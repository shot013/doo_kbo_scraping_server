/**
 * 모든 스크래핑 요청에 거는 타임아웃. 대상 사이트가 응답하지 않으면 fetch가 수십 초 넘게
 * 붙잡혀(2026-11 네이버 API 장애 때 요청당 약 60초) 5분 간격 크론 실행이 서로 겹친다.
 */
export const SCRAPE_REQUEST_TIMEOUT_MS = 15 * 1000;
