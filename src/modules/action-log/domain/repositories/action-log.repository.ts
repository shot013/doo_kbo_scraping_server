import {
  PaginatedResult,
  SortOrder,
} from '../../../../common/pagination/pagination';
import { ActionLog } from '../entities/action-log.entity';

export const ACTION_LOG_REPOSITORY = Symbol('ACTION_LOG_REPOSITORY');

export interface LogActionInput {
  userId: string;
  route: string;
  previousRoute: string | null;
  params: Record<string, unknown> | null;
  platform: string | null;
  occurredAt: Date;
}

export interface ActionLogFilter {
  userId?: string;
  route?: string;
  page?: number;
  limit?: number;
  sortOrder?: SortOrder;
}

export interface ActionLogRepository {
  log(entry: LogActionInput): Promise<ActionLog>;
  findAll(filter?: ActionLogFilter): Promise<PaginatedResult<ActionLog>>;
}
