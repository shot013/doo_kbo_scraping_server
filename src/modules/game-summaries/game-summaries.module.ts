import { Module } from '@nestjs/common';
import { GameModule } from '../game/game.module';
import { GameEventsModule } from '../game-events/game-events.module';
import { GameLineScoresModule } from '../game-line-scores/game-line-scores.module';
import { GameStatsModule } from '../game-stats/game-stats.module';
import { GameSummaryController } from './application/game-summary.controller';
import { GameSummaryService } from './application/game-summary.service';

@Module({
  imports: [
    GameModule,
    GameLineScoresModule,
    GameEventsModule,
    GameStatsModule,
  ],
  controllers: [GameSummaryController],
  providers: [GameSummaryService],
})
export class GameSummariesModule {}
