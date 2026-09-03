import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import {
  buildPaginatedResult,
  normalizePagination,
  normalizeSortOrder,
  PaginatedResult,
} from '../../../../common/pagination/pagination';
import { ActionLog } from '../../domain/entities/action-log.entity';
import {
  ActionLogFilter,
  ActionLogRepository,
  LogActionInput,
} from '../../domain/repositories/action-log.repository';
import { ActionLogOrmEntity } from '../orm/action-log.orm-entity';

@Injectable()
export class ActionLogRepositoryImpl implements ActionLogRepository {
  constructor(
    @InjectRepository(ActionLogOrmEntity)
    private readonly ormRepository: Repository<ActionLogOrmEntity>,
  ) {}

  async log(entry: LogActionInput): Promise<ActionLog> {
    const saved = await this.ormRepository.save(
      this.ormRepository.create(entry),
    );
    return this.toDomain(saved);
  }

  async findAll(
    filter: ActionLogFilter = {},
  ): Promise<PaginatedResult<ActionLog>> {
    const where: FindOptionsWhere<ActionLogOrmEntity> = {};
    if (filter.userId !== undefined) where.userId = filter.userId;
    if (filter.route !== undefined) where.route = filter.route;

    const { page, limit, skip } = normalizePagination(filter);
    const sortOrder = normalizeSortOrder(filter.sortOrder ?? 'DESC');

    const [rows, total] = await this.ormRepository.findAndCount({
      where,
      order: { occurredAt: sortOrder },
      skip,
      take: limit,
    });

    return buildPaginatedResult(
      rows.map((row) => this.toDomain(row)),
      total,
      page,
      limit,
    );
  }

  private toDomain(row: ActionLogOrmEntity): ActionLog {
    return new ActionLog({ ...row });
  }
}
