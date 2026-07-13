# 아키텍처

## 스택

| 영역 | 선택 |
|---|---|
| 프레임워크 / DI | Nest.js (Express 플랫폼), Nest container |
| DB / ORM | PostgreSQL + TypeORM |
| 스크래핑 | Playwright(동적 페이지), Cheerio(정적 HTML) |
| 아키텍처 패턴 | Modular Nest.js (도메인 모듈 + `domain`/`infrastructure`/`application` 계층 분리) |

## 폴더 구조

```
src/
  main.ts / app.module.ts   # 앱 엔트리포인트
  common/
    database/                # TypeOrmModule.forRootAsync 설정
    pagination/               # PaginatedResult, normalizePagination 등 공통 유틸
    kbo/                      # KBO 팀 코드/이름 조회 테이블
  database/
    data-source.ts            # TypeORM CLI용 DataSource (마이그레이션)
    migrations/                # 마이그레이션 히스토리
  modules/
    example/                  # 새 module 작성 시 복사할 템플릿 (README 참고, 인메모리 더미)
      domain/                  # entities, repositories(추상 인터페이스 + Symbol 토큰)
      infrastructure/
        repositories/           # domain 인터페이스 구현체
      application/              # controller, service, dto
    game/                      # 실제 TypeORM/DB 연동을 보여주는 참고 구현체
      domain/
      infrastructure/
        orm/                    # TypeORM @Entity 클래스
        repositories/
      application/
    game-stats/, standings/, scrape-source-health/  # game과 동일한 레이어 구조
    scrape/                   # DB 엔티티 없이 스크래퍼 3종을 오케스트레이션하는 모듈
```

## 데이터 흐름

```
Controller (application)
  → Service (application)                # DTO → domain 타입 변환, NotFoundException 등 예외 변환
    → Repository (interface, domain)      # Symbol 토큰으로 DI
      → RepositoryImpl (infrastructure)   # TypeORM Repository<OrmEntity> 사용
        → OrmEntity (infrastructure/orm)  # DB 테이블 매핑
```

- `domain`은 Nest 프레임워크, `application`, `infrastructure`에 의존하지 않는 순수 TS 코드입니다.
- infrastructure repository는 데이터 접근 결과(`null` 등)만 반환하고, `NotFoundException` 같은 Nest 예외로 변환하는 것은 `application/services`에서 처리합니다.
- 목록 조회 API에 페이징이 필요하면 `common/pagination`의 `PaginatedResult<T>`/`normalizePagination`을 재사용하고, `sortBy`는 화이트리스트된 컬럼만 허용합니다 (`game`/`game-stats`/`standings` 참고).
- 스크래핑 흐름은 `scrape` 모듈이 스크래퍼(Playwright/Cheerio) → 도메인 서비스(`upsert`/`upsertMany`) → `scrape-source-health` 로깅 순서로 오케스트레이션합니다.

## 새 기능 추가 절차

1. `src/modules/example/`을 복사해 `src/modules/{모듈명}/`으로 이름을 바꿉니다.
2. `domain/entities`, `domain/repositories`부터 작성합니다.
3. 실제 DB가 필요하면 `src/modules/game/infrastructure/orm`을 참고해 `infrastructure/orm`, `infrastructure/repositories`를 작성합니다 (필요 없다면 `example`처럼 인메모리로 남겨둡니다).
4. `application/{name}.controller.ts`, `application/{name}.service.ts`로 진입점을 연결합니다.
5. `{모듈명}.module.ts`을 만들고 `app.module.ts`에 등록합니다.
6. 새 테이블이 필요하면 `npm run migration:generate`로 마이그레이션을 생성합니다.

## 협업 규칙

브랜치/커밋/PR 규칙은 [CONTRIBUTING.md](../CONTRIBUTING.md)를 참고하세요.
