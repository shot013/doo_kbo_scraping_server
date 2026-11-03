# 아키텍처 규칙

- repository 인터페이스와 Symbol DI 토큰은 `domain/repositories/`, 구현체는 `infrastructure/repositories/`에 둔다. service는 `@Inject(TOKEN)`으로 인터페이스에만 의존하고, DI는 Nest container(`@Injectable()`)만 쓴다.
- 다른 모듈의 데이터는 그 모듈이 `exports`한 service를 주입받아 쓴다. 다른 모듈의 repository 토큰이나 ORM 엔티티를 직접 쓰지 않는다.
- TypeORM `@Entity`는 `infrastructure/orm/*.orm-entity.ts`에만 둔다. domain entity는 `readonly` 필드를 가진 순수 TS 클래스이고, 생성자에서 `{Name}Props`로 모든 필드를 채운다(`Object.assign(this, props)`를 쓰면 Props가 모든 필드를 포함해야 한다).
- repository 구현체는 `toDomain`/`toOrm`으로 변환하며 ORM 엔티티를 밖으로 반환하지 않는다.
- repository는 결과가 없으면 `null`을 반환한다. `NotFoundException` 등 Nest 예외로의 변환은 `application/` service에서 하고, domain은 예외를 던지거나 잡지 않는다.
- 다른 모듈 service만 조합하는 모듈(`teams`, `records`, `game-results`)은 `domain/`·`infrastructure/` 없이 `application/`만 둔다.
- 목록 API 페이징은 `common/pagination`(`normalizePagination`, `buildPaginatedResult`)을 재사용하고, `sortBy`는 화이트리스트 매핑을 거쳐 컬럼에 넘긴다.
