# CLAUDE.md

@doo_kbo_harness_kit/KIT_RULES.md

위 키트 공통 규칙이 이 저장소의 첫 단계 규칙이다. 이 파일은 그 아래의 프로젝트 최상위 규칙이고, 자동 로드되는 `.claude/rules/*.md`는 이 파일의 하위 규칙이다. 하위 규칙·스킬·서브에이전트는 상위 규칙을 다시 적지 않고 구체화만 하며, 충돌하면 상위가 우선한다.

## 명령어

```
npm install                                              # 의존성 설치
npm run start:dev                                        # 앱 실행 (watch 모드)
npm run format:check                                     # 포맷 체크 (npm run format으로 자동 포맷)
npm run lint:check                                       # 정적 분석, 경고 0개 (npm run lint는 --fix 포함)
npm run test                                             # 전체 테스트
npm run test -- <path> --testNamePattern "<name>"        # 단일 파일/테스트
npm run migration:generate -- src/database/migrations/<Name>  # 마이그레이션 생성 (.env의 DB 사용)
```

## 아키텍처

Modular Nest.js + TypeORM(PostgreSQL). 기능은 `src/modules/{name}/`의 도메인 단위 모듈이고, 모듈은 `domain/`(순수 TS 엔티티, repository 인터페이스와 Symbol 토큰), `infrastructure/`(`orm/` TypeORM 엔티티, `repositories/` 구현체, `scrapers/`), `application/`(controller, service, dto)으로 나뉜다. `src/modules/example/`은 복사용 템플릿(인메모리), `src/modules/game/`은 DB 연동 참고 구현이다. 새 모듈은 `/add-feature`, 엔드포인트 변경 시 문서 갱신은 `/api-docs-sync`를 따른다.

## 공통 규칙

- `domain/`은 Nest, TypeORM, `application/`, `infrastructure/`를 import하지 않는다.
- 기능은 도메인 단위 모듈로 나누고 `app.module.ts`에는 모듈 등록만 둔다. 새 모듈은 반드시 등록한다.
- 환경마다 달라지는 값(포트, DB 접속 정보, DSN, TTL 등)은 `.env` + `ConfigService`로 읽는다. 환경과 무관한 외부 스크래핑 소스 URL은 코드 상수로 둔다.
- 스크래핑 요청에는 요청 간 딜레이와 타임아웃·재시도 정책을 두고, 같은 사이트에 동시 요청을 몰지 않는다.
