---
name: verify
description: Verify a code change in doo_kbo_scraping_server by running the same checks as CI (format, lint, test). Use before considering a change done, or when asked to verify/check the project builds correctly.
---

# 변경 검증

CI(`.github/workflows/ci.yaml`)와 동일한 순서로 실행한다:

```
npm run format:check
npm run lint
npm run test
```

- 포맷 체크가 변경이 필요하다고 하면 `npm run format`을 실행해 정리한다.
- `npm run lint`는 경고 없이 통과해야 한다.
- 특정 파일/테스트만 검증하려면 `npm run test -- <path>` 또는 `npm run test -- <path> --testNamePattern "<name>"`을 사용한다.
- API 응답 형태가 바뀌는 변경(예: 페이징 응답 래핑)은 정적 검증만으로 충분하지 않다. 가능하면 `npm run start:dev`로 실제 엔드포인트를 호출해 확인한다.
