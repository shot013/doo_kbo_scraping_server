import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameEvent } from '../../domain/entities/game-event.entity';
import { GameEventRepository } from '../../domain/repositories/game-event.repository';
import { GameEventOrmEntity } from '../orm/game-event.orm-entity';

@Injectable()
export class GameEventRepositoryImpl implements GameEventRepository {
  constructor(
    @InjectRepository(GameEventOrmEntity)
    private readonly ormRepository: Repository<GameEventOrmEntity>,
  ) {}

  async findByGameId(gameId: string): Promise<GameEvent[]> {
    const rows = await this.ormRepository.find({
      where: { gameId },
      order: { sequenceNo: 'ASC', subSequenceNo: 'ASC' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async replaceByGameId(gameId: string, events: GameEvent[]): Promise<void> {
    await this.ormRepository.manager.transaction(async (manager) => {
      await manager.delete(GameEventOrmEntity, { gameId });
      if (events.length === 0) return;
      await manager.insert(
        GameEventOrmEntity,
        events.map((event) => this.toOrm({ ...event, gameId })),
      );
    });
  }

  private toDomain(row: GameEventOrmEntity): GameEvent {
    return new GameEvent({ ...row });
  }

  private toOrm(event: GameEvent): GameEventOrmEntity {
    const orm = Object.assign(new GameEventOrmEntity(), event);
    delete (orm as { id?: number }).id;
    return orm;
  }
}
