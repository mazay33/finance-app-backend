import { ApiResponseProperty } from '@nestjs/swagger';
import { JwtPayload } from 'src/auth/interfaces';

export class JwtPayloadResponse implements JwtPayload {
  @ApiResponseProperty({ example: '5f9d5b9f-9b2b-4a0b-9b2b-9b2b9b2b9b2b' })
  id: string;
  @ApiResponseProperty({ example: 'user@example.com' })
  email: string;
  @ApiResponseProperty({ example: ['USER', 'ADMIN'] })
  roles: string[];
}
