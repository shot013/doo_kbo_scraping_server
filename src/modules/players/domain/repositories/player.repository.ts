import { PaginatedResult } from '../../../../common/pagination/pagination';
import { Player, PlayerPosition } from '../entities/player.entity';

export const PLAYER_REPOSITORY = Symbol('PLAYER_REPOSITORY');

export interface PlayerFilter {
  teamCode?: string;
  position?: PlayerPosition;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PlayerRepository {
  findAll(filter?: PlayerFilter): Promise<PaginatedResult<Player>>;
  findByTeamCode(teamCode: string): Promise<Player[]>;
  findById(id: number): Promise<Player | null>;
  upsert(player: Player): Promise<Player>;
}
