import { Controller, Get, Query } from '@nestjs/common';
import { RecordQueryDto } from './dto/record-query.dto';
import {
  BatterRecordResponse,
  PitcherRecordResponse,
  RecordsService,
} from './records.service';

@Controller('records')
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  @Get('batters')
  getBatters(
    @Query() query: RecordQueryDto,
  ): Promise<{ data: BatterRecordResponse[] }> {
    return this.recordsService
      .getBatterLeaders(resolveSeasonYear(query), resolveLimit(query))
      .then((data) => ({ data }));
  }

  @Get('pitchers')
  getPitchers(
    @Query() query: RecordQueryDto,
  ): Promise<{ data: PitcherRecordResponse[] }> {
    return this.recordsService
      .getPitcherLeaders(resolveSeasonYear(query), resolveLimit(query))
      .then((data) => ({ data }));
  }
}

function resolveSeasonYear(query: RecordQueryDto): number {
  return query.seasonYear ? Number(query.seasonYear) : new Date().getFullYear();
}

function resolveLimit(query: RecordQueryDto): number | undefined {
  return query.limit ? Number(query.limit) : undefined;
}
