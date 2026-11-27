import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameLineScoreService } from './application/game-line-score.service';
import { GAME_LINE_SCORE_REPOSITORY } from './domain/repositories/game-line-score.repository';
import { GameLineScoreOrmEntity } from './infrastructure/orm/game-line-score.orm-entity';
import { GameLineScoreRepositoryImpl } from './infrastructure/repositories/game-line-score.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([GameLineScoreOrmEntity])],
  providers: [
    GameLineScoreService,
    {
      provide: GAME_LINE_SCORE_REPOSITORY,
      useClass: GameLineScoreRepositoryImpl,
    },
  ],
  exports: [GameLineScoreService],
})
export class GameLineScoresModule {}
