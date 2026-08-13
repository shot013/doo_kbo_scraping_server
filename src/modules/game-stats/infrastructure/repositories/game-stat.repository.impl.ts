import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsOrder, Repository } from 'typeorm';
import {
  buildPaginatedResult,
  normalizePagination,
  normalizeSortOrder,
  PaginatedResult,
} from '../../../../common/pagination/pagination';
import { GameStat } from '../../domain/entities/game-stat.entity';
import {
  GameStatFilter,
  GameStatRepository,
  GameStatSortField,
} from '../../domain/repositories/game-stat.repository';
import { GameStatOrmEntity } from '../orm/game-stat.orm-entity';

const SORT_FIELD_MAP: Record<GameStatSortField, keyof GameStatOrmEntity> = {
  id: 'id',
  teamCode: 'teamCode',
  playerName: 'playerName',
  homeRuns: 'homeRuns',
  rbi: 'rbi',
  battingAverage: 'battingAverage',
  era: 'era',
};

@Injectable()
export class GameStatRepositoryImpl implements GameStatRepository {
  constructor(
    @InjectRepository(GameStatOrmEntity)
    private readonly ormRepository: Repository<GameStatOrmEntity>,
  ) {}

  async findAll(
    filter: GameStatFilter = {},
  ): Promise<PaginatedResult<GameStat>> {
    const where: Record<string, unknown> = {};
    if (filter.gameId !== undefined) where.gameId = filter.gameId;
    if (filter.teamCode !== undefined) where.teamCode = filter.teamCode;
    if (filter.statType !== undefined) where.statType = filter.statType;

    const { page, limit, skip } = normalizePagination(filter);
    const sortField = SORT_FIELD_MAP[filter.sortBy as GameStatSortField];
    const sortOrder = normalizeSortOrder(filter.sortOrder);

    const order: FindOptionsOrder<GameStatOrmEntity> = sortField
      ? sortField === 'id'
        ? { id: sortOrder }
        : { [sortField]: sortOrder, id: 'ASC' }
      : { teamCode: 'ASC', id: 'ASC' };

    const [rows, total] = await this.ormRepository.findAndCount({
      where,
      order,
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

  async findById(id: number): Promise<GameStat | null> {
    const row = await this.ormRepository.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async upsert(stat: GameStat): Promise<GameStat> {
    const existing = await this.ormRepository.findOne({
      where: {
        gameId: stat.gameId,
        teamCode: stat.teamCode,
        playerName: stat.playerName,
        statType: stat.statType,
      },
    });
    const orm = this.toOrm(stat);
    if (existing) {
      orm.id = existing.id;
    }
    const saved = await this.ormRepository.save(orm);
    return this.toDomain(saved);
  }

  private toDomain(row: GameStatOrmEntity): GameStat {
    return new GameStat({ ...row });
  }

  private toOrm(stat: GameStat): GameStatOrmEntity {
    const orm = Object.assign(new GameStatOrmEntity(), stat);
    if (!stat.id) {
      delete (orm as { id?: number }).id;
    }
    return orm;
  }
}
