import { Module } from '@nestjs/common';
import { GameStatsModule } from '../game-stats/game-stats.module';
import { GameModule } from '../game/game.module';
import { ScrapeSourceHealthModule } from '../scrape-source-health/scrape-source-health.module';
import { StandingsModule } from '../standings/standings.module';
import { ScrapeController } from './application/scrape.controller';
import { ScrapeService } from './application/scrape.service';
import { GameStatsScraper } from './infrastructure/scrapers/game-stats.scraper';
import { GameScraper } from './infrastructure/scrapers/game.scraper';
import { StandingsScraper } from './infrastructure/scrapers/standings.scraper';

@Module({
  imports: [
    GameModule,
    GameStatsModule,
    StandingsModule,
    ScrapeSourceHealthModule,
  ],
  controllers: [ScrapeController],
  providers: [ScrapeService, GameScraper, StandingsScraper, GameStatsScraper],
})
export class ScrapeModule {}
