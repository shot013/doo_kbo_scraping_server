# Claude Code 작업 방식

이 저장소를 Claude Code로 열면 `.claude/`에 있는 설정을 자동으로 읽어들입니다.
새로 합류한 팀원이 아래 규칙들을 따로 외우거나 신경 쓸 필요는 없습니다 —
대부분은 사람이 개입하지 않아도 Claude Code가 알아서 지키거나 실행합니다.
이 문서는 "지금 뭐가 자동으로 돌아가고 있는지" 파악하기 위한 참고용입니다.

## 한눈에 보기

| 층 | 위치 | 언제 적용되나 | 내용 |
|---|---|---|---|
| 규칙 | `CLAUDE.md`, `.claude/rules/*.md` | 항상 (매 세션 시작 시 자동 로드) | 빌드/테스트 명령어, 아키텍처, 레이어링·린트·git 규칙 |
| Skills | `.claude/skills/*/SKILL.md` | Claude가 관련 작업이라고 판단하면 자동 사용, 또는 `/verify` `/add-feature`로 직접 호출 | 반복 업무 절차 (새 모듈 스캐폴딩, 변경 검증) |
| Hooks | `.claude/settings.json`, `.claude/hooks/*.sh` | 완전 자동, 사람 개입 없음 | 파일 저장 시 자동 포맷, 생성 파일 수정 차단 |
| Subagent | `.claude/agents/nest-reviewer.md` | Claude가 필요하다고 판단하면 자동 위임, 또는 "리뷰해줘"로 직접 요청 | 변경된 코드에 대한 아키텍처·컨벤션 리뷰 |

## 규칙 — `CLAUDE.md`, `.claude/rules/`

매 세션 시작 시 항상 컨텍스트에 포함됩니다. 사람이 별도로 링크하거나 지시하지 않아도
Claude Code는 이 내용을 이미 알고 작업을 시작합니다.

- `CLAUDE.md` — 빌드/테스트/린트 명령어, 폴더 구조, 데이터 흐름 개요
- `.claude/rules/architecture.md` — 레이어링 강제 규칙
- `.claude/rules/code-style.md` — 린트 규칙을 코드 작성 시점부터 준수
- `.claude/rules/git-workflow.md` — 브랜치명, 커밋 메시지, PR 규칙

규칙을 바꾸거나 추가하고 싶으면 이 파일들을 직접 수정하거나, Claude Code에게
"이런 규칙을 rules에 추가해줘"라고 요청하면 됩니다.

## Skills — `.claude/skills/`

작업 내용을 보고 관련 스킬이 있으면 Claude가 먼저 판단해서 사용합니다.
사람이 슬래시 명령으로 직접 호출할 수도 있습니다.

- **add-feature** — `src/modules/example/`을 복사해 새 기능을 만드는 절차
- **verify** — CI(`.github/workflows/ci.yaml`)와 동일하게 포맷 체크 → 린트 → 테스트를 실행해 변경을 검증하는 절차

## Hooks — `.claude/settings.json`, `.claude/hooks/`

사람 개입 없이 자동으로 실행됩니다. 팀 전체가 공유하는 `.claude/settings.json`에
등록되어 있어 저장소를 받는 모든 사람에게 동일하게 적용됩니다.

- **자동 포맷** — 소스 파일을 Claude Code가 수정하면 그 즉시 prettier가 실행됩니다.
- **생성 파일 보호** — `dist/`, `coverage/` 등 빌드 산출물을 Claude Code가 수정하려는 시도는 차단됩니다.

훅 스크립트는 `.claude/hooks/format-on-save.sh`, `.claude/hooks/block-generated-edit.sh`에 있습니다.
PATH에 툴체인이 없는 비대화형 셸에서도 동작하도록 셸 rc 파일을 재로드하는 처리가 들어있습니다.

## Subagent — `.claude/agents/nest-reviewer.md`

Claude가 소스 코드를 작성·수정한 뒤 필요하다고 판단하면 자동으로 리뷰를 위임합니다.
"리뷰해줘", "PR 올리기 전에 체크해줘"처럼 직접 요청할 수도 있습니다. 레이어링 위반,
에러 처리 방식, 린트 규칙, 템플릿 이탈 여부를 봅니다.
`npm run lint`/`npm run test` 자체는 실행하지 않습니다 (그건 verify 스킬의 역할).

## MEMORY.md / ERRORS.md

코드나 git 히스토리만으로는 알 수 없는 맥락을 기록하는 문서입니다.

- `MEMORY.md` — 결정 사항, 진행 중인 작업, 배경 맥락
- `ERRORS.md` — 재발 가능한 에러의 증상/원인/해결

## 무언가 바꾸고 싶다면

전부 일반 파일이라 직접 수정해도 되고, Claude Code에게 "이런 훅을 추가해줘" /
"이 스킬을 이렇게 바꿔줘"처럼 자연어로 요청해도 됩니다.
