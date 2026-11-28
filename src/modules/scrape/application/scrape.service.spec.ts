import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GameService } from '../../game/application/game.service';
import {
  Game,
  GameSeries,
  GameStatus,
} from '../../game/domain/entities/game.entity';
import { GameEventService } from '../../game-events/application/game-event.service';
import {
  GameEvent,
  GameEventType,
} from '../../game-events/domain/entities/game-event.entity';
import { GameLineScoreService } from '../../game-line-scores/application/game-line-score.service';
import { GameLineScore } from '../../game-line-scores/domain/entities/game-line-score.entity';
import { GamePreviewService } from '../../game-preview/application/game-preview.service';
import { GameStatService } from '../../game-stats/application/game-stat.service';
import { GameStat } from '../../game-stats/domain/entities/game-stat.entity';
import { PlayerStatType } from '../../game-stats/domain/entities/game-stat.entity';
import { PlateAppearanceService } from '../../plate-appearances/application/plate-appearance.service';
import { PlateAppearanceResult } from '../../plate-appearances/domain/entities/plate-appearance.entity';
import { PlayerService } from '../../players/application/player.service';
import { ScrapeSourceHealthService } from '../../scrape-source-health/application/scrape-source-health.service';
import { SeasonBattingStatService } from '../../season-stats/application/season-batting-stat.service';
import { SeasonPitchingStatService } from '../../season-stats/application/season-pitching-stat.service';
import { StandingService } from '../../standings/application/standing.service';
import { GamePreviewScraper } from '../infrastructure/scrapers/game-preview.scraper';
import {
  GameStatsScraper,
  ScrapedGameRecord,
  ScrapedGameStat,
} from '../infrastructure/scrapers/game-stats.scraper';
import { GameScraper } from '../infrastructure/scrapers/game.scraper';
import {
  PlayByPlayScraper,
  RosterEntry,
  ScrapedPlayByPlay,
} from '../infrastructure/scrapers/play-by-play.scraper';
import { RosterScraper } from '../infrastructure/scrapers/roster.scraper';
import { SeasonStatsScraper } from '../infrastructure/scrapers/season-stats.scraper';
import { StandingsScraper } from '../infrastructure/scrapers/standings.scraper';
import { ScrapeService } from './scrape.service';

const GAME_ID = '20261108KTSS0';

function makeGame(status: GameStatus): Game {
  const now = new Date('2026-11-08T09:00:00Z');
  return new Game({
    id: GAME_ID,
    seasonYear: 2026,
    gameDate: '2026-11-08',
    scheduledAt: now,
    stadium: null,
    homeTeamCode: 'SS',
    homeTeamName: '삼성 라이온즈',
    awayTeamCode: 'KT',
    awayTeamName: 'kt wiz',
    homeScore: null,
    awayScore: null,
    homeStarterPitcher: null,
    awayStarterPitcher: null,
    currentInning: null,
    status,
    series: GameSeries.KOREAN_SERIES,
    seriesGameNumber: 6,
    sourceUrl: null,
    createdAt: now,
    updatedAt: now,
  });
}

const pitcherStat: ScrapedGameStat = {
  gameId: GAME_ID,
  teamCode: 'KT',
  playerName: '대니엘',
  playerId: 56002,
  statType: PlayerStatType.PITCHING,
  atBats: null,
  hits: null,
  rbi: null,
  runs: null,
  battingAverage: null,
  atBatsAgainst: 14,
  inningsPitched: '3.0',
  hitsAllowed: 5,
  earnedRuns: 3,
  strikeoutsPitched: 4,
  walksAllowed: 2,
  homeRunsAllowed: 0,
  win: false,
  loss: true,
  save: false,
  hold: false,
  era: '9.00',
  runsAllowed: 3,
  pitchCount: 66,
  appearanceOrder: 1,
};

const record: ScrapedGameRecord = {
  stats: [pitcherStat],
  lineScores: [
    {
      gameId: GAME_ID,
      teamCode: 'KT',
      isHome: false,
      innings: [0, 0, 1, 0, 0, 0, 0, 0, 0],
      runs: 1,
      hits: 4,
      errors: 2,
      walks: 2,
    },
    {
      gameId: GAME_ID,
      teamCode: 'SS',
      isHome: true,
      innings: [0, 0, 3, 0, 8, 0, 0, 1, null],
      runs: 12,
      hits: 14,
      errors: 0,
      walks: 3,
    },
  ],
};

const playByPlay: ScrapedPlayByPlay = {
  plateAppearances: [
    {
      gameId: GAME_ID,
      inning: 1,
      isTopInning: true,
      sequenceNo: 1,
      batterId: 66606,
      batterTeamCode: 'KT',
      pitcherId: 69446,
      pitcherTeamCode: 'SS',
      resultText: '삼진 아웃',
      result: PlateAppearanceResult.STRIKEOUT,
      hitType: null,
      isAtBat: true,
    },
  ],
  events: [
    {
      gameId: GAME_ID,
      sequenceNo: 1,
      subSequenceNo: 5,
      inning: 1,
      isTopInning: true,
      type: GameEventType.PLATE_APPEARANCE,
      text: '최원준 : 삼진 아웃',
      battingTeamCode: 'KT',
      outs: 1,
      runnerOnFirst: false,
      runnerOnSecond: false,
      runnerOnThird: false,
      homeScore: 0,
      awayScore: 0,
      batterId: 66606,
      pitcherId: 69446,
      inPlayerId: null,
      inPlayerName: null,
      outPlayerId: null,
      outPlayerName: null,
    },
  ],
};

describe('ScrapeService.scrapePlayByPlay', () => {
  let calls: string[];
  let game: Game;
  let scrapeRecord: jest.Mock<Promise<ScrapedGameRecord>, [string, GameSeries]>;
  let scrapePlayByPlay: jest.Mock<
    Promise<ScrapedPlayByPlay>,
    [string, GameSeries, string, string, readonly RosterEntry[]]
  >;
  let upsertStats: jest.Mock<Promise<void>, [GameStat[]]>;
  let findStoredStats: jest.Mock<Promise<GameStat[]>, [string[]]>;
  let replaceEvents: jest.Mock<Promise<void>, [string, GameEvent[]]>;
  let upsertLineScores: jest.Mock<Promise<void>, [GameLineScore[]]>;
  let service: ScrapeService;

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    calls = [];
    game = makeGame(GameStatus.FINISHED);
    const track =
      <T>(name: string, value: T) =>
      () => {
        calls.push(name);
        return Promise.resolve(value);
      };
    scrapeRecord = jest
      .fn<Promise<ScrapedGameRecord>, [string, GameSeries]>()
      .mockImplementation(track('scrapeRecord', record));
    scrapePlayByPlay = jest
      .fn<
        Promise<ScrapedPlayByPlay>,
        [string, GameSeries, string, string, readonly RosterEntry[]]
      >()
      .mockImplementation(track('scrapePlayByPlay', playByPlay));
    upsertStats = jest
      .fn<Promise<void>, [GameStat[]]>()
      .mockImplementation(track('upsertStats', undefined));
    findStoredStats = jest
      .fn<Promise<GameStat[]>, [string[]]>()
      .mockImplementation(track('findStoredStats', [] as GameStat[]));
    replaceEvents = jest
      .fn<Promise<void>, [string, GameEvent[]]>()
      .mockImplementation(track('replaceEvents', undefined));
    upsertLineScores = jest
      .fn<Promise<void>, [GameLineScore[]]>()
      .mockImplementation(track('upsertLineScores', undefined));

    const unused = [
      GameScraper,
      GamePreviewScraper,
      StandingsScraper,
      RosterScraper,
      SeasonStatsScraper,
      GamePreviewService,
      StandingService,
      PlayerService,
      SeasonBattingStatService,
      SeasonPitchingStatService,
    ].map((provide) => ({ provide, useValue: {} }));
    const moduleRef = await Test.createTestingModule({
      providers: [
        ScrapeService,
        ...unused,
        { provide: GameStatsScraper, useValue: { scrape: scrapeRecord } },
        { provide: PlayByPlayScraper, useValue: { scrape: scrapePlayByPlay } },
        {
          provide: GameService,
          useValue: { findById: () => Promise.resolve(game) },
        },
        {
          provide: GameStatService,
          useValue: { upsertMany: upsertStats, findByGameIds: findStoredStats },
        },
        {
          provide: PlateAppearanceService,
          useValue: {
            upsertMany: track('upsertPlateAppearances', undefined),
          },
        },
        {
          provide: GameEventService,
          useValue: { replaceByGameId: replaceEvents },
        },
        {
          provide: GameLineScoreService,
          useValue: { upsertMany: upsertLineScores },
        },
        {
          provide: ScrapeSourceHealthService,
          useValue: { log: () => Promise.resolve({}) },
        },
      ],
    }).compile();
    service = moduleRef.get(ScrapeService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  async function run(): Promise<unknown> {
    const pending = service.scrapePlayByPlay(GAME_ID);
    await jest.runAllTimersAsync();
    return pending;
  }

  it('종료 경기는 박스스코어 → 타석 → 이벤트 → 점수표 순으로 저장한다', async () => {
    await expect(run()).resolves.toMatchObject({ itemsScraped: 1 });

    expect(calls).toEqual([
      'scrapeRecord',
      'upsertStats',
      'scrapePlayByPlay',
      'upsertPlateAppearances',
      'replaceEvents',
      'upsertLineScores',
    ]);
    expect(scrapePlayByPlay.mock.calls[0][4]).toBe(record.stats);
    expect(upsertStats.mock.calls[0][0][0]).toMatchObject({
      runsAllowed: 3,
      pitchCount: 66,
      appearanceOrder: 1,
    });
    expect(replaceEvents.mock.calls[0][0]).toBe(GAME_ID);
    expect(replaceEvents.mock.calls[0][1][0]).toMatchObject({
      id: 0,
      seasonYear: 2026,
      type: GameEventType.PLATE_APPEARANCE,
      subSequenceNo: 5,
    });
    expect(upsertLineScores.mock.calls[0][0]).toEqual([
      expect.objectContaining({ teamCode: 'KT', isHome: false, runs: 1 }),
      expect.objectContaining({
        teamCode: 'SS',
        isHome: true,
        innings: [0, 0, 3, 0, 8, 0, 0, 1, null],
      }),
    ]);
  });

  it('종료되지 않은 경기는 점수표를 저장하지 않는다', async () => {
    game = makeGame(GameStatus.IN_PROGRESS);

    await run();

    expect(calls).toContain('replaceEvents');
    expect(upsertLineScores).not.toHaveBeenCalled();
  });

  it('이벤트 저장이 실패하면 점수표를 저장하지 않는다', async () => {
    replaceEvents.mockRejectedValueOnce(new Error('db down'));

    await expect(run()).resolves.toMatchObject({ itemsScraped: 1 });

    expect(upsertLineScores).not.toHaveBeenCalled();
  });

  it('박스스코어를 받지 못하면 저장된 기록으로 이름을 맞추고 점수표는 저장하지 않는다', async () => {
    scrapeRecord.mockRejectedValueOnce(new Error('naver timeout'));

    await run();

    expect(findStoredStats).toHaveBeenCalledWith([GAME_ID]);
    expect(upsertStats).not.toHaveBeenCalled();
    expect(calls).toContain('replaceEvents');
    expect(upsertLineScores).not.toHaveBeenCalled();
  });

  it('이벤트가 하나도 없으면 기존 이벤트를 지우지 않고 점수표도 저장하지 않는다', async () => {
    scrapePlayByPlay.mockResolvedValueOnce({ ...playByPlay, events: [] });

    await run();

    expect(replaceEvents).not.toHaveBeenCalled();
    expect(upsertLineScores).not.toHaveBeenCalled();
  });
});
