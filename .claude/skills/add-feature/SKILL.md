---
name: add-feature
description: Scaffold a new module/feature in doo_kbo_scraping_server by copying src/modules/example/ and wiring it into app.module.ts. Use when asked to add, create, or scaffold a new feature, module, or DB table.
---

# 새 모듈 추가

계층 규칙은 `CLAUDE.md`의 공통 규칙과 `.claude/rules/architecture.md`를 따른다. 이 스킬은 순서만 다룬다.

1. `src/modules/example/`을 `src/modules/{모듈명}/`(kebab-case)으로 복사한다. 다른 모듈 service만 조합하는 모듈이면 `application/`과 `{모듈명}.module.ts`만 남긴다.
2. `domain/entities`, `domain/repositories`(인터페이스 + `{NAME}_REPOSITORY` 토큰)를 새 도메인에 맞게 다시 쓴다.
3. DB가 필요하면 `src/modules/game/`을 참고해 `infrastructure/orm/{name}.orm-entity.ts`와 `@InjectRepository` 기반 `infrastructure/repositories/{name}.repository.impl.ts`를 작성하고, 모듈 `imports`에 `TypeOrmModule.forFeature([...])`를 추가한다. 파일명은 `*.orm-entity.ts`를 지킨다 — 마이그레이션 생성(`src/database/data-source.ts`)이 이 패턴으로 엔티티를 찾는다.
4. 새 테이블·컬럼은 `npm run migration:generate -- src/database/migrations/{PascalCaseName}`으로 새 마이그레이션을 만든다. 이미 병합된 마이그레이션은 고치지 않는다(`guard-edit` 훅이 차단한다).
5. `application/`에 controller, service, `dto/`를 작성한다. 다른 모듈이 쓸 service는 `exports`에 넣는다.
6. `{모듈명}.module.ts`를 `app.module.ts`의 `imports`에 등록한다.
7. `example`/`Example` 이름이 새 파일에 남지 않았는지 grep으로 확인한다.
8. 엔드포인트를 추가했으면 `/api-docs-sync`, 마지막으로 `/verify`를 실행한다.
