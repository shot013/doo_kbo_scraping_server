import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameStatController } from './application/game-stat.controller';
import { GameStatService } from './application/game-stat.service';
import { GAME_STAT_REPOSITORY } from './domain/repositories/game-stat.repository';
import { GameStatOrmEntity } from './infrastructure/orm/game-stat.orm-entity';
import { GameStatRepositoryImpl } from './infrastructure/repositories/game-stat.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([GameStatOrmEntity])],
  controllers: [GameStatController],
  providers: [
    GameStatService,
    { provide: GAME_STAT_REPOSITORY, useClass: GameStatRepositoryImpl },
  ],
  exports: [GameStatService, GAME_STAT_REPOSITORY],
})
export class GameStatsModule {}
