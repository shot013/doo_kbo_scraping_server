import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';
import { PlayerStatType } from '../../domain/entities/game-stat.entity';

export class GameStatQueryDto extends PaginationQueryDto {
  gameId?: string;
  teamCode?: string;
  statType?: PlayerStatType;
  sortBy?: string;
}
