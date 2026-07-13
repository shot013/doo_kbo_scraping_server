import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { GameStat } from '../domain/entities/game-stat.entity';
import {
  GAME_STAT_REPOSITORY,
  GameStatFilter,
} from '../domain/repositories/game-stat.repository';
import type { GameStatRepository } from '../domain/repositories/game-stat.repository';

@Injectable()
export class GameStatService {
  constructor(
    @Inject(GAME_STAT_REPOSITORY)
    private readonly gameStatRepository: GameStatRepository,
  ) {}

  findAll(filter: GameStatFilter = {}): Promise<GameStat[]> {
    return this.gameStatRepository.findAll(filter);
  }

  async findById(id: number): Promise<GameStat> {
    const stat = await this.gameStatRepository.findById(id);
    if (!stat) {
      throw new NotFoundException(`Game stat not found: ${id}`);
    }
    return stat;
  }

  upsertMany(stats: GameStat[]): Promise<GameStat[]> {
    return this.gameStatRepository.upsertMany(stats);
  }
}
