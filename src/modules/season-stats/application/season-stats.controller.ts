import { Controller, Get, Query } from '@nestjs/common';
import { SeasonBattingStat } from '../domain/entities/season-batting-stat.entity';
import { SeasonPitchingStat } from '../domain/entities/season-pitching-stat.entity';
import { SeasonStatQueryDto } from './dto/season-stat-query.dto';
import { SeasonBattingStatService } from './season-batting-stat.service';
import { SeasonPitchingStatService } from './season-pitching-stat.service';

@Controller('season-stats')
export class SeasonStatsController {
  constructor(
    private readonly seasonBattingStatService: SeasonBattingStatService,
    private readonly seasonPitchingStatService: SeasonPitchingStatService,
  ) {}

  @Get('batters')
  getBatters(
    @Query() query: SeasonStatQueryDto,
  ): Promise<{ data: SeasonBattingStat[] }> {
    return this.seasonBattingStatService
      .findBySeasonYear({
        seasonYear: resolveSeasonYear(query),
        limit: resolveLimit(query),
      })
      .then((data) => ({ data }));
  }

  @Get('pitchers')
  getPitchers(
    @Query() query: SeasonStatQueryDto,
  ): Promise<{ data: SeasonPitchingStat[] }> {
    return this.seasonPitchingStatService
      .findBySeasonYear({
        seasonYear: resolveSeasonYear(query),
        limit: resolveLimit(query),
      })
      .then((data) => ({ data }));
  }
}

function resolveSeasonYear(query: SeasonStatQueryDto): number {
  return query.seasonYear ? Number(query.seasonYear) : new Date().getFullYear();
}

function resolveLimit(query: SeasonStatQueryDto): number | undefined {
  return query.limit ? Number(query.limit) : undefined;
}
