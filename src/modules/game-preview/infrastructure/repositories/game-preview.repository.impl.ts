import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { GamePreview } from '../../domain/entities/game-preview.entity';
import { GamePreviewRepository } from '../../domain/repositories/game-preview.repository';
import { GamePreviewOrmEntity } from '../orm/game-preview.orm-entity';

@Injectable()
export class GamePreviewRepositoryImpl implements GamePreviewRepository {
  constructor(
    @InjectRepository(GamePreviewOrmEntity)
    private readonly ormRepository: Repository<GamePreviewOrmEntity>,
  ) {}

  async findByGameId(gameId: string): Promise<GamePreview | null> {
    const row = await this.ormRepository.findOne({ where: { gameId } });
    return row ? this.toDomain(row) : null;
  }

  async findByGameIds(gameIds: string[]): Promise<GamePreview[]> {
    if (gameIds.length === 0) return [];
    const rows = await this.ormRepository.find({
      where: { gameId: In(gameIds) },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async upsert(gamePreview: GamePreview): Promise<GamePreview> {
    const saved = await this.ormRepository.save(this.toOrm(gamePreview));
    return this.toDomain(saved);
  }

  async upsertMany(gamePreviews: GamePreview[]): Promise<void> {
    if (gamePreviews.length === 0) return;
    await this.ormRepository.upsert(
      gamePreviews.map((gamePreview) => this.toOrm(gamePreview)),
      { conflictPaths: ['gameId'] },
    );
  }

  private toDomain(row: GamePreviewOrmEntity): GamePreview {
    return new GamePreview({ ...row });
  }

  private toOrm(gamePreview: GamePreview): GamePreviewOrmEntity {
    return Object.assign(new GamePreviewOrmEntity(), gamePreview);
  }
}
