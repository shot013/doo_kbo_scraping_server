import { GameSeries } from '../../../game/domain/entities/game.entity';
import { fromNaverGameId, toNaverGameId } from './naver-game-id';

/** 2026시즌 네이버 일정 API(`/schedule/games`)가 실제로 내려준 gameId. */
const CASES: [string, GameSeries, string][] = [
  ['20261003LGOB0', GameSeries.REGULAR, '20261003LGOB02026'],
  ['20261014OBLG0', GameSeries.WILDCARD, '44441014OBLG02026'],
  ['20261017LGHT0', GameSeries.SEMI_PLAYOFF, '33331017LGHT02026'],
  ['20261026HTSS0', GameSeries.PLAYOFF, '55551026HTSS02026'],
  ['20261104SSKT0', GameSeries.KOREAN_SERIES, '77771104SSKT02026'],
];

describe('naver-game-id', () => {
  it.each(CASES)(
    '%s(%s)를 네이버 gameId %s로 바꾼다',
    (id, series, naverId) => {
      expect(toNaverGameId(id, series)).toBe(naverId);
    },
  );

  it.each(CASES)(
    '네이버 gameId에서 KBO gameId %s를 되찾는다',
    (id, _series, naverId) => {
      expect(fromNaverGameId(naverId)).toBe(id);
    },
  );
});
