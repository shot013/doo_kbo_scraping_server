import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';

export class GameQueryDto extends PaginationQueryDto {
  seasonYear?: string;
  gameDate?: string;
  /** `GameStatus` 값. 컨트롤러에서 검증한다. */
  status?: string;
  /** `GameSeries` 값. 컨트롤러에서 검증한다. */
  series?: string;
  teamCode?: string;
  sortBy?: string;
}
