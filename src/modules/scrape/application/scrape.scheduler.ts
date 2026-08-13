import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { GameService } from '../../game/application/game.service';
import { Game, GameStatus } from '../../game/domain/entities/game.entity';
import { ScrapeService } from './scrape.service';

const EVENING_HOURLY_CRON = '0 17-23,0,1 * * *';
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
}
