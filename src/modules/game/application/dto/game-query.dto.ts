import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';
import { GameStatus } from '../../domain/entities/game.entity';

export class GameQueryDto extends PaginationQueryDto {
  seasonYear?: string;
  gameDate?: string;
  status?: GameStatus;
  teamCode?: string;
  sortBy?: string;
}
