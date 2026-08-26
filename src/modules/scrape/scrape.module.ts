import { Module } from '@nestjs/common';
import { GameStatsModule } from '../game-stats/game-stats.module';
import { GameModule } from '../game/game.module';
import { PlateAppearancesModule } from '../plate-appearances/plate-appearances.module';
import { PlayersModule } from '../players/players.module';
import { ScrapeSourceHealthModule } from '../scrape-source-health/scrape-source-health.module';
import { SeasonStatsModule } from '../season-stats/season-stats.module';
import { StandingsModule } from '../standings/standings.module';
import { ScrapeController } from './application/scrape.controller';
import { ScrapeScheduler } from './application/scrape.scheduler';
import { ScrapeService } from './application/scrape.service';
import { GameStatsScraper } from './infrastructure/scrapers/game-stats.scraper';
import { GameScraper } from './infrastructure/scrapers/game.scraper';
import { PlayByPlayScraper } from './infrastructure/scrapers/play-by-play.scraper';
import { RosterScraper } from './infrastructure/scrapers/roster.scraper';
import { SeasonStatsScraper } from './infrastructure/scrapers/season-stats.scraper';
import { StandingsScraper } from './infrastructure/scrapers/standings.scraper';

@Module({
  imports: [
    GameModule,
    GameStatsModule,
    PlateAppearancesModule,
    PlayersModule,
    StandingsModule,
    SeasonStatsModule,
    ScrapeSourceHealthModule,
  ],
  controllers: [ScrapeController],
  providers: [
    ScrapeService,
    ScrapeScheduler,
    GameScraper,
    StandingsScraper,
    GameStatsScraper,
    PlayByPlayScraper,
    RosterScraper,
    SeasonStatsScraper,
  ],
})
export class ScrapeModule {}
