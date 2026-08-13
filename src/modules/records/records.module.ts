import { Module } from '@nestjs/common';
import { GameStatsModule } from '../game-stats/game-stats.module';
import { RecordsController } from './application/records.controller';
import { RecordsService } from './application/records.service';

@Module({
  imports: [GameStatsModule],
  controllers: [RecordsController],
  providers: [RecordsService],
})
export class RecordsModule {}
