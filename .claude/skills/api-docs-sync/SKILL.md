---
name: api-docs-sync
description: Update README's API docs in the same change when an HTTP endpoint of doo_kbo_scraping_server is added, removed, or changed (path, query/body params, defaults or limits, response fields, scheduler registration, data source). Use whenever a controller, DTO, response mapping, or scrape flow under src/modules changes, and before opening such a PR.
---

# API 문서 동기화

API를 바꾼 같은 브랜치·같은 PR 안에서 문서를 갱신한다. 별도 PR이나 이슈로 미루지 않는다.

1. `git diff develop...HEAD`와 `git diff`로 바뀐 controller, dto, 응답 매핑, scraper/service 흐름을 확인한다.
2. `README.md`의 `## API 목록`에서 해당 모듈 표를 고친다: 경로, Query/Body 파라미터와 기본값·최대값, 응답 필드. `/scrape/*`는 스케줄러 등록 여부와 실행 시각까지 맞춘다.
3. 호출 경로(거치는 service, scraper, 외부 소스)나 저장 방식이 바뀌었으면 `## API 호출 플로우`도 고친다.
4. 공통 값(`common/pagination`의 `DEFAULT_LIMIT`/`MAX_LIMIT`, 기본 정렬 등)을 바꿨다면 `## API 목록` 상단의 공통 설명도 맞춘다.
5. 모듈을 추가·삭제했거나 계층 구조가 바뀌었으면 `docs/ARCHITECTURE.md`의 폴더 구조와 데이터 흐름도 고친다.
