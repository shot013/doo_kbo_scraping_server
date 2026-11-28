import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';

export class GameStatQueryDto extends PaginationQueryDto {
  gameId?: string;
  teamCode?: string;
  /** `PlayerStatType` 값. 컨트롤러에서 검증한다. */
  statType?: string;
  sortBy?: string;
}
