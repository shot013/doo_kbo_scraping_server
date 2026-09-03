import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';

export class ActionLogQueryDto extends PaginationQueryDto {
  userId?: string;
  route?: string;
}
