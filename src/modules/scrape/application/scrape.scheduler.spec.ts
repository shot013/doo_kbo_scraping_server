import { Logger } from '@nestjs/common';
import { GameService } from '../../game/application/game.service';
import {
  Game,
  GameSeries,
  GameStatus,
} from '../../game/domain/entities/game.entity';
import { GameFilter } from '../../game/domain/repositories/game.repository';
import { ScrapeScheduler } from './scrape.scheduler';
import { ScrapeService } from './scrape.service';

function kst(localDateTime: string): Date {
  return new Date(`${localDateTime}:00+09:00`);
}

function makeGame(scheduledAtKst: string, status: GameStatus): Game {
  const scheduledAt = kst(scheduledAtKst);
  return new Game({
    id: `game-${scheduledAtKst}`,
    seasonYear: 2026,
    gameDate: scheduledAtKst.slice(0, 10),
    scheduledAt,
    stadium: null,
    homeTeamCode: 'KT',
    homeTeamName: 'kt wiz',
    awayTeamCode: 'SS',
    awayTeamName: '삼성 라이온즈',
    homeScore: null,
    awayScore: null,
    homeStarterPitcher: null,
    awayStarterPitcher: null,
    currentInning: null,
    status,
    series: GameSeries.KOREAN_SERIES,
    seriesGameNumber: 1,
    sourceUrl: null,
    createdAt: scheduledAt,
    updatedAt: scheduledAt,
  });
}

describe('ScrapeScheduler.scrapeGames', () => {
  let games: Game[];
  let scrapeGames: jest.Mock<Promise<unknown>, [number, string | undefined]>;
  let warn: jest.SpyInstance;
  let scheduler: ScrapeScheduler;

  beforeEach(() => {
    jest.useFakeTimers();
    warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    games = [];
    scrapeGames = jest
      .fn<Promise<unknown>, [number, string | undefined]>()
      .mockResolvedValue({ itemsScraped: 1 });
    const gameService = {
      findAll: (filter: GameFilter) =>
        Promise.resolve({
          data: games.filter((game) => game.gameDate === filter.gameDate),
        }),
    };
    scheduler = new ScrapeScheduler(
      { scrapeGames } as unknown as ScrapeService,
      gameService as unknown as GameService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  async function runAt(time: string): Promise<void> {
    jest.setSystemTime(kst(time));
    await scheduler.scrapeGames();
  }

  it('경기 시간대도 매시 정각도 아니면 스크랩하지 않는다', async () => {
    games = [makeGame('2026-11-04T18:30', GameStatus.SCHEDULED)];

    await runAt('2026-11-04T16:35');

    expect(scrapeGames).not.toHaveBeenCalled();
  });

  it('경기가 없는 날에도 17시~다음날 1시 정각에는 기존처럼 이번 달을 스크랩한다', async () => {
    await runAt('2026-11-05T17:00');

    expect(scrapeGames).toHaveBeenCalledTimes(1);
    expect(scrapeGames).toHaveBeenCalledWith(2026, '11');
  });

  it('경기 시작 10분 전부터 5분 간격으로 스크랩한다 (14시 낮 경기 포함)', async () => {
    games = [makeGame('2026-11-07T14:00', GameStatus.SCHEDULED)];

    await runAt('2026-11-07T13:45');
    await runAt('2026-11-07T13:50');
    await runAt('2026-11-07T13:55');

    expect(scrapeGames).toHaveBeenCalledTimes(2);
    expect(scrapeGames).toHaveBeenCalledWith(2026, '11');
  });

  it('경기가 FINISHED가 되면 5분 간격 스크랩을 멈춘다', async () => {
    games = [makeGame('2026-11-04T18:30', GameStatus.FINISHED)];

    await runAt('2026-11-04T21:35');

    expect(scrapeGames).not.toHaveBeenCalled();
  });

  it('정각과 경기 시간대가 겹쳐도 같은 달은 한 번만 스크랩한다', async () => {
    games = [makeGame('2026-11-04T18:30', GameStatus.IN_PROGRESS)];

    await runAt('2026-11-04T19:00');

    expect(scrapeGames).toHaveBeenCalledTimes(1);
  });

  it('자정을 넘겨 진행 중인 월말 경기는 그 경기가 속한 달을 스크랩한다', async () => {
    games = [makeGame('2026-10-31T18:30', GameStatus.IN_PROGRESS)];

    // 00시 정각: 이번 달(11월) + 경기 시간대인 전날 경기의 달(10월)
    await runAt('2026-11-01T00:00');
    expect(scrapeGames.mock.calls).toEqual([
      [2026, '11'],
      [2026, '10'],
    ]);

    scrapeGames.mockClear();
    await runAt('2026-11-01T00:10');
    expect(scrapeGames.mock.calls).toEqual([[2026, '10']]);

    // 시작 후 6시간(00:30)이 지나면 FINISHED가 아니어도 더 폴링하지 않는다.
    scrapeGames.mockClear();
    await runAt('2026-11-01T00:35');
    expect(scrapeGames).not.toHaveBeenCalled();
  });

  it('이전 실행이 끝나지 않았으면 이번 회차는 건너뛴다', async () => {
    let finishFirst: () => void = () => undefined;
    let markStarted: () => void = () => undefined;
    const firstStarted = new Promise<void>(
      (resolve) => (markStarted = resolve),
    );
    scrapeGames.mockImplementationOnce(() => {
      markStarted();
      return new Promise((resolve) => (finishFirst = () => resolve({})));
    });
    jest.setSystemTime(kst('2026-11-04T19:00'));

    const first = scheduler.scrapeGames();
    await firstStarted;
    await scheduler.scrapeGames();
    finishFirst();
    await first;

    expect(scrapeGames).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      'previous games scrape is still running, skipping this run',
    );
  });
});
