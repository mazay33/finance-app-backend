import { ApiProperty } from "@nestjs/swagger";

export class PaginationResponseDto {
  @ApiProperty()
  page: number;
  @ApiProperty()
  limit: number;
  @ApiProperty()
  total: number;
}
