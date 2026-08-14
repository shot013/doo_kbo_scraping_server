/**
 * KBO 이닝 표기(정수 또는 "1/3"/"2/3", "N 1/3"/"N 2/3")를
 * 야구 통상 표기(N.1 = N+1/3이닝, N.2 = N+2/3이닝)로 변환한다.
 */
export function parseInningsPitched(raw: string): string | null {
  if (!raw || raw === '&nbsp;') return null;

  const combined = /^(\d+)\s+([12])\/3$/.exec(raw);
  if (combined) return `${combined[1]}.${combined[2]}`;

  const fractionOnly = /^([12])\/3$/.exec(raw);
  if (fractionOnly) return `0.${fractionOnly[1]}`;

  const whole = /^\d+$/.exec(raw);
  if (whole) return `${raw}.0`;

  return null;
}
