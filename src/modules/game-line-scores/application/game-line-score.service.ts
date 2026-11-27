import { Inject, Injectable } from '@nestjs/common';
import { GameLineScore } from '../domain/entities/game-line-score.entity';
import { GAME_LINE_SCORE_REPOSITORY } from '../domain/repositories/game-line-score.repository';
import type { GameLineScoreRepository } from '../domain/repositories/game-line-score.repository';

/**
 * 경기 점수표 저장·조회. 점수표가 있는 경기만 경기 요약이 있다고 본다
 * (없으면 `GET /game-summaries/:gameId`가 404). 그래서 스크랩 모듈은 같은 경기의
 * 이벤트·투수 기록을 저장한 뒤 마지막에 점수표를 저장한다.
 */
@Injectable()
export class GameLineScoreService {
  constructor(
    @Inject(GAME_LINE_SCORE_REPOSITORY)
    private readonly gameLineScoreRepository: GameLineScoreRepository,
  ) {}

  findByGameId(gameId: string): Promise<GameLineScore[]> {
    return this.gameLineScoreRepository.findByGameId(gameId);
  }

  upsertMany(lineScores: GameLineScore[]): Promise<void> {
    return this.gameLineScoreRepository.upsertMany(lineScores);
  }
}
