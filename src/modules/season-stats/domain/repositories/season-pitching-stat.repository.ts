import { SeasonPitchingStat } from '../entities/season-pitching-stat.entity';

export const SEASON_PITCHING_STAT_REPOSITORY = Symbol(
  'SEASON_PITCHING_STAT_REPOSITORY',
);

export interface SeasonPitchingStatFilter {
  seasonYear: number;
  limit?: number;
}

export interface SeasonPitchingStatRepository {
  findBySeasonYear(
    filter: SeasonPitchingStatFilter,
  ): Promise<SeasonPitchingStat[]>;
  upsert(stat: SeasonPitchingStat): Promise<SeasonPitchingStat>;
}
