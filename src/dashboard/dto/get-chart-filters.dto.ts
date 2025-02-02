import { ApiProperty } from "@nestjs/swagger";

export class GetChartFiltersDto {
  @ApiProperty(
    {
      description: 'The start date of the chart',
      example: '2023-01-01',
      type: Date,
    }
  )
  startDate: Date;
  @ApiProperty(
    {
      description: 'The end date of the chart',
      example: '2023-01-31',
      type: Date,
    }
  )
  endDate: Date;
  @ApiProperty(
    {
      description: 'The interval of the chart',
      example: 'daily',
      enum: ['daily', 'weekly'],
    }
  )
  interval: 'daily' | 'weekly';
}
