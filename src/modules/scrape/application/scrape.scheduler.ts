import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { GameService } from '../../game/application/game.service';
import { Game, GameStatus } from '../../game/domain/entities/game.entity';
import { ScrapeService } from './scrape.service';

const EVENING_HOURLY_CRON = '0 17-23,0,1 * * *';
const DAILY_ROSTER_CRON = '0 18 * * *';
/** 가장 이른 경기(14시)보다 앞서 프리뷰(경기 시작 전 데이터)를 미리 받아온다. */
const DAILY_PREVIEW_CRON = '0 9 * * *';
const KST_CRON_OPTIONS = { timeZone: 'Asia/Seoul' };

@Injectable()
export class ScrapeScheduler {
  private readonly logger = new Logger(ScrapeScheduler.name);

  constructor(
    private readonly scrapeService: ScrapeService,
    private readonly gameService: GameService,
  ) {}

  @Cron(EVENING_HOURLY_CRON, KST_CRON_OPTIONS)
  async scrapeGames(): Promise<void> {
    try {
      await this.scrapeService.scrapeGames(new Date().getFullYear());
    } catch (error) {
      this.logger.error(
        `scheduled games scrape failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
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
