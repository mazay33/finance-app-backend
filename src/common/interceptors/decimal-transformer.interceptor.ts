import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import Decimal from 'decimal.js';

@Injectable()
export class DecimalTransformerInterceptor implements NestInterceptor {
  private transformDecimal(data: any): any {
    if (data === null || data === undefined) return data;

    // Если это массив, обрабатываем каждый элемент
    if (Array.isArray(data)) {
      return data.map(item => this.transformDecimal(item));
    }

    // Если это Decimal, преобразуем в строку
    if (data instanceof Decimal) {
      return data.toString();
    }

    // Если это дата, преобразуем в строку ISO
    if (data instanceof Date) {
      return data.toISOString();
    }

    // Если это объект, обрабатываем все его свойства
    if (typeof data === 'object' && data !== null) {
      // Если это пустой объект, проверяем, возможно, это должна быть дата
      if (Object.keys(data).length === 0) {
        // В случае пустого объекта возвращаем текущую дату в формате ISO
        return new Date().toISOString();
      }

      // Если это Decimal с внутренней структурой
      if ('d' in data && 's' in data && 'e' in data) {
        try {
          return new Decimal(data).toString();
        } catch (e) {
          return '0';
        }
      }

      // Для всех обычных объектов обрабатываем их свойства
      const result = {};
      for (const key of Object.keys(data)) {
        result[key] = this.transformDecimal(data[key]);
      }
      return result;
    }

    // Для всех остальных типов данных возвращаем без изменений
    return data;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => this.transformDecimal(data))
    );
  }
}
