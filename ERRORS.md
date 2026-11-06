# ERRORS.md

반복되거나 원인 파악에 시간이 걸렸던 에러/장애를 기록하는 문서입니다.
같은 문제를 다시 겪을 때 검색해서 바로 해결하는 것이 목적입니다.

작성 규칙:
- 사소하거나 한 번에 해결된 오타/타입 에러는 기록하지 않습니다.
- 재발 가능성이 있거나, 원인이 코드만 봐서는 바로 안 보이는 경우에 기록합니다.
- 아래 항목을 포함합니다: 증상 → 원인 → 해결 방법 → (선택) 재발 방지.

## 템플릿

```
### [YYYY-MM-DD] 에러 제목

**증상**: 무엇이 어떻게 실패했는지 (에러 메시지, 재현 조건)

**원인**: 근본 원인

**해결**: 실제로 어떻게 고쳤는지

**재발 방지**: (선택) 린트 규칙 추가, 테스트 추가 등
```

---

### [2026-11-06] 포스트시즌 경기의 박스스코어·타석 데이터가 전혀 저장되지 않음

**증상**: 포스트시즌 경기의 `game_stats`/`plate_appearances`가 0건. `scrape_source_health`에는 `naver-box-score`/`naver-play-by-play`가 `The operation was aborted due to timeout`(11/03~04)으로 실패. 경기 중 실시간 스코어도 갱신되지 않음.

**원인**: 네이버 gameId는 포스트시즌일 때 앞 4자리 연도 자리를 시리즈 SR_ID ×4(WC `4444`, 준PO `3333`, PO `5555`, KS `7777`)로 바꾼다(`20261104SSKT0` → `77771104SSKT02026`). 코드는 정규시즌 규칙(연도 뒤에 붙이기)만 써서 404가 났다. 11/03~04에는 네이버 장애로 timeout이 먼저 나서 404가 가려졌다.

**해결**: `scrapers/naver-game-id.ts`의 `toNaverGameId(gameId, series)`/`fromNaverGameId()`로 변환을 모았다. 박스스코어·문자중계·실시간 스코어 보정이 모두 이 함수를 쓴다.

**재발 방지**: 네이버 요청이 실패하면 `GET /schedule/games?fromDate=..&toDate=..&categoryId=kbo`로 실제 gameId부터 확인한다. 로컬 PC에서는 네이버가 timeout인데 EC2에서는 정상일 수 있으니 EC2에서도 확인한다.

### [2026-11-03] `format-on-save` 훅이 아무 파일도 포맷하지 않음

**증상**: Claude Code로 `.ts` 파일을 수정해도 prettier가 적용되지 않고, 포맷 위반이 `npm run format:check`/lint 단계에서야 드러남. 훅 자체는 에러 없이 끝남.

**원인**: 훅이 `command -v prettier`로 prettier를 찾았는데, prettier는 devDependency라 `node_modules/.bin`에만 있고 전역 PATH에는 없다. 찾지 못하면 `exit 0`으로 조용히 빠져나가도록 작성돼 있었다.

**해결**: `$CLAUDE_PROJECT_DIR/node_modules/.bin/prettier`를 직접 실행하고, PATH 확인은 shim이 필요로 하는 `node`에 대해서만 한다.

**재발 방지**: 훅을 추가·수정하면 JSON 입력을 직접 만들어 넣어 실제 동작(차단/포맷 결과)을 확인한다. fail-open 훅은 실패해도 아무 신호가 없다.

### [2026-08-23] `/records/batters`, `/records/pitchers`의 `playerId`가 특정 선수만 null

**증상**: `/records/batters`, `/records/pitchers` 응답 중 일부 항목의 `playerId`가 `null`로 내려옴 (예: LT 황성빈).

**원인**: `records.service.ts`는 `teamCode + playerName` 키로 `players` 테이블(로스터 스크래핑 결과, `roster.scraper.ts`)에서 `playerId`를 찾는다. 시즌 기록(`season-stats`)에는 해당 선수가 팀 소속으로 집계되지만, KBO 공식 로스터 검색 페이지(`Player/Search.aspx`, `ROSTER_SOURCE_URL`)에는 그 선수가 없는 경우가 있다 (상무/군 복무 등으로 1군 로스터 검색에서 빠지는 사례로 추정). 매칭 로직이나 스크래퍼 버그가 아니라 KBO 소스 데이터 자체의 결손이며, `records.service.ts`의 `?? null` 폴백은 설계대로 동작한 것.

**확인 방법**: 운영 서버 API를 직접 호출해 null 비율을 확인(타자 30명 중 1명만 null, 투수는 0명)한 뒤, `roster.scraper.ts`와 동일한 폼 제출 로직으로 KBO `Player/Search.aspx`를 LT 팀으로 직접 조회해 5페이지(100명) 전체에 해당 선수가 없음을 재현 — 스크래퍼 파싱 문제가 아니라 소스 페이지 자체의 누락임을 확인.

**해결**: 코드 수정 없음. 정상적으로 발생 가능한 케이스(로스터 미등록 선수)로 판단.

**재발 방지**: `playerId: null`은 "로스터 검색에 없는 선수"에 대한 정상 폴백이다. 이 케이스가 잦아지면 로스터 소스를 보강하거나(예: 말소/군복무 선수 별도 매핑) 프론트에서 null을 별도 처리하는 방안을 검토.
