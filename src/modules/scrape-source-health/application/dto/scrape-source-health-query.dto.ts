import { ScrapeStatus } from '../../domain/entities/scrape-source-health.entity';

export class ScrapeSourceHealthQueryDto {
  sourceName?: string;
  status?: ScrapeStatus;
  limit?: string;
}
