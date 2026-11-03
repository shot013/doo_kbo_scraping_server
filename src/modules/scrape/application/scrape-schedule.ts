import { Game, GameStatus } from '../../game/domain/entities/game.entity';

/** 매시 정각 스크랩을 돌리는 KST 시각 (17시~다음날 1시). 경기가 없는 날의 기본 주기다. */
export const EVENING_HOURS = [17, 18, 19, 20, 21, 22, 23, 0, 1];

/** 경기 시작 이만큼 전부터 5분 간격 스크랩을 시작한다. */
const GAME_WINDOW_LEAD_MS = 10 * 60 * 1000;
/**
 * KBO가 끝내 종료 처리를 하지 않는 경기(서스펜디드 등)를 무한히 폴링하지 않도록,
 * 시작 후 이 시간이 지나면 FINISHED가 아니어도 경기 시간대에서 뺀다.
 */
const GAME_WINDOW_MAX_MS = 6 * 60 * 60 * 1000;

/** 한국은 서머타임이 없어 KST는 항상 UTC+9다. */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 서버 타임존과 무관하게 KST 기준 날짜("YYYY-MM-DD")와 시·분을 구한다. */
export function toKst(date: Date): {
  date: string;
  hour: number;
  minute: number;
} {
  const shifted = new Date(date.getTime() + KST_OFFSET_MS);
  return {
    date: shifted.toISOString().slice(0, 10),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

/** 5분 간격 크론의 실행 중 기존 매시 정각 스크랩에 해당하는 회차인지. */
export function isEveningHourlySlot(now: Date): boolean {
  const { hour, minute } = toKst(now);
  return minute < 5 && EVENING_HOURS.includes(hour);
}

/**
 * 경기 시작 10분 전부터 FINISHED가 될 때까지(최대 6시간)를 경기 시간대로 본다.
 * FINISHED는 KBO가 최종 스코어와 리뷰 링크를 준 상태라 이후로는 바뀌지 않는다.
 */
export function isInGameWindow(game: Game, now: Date): boolean {
  if (
    game.status === GameStatus.FINISHED ||
    game.status === GameStatus.CANCELLED ||
    game.status === GameStatus.POSTPONED
  ) {
    return false;
  }
  const startsAt = game.scheduledAt.getTime();
  const time = now.getTime();
  return (
    time >= startsAt - GAME_WINDOW_LEAD_MS &&
    time <= startsAt + GAME_WINDOW_MAX_MS
  );
}
