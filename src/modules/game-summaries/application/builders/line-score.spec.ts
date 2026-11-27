import { GameLineScore } from '../../../game-line-scores/domain/entities/game-line-score.entity';
import { AWAY, HOME, buildLineScores } from './__fixtures__/lg-ob-20261126';
import { buildLineScore } from './line-score';

describe('buildLineScore', () => {
  it('원정 → 홈 순서로 이닝 점수와 R/H/E/B를 반환한다', () => {
    const result = buildLineScore(HOME, AWAY, buildLineScores());

    expect(result).toEqual({
      inningCount: 9,
      away: {
        teamCode: AWAY,
        innings: [0, 1, 0, 0, 2, 0, 0, 0, 0],
        runs: 3,
        hits: 8,
        errors: 1,
        walks: 3,
      },
      home: {
        teamCode: HOME,
        innings: [1, 0, 0, 0, 0, 3, 0, 1, null],
        runs: 5,
        hits: 10,
        errors: 0,
        walks: 4,
      },
    });
  });

  it('한 팀이라도 없으면 요약이 없는 것으로 보고 null을 반환한다', () => {
    const [home] = buildLineScores();

    expect(buildLineScore(HOME, AWAY, [home])).toBeNull();
    expect(buildLineScore(HOME, AWAY, [])).toBeNull();
  });

  it('이닝 수는 긴 쪽에 맞추고 짧은 쪽 뒤는 null로 채운다 (연장전)', () => {
    const [home, away] = buildLineScores();
    const extraAway = new GameLineScore({
      ...away,
      innings: [...away.innings, 1],
    });

    const result = buildLineScore(HOME, AWAY, [home, extraAway]);

    expect(result?.inningCount).toBe(10);
    expect(result?.away.innings).toHaveLength(10);
    expect(result?.home.innings).toEqual([1, 0, 0, 0, 0, 3, 0, 1, null, null]);
  });
});
