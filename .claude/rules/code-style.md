# 코드 스타일 규칙

`eslint.config.mjs`(`recommendedTypeChecked`)를 작성 시점부터 지킨다.

- `no-explicit-any`는 꺼져 있지만 `any` 대신 구체 타입을 쓴다.
- Promise는 `await`하거나 명시적으로 처리한다 (`no-floating-promises`).
- `any`/`unknown` 값은 타입을 좁힌 뒤 인자로 넘긴다 (`no-unsafe-argument`).
