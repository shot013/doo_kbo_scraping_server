---
name: verify
description: Verify a code change in doo_kbo_scraping_server by running the same checks as CI (format, lint, test). Use before committing or considering a change done, or when asked to verify/check the project builds correctly.
---

# 변경 검증

CI(`.github/workflows/ci.yaml`)와 같은 순서로 실행한다. 하나라도 실패하면 고친 뒤 처음부터 다시 돌린다.

```
npm run format:check   # 실패하면 npm run format 후 재실행
npm run lint:check     # 경고도 실패로 취급한다 (--max-warnings 0)
npm run test
```

- 범위를 좁혀 반복할 때는 `npm run test -- <path> --testNamePattern "<name>"`를 쓰고, 끝내기 전에 전체를 다시 돌린다.
- API 응답 형태가 바뀌는 변경은 정적 검증만으로 부족하다. 로컬 DB가 떠 있으면 `npm run start:dev`로 실제 엔드포인트를 호출해 확인한다.
- 새 마이그레이션을 추가했다면 로컬 DB에 `npm run migration:run`으로 적용되는지 확인한다.
