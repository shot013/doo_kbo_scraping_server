import {
  PaginatedResult,
  SortOrder,
} from '../../../../common/pagination/pagination';
import { Game, GameStatus } from '../entities/game.entity';

export const GAME_REPOSITORY = Symbol('GAME_REPOSITORY');

export type GameSortField =
  'scheduledAt' | 'gameDate' | 'seasonYear' | 'homeScore' | 'awayScore';

export interface GameFilter {
  seasonYear?: number;
  gameDate?: string;
  status?: GameStatus;
  teamCode?: string;
  page?: number;
  limit?: number;
  sortBy?: GameSortField;
  sortOrder?: SortOrder;
}

export interface GameRepository {
  findAll(filter?: GameFilter): Promise<PaginatedResult<Game>>;
  findById(id: string): Promise<Game | null>;
  upsert(game: Game): Promise<Game>;
}
