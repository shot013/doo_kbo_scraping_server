import { Player, PlayerPosition } from '../entities/player.entity';

export const PLAYER_REPOSITORY = Symbol('PLAYER_REPOSITORY');

export interface PlayerFilter {
  teamCode?: string;
  position?: PlayerPosition;
  search?: string;
}

export interface PlayerRepository {
  findAll(filter?: PlayerFilter): Promise<Player[]>;
  findByTeamCode(teamCode: string): Promise<Player[]>;
  findById(id: number): Promise<Player | null>;
  upsert(player: Player): Promise<Player>;
}
