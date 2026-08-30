import { SeasonBattingStat } from '../entities/season-batting-stat.entity';

export const SEASON_BATTING_STAT_REPOSITORY = Symbol(
  'SEASON_BATTING_STAT_REPOSITORY',
);

export interface SeasonBattingStatFilter {
  seasonYear: number;
  limit?: number;
  qualifiedOnly?: boolean;
}

export interface SeasonBattingStatRepository {
  findBySeasonYear(
    filter: SeasonBattingStatFilter,
  ): Promise<SeasonBattingStat[]>;
  upsert(stat: SeasonBattingStat): Promise<SeasonBattingStat>;
  upsertMany(stats: SeasonBattingStat[]): Promise<void>;
}
