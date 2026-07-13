import {
  PaginatedResult,
  SortOrder,
} from '../../../../common/pagination/pagination';
import { Standing } from '../entities/standing.entity';

export const STANDING_REPOSITORY = Symbol('STANDING_REPOSITORY');

export type StandingSortField =
  'rank' | 'winRate' | 'gamesBehind' | 'wins' | 'losses' | 'gamesPlayed';

export interface StandingFilter {
  seasonYear: number;
  page?: number;
  limit?: number;
  sortBy?: StandingSortField;
  sortOrder?: SortOrder;
}

export interface StandingRepository {
  findBySeasonYear(filter: StandingFilter): Promise<PaginatedResult<Standing>>;
  upsertMany(standings: Standing[]): Promise<Standing[]>;
}
