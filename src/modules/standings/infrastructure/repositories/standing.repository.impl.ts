import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsOrder, Repository } from 'typeorm';
import {
  buildPaginatedResult,
  normalizePagination,
  normalizeSortOrder,
  PaginatedResult,
} from '../../../../common/pagination/pagination';
import { Standing } from '../../domain/entities/standing.entity';
import {
  StandingFilter,
  StandingRepository,
  StandingSortField,
} from '../../domain/repositories/standing.repository';
import { StandingOrmEntity } from '../orm/standing.orm-entity';

const SORT_FIELD_MAP: Record<StandingSortField, keyof StandingOrmEntity> = {
  rank: 'rank',
  winRate: 'winRate',
  gamesBehind: 'gamesBehind',
  wins: 'wins',
  losses: 'losses',
  gamesPlayed: 'gamesPlayed',
};

@Injectable()
export class StandingRepositoryImpl implements StandingRepository {
  constructor(
    @InjectRepository(StandingOrmEntity)
    private readonly ormRepository: Repository<StandingOrmEntity>,
  ) {}

  async findBySeasonYear(
    filter: StandingFilter,
  ): Promise<PaginatedResult<Standing>> {
    const { page, limit, skip } = normalizePagination(filter);
    const sortField = SORT_FIELD_MAP[filter.sortBy as StandingSortField];
    const sortOrder = normalizeSortOrder(filter.sortOrder);

    const order: FindOptionsOrder<StandingOrmEntity> = sortField
      ? { [sortField]: sortOrder }
      : { rank: 'ASC' };

    const [rows, total] = await this.ormRepository.findAndCount({
      where: { seasonYear: filter.seasonYear },
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

  async upsert(standing: Standing): Promise<Standing> {
    const existing = await this.ormRepository.findOne({
      where: {
        seasonYear: standing.seasonYear,
        teamCode: standing.teamCode,
      },
    });
    const orm = this.toOrm(standing);
    if (existing) {
      orm.id = existing.id;
    }
    const saved = await this.ormRepository.save(orm);
    return this.toDomain(saved);
  }

  private toDomain(row: StandingOrmEntity): Standing {
    return new Standing({ ...row });
  }

  private toOrm(standing: Standing): StandingOrmEntity {
    const orm = Object.assign(new StandingOrmEntity(), standing);
    if (!standing.id) {
      delete (orm as { id?: number }).id;
    }
    return orm;
  }
}
