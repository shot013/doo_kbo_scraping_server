import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScrapeSourceHealthController } from './application/scrape-source-health.controller';
import { ScrapeSourceHealthService } from './application/scrape-source-health.service';
import { SCRAPE_SOURCE_HEALTH_REPOSITORY } from './domain/repositories/scrape-source-health.repository';
import { ScrapeSourceHealthOrmEntity } from './infrastructure/orm/scrape-source-health.orm-entity';
import { ScrapeSourceHealthRepositoryImpl } from './infrastructure/repositories/scrape-source-health.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([ScrapeSourceHealthOrmEntity])],
  controllers: [ScrapeSourceHealthController],
  providers: [
    ScrapeSourceHealthService,
    {
      provide: SCRAPE_SOURCE_HEALTH_REPOSITORY,
      useClass: ScrapeSourceHealthRepositoryImpl,
    },
  ],
  exports: [ScrapeSourceHealthService, SCRAPE_SOURCE_HEALTH_REPOSITORY],
})
export class ScrapeSourceHealthModule {}
