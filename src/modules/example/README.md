# example 모듈

이 모듈은 실제 기능이 아니라 **새 모듈을 만들 때 복사할 참고 구현체**입니다
(`add-feature` 스킬, `CLAUDE.md`의 "새 module 체크리스트" 참고).

`domain → infrastructure → application` 3계층이 전부 동작하는 최소 예시(이름/설명이 있는 `Example` 엔티티, 목록/단건 조회, 생성)를 담고 있습니다. `infrastructure/repositories/example.repository.impl.ts`는 실제 DB에 연결하지 않는 인메모리 저장소입니다 — 마이그레이션 없이 그대로 실행/복사할 수 있도록 하기 위함입니다. 실제 TypeORM 엔티티(`infrastructure/orm/`)와 마이그레이션을 쓰는 패턴은 `src/modules/game/`을 참고하세요. 페이징·정렬 같은 심화 패턴도 `src/modules/game/`에 있습니다.

새 도메인을 추가할 때:
1. `src/modules/example/`을 `src/modules/{모듈명}/`으로 복사한다.
2. `Example`/`example` 관련 이름을 전부 새 도메인 이름으로 바꾼다.
3. `domain/entities`, `domain/repositories`부터 다시 작성한다 (`domain`은 Nest/`application`/`infrastructure`를 import하지 않는다).
4. 실제 DB가 필요하면 `src/modules/game/infrastructure/orm`을 참고해 `infrastructure/orm/{name}.orm-entity.ts`를 추가하고, `infrastructure/repositories`에서 `@InjectRepository`로 구현한다 (이 예시처럼 인메모리로 남겨둬도 된다).
5. `application/{name}.controller.ts`, `application/{name}.service.ts`로 진입점을 연결한다.
6. `{모듈명}.module.ts`을 만들고 `app.module.ts`에 등록한다.
7. 새 테이블이 필요하면 `npm run migration:generate`로 마이그레이션을 생성한다.
