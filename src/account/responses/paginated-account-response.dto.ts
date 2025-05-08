import { Pagination } from "@common/types";
import { AccountResponseDto } from "./account-response.dto";
import { ApiProperty } from "@nestjs/swagger";
import { PaginationResponseDto } from "@common/responses";

export class PaginatedAccountResponseDto {
  @ApiProperty({ type: [AccountResponseDto] })
  data: AccountResponseDto[];

  @ApiProperty({ type: PaginationResponseDto })
  pagination: PaginationResponseDto;
}
