import { BadRequestException } from '@nestjs/common';

/**
 * 쿼리 문자열을 enum 값으로 좁힌다. 비어 있으면 undefined(필터 없음), 목록 밖의 값이면 400.
 * DB enum 컬럼에 그대로 넘기면 Postgres 캐스트 오류로 500이 나므로 컨트롤러에서 먼저 거른다.
 */
export function parseEnumQuery<T extends string>(
  name: string,
  value: string | undefined,
  enumObject: Record<string, T>,
): T | undefined {
  if (value === undefined || value === '') return undefined;
  const allowed = Object.values(enumObject);
  if ((allowed as string[]).includes(value)) return value as T;
  throw new BadRequestException(
    `${name} must be one of: ${allowed.join(', ')}`,
  );
}
