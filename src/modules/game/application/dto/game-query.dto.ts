import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';
import { GameSeries, GameStatus } from '../../domain/entities/game.entity';

export class GameQueryDto extends PaginationQueryDto {
  seasonYear?: string;
  gameDate?: string;
  status?: GameStatus;
  series?: GameSeries;
  teamCode?: string;
  sortBy?: string;
}
