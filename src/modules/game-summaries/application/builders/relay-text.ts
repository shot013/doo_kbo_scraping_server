import { InningHalf } from '../game-summary.response';

export type HitKind = 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'HOME_RUN';

export interface PlateAppearanceOutcome {
  /** 화면에 보일 짧은 결과 (예: 2루타, 삼진, 유격수 땅볼) */
  label: string;
  hitKind: HitKind | null;
  /** 타수에 들어가는 결과인가 (볼넷·사구·희생타는 아님) */
  isAtBat: boolean;
  /** 볼넷·고의4구·사구 */
  isFreePass: boolean;
}

/** 경기 요약을 계산할 때 공통으로 쓰는 경기 정보. */
export interface SummaryContext {
  homeTeamCode: string;
  awayTeamCode: string;
  /** 같은 경기 박스스코어의 선수 id → 이름 */
  nameById: Map<number, string>;
}

export function toHalf(isTopInning: boolean): InningHalf {
  return isTopInning ? 'TOP' : 'BOTTOM';
}

/** relay 문구는 `"{선수명} : {내용}"` 형식이다. 구분자가 없으면 이름은 null. */
export function splitRelayText(text: string): {
  name: string | null;
  content: string;
} {
  const separatorIndex = text.indexOf(' : ');
  if (separatorIndex === -1) {
    return { name: null, content: text.trim() };
  }
  return {
    name: text.slice(0, separatorIndex).trim() || null,
    content: text.slice(separatorIndex + 3).trim(),
  };
}

/** 박스스코어 이름을 먼저 쓰고, 없으면 relay에 있던 이름을 쓴다. */
export function resolveName(
  context: SummaryContext,
  playerId: number | null,
  fallback: string | null,
): string | null {
  if (playerId !== null) {
    const name = context.nameById.get(playerId);
    if (name) return name;
  }
  return fallback;
}

const AT_BAT_OUT_KEYWORDS = [
  '아웃',
  '땅볼',
  '플라이',
  '라인드라이브',
  '병살',
  '야수선택',
  '실책',
];

/**
 * 타석 결과 문구를 분류한다. 기준 문구는 `play-by-play.scraper.ts`의 분류와 같다
 * (홈런 → 3루타 → 2루타 → 1루타 순으로 먼저 맞는 것을 쓴다).
 */
export function classifyPlateAppearance(
  content: string,
): PlateAppearanceOutcome {
  const hit = (label: string, hitKind: HitKind): PlateAppearanceOutcome => ({
    label,
    hitKind,
    isAtBat: true,
    isFreePass: false,
  });
  const notAtBat = (label: string, isFreePass: boolean) => ({
    label,
    hitKind: null,
    isAtBat: false,
    isFreePass,
  });

  if (content.includes('홈런')) return hit('홈런', 'HOME_RUN');
  if (content.includes('3루타')) return hit('3루타', 'TRIPLE');
  if (content.includes('2루타')) return hit('2루타', 'DOUBLE');
  if (content.includes('1루타') || content.includes('안타')) {
    return hit('안타', 'SINGLE');
  }
  if (content.includes('삼진')) {
    return { label: '삼진', hitKind: null, isAtBat: true, isFreePass: false };
  }
  if (content.includes('고의4구')) return notAtBat('고의4구', true);
  if (content.includes('볼넷')) return notAtBat('볼넷', true);
  if (content.includes('몸에 맞는 볼') || content.includes('사구')) {
    return notAtBat('몸에 맞는 볼', true);
  }
  if (content.includes('희생플라이')) return notAtBat('희생플라이', false);
  if (content.includes('희생번트')) return notAtBat('희생번트', false);
  if (content.includes('희생')) return notAtBat(cleanLabel(content), false);

  return {
    label: cleanLabel(content),
    hitKind: null,
    isAtBat: AT_BAT_OUT_KEYWORDS.some((keyword) => content.includes(keyword)),
    isFreePass: false,
  };
}

/** "유격수 땅볼 아웃 (2루 주자 3루 진루)" → "유격수 땅볼" */
function cleanLabel(content: string): string {
  return content
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s+아웃$/, '')
    .trim();
}
