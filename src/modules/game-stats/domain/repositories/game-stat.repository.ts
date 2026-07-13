import {
  PaginatedResult,
  SortOrder,
} from '../../../../common/pagination/pagination';
import { GameStat, PlayerStatType } from '../entities/game-stat.entity';

export const GAME_STAT_REPOSITORY = Symbol('GAME_STAT_REPOSITORY');

export type GameStatSortField =
  | 'id'
  | 'teamCode'
  | 'playerName'
  | 'homeRuns'
  | 'rbi'
  | 'battingAverage'
  | 'era';

export interface GameStatFilter {
  gameId?: string;
  teamCode?: string;
  statType?: PlayerStatType;
  page?: number;
  limit?: number;
  sortBy?: GameStatSortField;
  sortOrder?: SortOrder;
}

export interface GameStatRepository {
  findAll(filter?: GameStatFilter): Promise<PaginatedResult<GameStat>>;
  findById(id: number): Promise<GameStat | null>;
  upsertMany(stats: GameStat[]): Promise<GameStat[]>;
}
