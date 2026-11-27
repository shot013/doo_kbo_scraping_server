import { readFileSync } from 'fs';
import { join } from 'path';
import { Logger } from '@nestjs/common';
import { GameSeries } from '../../../game/domain/entities/game.entity';
import { PlayerStatType } from '../../../game-stats/domain/entities/game-stat.entity';
import {
  GameStatsScraper,
  parseLineScores,
  ScrapedGameStat,
  toInningsPitched,
} from './game-stats.scraper';
import { NaverBrowserClient } from './naver-browser.client';

/**
 * 실제 네이버 `record` 응답(2026 포스트시즌)에서 스크래퍼가 읽는 필드만 남긴 것.
 * - 20261108KTSS0: 9회말 없음 (홈 SS 12:1 승)
 * - 20261104SSKT0: 12회 연장 (원정 SS 3:2 승)
 */
function loadRecord(gameId: string): unknown {
  return JSON.parse(
    readFileSync(
      join(__dirname, '__fixtures__', `naver-record-${gameId}.json`),
      'utf8',
    ),
  );
}

function createScraper(gameId: string): GameStatsScraper {
  const naver = {
    fetchJson: jest.fn(() => Promise.resolve(loadRecord(gameId))),
  } as unknown as NaverBrowserClient;
  return new GameStatsScraper(naver);
}

function pitchers(stats: ScrapedGameStat[], teamCode: string) {
  return stats
    .filter(
      (stat) =>
        stat.statType === PlayerStatType.PITCHING && stat.teamCode === teamCode,
    )
    .map((stat) => [
      stat.appearanceOrder,
      stat.playerName,
      stat.inningsPitched,
      stat.runsAllowed,
      stat.pitchCount,
    ]);
}

beforeEach(() => {
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('toInningsPitched', () => {
  it.each([
    ['3', '3.0'],
    ['1 ⅓', '1.1'],
    ['0 ⅔', '0.2'],
    ['⅓', '0.1'],
    ['5.2', '5.2'],
    [' 7 ', '7.0'],
  ])('"%s"를 "%s"로 바꾼다', (raw, expected) => {
    expect(toInningsPitched(raw)).toBe(expected);
  });

  it.each(['', '-', '1 ¼', '1.5'])('알 수 없는 값 "%s"는 null', (raw) => {
    expect(toInningsPitched(raw)).toBeNull();
  });
});

describe('parseLineScores', () => {
  const rheb = { r: 1, h: 2, e: 0, b: 1 };

  it('하지 않은 이닝은 null로 채워 두 팀의 이닝 수를 맞춘다', () => {
    const lineScores = parseLineScores(
      {
        inn: { away: [0, 1, 0], home: [1, 0] },
        rheb: { away: rheb, home: { r: 1, h: 3, e: 1, b: 0 } },
      },
      'G',
      'AW',
      'HM',
    );

    expect(lineScores).toEqual([
      {
        gameId: 'G',
        teamCode: 'AW',
        isHome: false,
        innings: [0, 1, 0],
        runs: 1,
        hits: 2,
        errors: 0,
        walks: 1,
      },
      {
        gameId: 'G',
        teamCode: 'HM',
        isHome: true,
        innings: [1, 0, null],
        runs: 1,
        hits: 3,
        errors: 1,
        walks: 0,
      },
    ]);
  });

  it('이닝 값이 숫자가 아니면 그 이닝만 null로 둔다', () => {
    const [away] = parseLineScores(
      {
        inn: { away: [0, '-', 2], home: [0, 0, 0] },
        rheb: { away: rheb, home: rheb },
      },
      'G',
      'AW',
      'HM',
    );

    expect(away.innings).toEqual([0, null, 2]);
  });

  it('점수표가 없거나 R·H·E·B가 숫자가 아니면 빈 배열', () => {
    expect(parseLineScores(undefined, 'G', 'AW', 'HM')).toEqual([]);
    expect(parseLineScores(null, 'G', 'AW', 'HM')).toEqual([]);
    expect(
      parseLineScores(
        {
          inn: { away: [0], home: [0] },
          rheb: { away: rheb, home: { ...rheb, b: null as unknown as number } },
        },
        'G',
        'AW',
        'HM',
      ),
    ).toEqual([]);
  });
});

describe('GameStatsScraper.scrape', () => {
  it('9회말을 하지 않은 경기는 홈팀 마지막 이닝이 null이다', async () => {
    const { lineScores } = await createScraper('20261108KTSS0').scrape(
      '20261108KTSS0',
      GameSeries.KOREAN_SERIES,
    );

    expect(lineScores).toEqual([
      expect.objectContaining({
        teamCode: 'KT',
        isHome: false,
        innings: [0, 0, 1, 0, 0, 0, 0, 0, 0],
        runs: 1,
        hits: 4,
        errors: 2,
        walks: 2,
      }),
      expect.objectContaining({
        teamCode: 'SS',
        isHome: true,
        innings: [0, 0, 3, 0, 8, 0, 0, 1, null],
        runs: 12,
        hits: 14,
        errors: 0,
        walks: 3,
      }),
    ]);
  });

  it('연장 경기는 마지막 연장 이닝까지 담는다', async () => {
    const { lineScores } = await createScraper('20261104SSKT0').scrape(
      '20261104SSKT0',
      GameSeries.KOREAN_SERIES,
    );

    expect(lineScores.map((line) => line.innings)).toEqual([
      [0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
      [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
    ]);
  });

  it('투수는 박스 순서대로 등판 순서를 매기고 실점·투구 수·분수 이닝을 채운다', async () => {
    const { stats } = await createScraper('20261108KTSS0').scrape(
      '20261108KTSS0',
      GameSeries.KOREAN_SERIES,
    );

    expect(pitchers(stats, 'KT')).toEqual([
      [1, '대니엘', '3.0', 3, 66],
      [2, '고영표', '1.1', 8, 36],
      [3, '손동현', '1.2', 0, 26],
      [4, '김정운', '1.0', 0, 16],
      [5, '우규민', '0.2', 1, 11],
      [6, '주권', '0.1', 0, 8],
    ]);
    expect(pitchers(stats, 'SS')).toEqual([
      [1, '원태인', '5.0', 1, 88],
      [2, '페덱', '4.0', 0, 50],
    ]);
  });

  it('타자 행은 투수 전용 값을 비워 둔다', async () => {
    const { stats } = await createScraper('20261108KTSS0').scrape(
      '20261108KTSS0',
      GameSeries.KOREAN_SERIES,
    );
    const batters = stats.filter(
      (stat) => stat.statType === PlayerStatType.BATTING,
    );

    expect(batters.length).toBeGreaterThan(0);
    for (const batter of batters) {
      expect(batter).toMatchObject({
        runsAllowed: null,
        pitchCount: null,
        appearanceOrder: null,
      });
    }
  });
});
