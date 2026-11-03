# Claude Code 작업 방식

이 저장소를 Claude Code로 열면 `.claude/`와 `CLAUDE.md`의 설정을 자동으로 읽어들입니다.
새로 합류한 팀원이 아래 규칙들을 따로 외울 필요는 없습니다 — 대부분은 Claude Code가
알아서 지키거나 훅이 기계적으로 강제합니다. 이 문서는 "지금 뭐가 자동으로 돌아가고
있는지"를 파악하기 위한 사람용 참고 문서이며, Claude의 컨텍스트에는 로드되지 않습니다.

## 준비: 하네스 키트 clone

공통 규칙은 별도 저장소인 [doo_kbo_harness_kit](https://github.com/shot013/doo_kbo_harness_kit)에
있습니다. 저장소 루트에서 한 번 clone해 두세요 (`.gitignore` 대상이라 커밋되지 않습니다).

```
git clone https://github.com/shot013/doo_kbo_harness_kit.git
```

키트가 없으면 세션 시작 시 `check-kit` 훅이 경고를 띄우고, 키트 공통 규칙 없이 세션이 시작됩니다.

## 규칙 계층

규칙은 위에서 아래로 적용되며, 하위는 상위를 구체화만 하고 뒤집지 않습니다. 같은 규칙은
한 곳에만 둡니다 — 위 계층에 있는 내용은 아래 계층에서 다시 적지 않고 참조합니다.

| 단계 | 위치 | 담는 것 |
|---|---|---|
| 0. 키트 공통 규칙 | `doo_kbo_harness_kit/KIT_RULES.md` (`CLAUDE.md` 맨 위에서 `@` import) | 모든 프로젝트 공통: 규칙을 둘 자리, `MEMORY.md`/`ERRORS.md` 읽는 법, PR base(`develop`)·PR 단위·커밋 전 검증·충돌 확인 |
| 1. 프로젝트 최상위 | `CLAUDE.md` | 명령어, 아키텍처 요약, 여러 하위 파일이 공통으로 전제하는 규칙(계층 import 방향, 모듈 등록, 환경변수, 스크래핑 예의) |
| 2. 하위 규칙 | `.claude/rules/architecture.md`, `code-style.md`, `git-workflow.md` (자동 로드) | 각 영역에만 해당하는 규칙 |
| 3. 필요할 때만 | `.claude/skills/*`, `.claude/agents/*` | 특정 작업의 절차(본문은 호출될 때만 로드) |
| 항상, 0토큰 | `.claude/hooks/*` (`.claude/settings.json`에 등록) | 기계적으로 판정 가능한 규칙의 강제 |

`.claude/rules/*.md`는 `@` import 없이도 자동 로드됩니다. `CLAUDE.md`에서 다시 import하면
중복 로드될 수 있으니 추가하지 마세요. 실제로 무엇이 로드됐는지는 세션에서 `/context`로 확인합니다.

### 규칙이 어디에 있는지

| 규칙 | 위치 |
|---|---|
| PR base는 `develop`, PR 하나 = 리뷰 단위 하나, 커밋 전 `/verify`와 충돌 확인 | 키트 `KIT_RULES.md` |
| 브랜치명, Conventional Commits, `main` 직접 push 금지 | `guard-git` 훅 |
| 작업 브랜치에서만 편집, 병합된 마이그레이션 수정 금지 | `guard-edit` 훅 |
| 포맷(Prettier) | `format-on-save` 훅 + CI `format:check` |
| 린트 경고 0개 | `npm run lint:check`(`--max-warnings 0`) — CI와 `/verify` |
| `domain` import 금지, 모듈 등록, 환경변수, 스크래핑 예의 | `CLAUDE.md` 공통 규칙 |
| repository/DI/ORM 배치, 예외 변환 위치, 조합 모듈, 페이징 | `.claude/rules/architecture.md` |
| 타입·Promise 처리 | `.claude/rules/code-style.md` |
| 커밋 scope | `.claude/rules/git-workflow.md` |
| 새 모듈 절차 | `/add-feature` 스킬 |
| API 변경 시 README 갱신 | `/api-docs-sync` 스킬 (+ PR 템플릿 체크박스, 리뷰어 점검 항목) |

새 규칙을 추가할 때는 키트의 "규칙을 둘 자리" 순서로 판단하세요: 기계적으로 판정 가능 → 훅,
특정 작업에서만 필요 → 스킬, 탐색은 많고 결론은 짧음 → 서브에이전트, 그 외 매 턴 필요한 것만
규칙. 규칙 파일(`CLAUDE.md`, `.claude/rules/*`)은 프롬프트 캐시 프리픽스라, 작업 도중이 아니라
별도 세션에서 몰아서 고칩니다.

## Skills — `.claude/skills/`

관련 작업이라고 판단되면 Claude가 먼저 사용하며, `/이름`으로 직접 호출할 수도 있습니다.
자동 호출은 `description`만 보고 판단하므로 `description`에 "언제 쓰는지"를 구체적으로 적습니다.

- **verify** — CI와 같은 순서(`format:check` → `lint:check` → `test`)로 변경을 검증
- **add-feature** — `src/modules/example/`을 복사해 새 모듈을 만드는 절차
- **api-docs-sync** — 엔드포인트를 바꿨을 때 같은 PR에서 갱신할 문서 목록

## Hooks — `.claude/settings.json`, `.claude/hooks/`

사람 개입 없이 자동으로 실행되며, 팀 공유 설정이라 저장소를 받는 모든 사람에게 적용됩니다.
파싱에 실패하면 통과시키므로(fail-open) 편의 장치이지 보안 경계가 아닙니다.

- **check-kit** (SessionStart) — 키트가 없으면 경고
- **block-generated-edit** (Edit/Write 전) — `dist/`, `coverage/` 수정 차단
- **guard-edit** (Edit/Write 전) — `main`/`master`/`develop`에서 추적 파일 편집 차단, `origin/develop`·`origin/main`에 이미 있는 마이그레이션 수정 차단
- **guard-git** (Bash 전) — `main`/`master` 직접 push, 규약 밖 브랜치명, Conventional Commits가 아닌 커밋 메시지 차단
- **format-on-save** (Edit/Write 후) — 수정한 `.ts` 파일에 프로젝트의 prettier 적용

`check-kit`, `block-generated-edit`은 키트 템플릿 그대로이고, `guard-git`은 키트 템플릿에서
heredoc 커밋 처리와 브랜치명 규약(이슈 번호 선택, `docs/` 허용)을 고친 버전입니다.
훅을 바꿨다면 JSON 입력을 직접 만들어 넣어 차단/통과가 의도대로인지 확인하세요.
훅 스크립트는 `.gitattributes`(`*.sh eol=lf`, 키트와 동일)로 LF를 유지합니다 — CRLF로 체크아웃되면 Git Bash 밖에서는 훅이 깨집니다.

## Subagent — `.claude/agents/nest-reviewer.md`

변경이 여러 파일에 걸치거나 모듈·스크래퍼·엔드포인트·마이그레이션이 추가됐을 때, 또는
"리뷰해줘"라고 요청하면 리뷰를 위임합니다. 규칙 위반, README API 문서 누락, 스크래퍼
타임아웃·딜레이·크론 순서, 마이그레이션 `down()`, 입력 처리를 봅니다. 린트·테스트는
실행하지 않습니다(`/verify`의 역할). 파일 한두 개짜리 변경은 위임하지 않는 편이 쌉니다.

## MEMORY.md / ERRORS.md

코드나 git 히스토리로는 알 수 없는 맥락을 기록하는 문서입니다. 컨텍스트에 자동 로드되지
**않으며**, 필요할 때 grep해서 해당 부분만 읽습니다 (키트 `KIT_RULES.md`의 "작업 맥락").

- `MEMORY.md` — 결정 사항과 그 이유, 진행 중인 작업, 배경 맥락
- `ERRORS.md` — 재발 가능한 에러의 증상/원인/해결
