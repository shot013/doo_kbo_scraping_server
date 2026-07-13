export enum ScrapeStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
}

export interface ScrapeSourceHealthProps {
  id: number;
  sourceName: string;
  targetUrl: string | null;
  status: ScrapeStatus;
  httpStatusCode: number | null;
  durationMs: number | null;
  itemsScraped: number | null;
  errorMessage: string | null;
  scrapedAt: Date;
  createdAt: Date;
}

export class ScrapeSourceHealth {
  readonly id: number;
  readonly sourceName: string;
  readonly targetUrl: string | null;
  readonly status: ScrapeStatus;
  readonly httpStatusCode: number | null;
  readonly durationMs: number | null;
  readonly itemsScraped: number | null;
  readonly errorMessage: string | null;
  readonly scrapedAt: Date;
  readonly createdAt: Date;

  constructor(props: ScrapeSourceHealthProps) {
    Object.assign(this, props);
  }
}
