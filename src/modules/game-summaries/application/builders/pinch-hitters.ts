import {
  GameEvent,
  GameEventType,
} from '../../../game-events/domain/entities/game-event.entity';
import {
  PinchHitterAppearanceResponse,
  PinchHitterSummaryResponse,
  PinchHittersResponse,
} from '../game-summary.response';
import {
  SummaryContext,
  classifyPlateAppearance,
  resolveName,
  splitRelayText,
  toHalf,
} from './relay-text';

export interface PinchHitterUse {
  /** `events` 안에서 대타 교체 이벤트의 위치 */
  substitutionIndex: number;
  /** 그 대타가 끝낸 타석 결과 이벤트의 위치. 타석이 없으면 null. */
  plateAppearanceIndex: number | null;
}

/**
 * 대타 교체마다 그 대타의 타석 결과를 찾는다. 같은 팀의 다음 타석 결과가 그 대타의
 * 것이면 짝을 짓고, 다른 타자의 것이면(타석 전에 다시 교체됨) 결과 없음으로 둔다.
 * 이닝이 끝나 다음 이닝 첫 타석을 마친 경우도 같은 팀의 다음 타석이라 그대로 잡힌다.
 */
export function findPinchHitterUses(events: GameEvent[]): PinchHitterUse[] {
  const uses: PinchHitterUse[] = [];
  events.forEach((event, substitutionIndex) => {
    if (event.type !== GameEventType.PINCH_HITTER) return;

    const nextIndex = events.findIndex(
      (candidate, index) =>
        index > substitutionIndex &&
        candidate.type === GameEventType.PLATE_APPEARANCE &&
        candidate.battingTeamCode === event.battingTeamCode,
    );
    const next = nextIndex === -1 ? null : events[nextIndex];
    const isSameBatter =
      next !== null &&
      (event.inPlayerId === null ||
        next.batterId === null ||
        next.batterId === event.inPlayerId);
    uses.push({
      substitutionIndex,
      plateAppearanceIndex: isSameBatter ? nextIndex : null,
    });
  });
  return uses;
}

interface PinchHitterRecord {
  appearance: PinchHitterAppearanceResponse;
  /** 타수에 들어가는 결과인가 (결과가 없으면 false) */
  isAtBat: boolean;
}

export function buildPinchHitters(
  events: GameEvent[],
  context: SummaryContext,
): PinchHittersResponse {
  const records = findPinchHitterUses(events).map((use) =>
    toRecord(events, use, context),
  );
  return {
    summary: {
      away: summarize(context.awayTeamCode, records),
      home: summarize(context.homeTeamCode, records),
    },
    appearances: records.map((record) => record.appearance),
  };
}

function toRecord(
  events: GameEvent[],
  use: PinchHitterUse,
  context: SummaryContext,
): PinchHitterRecord {
  const substitution = events[use.substitutionIndex];
  const base = {
    inning: substitution.inning,
    half: toHalf(substitution.isTopInning),
    teamCode: substitution.battingTeamCode,
    playerId: substitution.inPlayerId,
    playerName:
      resolveName(
        context,
        substitution.inPlayerId,
        substitution.inPlayerName,
      ) ?? '',
    replacedPlayerId: substitution.outPlayerId,
    replacedPlayerName: resolveName(
      context,
      substitution.outPlayerId,
      substitution.outPlayerName,
    ),
  };
  if (use.plateAppearanceIndex === null) {
    return {
      appearance: {
        ...base,
        pitcherId: null,
        pitcherName: null,
        resultText: null,
        isHit: false,
        rbi: 0,
      },
      isAtBat: false,
    };
  }

  const plateAppearance = events[use.plateAppearanceIndex];
  const outcome = classifyPlateAppearance(
    splitRelayText(plateAppearance.text).content,
  );
  return {
    appearance: {
      ...base,
      pitcherId: plateAppearance.pitcherId,
      pitcherName: resolveName(context, plateAppearance.pitcherId, null),
      resultText: outcome.label,
      isHit: outcome.hitKind !== null,
      rbi: runsScoredOn(events, use.plateAppearanceIndex, context),
    },
    isAtBat: outcome.isAtBat,
  };
}

/**
 * 그 이벤트로 공격 팀이 낸 점수. 이벤트 뒤 점수에서 바로 앞의 알려진 점수를 뺀다.
 * 점수를 모르면 null.
 */
export function runsScoredOn(
  events: GameEvent[],
  index: number,
  context: SummaryContext,
): number | null {
  const event = events[index];
  const isHomeBatting = event.battingTeamCode === context.homeTeamCode;
  const after = isHomeBatting ? event.homeScore : event.awayScore;
  if (after === null) return null;

  let before = 0;
  for (let cursor = index - 1; cursor >= 0; cursor--) {
    const previous = events[cursor];
    const score = isHomeBatting ? previous.homeScore : previous.awayScore;
    if (score !== null) {
      before = score;
      break;
    }
  }
  return Math.max(after - before, 0);
}

function summarize(
  teamCode: string,
  records: PinchHitterRecord[],
): PinchHitterSummaryResponse {
  const teamRecords = records.filter(
    (record) => record.appearance.teamCode === teamCode,
  );
  return {
    teamCode,
    count: teamRecords.length,
    atBats: teamRecords.filter((record) => record.isAtBat).length,
    hits: teamRecords.filter((record) => record.appearance.isHit).length,
    rbi: teamRecords.reduce(
      (sum, record) => sum + (record.appearance.rbi ?? 0),
      0,
    ),
  };
}
