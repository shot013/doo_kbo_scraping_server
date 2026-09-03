import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../common/pagination/pagination';
import { ActionLog } from '../domain/entities/action-log.entity';
import {
  ACTION_LOG_REPOSITORY,
  ActionLogFilter,
  LogActionInput,
} from '../domain/repositories/action-log.repository';
import type { ActionLogRepository } from '../domain/repositories/action-log.repository';

@Injectable()
export class ActionLogService {
  constructor(
    @Inject(ACTION_LOG_REPOSITORY)
    private readonly repository: ActionLogRepository,
  ) {}

  logMany(entries: LogActionInput[]): Promise<ActionLog[]> {
    return this.repository.logMany(entries);
  }

  findAll(filter: ActionLogFilter = {}): Promise<PaginatedResult<ActionLog>> {
    return this.repository.findAll(filter);
  }
}
