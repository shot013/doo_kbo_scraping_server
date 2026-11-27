import {
  GameEvent,
  GameEventType,
} from '../../../game-events/domain/entities/game-event.entity';
import {
  GameStat,
  PlayerStatType,
} from '../../../game-stats/domain/entities/game-stat.entity';
import {
  PitcherAppearanceResponse,
  PitcherDecision,
  PitcherEntryResponse,
  PitchingResponse,
} from '../game-summary.response';
import { SummaryContext, toHalf } from './relay-text';

/** 팀별 등판 목록. 원정 → 홈, 팀 안에서는 등판 순서대로. */
export function buildPitching(
  stats: GameStat[],
  events: GameEvent[],
  context: SummaryContext,
): PitchingResponse {
  return {
    away: buildTeam(context.awayTeamCode, stats, events),
    home: buildTeam(context.homeTeamCode, stats, events),
  };
}

function buildTeam(
  teamCode: string,
  stats: GameStat[],
  events: GameEvent[],
): PitcherAppearanceResponse[] {
  const pitchers = sortByAppearance(
    stats.filter(
      (stat) =>
        stat.statType === PlayerStatType.PITCHING && stat.teamCode === teamCode,
    ),
    events,
  );
  return pitchers.map((stat, index) => ({
    playerId: stat.playerId,
    playerName: stat.playerName,
    role: index === 0 ? 'STARTER' : 'RELIEVER',
    entry: index === 0 ? null : findEntry(stat.playerId, events),
    outs: toOuts(stat.inningsPitched),
    pitchCount: stat.pitchCount,
    runs: stat.runsAllowed,
    decision: toDecision(stat),
  }));
}

/**
 * 박스스코어의 등판 순서가 모두 있으면 그것을 쓰고, 없으면 문자중계에 처음 나온
 * 순서로 정렬한다. 문자중계에도 없는 투수는 박스스코어 저장 순서대로 뒤에 둔다.
 */
function sortByAppearance(
  pitchers: GameStat[],
  events: GameEvent[],
): GameStat[] {
  if (pitchers.every((stat) => stat.appearanceOrder !== null)) {
    return [...pitchers].sort(
      (a, b) => (a.appearanceOrder ?? 0) - (b.appearanceOrder ?? 0),
    );
  }
  const firstSeen = (stat: GameStat): number => {
    if (stat.playerId === null) return Number.MAX_SAFE_INTEGER;
    const index = events.findIndex(
      (event) =>
        event.pitcherId === stat.playerId ||
        (event.type === GameEventType.PITCHER_CHANGE &&
          event.inPlayerId === stat.playerId),
    );
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };
  return pitchers
    .map((stat, position) => ({ stat, position, seen: firstSeen(stat) }))
    .sort((a, b) => a.seen - b.seen || a.position - b.position)
    .map(({ stat }) => stat);
}

/**
 * 구원 투수의 등판 시점. 투수 교체 이벤트가 있으면 그 시점의 아웃·주자를 쓰고,
 * 없으면 그 투수의 첫 타석 직전 상태(같은 이닝의 앞 이벤트, 없으면 이닝 시작)로 대신한다.
 */
function findEntry(
  playerId: number | null,
  events: GameEvent[],
): PitcherEntryResponse | null {
  if (playerId === null) return null;

  const changeIndex = events.findIndex(
    (event) =>
      event.type === GameEventType.PITCHER_CHANGE &&
      event.inPlayerId === playerId,
  );
  if (changeIndex !== -1) {
    const change = events[changeIndex];
    return {
      inning: change.inning,
      half: toHalf(change.isTopInning),
      outs: change.outs,
      runners: toRunners(change),
      atInningStart: !hasPlateAppearanceBefore(events, changeIndex),
    };
  }

  const firstIndex = events.findIndex(
    (event) =>
      event.type === GameEventType.PLATE_APPEARANCE &&
      event.pitcherId === playerId,
  );
  if (firstIndex === -1) return null;
  const first = events[firstIndex];
  const previous = findPreviousInSameHalf(events, firstIndex);
  if (!previous) {
    return {
      inning: first.inning,
      half: toHalf(first.isTopInning),
      outs: 0,
      runners: [],
      atInningStart: true,
    };
  }
  return {
    inning: first.inning,
    half: toHalf(first.isTopInning),
    outs: previous.outs,
    runners: toRunners(previous),
    atInningStart: false,
  };
}

function isSameHalf(a: GameEvent, b: GameEvent): boolean {
  return a.inning === b.inning && a.isTopInning === b.isTopInning;
}

function hasPlateAppearanceBefore(events: GameEvent[], index: number): boolean {
  const target = events[index];
  return events
    .slice(0, index)
    .some(
      (event) =>
        event.type === GameEventType.PLATE_APPEARANCE &&
        isSameHalf(event, target),
    );
}

function findPreviousInSameHalf(
  events: GameEvent[],
  index: number,
): GameEvent | null {
  const target = events[index];
  for (let cursor = index - 1; cursor >= 0; cursor--) {
    if (!isSameHalf(events[cursor], target)) return null;
    if (events[cursor].type === GameEventType.PLATE_APPEARANCE) {
      return events[cursor];
    }
  }
  return null;
}

function toRunners(event: GameEvent): number[] | null {
  const bases = [
    event.runnerOnFirst,
    event.runnerOnSecond,
    event.runnerOnThird,
  ];
  if (bases.some((occupied) => occupied === null)) return null;
  return bases.flatMap((occupied, index) => (occupied ? [index + 1] : []));
}

/** "5.1"(5와 1/3이닝) → 16아웃 */
export function toOuts(inningsPitched: string | null): number | null {
  if (inningsPitched === null) return null;
  const match = /^(\d+)(?:\.(\d))?/.exec(String(inningsPitched));
  if (!match) return null;
  const thirds = Number(match[2] ?? 0);
  if (thirds > 2) return null;
  return Number(match[1]) * 3 + thirds;
}

function toDecision(stat: GameStat): PitcherDecision | null {
  if (stat.win) return 'WIN';
  if (stat.loss) return 'LOSS';
  if (stat.save) return 'SAVE';
  if (stat.hold) return 'HOLD';
  return null;
}
