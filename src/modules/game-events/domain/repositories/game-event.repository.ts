import { GameEvent } from '../entities/game-event.entity';

export const GAME_EVENT_REPOSITORY = Symbol('GAME_EVENT_REPOSITORY');

export interface GameEventRepository {
  /** 경기의 이벤트를 relay 순서(항목 번호, 항목 안 순서)대로 반환한다. */
  findByGameId(gameId: string): Promise<GameEvent[]>;
  /**
   * 경기의 이벤트를 통째로 바꾼다. 다시 스크랩했을 때 항목 번호가 바뀌거나 사라진
   * 이벤트가 남지 않도록 지우고 넣는 것을 한 트랜잭션으로 처리한다.
   */
  replaceByGameId(gameId: string, events: GameEvent[]): Promise<void>;
}
