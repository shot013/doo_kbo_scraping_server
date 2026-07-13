import { PlayerStatType } from '../../domain/entities/game-stat.entity';

export class GameStatQueryDto {
  gameId?: string;
  teamCode?: string;
  statType?: PlayerStatType;
}
