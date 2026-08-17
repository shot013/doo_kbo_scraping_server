import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeasonStatsModule } from '../season-stats/season-stats.module';
import { PlayerController } from './application/player.controller';
import { PlayerService } from './application/player.service';
import { PLAYER_REPOSITORY } from './domain/repositories/player.repository';
import { PlayerOrmEntity } from './infrastructure/orm/player.orm-entity';
import { PlayerRepositoryImpl } from './infrastructure/repositories/player.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([PlayerOrmEntity]), SeasonStatsModule],
  controllers: [PlayerController],
  providers: [
    PlayerService,
    { provide: PLAYER_REPOSITORY, useClass: PlayerRepositoryImpl },
  ],
  exports: [PlayerService, PLAYER_REPOSITORY],
})
export class PlayersModule {}
