# Git 워크플로 규칙 (항상 적용)

- `main`에 직접 push하지 않는다. 항상 PR을 통해 병합한다.
- 브랜치명: `feature/{issue번호}-{짧은-설명}`, `fix/{issue번호}-{짧은-설명}`, `chore/{짧은-설명}`, `release/{version}`.
- 커밋 메시지는 Conventional Commits 형식을 따른다: `<type>(<scope>): <subject>` — `type`은 `feat`/`fix`/`docs`/`style`/`refactor`/`test`/`chore`/`perf` 중 하나, `subject`는 명령형·소문자 시작·마침표 없음.
- 하나의 PR에는 하나의 리뷰 가능한 단위만 담는다. 여러 기능을 한 PR에 묶지 않는다.
- 커밋을 생성하기 전에 `npm run lint`와 `npm run test`가 로컬에서 통과하는지 확인한다.
