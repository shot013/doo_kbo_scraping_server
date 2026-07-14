import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScrapeService } from './scrape.service';

@Injectable()
export class ScrapeScheduler {
  private readonly logger = new Logger(ScrapeScheduler.name);

  constructor(private readonly scrapeService: ScrapeService) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async scrapeGames(): Promise<void> {
    try {
      await this.scrapeService.scrapeGames(new Date().getFullYear());
    } catch (error) {
      this.logger.error(
        `scheduled games scrape failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async scrapeStandings(): Promise<void> {
    try {
      await this.scrapeService.scrapeStandings(new Date().getFullYear());
    } catch (error) {
      this.logger.error(
        `scheduled standings scrape failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
