import {
  PaginatedResult,
  SortOrder,
} from '../../../../common/pagination/pagination';
import { ActionLog } from '../entities/action-log.entity';

export const ACTION_LOG_REPOSITORY = Symbol('ACTION_LOG_REPOSITORY');

export interface LogActionInput {
  userId: string | null;
  route: string;
  previousRoute: string | null;
  params: Record<string, unknown> | null;
  platform: string | null;
  osVersion: string | null;
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
  /** 앱이 일정 주기로 모아 보낸 로그를 한 번에 저장한다. */
  logMany(entries: LogActionInput[]): Promise<ActionLog[]>;
  findAll(filter?: ActionLogFilter): Promise<PaginatedResult<ActionLog>>;
}
