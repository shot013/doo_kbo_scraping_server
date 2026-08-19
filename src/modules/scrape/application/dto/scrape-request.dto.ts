export class ScrapeRequestDto {
  seasonYear?: number;
  /** '01'~'12'. games 스크랩에서만 사용하며, 생략 시 현재(KST) 월을 스크랩한다. */
  gameMonth?: string;
}
