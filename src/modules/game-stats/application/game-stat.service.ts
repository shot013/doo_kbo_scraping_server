import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PaginatedResult } from '../../../common/pagination/pagination';
import { GameStat } from '../domain/entities/game-stat.entity';
import {
  BattingAggregate,
  GAME_STAT_REPOSITORY,
  GameStatFilter,
  PitchingAggregate,
  StatAggregateFilter,
} from '../domain/repositories/game-stat.repository';
import type { GameStatRepository } from '../domain/repositories/game-stat.repository';

@Injectable()
export class GameStatService {
  constructor(
    @Inject(GAME_STAT_REPOSITORY)
    private readonly gameStatRepository: GameStatRepository,
  ) {}

  findAll(filter: GameStatFilter = {}): Promise<PaginatedResult<GameStat>> {
    return this.gameStatRepository.findAll(filter);
  }

  async findById(id: number): Promise<GameStat> {
    const stat = await this.gameStatRepository.findById(id);
    if (!stat) {
      throw new NotFoundException(`Game stat not found: ${id}`);
    }
    return stat;
  }

  upsert(stat: GameStat): Promise<GameStat> {
    return this.gameStatRepository.upsert(stat);
  }

  findByGameIds(gameIds: string[]): Promise<GameStat[]> {
    return this.gameStatRepository.findByGameIds(gameIds);
  }

  aggregateBatting(filter: StatAggregateFilter): Promise<BattingAggregate[]> {
    return this.gameStatRepository.aggregateBatting(filter);
  }

  aggregatePitching(filter: StatAggregateFilter): Promise<PitchingAggregate[]> {
    return this.gameStatRepository.aggregatePitching(filter);
  }
}
