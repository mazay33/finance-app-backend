import { AccountResponseDto } from "./account-response.dto";
import { ApiProperty } from "@nestjs/swagger";
import { PaginationResponseDto } from "@common/responses";

export class PaginatedAccountResponseDto {
  @ApiProperty({
    type: [AccountResponseDto],
    description: 'Массив счетов в текущей странице результатов'
  })
  data: AccountResponseDto[];

  @ApiProperty({
    type: PaginationResponseDto,
    description: 'Информация о пагинации'
  })
  pagination: PaginationResponseDto;
}
