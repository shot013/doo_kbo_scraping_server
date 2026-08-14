import { Module } from '@nestjs/common';
import { SeasonStatsModule } from '../season-stats/season-stats.module';
import { RecordsController } from './application/records.controller';
import { RecordsService } from './application/records.service';

@Module({
  imports: [SeasonStatsModule],
  controllers: [RecordsController],
  providers: [RecordsService],
})
export class RecordsModule {}
