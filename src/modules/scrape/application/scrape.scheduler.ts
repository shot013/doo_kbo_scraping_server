import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { GameService } from '../../game/application/game.service';
import { Game, GameStatus } from '../../game/domain/entities/game.entity';
import {
  EVENING_HOURS,
  isEveningHourlySlot,
  isInGameWindow,
  toKst,
} from './scrape-schedule';
import { ScrapeService } from './scrape.service';

const EVENING_HOURLY_CRON = `0 ${EVENING_HOURS.join(',')} * * *`;
/** 경기 일정·결과 스크랩은 5분마다 깨어나되, 매시 정각 회차와 경기 시간대에만 실제로 요청한다. */
const EVERY_5_MINUTES_CRON = '*/5 * * * *';
const DAY_MS = 24 * 60 * 60 * 1000;
const DAILY_ROSTER_CRON = '0 18 * * *';
/** 가장 이른 경기(14시)보다 앞서 프리뷰(경기 시작 전 데이터)를 미리 받아온다. */
const DAILY_PREVIEW_CRON = '0 9 * * *';
const KST_CRON_OPTIONS = { timeZone: 'Asia/Seoul' };

@Injectable()
export class ScrapeScheduler {
  private readonly logger = new Logger(ScrapeScheduler.name);
  /** 5분 간격 실행이 이전 회차와 겹치지 않도록 진행 중 여부를 기억한다. */
  private gamesScrapeRunning = false;

  constructor(
    private readonly scrapeService: ScrapeService,
    private readonly gameService: GameService,
  ) {}

  /**
   * 매시 정각(17시~다음날 1시)에는 이번 달을, 경기 시간대에는 그 경기가 속한 달을 스크랩한다.
   * 자정을 넘겨 끝나는 월말 경기는 다음 달 목록에 없으므로 경기가 속한 달을 따로 요청해야 한다.
   */
  @Cron(EVERY_5_MINUTES_CRON, KST_CRON_OPTIONS)
  async scrapeGames(): Promise<void> {
    if (this.gamesScrapeRunning) {
      this.logger.warn(
        'previous games scrape is still running, skipping this run',
      );
      return;
    }
    this.gamesScrapeRunning = true;
    try {
      const now = new Date();
      const months = new Map<string, { seasonYear: number; month: string }>();
      if (isEveningHourlySlot(now)) {
        addMonth(months, toKst(now).date);
      }
      for (const game of await this.findGamesInWindow(now)) {
        addMonth(months, game.gameDate);
      }

      for (const { seasonYear, month } of months.values()) {
        try {
          await this.scrapeService.scrapeGames(seasonYear, month);
        } catch (error) {
          this.logger.error(
            `scheduled games scrape failed for ${seasonYear}-${month}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `scheduled games scrape failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.gamesScrapeRunning = false;
    }
  }

  /** 자정을 넘겨 진행 중인 경기도 잡도록 오늘과 어제(KST) 경기를 함께 본다. */
  private async findGamesInWindow(now: Date): Promise<Game[]> {
    const gameDates = [
      toKst(now).date,
      toKst(new Date(now.getTime() - DAY_MS)).date,
    ];
    const games: Game[] = [];
    for (const gameDate of gameDates) {
      const { data } = await this.gameService.findAll({ gameDate, limit: 100 });
      games.push(...data.filter((game) => isInGameWindow(game, now)));
    }
    return games;
  }

  @Cron(DAILY_PREVIEW_CRON, KST_CRON_OPTIONS)
  async scrapeGamePreviews(): Promise<void> {
    const gameDate = new Date().toISOString().slice(0, 10);
    try {
      await this.scrapeService.scrapeGamePreviews(gameDate);
    } catch (error) {
      this.logger.error(
        `scheduled game-preview scrape failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  @Cron(DAILY_ROSTER_CRON, KST_CRON_OPTIONS)
  async scrapeRoster(): Promise<void> {
    try {
      await this.scrapeService.scrapeRoster();
    } catch (error) {
      this.logger.error(
        `scheduled roster scrape failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  @Cron(EVENING_HOURLY_CRON, KST_CRON_OPTIONS)
  async scrapeStandings(): Promise<void> {
    try {
      await this.scrapeService.scrapeStandings(new Date().getFullYear());
    } catch (error) {
      this.logger.error(
        `scheduled standings scrape failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  @Cron(EVENING_HOURLY_CRON, KST_CRON_OPTIONS)
  async scrapeSeasonStats(): Promise<void> {
    try {
      await this.scrapeService.scrapeSeasonStats(new Date().getFullYear());
    } catch (error) {
      this.logger.error(
        `scheduled season-stats scrape failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  @Cron(EVENING_HOURLY_CRON, KST_CRON_OPTIONS)
  async scrapeGameStats(): Promise<void> {
    const gameDate = new Date().toISOString().slice(0, 10);
    let todaysGames: Game[];
    try {
      todaysGames = (await this.gameService.findAll({ gameDate, limit: 100 }))
        .data;
    } catch (error) {
      this.logger.error(
        `scheduled game-stats scrape failed to load games for ${gameDate}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return;
    }

    const targets = todaysGames.filter(
      (game) =>
        game.status === GameStatus.IN_PROGRESS ||
        game.status === GameStatus.FINISHED,
    );

    for (const game of targets) {
      try {
        await this.scrapeService.scrapeGameStats(game.id);
      } catch (error) {
        this.logger.error(
          `scheduled game-stats scrape failed for ${game.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  /**
   * 진행 중인 경기는 이닝 전체를 매시간 다시 받아야 해 비효율적이고, 타자-투수 상대전적은
   * 완료된 경기만으로도 목적을 달성하므로 FINISHED 상태만 대상으로 한다.
   */
  @Cron(EVENING_HOURLY_CRON, KST_CRON_OPTIONS)
  async scrapePlayByPlay(): Promise<void> {
    const gameDate = new Date().toISOString().slice(0, 10);
    let todaysGames: Game[];
    try {
      todaysGames = (await this.gameService.findAll({ gameDate, limit: 100 }))
        .data;
    } catch (error) {
      this.logger.error(
        `scheduled play-by-play scrape failed to load games for ${gameDate}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return;
    }

    const targets = todaysGames.filter(
      (game) => game.status === GameStatus.FINISHED,
    );

    for (const game of targets) {
      try {
        await this.scrapeService.scrapePlayByPlay(game.id);
      } catch (error) {
        this.logger.error(
          `scheduled play-by-play scrape failed for ${game.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
}

/** "YYYY-MM-DD"가 속한 달을 중복 없이 모은다 (같은 달은 한 번만 스크랩). */
function addMonth(
  months: Map<string, { seasonYear: number; month: string }>,
  date: string,
): void {
  const [year, month] = date.split('-');
  months.set(`${year}-${month}`, { seasonYear: Number(year), month });
}
