# 아키텍처 규칙 (항상 적용)

- `src/modules/{module}/domain/`은 Nest 프레임워크, `application/`, `infrastructure/`를 import하지 않는다. 위반하는 코드를 작성하지 않는다.
- 새 module은 `src/modules/game/`을 복사해서 시작한다. `domain → infrastructure → application` 순서로 작성한다.
- 에러는 infrastructure layer에서 예외를 던지고, `application/services`에서 `NotFoundException` 등 Nest 예외로 변환해 controller로 전달한다. domain에서 예외를 직접 처리하지 않는다.
- DI/Provider는 Nest container에 등록된 방식만 사용한다 (`@Injectable()`, `@Inject(TOKEN)`). 다른 상태관리 라이브러리를 추가하지 않는다.
- repository 인터페이스는 `domain/repositories/`에 Symbol 토큰과 함께 정의하고, 구현체는 `infrastructure/repositories/`에 둔다. TypeORM 엔티티(`@Entity`)는 `infrastructure/orm/`에만 두고 domain entity는 순수 TS 클래스로 유지한다.
- 새 module 추가 시 `app.module.ts`에 반드시 등록한다.
