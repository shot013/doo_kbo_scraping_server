import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from '../../domain/entities/game.entity';
import {
  GameFilter,
  GameRepository,
} from '../../domain/repositories/game.repository';
import { GameOrmEntity } from '../orm/game.orm-entity';

@Injectable()
export class GameRepositoryImpl implements GameRepository {
  constructor(
    @InjectRepository(GameOrmEntity)
    private readonly ormRepository: Repository<GameOrmEntity>,
  ) {}

  async findAll(filter: GameFilter = {}): Promise<Game[]> {
    const where: Record<string, unknown> = {};
    if (filter.seasonYear !== undefined) where.seasonYear = filter.seasonYear;
    if (filter.gameDate !== undefined) where.gameDate = filter.gameDate;
    if (filter.status !== undefined) where.status = filter.status;

    const rows = await this.ormRepository.find({
      where,
      order: { scheduledAt: 'ASC' },
    });

    return rows
      .filter(
        (row) =>
          !filter.teamCode ||
          row.homeTeamCode === filter.teamCode ||
          row.awayTeamCode === filter.teamCode,
      )
      .map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<Game | null> {
    const row = await this.ormRepository.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async upsert(game: Game): Promise<Game> {
    const saved = await this.ormRepository.save(this.toOrm(game));
    return this.toDomain(saved);
  }

  private toDomain(row: GameOrmEntity): Game {
    return new Game({ ...row });
  }

  private toOrm(game: Game): GameOrmEntity {
    return Object.assign(new GameOrmEntity(), game);
  }
}
