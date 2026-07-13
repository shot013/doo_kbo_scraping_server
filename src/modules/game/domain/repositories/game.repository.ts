import { Game, GameStatus } from '../entities/game.entity';

export const GAME_REPOSITORY = Symbol('GAME_REPOSITORY');

export interface GameFilter {
  seasonYear?: number;
  gameDate?: string;
  status?: GameStatus;
  teamCode?: string;
}

export interface GameRepository {
  findAll(filter?: GameFilter): Promise<Game[]>;
  findById(id: string): Promise<Game | null>;
  upsert(game: Game): Promise<Game>;
}
