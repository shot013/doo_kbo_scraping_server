import { Inject, Injectable } from '@nestjs/common';
import { SeasonPitchingStat } from '../domain/entities/season-pitching-stat.entity';
import {
  SEASON_PITCHING_STAT_REPOSITORY,
  SeasonPitchingStatFilter,
} from '../domain/repositories/season-pitching-stat.repository';
import type { SeasonPitchingStatRepository } from '../domain/repositories/season-pitching-stat.repository';

@Injectable()
export class SeasonPitchingStatService {
  constructor(
    @Inject(SEASON_PITCHING_STAT_REPOSITORY)
    private readonly seasonPitchingStatRepository: SeasonPitchingStatRepository,
  ) {}

  findBySeasonYear(
    filter: SeasonPitchingStatFilter,
  ): Promise<SeasonPitchingStat[]> {
    return this.seasonPitchingStatRepository.findBySeasonYear(filter);
  }

  upsert(stat: SeasonPitchingStat): Promise<SeasonPitchingStat> {
    return this.seasonPitchingStatRepository.upsert(stat);
  }
}
