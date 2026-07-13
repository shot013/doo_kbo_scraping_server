# CLAUDE.md

이 파일은 이 저장소에서 작업하는 Claude Code(claude.ai/code)에게 제공되는 가이드입니다.

## 명령어

```
npm install                                              # 의존성 설치
npm run start:dev                                        # 앱 실행 (watch 모드)
npm run format:check                                     # 포맷 체크 (CI에서 사용; npm run format으로 자동 포맷)
npm run lint                                             # 정적 분석 (경고 없이 통과해야 함)
npm run test                                             # 전체 테스트 실행
npm run test -- <path>                                   # 단일 테스트 파일 실행
npm run test -- <path> --testNamePattern "<name>"        # 이름으로 단일 테스트 실행
```

CI(`.github/workflows/ci.yaml`)는 `main`/`develop`으로의 모든 PR/push에서 포맷 체크 → `npm run lint` → `npm run test` 순으로 실행합니다. 병합 전 세 가지 모두 로컬에서 통과해야 합니다.

## 아키텍처

Modular Nest.js Architecture. DI는 Nest container, HTTP 진입점은 controllers, 핵심 로직은 services, 데이터 접근은 repositories/providers를 사용합니다.

```
src/
  main.ts / app.module.ts   # 앱 엔트리포인트
  common/                    # 공통 유틸(pagination 등), 필터, 인터셉터, Exception
  modules/{name}/
    application/             # controllers, dto, services
    domain/                  # entities, repositories(추상 인터페이스 + DI 토큰)
    infrastructure/
      orm/                   # TypeORM @Entity 클래스
      repositories/          # domain repository 인터페이스 구현체
```

`src/modules/example/`은 새 module을 만들 때 복사할 순수 템플릿입니다 (실제 기능이 아닌 더미 데이터, `src/modules/example/README.md` 참고). 실제 TypeORM/DB 연동 패턴을 볼 때는 `src/modules/game/`을 참고하세요 (entity → domain repository → infrastructure/orm + repository 구현 → application service/controller 순으로 레이어가 이어짐).

**새 module 체크리스트** (`docs/ARCHITECTURE.md`, `.claude/rules/architecture.md` 참고):
1. `src/modules/example/`을 새 이름으로 복사한다.
2. `domain/entities`, `domain/repositories`부터 새 도메인에 맞게 다시 작성한다.
3. `infrastructure/orm`, `infrastructure/repositories`에서 domain 인터페이스를 구현한다 (DB 연동이 필요 없다면 `example`처럼 인메모리로 남겨둬도 된다).
4. `application/controllers`, `application/services`에서 진입점과 흐름을 연결한다.
5. `app.module.ts`에 새 모듈을 등록한다.

## 주요 린트 규칙

`eslint.config.mjs` 기준 (`@typescript-eslint/recommendedTypeChecked` + Prettier 연동):

- `no-explicit-any`는 꺼져 있지만, 가능하면 구체 타입을 쓴다.
- `no-floating-promises`, `no-unsafe-argument`는 `warn` — 새 코드에서 경고가 나오지 않는 것을 목표로 한다 (Promise는 `await`하거나 명시적으로 처리한다).
- Prettier 규칙(`.prettierrc`: single quote, trailing comma)을 어기면 lint 에러로 잡힌다.

## 도메인 규칙

- **모듈 구조**: 기능별로 모듈을 분리한다 (예: `scrape/`, `game/`, `standings/` 등 도메인 단위 모듈). `AppModule`에 직접 비즈니스 로직을 넣지 않는다.
- **환경변수**: `.env` + `@nestjs/config`로 관리한다. 시크릿/URL을 코드에 하드코딩하지 않는다.
- **스크래핑 예의**: 요청 간 딜레이·재시도 정책을 두고, 대상 사이트에 과도한 부하를 주지 않는다.

## 협업 (`CONTRIBUTING.md`)

- 브랜치: `main` (보호됨, PR 전용), `develop` (통합), `feature/{issue}-{desc}`, `fix/{issue}-{desc}`, `chore/{desc}`, `release/{version}`.
- 커밋: Conventional Commits — `<type>(<scope>): <subject>`, 명령형, 소문자 시작, 마침표 없음. 타입: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`.
- PR 하나 = 리뷰 가능한 단위 하나; 최소 1명 승인 필요; squash merge; PR 열기 전 로컬에서 `npm run lint`와 `npm run test`가 통과해야 함.
