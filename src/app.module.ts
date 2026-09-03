import { Module } from '@nestjs/common';
import { SentryModule } from '@sentry/nestjs/setup';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './common/database/database.module';
import { ActionLogModule } from './modules/action-log/action-log.module';
import { ExampleModule } from './modules/example/example.module';
import { GameModule } from './modules/game/game.module';
import { GameResultsModule } from './modules/game-results/game-results.module';
import { GameStatsModule } from './modules/game-stats/game-stats.module';
import { PlateAppearancesModule } from './modules/plate-appearances/plate-appearances.module';
import { PlayersModule } from './modules/players/players.module';
import { RecordsModule } from './modules/records/records.module';
import { SeasonStatsModule } from './modules/season-stats/season-stats.module';
import { StandingsModule } from './modules/standings/standings.module';
import { TeamsModule } from './modules/teams/teams.module';
import { ScrapeSourceHealthModule } from './modules/scrape-source-health/scrape-source-health.module';
import { ScrapeModule } from './modules/scrape/scrape.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ttl: config.get<number>('CACHE_TTL_MS', 300000),
      }),
    }),
    DatabaseModule,
    ActionLogModule,
    ExampleModule,
    GameModule,
    GameStatsModule,
    GameResultsModule,
    PlateAppearancesModule,
    PlayersModule,
    StandingsModule,
    TeamsModule,
    RecordsModule,
    SeasonStatsModule,
    ScrapeSourceHealthModule,
    ScrapeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
