import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';

export class StandingQueryDto extends PaginationQueryDto {
  seasonYear?: string;
  sortBy?: string;
}
