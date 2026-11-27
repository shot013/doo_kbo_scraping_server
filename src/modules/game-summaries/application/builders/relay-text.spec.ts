import { classifyPlateAppearance, splitRelayText } from './relay-text';

describe('splitRelayText', () => {
  it('"이름 : 내용"을 이름과 내용으로 나눈다', () => {
    expect(splitRelayText('정내야 : 좌월 홈런 (홈런거리:120M)')).toEqual({
      name: '정내야',
      content: '좌월 홈런 (홈런거리:120M)',
    });
  });

  it('앞뒤 공백을 지우고, 구분자가 없으면 이름은 null이고 전체가 내용이다', () => {
    expect(splitRelayText(' 3루주자 구유격 : 홈인')).toEqual({
      name: '3루주자 구유격',
      content: '홈인',
    });
    expect(splitRelayText('폭투로 3루주자 득점')).toEqual({
      name: null,
      content: '폭투로 3루주자 득점',
    });
  });
});

describe('classifyPlateAppearance', () => {
  it.each([
    ['좌월 홈런 (홈런거리:115M)', '홈런', 'HOME_RUN'],
    ['우익수 오른쪽 3루타', '3루타', 'TRIPLE'],
    ['우중간 2루타', '2루타', 'DOUBLE'],
    ['중전 1루타', '안타', 'SINGLE'],
    ['내야안타', '안타', 'SINGLE'],
  ])('%s → %s (타수, 안타)', (content, label, hitKind) => {
    expect(classifyPlateAppearance(content)).toEqual({
      label,
      hitKind,
      isAtBat: true,
      isFreePass: false,
    });
  });

  it.each([
    ['볼넷', '볼넷', true],
    ['고의4구', '고의4구', true],
    ['몸에 맞는 볼', '몸에 맞는 볼', true],
    ['희생플라이 아웃', '희생플라이', false],
    ['희생번트 아웃', '희생번트', false],
  ])('%s → %s (타수 아님)', (content, label, isFreePass) => {
    expect(classifyPlateAppearance(content)).toEqual({
      label,
      hitKind: null,
      isAtBat: false,
      isFreePass,
    });
  });

  it('삼진은 타수에 들어가는 아웃이다', () => {
    expect(classifyPlateAppearance('헛스윙 삼진')).toEqual({
      label: '삼진',
      hitKind: null,
      isAtBat: true,
      isFreePass: false,
    });
  });

  it('그 밖의 아웃은 괄호와 "아웃"을 뗀 문구를 쓰고 타수로 센다', () => {
    expect(
      classifyPlateAppearance('유격수 땅볼 아웃 (2루 주자 3루 진루)'),
    ).toEqual({
      label: '유격수 땅볼',
      hitKind: null,
      isAtBat: true,
      isFreePass: false,
    });
  });

  it('아웃 문구가 아니면 타수로 세지 않는다', () => {
    expect(classifyPlateAppearance('타격방해').isAtBat).toBe(false);
  });
});
