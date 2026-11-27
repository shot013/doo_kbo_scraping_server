import { Inject, Injectable } from '@nestjs/common';
import { GameEvent } from '../domain/entities/game-event.entity';
import { GAME_EVENT_REPOSITORY } from '../domain/repositories/game-event.repository';
import type { GameEventRepository } from '../domain/repositories/game-event.repository';

/**
 * 문자중계 이벤트 저장·조회. 저장은 스크랩 모듈이, 조회는 경기 요약이 쓴다.
 * 조회 API는 두지 않는다 (앱에는 경기 요약으로 가공해 내려준다).
 */
@Injectable()
export class GameEventService {
  constructor(
    @Inject(GAME_EVENT_REPOSITORY)
    private readonly gameEventRepository: GameEventRepository,
  ) {}

  findByGameId(gameId: string): Promise<GameEvent[]> {
    return this.gameEventRepository.findByGameId(gameId);
  }

  replaceByGameId(gameId: string, events: GameEvent[]): Promise<void> {
    return this.gameEventRepository.replaceByGameId(gameId, events);
  }
}
