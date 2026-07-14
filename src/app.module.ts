import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './common/database/database.module';
import { ExampleModule } from './modules/example/example.module';
import { GameModule } from './modules/game/game.module';
import { GameStatsModule } from './modules/game-stats/game-stats.module';
import { StandingsModule } from './modules/standings/standings.module';
import { ScrapeSourceHealthModule } from './modules/scrape-source-health/scrape-source-health.module';
import { ScrapeModule } from './modules/scrape/scrape.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    ExampleModule,
    GameModule,
    GameStatsModule,
    StandingsModule,
    ScrapeSourceHealthModule,
    ScrapeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
