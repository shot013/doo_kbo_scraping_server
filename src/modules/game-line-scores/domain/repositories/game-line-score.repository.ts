import { GameLineScore } from '../entities/game-line-score.entity';

export const GAME_LINE_SCORE_REPOSITORY = Symbol('GAME_LINE_SCORE_REPOSITORY');

export interface GameLineScoreRepository {
  /** 경기의 점수표를 원정 → 홈 순서로 반환한다. 없으면 빈 배열. */
  findByGameId(gameId: string): Promise<GameLineScore[]>;
  upsertMany(lineScores: GameLineScore[]): Promise<void>;
}
