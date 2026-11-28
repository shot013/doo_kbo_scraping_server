import { BadRequestException } from '@nestjs/common';
import { parseEnumQuery } from './enum-query';

enum Color {
  RED = 'RED',
  BLUE = 'BLUE',
}

describe('parseEnumQuery', () => {
  it('목록 안의 값은 그대로 반환한다', () => {
    expect(parseEnumQuery('color', 'RED', Color)).toBe(Color.RED);
  });

  it('값이 없거나 빈 문자열이면 필터 없음(undefined)이다', () => {
    expect(parseEnumQuery('color', undefined, Color)).toBeUndefined();
    expect(parseEnumQuery('color', '', Color)).toBeUndefined();
  });

  it('목록 밖의 값이면 허용 값을 알려 주는 400을 던진다', () => {
    expect(() => parseEnumQuery('color', 'red', Color)).toThrow(
      new BadRequestException('color must be one of: RED, BLUE'),
    );
  });
});
