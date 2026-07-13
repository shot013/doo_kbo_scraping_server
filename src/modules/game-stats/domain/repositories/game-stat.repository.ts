import { GameStat, PlayerStatType } from '../entities/game-stat.entity';

export const GAME_STAT_REPOSITORY = Symbol('GAME_STAT_REPOSITORY');

export interface GameStatFilter {
  gameId?: string;
  teamCode?: string;
  statType?: PlayerStatType;
}

export interface GameStatRepository {
  findAll(filter?: GameStatFilter): Promise<GameStat[]>;
  findById(id: number): Promise<GameStat | null>;
  upsertMany(stats: GameStat[]): Promise<GameStat[]>;
}
