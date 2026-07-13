import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Game } from '../domain/entities/game.entity';
import {
  GAME_REPOSITORY,
  GameFilter,
} from '../domain/repositories/game.repository';
import type { GameRepository } from '../domain/repositories/game.repository';

@Injectable()
export class GameService {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
  ) {}

  findAll(filter: GameFilter = {}): Promise<Game[]> {
    return this.gameRepository.findAll(filter);
  }

  async findById(id: string): Promise<Game> {
    const game = await this.gameRepository.findById(id);
    if (!game) {
      throw new NotFoundException(`Game not found: ${id}`);
    }
    return game;
  }

  upsert(game: Game): Promise<Game> {
    return this.gameRepository.upsert(game);
  }
}
