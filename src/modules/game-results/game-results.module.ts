import { Module } from '@nestjs/common';
import { GameModule } from '../game/game.module';
import { GameStatsModule } from '../game-stats/game-stats.module';
import { GameResultController } from './application/game-result.controller';
import { GameResultService } from './application/game-result.service';

@Module({
  imports: [GameModule, GameStatsModule],
  controllers: [GameResultController],
  providers: [GameResultService],
})
export class GameResultsModule {}
