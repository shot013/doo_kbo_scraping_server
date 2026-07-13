# 기여 가이드

이 프로젝트에 기여하는 인원이 늘어나도 리뷰 비용을 줄이고 충돌을 예방할 수 있도록,
아래 규칙은 최소한의 합의 사항입니다.

## 브랜치 전략

- `main` — 항상 배포 가능한 상태. 직접 push 금지, PR로만 병합.
- `develop` — 다음 배포를 준비하는 통합 브랜치. 기능 브랜치는 여기서 분기.
- `feature/{issue번호}-{짧은-설명}` — 새 기능. 예: `feature/42-team-standings`
- `fix/{issue번호}-{짧은-설명}` — 버그 수정
- `chore/{짧은-설명}` — 빌드/설정/의존성 등 코드 동작에 영향 없는 변경
- `release/{version}` — 배포 준비 (버전 고정, 최종 QA)

기능 브랜치는 완료 후 삭제합니다. `develop`이 오래 밀리지 않도록 주기적으로
`main`에 병합하고 새로 분기하세요.

## 커밋 메시지 (Conventional Commits)

```
<type>(<scope>): <subject>

<body (선택)>
```

- `type`: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`
- `scope`: 영향받는 feature/모듈명 (예: `game`, `standings`, `scrape`)
- `subject`: 명령형, 소문자 시작, 마침표 없이

예시:
```
feat(game): add pagination and sorting to games endpoint
fix(scrape): retry request on timeout
chore: bump dependency to latest
```

## PR 규칙

- PR 하나 = 리뷰 가능한 단위 하나. 여러 기능을 한 PR에 묶지 않습니다.
- PR 설명에는 변경 이유와 테스트 방법을 반드시 포함합니다 (템플릿 참고).
- 최소 1명 이상의 승인 후 병합합니다.
- 병합 전 `npm run lint`와 `npm run test`가 로컬에서 통과해야 합니다.
  (CI에서도 동일하게 실행됩니다.)
- Squash merge를 기본으로 사용합니다.

## 코드 작성 규칙

- 새 기능은 `src/modules/game/`의 폴더 구조를 그대로 복사해서 시작하세요.
  (레이어 분리 등 자세한 내용은 [.claude/rules/architecture.md](.claude/rules/architecture.md) 참고)
- 도메인/핵심 로직 레이어(`domain/`)는 Nest 프레임워크나 `application/`/`infrastructure/`를 import하지 않습니다.
- `npm run lint`에서 경고가 나오지 않는 것을 기본 목표로 합니다.
