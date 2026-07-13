import { Inject, Injectable } from '@nestjs/common';
import { ScrapeSourceHealth } from '../domain/entities/scrape-source-health.entity';
import {
  LogScrapeAttemptInput,
  SCRAPE_SOURCE_HEALTH_REPOSITORY,
  ScrapeSourceHealthFilter,
} from '../domain/repositories/scrape-source-health.repository';
import type { ScrapeSourceHealthRepository } from '../domain/repositories/scrape-source-health.repository';

@Injectable()
export class ScrapeSourceHealthService {
  constructor(
    @Inject(SCRAPE_SOURCE_HEALTH_REPOSITORY)
    private readonly repository: ScrapeSourceHealthRepository,
  ) {}

  log(entry: LogScrapeAttemptInput): Promise<ScrapeSourceHealth> {
    return this.repository.log(entry);
  }

  findAll(
    filter: ScrapeSourceHealthFilter = {},
  ): Promise<ScrapeSourceHealth[]> {
    return this.repository.findAll(filter);
  }
}
