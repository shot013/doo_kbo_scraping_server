---
name: scaffold-module
description: Scaffold a new module/feature in doo_kbo_scraping_server by copying the template module (see src/modules/game/) and wiring it into app.module.ts. Use when asked to add, create, or scaffold a new feature or module.
---

# 새 모듈 추가

1. `src/modules/game/`을 `src/modules/{모듈명}/`으로 복사한다. `{모듈명}`은 kebab-case를 사용한다 (예: `player-stats`).
2. `domain/entities`, `domain/repositories`부터 새 도메인에 맞게 다시 작성한다.
   - `domain`은 프레임워크나 `application`/`infrastructure`를 import하지 않는다.
   - repository 인터페이스는 Symbol 토큰(`XXX_REPOSITORY`)과 함께 `domain/repositories/`에 둔다.
3. `infrastructure/orm/{name}.orm-entity.ts`에 TypeORM `@Entity` 클래스를 작성하고, `infrastructure/repositories/{name}.repository.impl.ts`에서 domain 인터페이스를 구현한다.
4. `application/{name}.controller.ts`, `application/{name}.service.ts`, `application/dto/*.dto.ts`에서 모듈의 진입점과 비즈니스 흐름을 연결한다.
5. `{모듈명}.module.ts`을 만들고 `app.module.ts`의 `imports`에 등록한다.
6. 새 테이블이 필요하면 `npm run migration:generate -- src/database/migrations/{설명}`으로 마이그레이션을 생성한다 (`.env`의 DB 접속 정보 사용).
7. 복사 원본(`game`, `Game` 등)의 이름이 새 파일에 남아있지 않은지 확인한다.
8. `npm run lint`와 `npm run test`를 실행해 통과하는지 확인한다 (`verify` 스킬 참고).

세부 레이어링 규칙은 `.claude/rules/architecture.md`를 따른다.
