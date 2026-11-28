export class ScrapeSourceHealthQueryDto {
  sourceName?: string;
  /** `ScrapeStatus` 값. 컨트롤러에서 검증한다. */
  status?: string;
  limit?: string;
}
