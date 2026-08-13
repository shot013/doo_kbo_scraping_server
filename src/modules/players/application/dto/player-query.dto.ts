import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';

export class PlayerQueryDto extends PaginationQueryDto {
  search?: string;
  teamCode?: string;
  position?: string;
  seasonYear?: string;
}
