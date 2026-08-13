import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import {
  buildPaginatedResult,
  normalizePagination,
  PaginatedResult,
} from '../../../../common/pagination/pagination';
import { Player } from '../../domain/entities/player.entity';
import {
  PlayerFilter,
  PlayerRepository,
} from '../../domain/repositories/player.repository';
import { PlayerOrmEntity } from '../orm/player.orm-entity';

@Injectable()
export class PlayerRepositoryImpl implements PlayerRepository {
  constructor(
    @InjectRepository(PlayerOrmEntity)
    private readonly ormRepository: Repository<PlayerOrmEntity>,
  ) {}

  async findAll(filter: PlayerFilter = {}): Promise<PaginatedResult<Player>> {
    const where: Record<string, unknown> = {};
    if (filter.teamCode !== undefined) where.teamCode = filter.teamCode;
    if (filter.position !== undefined) where.position = filter.position;
    if (filter.search) where.name = ILike(`%${filter.search}%`);

    const { page, limit, skip } = normalizePagination(filter);
    const [rows, total] = await this.ormRepository.findAndCount({
      where,
      order: { teamCode: 'ASC', position: 'ASC', backNumber: 'ASC' },
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

  async findByTeamCode(teamCode: string): Promise<Player[]> {
    const rows = await this.ormRepository.find({
      where: { teamCode },
      order: { position: 'ASC', backNumber: 'ASC' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: number): Promise<Player | null> {
    const row = await this.ormRepository.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async upsert(player: Player): Promise<Player> {
    const saved = await this.ormRepository.save(this.toOrm(player));
    return this.toDomain(saved);
  }

  private toDomain(row: PlayerOrmEntity): Player {
    return new Player({ ...row });
  }

  private toOrm(player: Player): PlayerOrmEntity {
    return Object.assign(new PlayerOrmEntity(), player);
  }
}
