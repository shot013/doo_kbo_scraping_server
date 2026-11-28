import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GameService } from '../../game/application/game.service';
import {
  Game,
  GameSeries,
  GameStatus,
} from '../../game/domain/entities/game.entity';
import { GameEventService } from '../../game-events/application/game-event.service';
import { GameLineScoreService } from '../../game-line-scores/application/game-line-score.service';
import { GamePreviewService } from '../../game-preview/application/game-preview.service';
import { GameStatService } from '../../game-stats/application/game-stat.service';
import { PlateAppearanceService } from '../../plate-appearances/application/plate-appearance.service';
import { PlayerService } from '../../players/application/player.service';
import { ScrapeSourceHealthService } from '../../scrape-source-health/application/scrape-source-health.service';
import { SeasonBattingStatService } from '../../season-stats/application/season-batting-stat.service';
import { SeasonPitchingStatService } from '../../season-stats/application/season-pitching-stat.service';
import { StandingService } from '../../standings/application/standing.service';
import { GamePreviewScraper } from '../infrastructure/scrapers/game-preview.scraper';
import { GameStatsScraper } from '../infrastructure/scrapers/game-stats.scraper';
import {
  GameScraper,
  ScrapedGame,
} from '../infrastructure/scrapers/game.scraper';
import { PlayByPlayScraper } from '../infrastructure/scrapers/play-by-play.scraper';
import { RosterScraper } from '../infrastructure/scrapers/roster.scraper';
import { SeasonStatsScraper } from '../infrastructure/scrapers/season-stats.scraper';
import { StandingsScraper } from '../infrastructure/scrapers/standings.scraper';
import { ScrapeService } from './scrape.service';

function scrapedGame(
  id: string,
  gameDate: string,
  status: GameStatus,
  series = GameSeries.KOREAN_SERIES,
): ScrapedGame {
  return {
    id,
    gameDate,
    scheduledAt: new Date(`${gameDate}T18:30:00+09:00`),
    stadium: null,
    homeTeamCode: 'KT',
    homeTeamName: 'kt wiz',
    awayTeamCode: 'SS',
    awayTeamName: '삼성 라이온즈',
    homeScore: null,
    awayScore: null,
    homeStarterPitcher: null,
    awayStarterPitcher: null,
    status,
    series,
    seriesGameNumber: 1,
    sourceUrl: 'https://www.koreabaseball.com/Schedule/Schedule.aspx',
  };
}

function storedGame(item: ScrapedGame): Game {
  return new Game({
    ...item,
    seasonYear: 2026,
    currentInning: null,
    createdAt: item.scheduledAt,
    updatedAt: item.scheduledAt,
  });
}

/** KBO가 시리즈 종료 뒤 목록에서 뺀 KS 6·7차전 (실측: 11월 목록에 5차전까지만 남음). */
const KS6 = scrapedGame('20261110SSKT0', '2026-11-10', GameStatus.SCHEDULED);
const KS7 = scrapedGame('20261111SSKT0', '2026-11-11', GameStatus.SCHEDULED);
const KS5 = scrapedGame('20261108KTSS0', '2026-11-08', GameStatus.FINISHED);

describe('ScrapeService.scrapeGames 열리지 않은 포스트시즌 경기 정리', () => {
  let scraped: ScrapedGame[];
  let stored: Game[];
  let upsert: jest.Mock<Promise<Game>, [Game]>;
  let service: ScrapeService;

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-28T20:00:00+09:00'));
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    scraped = [KS5];
    stored = [storedGame(KS6), storedGame(KS7)];
    upsert = jest
      .fn<Promise<Game>, [Game]>()
      .mockImplementation((game) => Promise.resolve(game));

    const unused = [
      GamePreviewScraper,
      StandingsScraper,
      GameStatsScraper,
      PlayByPlayScraper,
      RosterScraper,
      SeasonStatsScraper,
      GamePreviewService,
      StandingService,
      GameStatService,
      PlateAppearanceService,
      GameEventService,
      GameLineScoreService,
      PlayerService,
      SeasonBattingStatService,
      SeasonPitchingStatService,
    ].map((provide) => ({ provide, useValue: {} }));
    const moduleRef = await Test.createTestingModule({
      providers: [
        ScrapeService,
        ...unused,
        {
          provide: GameScraper,
          useValue: { scrape: () => Promise.resolve(scraped) },
        },
        {
          provide: GameService,
          useValue: {
            upsertMany: () => Promise.resolve(),
            upsert,
            findAll: () => Promise.resolve({ data: stored }),
          },
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

  it('KBO 목록에서 빠진, 날짜가 지난 예정 포스트시즌 경기를 취소로 바꾼다', async () => {
    await service.scrapeGames(2026, '11');

    expect(upsert.mock.calls.map(([game]) => [game.id, game.status])).toEqual([
      ['20261110SSKT0', GameStatus.CANCELLED],
      ['20261111SSKT0', GameStatus.CANCELLED],
    ]);
  });

  it('목록에 남아 있거나 아직 날짜가 오지 않은 경기는 건드리지 않는다', async () => {
    jest.setSystemTime(new Date('2026-11-11T09:00:00+09:00'));
    scraped = [KS5, KS6];

    await service.scrapeGames(2026, '11');

    // KS6는 목록에 있고, KS7은 아직 경기일이 아니다.
    expect(upsert).not.toHaveBeenCalled();
  });

  it('정규시즌 경기와 다른 달 경기는 대상이 아니다', async () => {
    stored = [
      storedGame(
        scrapedGame(
          '20261020LTHH0',
          '2026-10-20',
          GameStatus.SCHEDULED,
          GameSeries.REGULAR,
        ),
      ),
      storedGame(
        scrapedGame(
          '20261103SSKT0',
          '2026-11-03',
          GameStatus.SCHEDULED,
          GameSeries.REGULAR,
        ),
      ),
      storedGame(
        scrapedGame('20261031HTSS0', '2026-10-31', GameStatus.SCHEDULED),
      ),
    ];

    await service.scrapeGames(2026, '11');

    expect(upsert).not.toHaveBeenCalled();
  });

  it('그 달 포스트시즌 경기를 하나도 받지 못하면 정리하지 않는다', async () => {
    scraped = [
      scrapedGame(
        '20261101LTHH0',
        '2026-11-01',
        GameStatus.FINISHED,
        GameSeries.REGULAR,
      ),
    ];

    await service.scrapeGames(2026, '11');

    expect(upsert).not.toHaveBeenCalled();
  });
});
