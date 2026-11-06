import { Logger } from '@nestjs/common';
import {
  Game,
  GameSeries,
  GameStatus,
} from '../../game/domain/entities/game.entity';
import { ScrapeStatus } from '../../scrape-source-health/domain/entities/scrape-source-health.entity';
import { ScrapeService } from './scrape.service';

function makeGame(id: string): Game {
  const scheduledAt = new Date('2026-11-04T09:30:00Z');
  return new Game({
    id,
    seasonYear: 2026,
    gameDate: '2026-11-04',
    scheduledAt,
    stadium: null,
    homeTeamCode: 'KT',
    homeTeamName: 'kt wiz',
    awayTeamCode: 'SS',
    awayTeamName: '삼성 라이온즈',
    homeScore: 3,
    awayScore: 2,
    homeStarterPitcher: null,
    awayStarterPitcher: null,
    currentInning: null,
    status: GameStatus.FINISHED,
    series: GameSeries.KOREAN_SERIES,
    seriesGameNumber: 1,
    sourceUrl: null,
    createdAt: scheduledAt,
    updatedAt: scheduledAt,
  });
}

describe('ScrapeService.scrapeMissingGameData', () => {
  let games: Game[];
  let gameIdsWithStats: string[];
  let gameIdsWithPlateAppearances: string[];
  let calls: string[];
  let failingStatGameIds: Set<string>;
  let log: jest.Mock<Promise<void>, [{ status: ScrapeStatus }]>;
  let service: ScrapeService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    games = [];
    gameIdsWithStats = [];
    gameIdsWithPlateAppearances = [];
    calls = [];
    failingStatGameIds = new Set();
    log = jest
      .fn<Promise<void>, [{ status: ScrapeStatus }]>()
      .mockResolvedValue(undefined);

    const gameStatsScraper = {
      scrape: (gameId: string) => {
        calls.push(`stats:${gameId}`);
        return failingStatGameIds.has(gameId)
          ? Promise.reject(
              new Error('The operation was aborted due to timeout'),
            )
          : Promise.resolve([{ gameId }]);
      },
    };
    const playByPlayScraper = {
      scrape: (gameId: string) => {
        calls.push(`pbp:${gameId}`);
        return Promise.resolve([{ gameId, batterId: null, pitcherId: null }]);
      },
    };
    const gameService = {
      findAll: () => Promise.resolve({ data: games }),
    };
    const gameStatService = {
      findSavedGameIds: () => Promise.resolve(gameIdsWithStats),
      findByGameIds: () => Promise.resolve([]),
      upsertMany: () => Promise.resolve(),
    };
    const plateAppearanceService = {
      findSavedGameIds: () => Promise.resolve(gameIdsWithPlateAppearances),
      upsertMany: () => Promise.resolve(),
    };

    service = new ScrapeService(
      {} as never,
      {} as never,
      {} as never,
      gameStatsScraper as never,
      playByPlayScraper as never,
      {} as never,
      {} as never,
      gameService as never,
      {} as never,
      {} as never,
      gameStatService as never,
      plateAppearanceService as never,
      {} as never,
      {} as never,
      {} as never,
      { log } as never,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  /** 요청 간 딜레이(setTimeout)를 흘려보내며 실행하고, 실패하면 그 에러를 돌려준다. */
  async function run(): Promise<unknown> {
    const result = service
      .scrapeMissingGameData(2026)
      .catch((error: unknown) => error);
    await jest.runAllTimersAsync();
    return result;
  }

  it('박스스코어나 타석이 빠진 경기만 박스스코어 → 타석 순으로 받는다', async () => {
    games = [makeGame('complete'), makeGame('empty'), makeGame('no-pa')];
    gameIdsWithStats = ['complete', 'no-pa'];
    gameIdsWithPlateAppearances = ['complete'];

    const result = await run();

    expect(calls).toEqual(['stats:empty', 'pbp:empty', 'pbp:no-pa']);
    expect(result).toEqual(expect.objectContaining({ itemsScraped: 3 }));
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ScrapeStatus.SUCCESS,
        errorMessage: null,
      }),
    );
  });

  it('박스스코어를 받지 못한 경기는 타석을 받지 않고 다음 경기로 넘어간다', async () => {
    games = [makeGame('fails'), makeGame('ok')];
    failingStatGameIds = new Set(['fails']);

    await run();

    expect(calls).toEqual(['stats:fails', 'stats:ok', 'pbp:ok']);
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ScrapeStatus.SUCCESS,
        errorMessage: '1/2 games failed (see server logs)',
      }),
    );
  });

  it('연속 2경기가 실패하면 네이버가 응답하지 않는 것으로 보고 멈춘다', async () => {
    games = [makeGame('a'), makeGame('b'), makeGame('c')];
    failingStatGameIds = new Set(['a', 'b', 'c']);

    const error = await run();

    expect(calls).toEqual(['stats:a', 'stats:b']);
    expect(error).toEqual(
      new Error(
        'Stopped after 2 consecutive failed games; 3/3 games still missing data',
      ),
    );
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ status: ScrapeStatus.FAILURE }),
    );
  });

  it('빠진 경기가 없으면 요청도 상태 기록도 하지 않는다', async () => {
    games = [makeGame('complete')];
    gameIdsWithStats = ['complete'];
    gameIdsWithPlateAppearances = ['complete'];

    await run();

    expect(calls).toEqual([]);
    expect(log).not.toHaveBeenCalled();
  });
});
