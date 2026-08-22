import { Module } from '@nestjs/common';
import { PlayersModule } from '../players/players.module';
import { SeasonStatsModule } from '../season-stats/season-stats.module';
import { RecordsController } from './application/records.controller';
import { RecordsService } from './application/records.service';

@Module({
  imports: [SeasonStatsModule, PlayersModule],
  controllers: [RecordsController],
  providers: [RecordsService],
})
export class RecordsModule {}
