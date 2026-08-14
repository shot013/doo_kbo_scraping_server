import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeasonBattingStatService } from './application/season-batting-stat.service';
import { SeasonPitchingStatService } from './application/season-pitching-stat.service';
import { SeasonStatsController } from './application/season-stats.controller';
import { SEASON_BATTING_STAT_REPOSITORY } from './domain/repositories/season-batting-stat.repository';
import { SEASON_PITCHING_STAT_REPOSITORY } from './domain/repositories/season-pitching-stat.repository';
import { SeasonBattingStatOrmEntity } from './infrastructure/orm/season-batting-stat.orm-entity';
import { SeasonPitchingStatOrmEntity } from './infrastructure/orm/season-pitching-stat.orm-entity';
import { SeasonBattingStatRepositoryImpl } from './infrastructure/repositories/season-batting-stat.repository.impl';
import { SeasonPitchingStatRepositoryImpl } from './infrastructure/repositories/season-pitching-stat.repository.impl';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SeasonBattingStatOrmEntity,
      SeasonPitchingStatOrmEntity,
    ]),
  ],
  controllers: [SeasonStatsController],
  providers: [
    SeasonBattingStatService,
    SeasonPitchingStatService,
    {
      provide: SEASON_BATTING_STAT_REPOSITORY,
      useClass: SeasonBattingStatRepositoryImpl,
    },
    {
      provide: SEASON_PITCHING_STAT_REPOSITORY,
      useClass: SeasonPitchingStatRepositoryImpl,
    },
  ],
  exports: [
    SeasonBattingStatService,
    SeasonPitchingStatService,
    SEASON_BATTING_STAT_REPOSITORY,
    SEASON_PITCHING_STAT_REPOSITORY,
  ],
})
export class SeasonStatsModule {}
