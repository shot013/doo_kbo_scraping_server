import {
  GameEvent,
  GameEventType,
} from '../../../game-events/domain/entities/game-event.entity';
import { ScoringPlayResponse } from '../game-summary.response';
import { findPinchHitterUses } from './pinch-hitters';
import {
  PlateAppearanceOutcome,
  SummaryContext,
  classifyPlateAppearance,
  resolveName,
  splitRelayText,
  toHalf,
} from './relay-text';

type Leader = 'HOME' | 'AWAY' | 'TIE';

/**
 * 이벤트 뒤 점수가 바로 앞의 알려진 점수와 달라진 이벤트를 득점 장면으로 본다.
 * 타석 결과뿐 아니라 폭투·도루 같은 타석 외 득점도 같은 방식으로 잡힌다.
 */
export function buildScoringPlays(
  events: GameEvent[],
  context: SummaryContext,
): ScoringPlayResponse[] {
  const pinchHitPlateAppearances = new Set(
    findPinchHitterUses(events)
      .map((use) => use.plateAppearanceIndex)
      .filter((index): index is number => index !== null),
  );

  const plays: ScoringPlayResponse[] = [];
  let home = 0;
  let away = 0;
  events.forEach((event, index) => {
    if (event.homeScore === null || event.awayScore === null) return;
    const homeRuns = event.homeScore - home;
    const awayRuns = event.awayScore - away;
    if (homeRuns === 0 && awayRuns === 0) return;

    const before = leaderOf(home, away);
    const after = leaderOf(event.homeScore, event.awayScore);
    const scoredByHome = homeRuns > 0;
    plays.push({
      inning: event.inning,
      half: toHalf(event.isTopInning),
      teamCode: scoredByHome ? context.homeTeamCode : context.awayTeamCode,
      description: describe(
        event,
        Math.max(homeRuns, awayRuns),
        pinchHitPlateAppearances.has(index),
        context,
      ),
      homeScore: event.homeScore,
      awayScore: event.awayScore,
      isReversal: before !== 'TIE' && after !== 'TIE' && before !== after,
      isTying: after === 'TIE',
    });
    home = event.homeScore;
    away = event.awayScore;
  });
  return plays;
}

function leaderOf(home: number, away: number): Leader {
  if (home > away) return 'HOME';
  if (away > home) return 'AWAY';
  return 'TIE';
}

/**
 * 타석 결과는 "타자 이름 + 결과 요약"(예: 정내야 3점 홈런, 대타 표중견 1타점 2루타),
 * 타석 외 득점은 relay 원문을 그대로 쓴다.
 */
function describe(
  event: GameEvent,
  runs: number,
  isPinchHit: boolean,
  context: SummaryContext,
): string {
  const { name, content } = splitRelayText(event.text);
  if (event.type !== GameEventType.PLATE_APPEARANCE) {
    return event.text.trim();
  }
  const batterName = resolveName(context, event.batterId, name) ?? '';
  const phrase = describeOutcome(classifyPlateAppearance(content), runs);
  return [isPinchHit ? '대타' : null, batterName, phrase]
    .filter((part): part is string => Boolean(part))
    .join(' ');
}

function describeOutcome(
  outcome: PlateAppearanceOutcome,
  runs: number,
): string {
  switch (outcome.hitKind) {
    case 'HOME_RUN':
      if (runs === 1) return '솔로 홈런';
      if (runs === 4) return '만루 홈런';
      return `${runs}점 홈런`;
    case 'TRIPLE':
      return `${runs}타점 3루타`;
    case 'DOUBLE':
      return `${runs}타점 2루타`;
    case 'SINGLE':
      return runs === 1 ? '적시타' : `${runs}타점 적시타`;
    default:
      return outcome.isFreePass ? `밀어내기 ${outcome.label}` : outcome.label;
  }
}
