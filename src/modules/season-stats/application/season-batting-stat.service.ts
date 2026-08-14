import { Inject, Injectable } from '@nestjs/common';
import { SeasonBattingStat } from '../domain/entities/season-batting-stat.entity';
import {
  SEASON_BATTING_STAT_REPOSITORY,
  SeasonBattingStatFilter,
} from '../domain/repositories/season-batting-stat.repository';
import type { SeasonBattingStatRepository } from '../domain/repositories/season-batting-stat.repository';

@Injectable()
export class SeasonBattingStatService {
  constructor(
    @Inject(SEASON_BATTING_STAT_REPOSITORY)
    private readonly seasonBattingStatRepository: SeasonBattingStatRepository,
  ) {}

  findBySeasonYear(
    filter: SeasonBattingStatFilter,
  ): Promise<SeasonBattingStat[]> {
    return this.seasonBattingStatRepository.findBySeasonYear(filter);
  }

  upsert(stat: SeasonBattingStat): Promise<SeasonBattingStat> {
    return this.seasonBattingStatRepository.upsert(stat);
  }
}
