import { GamePreview } from '../entities/game-preview.entity';

export const GAME_PREVIEW_REPOSITORY = Symbol('GAME_PREVIEW_REPOSITORY');

export interface GamePreviewRepository {
  findByGameId(gameId: string): Promise<GamePreview | null>;
  findByGameIds(gameIds: string[]): Promise<GamePreview[]>;
  upsert(gamePreview: GamePreview): Promise<GamePreview>;
  upsertMany(gamePreviews: GamePreview[]): Promise<void>;
}
