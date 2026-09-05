import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { GamePreview } from '../domain/entities/game-preview.entity';
import { GAME_PREVIEW_REPOSITORY } from '../domain/repositories/game-preview.repository';
import type { GamePreviewRepository } from '../domain/repositories/game-preview.repository';

@Injectable()
export class GamePreviewService {
  constructor(
    @Inject(GAME_PREVIEW_REPOSITORY)
    private readonly gamePreviewRepository: GamePreviewRepository,
  ) {}

  findByGameId(gameId: string): Promise<GamePreview | null> {
    return this.gamePreviewRepository.findByGameId(gameId);
  }

  async getByGameId(gameId: string): Promise<GamePreview> {
    const preview = await this.findByGameId(gameId);
    if (!preview) {
      throw new NotFoundException(`Game preview not found: ${gameId}`);
    }
    return preview;
  }

  findByGameIds(gameIds: string[]): Promise<GamePreview[]> {
    return this.gamePreviewRepository.findByGameIds(gameIds);
  }

  upsert(gamePreview: GamePreview): Promise<GamePreview> {
    return this.gamePreviewRepository.upsert(gamePreview);
  }

  upsertMany(gamePreviews: GamePreview[]): Promise<void> {
    return this.gamePreviewRepository.upsertMany(gamePreviews);
  }
}
