import { GameStatus } from '../../domain/entities/game.entity';

export class GameQueryDto {
  seasonYear?: string;
  gameDate?: string;
  status?: GameStatus;
  teamCode?: string;
}
