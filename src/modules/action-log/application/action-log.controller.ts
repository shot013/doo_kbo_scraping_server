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
import { LogActionDto } from './dto/log-action.dto';
import { ActionLogService } from './action-log.service';

@Controller('action-logs')
export class ActionLogController {
  constructor(private readonly actionLogService: ActionLogService) {}

  @Post()
  log(@Body() body?: LogActionDto): Promise<ActionLog> {
    if (!body?.userId || !body?.route) {
      throw new BadRequestException('userId and route are required');
    }
    return this.actionLogService.log({
      userId: body.userId,
      route: body.route,
      previousRoute: body.previousRoute ?? null,
      params: body.params ?? null,
      platform: body.platform ?? null,
      occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
    });
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
