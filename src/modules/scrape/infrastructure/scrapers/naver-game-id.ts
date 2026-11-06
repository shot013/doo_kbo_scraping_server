import { GameSeries } from '../../../game/domain/entities/game.entity';

/**
 * 네이버 스포츠 gameId는 KBO gameId 뒤에 시즌 연도를 붙인 형식인데, 포스트시즌은 앞 4자리
 * 연도 자리에 KBO 시리즈 SR_ID(4=WC, 3=준PO, 5=PO, 7=KS)를 네 번 반복해 넣는다.
 *   정규시즌 "20261003LGOB0" -> "20261003LGOB02026"
 *   KS       "20261104SSKT0" -> "77771104SSKT02026"
 */
const NAVER_PREFIX_BY_SERIES: Record<GameSeries, string | null> = {
  [GameSeries.REGULAR]: null,
  [GameSeries.WILDCARD]: '4444',
  [GameSeries.SEMI_PLAYOFF]: '3333',
  [GameSeries.PLAYOFF]: '5555',
  [GameSeries.KOREAN_SERIES]: '7777',
};

export function toNaverGameId(gameId: string, series: GameSeries): string {
  const year = gameId.slice(0, 4);
  return `${NAVER_PREFIX_BY_SERIES[series] ?? year}${gameId.slice(4)}${year}`;
}

/** 끝 4자리(시즌 연도)를 앞 4자리 자리로 되돌린다. 정규시즌·포스트시즌 모두 같은 규칙이다. */
export function fromNaverGameId(naverGameId: string): string {
  return `${naverGameId.slice(-4)}${naverGameId.slice(4, -4)}`;
}
