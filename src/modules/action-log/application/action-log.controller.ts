import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { PaginatedResult } from '../../../common/pagination/pagination';
import { ActionLog } from '../domain/entities/action-log.entity';
import { ActionLogQueryDto } from './dto/action-log-query.dto';
import { LogActionsRequestDto } from './dto/log-action.dto';
import { ActionLogService } from './action-log.service';

@Controller('action-logs')
export class ActionLogController {
  constructor(private readonly actionLogService: ActionLogService) {}

  @Post()
  logMany(@Body() body?: LogActionsRequestDto): Promise<ActionLog[]> {
    const logs = body?.logs ?? [];
    if (logs.length === 0) {
      throw new BadRequestException('logs must not be empty');
    }
    if (logs.some((entry) => !entry.route)) {
      throw new BadRequestException('route is required for every log');
    }

    return this.actionLogService.logMany(
      logs.map((entry) => ({
        userId: entry.userId ?? null,
        route: entry.route as string,
        previousRoute: entry.previousRoute ?? null,
        params: entry.params ?? null,
        platform: entry.platform ?? null,
        osVersion: entry.osVersion ?? null,
        occurredAt: entry.occurredAt ? new Date(entry.occurredAt) : new Date(),
      })),
    );
  }

  @Get()
  findAll(
    @Query() query: ActionLogQueryDto,
  ): Promise<PaginatedResult<ActionLog>> {
    return this.actionLogService.findAll({
      userId: query.userId,
      route: query.route,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      sortOrder: query.sortOrder === 'ASC' ? 'ASC' : undefined,
    });
  }
}
