export interface KboTeam {
  code: string;
  shortName: string;
  fullName: string;
}

/**
 * KBO 공식 사이트(koreabaseball.com) 스케줄 AJAX 응답의 gameId(예: 20260701LTOB0)에
 * 실제로 쓰이는 팀 코드와, 목록에 표시되는 한글 약칭을 매핑한다.
 */
export const KBO_TEAMS: readonly KboTeam[] = [
  { code: 'LT', shortName: '롯데', fullName: '롯데 자이언츠' },
  { code: 'OB', shortName: '두산', fullName: '두산 베어스' },
  { code: 'SK', shortName: 'SSG', fullName: 'SSG 랜더스' },
  { code: 'HT', shortName: 'KIA', fullName: 'KIA 타이거즈' },
  { code: 'SS', shortName: '삼성', fullName: '삼성 라이온즈' },
  { code: 'NC', shortName: 'NC', fullName: 'NC 다이노스' },
  { code: 'KT', shortName: 'KT', fullName: 'kt wiz' },
  { code: 'HH', shortName: '한화', fullName: '한화 이글스' },
  { code: 'LG', shortName: 'LG', fullName: 'LG 트윈스' },
  { code: 'WO', shortName: '키움', fullName: '키움 히어로즈' },
];

const BY_SHORT_NAME = new Map(KBO_TEAMS.map((team) => [team.shortName, team]));

export function resolveKboTeam(shortName: string): KboTeam {
  const team = BY_SHORT_NAME.get(shortName);
  if (!team) {
    throw new Error(`Unknown KBO team short name: ${shortName}`);
  }
  return team;
}
