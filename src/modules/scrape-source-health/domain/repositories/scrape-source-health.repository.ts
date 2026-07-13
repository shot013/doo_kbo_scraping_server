import {
  ScrapeSourceHealth,
  ScrapeStatus,
} from '../entities/scrape-source-health.entity';

export const SCRAPE_SOURCE_HEALTH_REPOSITORY = Symbol(
  'SCRAPE_SOURCE_HEALTH_REPOSITORY',
);

export interface LogScrapeAttemptInput {
  sourceName: string;
  targetUrl: string | null;
  status: ScrapeStatus;
  httpStatusCode: number | null;
  durationMs: number | null;
  itemsScraped: number | null;
  errorMessage: string | null;
  scrapedAt: Date;
}

export interface ScrapeSourceHealthFilter {
  sourceName?: string;
  status?: ScrapeStatus;
  limit?: number;
}

export interface ScrapeSourceHealthRepository {
  log(entry: LogScrapeAttemptInput): Promise<ScrapeSourceHealth>;
  findAll(filter?: ScrapeSourceHealthFilter): Promise<ScrapeSourceHealth[]>;
}
