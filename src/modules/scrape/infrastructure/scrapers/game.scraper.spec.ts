import { readFileSync } from 'fs';
import { join } from 'path';
import { Logger } from '@nestjs/common';
import {
  GameSeries,
  GameStatus,
} from '../../../game/domain/entities/game.entity';
import {
  GameScraper,
  POSTSEASON_SERIES_IDS,
  REGULAR_SERIES_IDS,
  ScrapedGame,
} from './game.scraper';

interface KboScheduleFixture {
  rows: { row: { Text: string }[] }[];
}

/** 실제 KBO GetScheduleList 응답을 저장한 것 (2026시즌). */
function loadFixture(name: string): KboScheduleFixture {
  return JSON.parse(
    readFileSync(join(__dirname, '__fixtures__', name), 'utf8'),
  ) as KboScheduleFixture;
}

const EMPTY_SCHEDULE: KboScheduleFixture = { rows: [] };

/**
 * KBO 일정 요청은 srIdList별 fixture를 돌려주고, 네이버 보정 요청은 실패시켜
 * KBO 응답만으로 파싱 결과를 검증한다 (보정 실패는 warn만 남기고 진행된다).
 */
function mockFetch(bySeriesIds: Record<string, KboScheduleFixture>) {
  return jest.spyOn(global, 'fetch').mockImplementation((input, init) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (!url.includes('GetScheduleList')) {
      return Promise.reject(new Error('naver unavailable in test'));
    }
    const body = typeof init?.body === 'string' ? init.body : '';
    const srIdList = new URLSearchParams(body).get('srIdList') ?? '';
    const data = bySeriesIds[srIdList] ?? EMPTY_SCHEDULE;
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data),
    } as Response);
  });
}

function summarize(game: ScrapedGame) {
  return [
    game.id,
    game.series,
    game.seriesGameNumber,
    game.status,
    `${game.awayTeamCode} ${game.awayScore ?? '-'}:${game.homeScore ?? '-'} ${game.homeTeamCode}`,
  ];
}

describe('GameScraper', () => {
  let scraper: GameScraper;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    scraper = new GameScraper();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  async function scrape(gameMonth: string): Promise<ScrapedGame[]> {
    const promise = scraper.scrape(2026, gameMonth);
    await jest.runAllTimersAsync();
    return promise;
  }

  it('정규시즌과 포스트시즌 일정 목록을 모두 요청한다', async () => {
    const fetchMock = mockFetch({});

    await scrape('10');

    const requestedSeriesIds = fetchMock.mock.calls
      .map(([, init]) => (typeof init?.body === 'string' ? init.body : ''))
      .filter((body) => body.includes('srIdList'))
      .map((body) => new URLSearchParams(body).get('srIdList'));
    expect(requestedSeriesIds).toEqual([
      REGULAR_SERIES_IDS,
      POSTSEASON_SERIES_IDS,
    ]);
  });

  it('포스트시즌 경기를 시리즈·차전과 함께 파싱하고 이동일 행은 건너뛴다', async () => {
    mockFetch({
      [POSTSEASON_SERIES_IDS]: loadFixture(
        'kbo-schedule-2026-10-postseason.json',
      ),
    });

    const games = await scrape('10');

    expect(games.map(summarize)).toEqual([
      [
        '20261014OBLG0',
        GameSeries.WILDCARD,
        1,
        GameStatus.FINISHED,
        'OB 1:4 LG',
      ],
      [
        '20261017LGHT0',
        GameSeries.SEMI_PLAYOFF,
        1,
        GameStatus.FINISHED,
        'LG 1:5 HT',
      ],
      [
        '20261018LGHT0',
        GameSeries.SEMI_PLAYOFF,
        2,
        GameStatus.FINISHED,
        'LG 3:6 HT',
      ],
      [
        '20261020HTLG0',
        GameSeries.SEMI_PLAYOFF,
        3,
        GameStatus.FINISHED,
        'HT 13:1 LG',
      ],
      [
        '20261026HTSS0',
        GameSeries.PLAYOFF,
        1,
        GameStatus.FINISHED,
        'HT 5:1 SS',
      ],
      [
        '20261027HTSS0',
        GameSeries.PLAYOFF,
        2,
        GameStatus.FINISHED,
        'HT 3:8 SS',
      ],
      [
        '20261029SSHT0',
        GameSeries.PLAYOFF,
        3,
        GameStatus.FINISHED,
        'SS 6:4 HT',
      ],
      [
        '20261030SSHT0',
        GameSeries.PLAYOFF,
        4,
        GameStatus.FINISHED,
        'SS 2:4 HT',
      ],
    ]);
  });

  it('진행 중·예정 포스트시즌 경기를 연기로 판정하지 않는다', async () => {
    mockFetch({
      [POSTSEASON_SERIES_IDS]: loadFixture(
        'kbo-schedule-2026-11-postseason.json',
      ),
    });

    const games = await scrape('11');

    expect(games.map(summarize)).toEqual([
      [
        '20261101HTSS0',
        GameSeries.PLAYOFF,
        5,
        GameStatus.FINISHED,
        'HT 1:6 SS',
      ],
      // 진행 중인 경기는 리뷰/프리뷰 링크가 없어 gameId를 날짜+팀코드로 만든다.
      [
        '20261103SSKT0',
        GameSeries.KOREAN_SERIES,
        1,
        GameStatus.IN_PROGRESS,
        'SS 0:0 KT',
      ],
      [
        '20261104SSKT0',
        GameSeries.KOREAN_SERIES,
        2,
        GameStatus.SCHEDULED,
        'SS -:- KT',
      ],
      [
        '20261106KTSS0',
        GameSeries.KOREAN_SERIES,
        3,
        GameStatus.SCHEDULED,
        'KT -:- SS',
      ],
      [
        '20261107KTSS0',
        GameSeries.KOREAN_SERIES,
        4,
        GameStatus.SCHEDULED,
        'KT -:- SS',
      ],
      [
        '20261108KTSS0',
        GameSeries.KOREAN_SERIES,
        5,
        GameStatus.SCHEDULED,
        'KT -:- SS',
      ],
      [
        '20261110SSKT0',
        GameSeries.KOREAN_SERIES,
        6,
        GameStatus.SCHEDULED,
        'SS -:- KT',
      ],
      [
        '20261111SSKT0',
        GameSeries.KOREAN_SERIES,
        7,
        GameStatus.SCHEDULED,
        'SS -:- KT',
      ],
    ]);
  });

  it('정규시즌 경기는 REGULAR로 저장하고, 비고가 있으면 연기로 판정한다', async () => {
    const regular = loadFixture('kbo-schedule-2026-10-regular.json');
    const cells = regular.rows[0].row;
    cells[cells.length - 1] = { Text: '우천취소' };
    mockFetch({ [REGULAR_SERIES_IDS]: regular });

    const games = await scrape('10');

    expect(games).toHaveLength(8);
    expect(
      games.every(
        (game) =>
          game.series === GameSeries.REGULAR && game.seriesGameNumber === null,
      ),
    ).toBe(true);
    expect(games[0].status).toBe(GameStatus.POSTPONED);
    expect(games.slice(1).map((game) => game.status)).toEqual(
      Array(7).fill(GameStatus.FINISHED),
    );
  });

  it('시리즈를 알 수 없는 포스트시즌 행은 정규시즌으로 저장하지 않고 건너뛴다', async () => {
    const postseason = loadFixture('kbo-schedule-2026-10-postseason.json');
    const cells = postseason.rows[0].row;
    cells[cells.length - 1] = { Text: '우천취소' };
    mockFetch({ [POSTSEASON_SERIES_IDS]: postseason });

    const games = await scrape('10');

    expect(games.map((game) => game.id)).not.toContain('20261014OBLG0');
    expect(games).toHaveLength(7);
  });
});
