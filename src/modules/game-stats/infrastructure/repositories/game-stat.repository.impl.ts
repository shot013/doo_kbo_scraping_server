import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameStat } from '../../domain/entities/game-stat.entity';
import {
  GameStatFilter,
  GameStatRepository,
} from '../../domain/repositories/game-stat.repository';
import { GameStatOrmEntity } from '../orm/game-stat.orm-entity';

@Injectable()
export class GameStatRepositoryImpl implements GameStatRepository {
  constructor(
    @InjectRepository(GameStatOrmEntity)
    private readonly ormRepository: Repository<GameStatOrmEntity>,
  ) {}

  async findAll(filter: GameStatFilter = {}): Promise<GameStat[]> {
    const where: Record<string, unknown> = {};
    if (filter.gameId !== undefined) where.gameId = filter.gameId;
    if (filter.teamCode !== undefined) where.teamCode = filter.teamCode;
    if (filter.statType !== undefined) where.statType = filter.statType;

    const rows = await this.ormRepository.find({
      where,
      order: { teamCode: 'ASC', id: 'ASC' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: number): Promise<GameStat | null> {
    const row = await this.ormRepository.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async upsertMany(stats: GameStat[]): Promise<GameStat[]> {
    const saved: GameStatOrmEntity[] = [];
    for (const stat of stats) {
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
      saved.push(await this.ormRepository.save(orm));
    }
    return saved.map((row) => this.toDomain(row));
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
