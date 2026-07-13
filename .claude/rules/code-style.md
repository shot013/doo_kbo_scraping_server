# 코드 스타일 규칙 (항상 적용)

`eslint.config.mjs`에 정의된 규칙을 코드 작성 시점부터 지킨다 (`npm run lint` 실행 후 고치지 않는다):

- `@typescript-eslint/recommendedTypeChecked` 기반. `no-explicit-any`는 꺼져 있지만 가능하면 구체 타입을 쓴다.
- `no-floating-promises`, `no-unsafe-argument`는 경고(`warn`) 대상 — Promise는 `await`하거나 명시적으로 처리해 새 경고를 만들지 않는다.
- Prettier(`.prettierrc`: `singleQuote: true`, `trailingComma: all`)를 어기면 lint 에러로 잡힌다.
- domain entity는 생성자에서 필드를 명시적으로 할당한다 (`Object.assign` 사용 시에도 타입이 좁혀지는지 확인).
- repository 구현체의 `toDomain`/`toOrm` 변환 패턴을 새 module에도 동일하게 따른다.

- 코드를 수정한 뒤에는 `npm run lint`가 경고 없이 통과하는 것을 목표로 한다.
