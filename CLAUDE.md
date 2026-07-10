# doo_kbo_scraping_server

이 프로젝트는 doo_kbo_harness_kit의 규칙에 따른다.

## 규칙

- **모듈 구조**: 기능별로 모듈을 분리한다 (예: `scrape/`, `game/`, `standings/` 등 도메인 단위 모듈). `AppModule`에 직접 비즈니스 로직을 넣지 않는다.
- **환경변수**: `.env` + `@nestjs/config`로 관리한다. 시크릿/URL을 코드에 하드코딩하지 않는다.
- **스크래핑 예의**: 요청 간 딜레이·재시도 정책을 두고, 대상 사이트에 과도한 부하를 주지 않는다.
- **커밋 전 검증**: `npm run lint`와 `npm test`를 통과한 뒤 커밋한다.
