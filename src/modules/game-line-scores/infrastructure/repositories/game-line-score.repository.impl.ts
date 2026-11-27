import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryDeepPartialEntity, Repository } from 'typeorm';
import { GameLineScore } from '../../domain/entities/game-line-score.entity';
import { GameLineScoreRepository } from '../../domain/repositories/game-line-score.repository';
import { GameLineScoreOrmEntity } from '../orm/game-line-score.orm-entity';

@Injectable()
export class GameLineScoreRepositoryImpl implements GameLineScoreRepository {
  constructor(
    @InjectRepository(GameLineScoreOrmEntity)
    private readonly ormRepository: Repository<GameLineScoreOrmEntity>,
  ) {}

  async findByGameId(gameId: string): Promise<GameLineScore[]> {
    const rows = await this.ormRepository.find({
      where: { gameId },
      order: { isHome: 'ASC' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async upsertMany(lineScores: GameLineScore[]): Promise<void> {
    if (lineScores.length === 0) return;
    await this.ormRepository.upsert(
      lineScores.map(
        (lineScore) =>
          this.toOrm(
            lineScore,
          ) as QueryDeepPartialEntity<GameLineScoreOrmEntity>,
      ),
      { conflictPaths: ['gameId', 'teamCode'] },
    );
  }

  private toDomain(row: GameLineScoreOrmEntity): GameLineScore {
    return new GameLineScore({ ...row });
  }

  private toOrm(lineScore: GameLineScore): GameLineScoreOrmEntity {
    const orm = Object.assign(new GameLineScoreOrmEntity(), lineScore);
    if (!lineScore.id) {
      delete (orm as { id?: number }).id;
    }
    return orm;
  }
}
