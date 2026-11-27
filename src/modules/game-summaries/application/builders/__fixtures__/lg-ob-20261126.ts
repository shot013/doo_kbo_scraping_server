import {
  GameEvent,
  GameEventProps,
  GameEventType,
} from '../../../../game-events/domain/entities/game-event.entity';
import { GameLineScore } from '../../../../game-line-scores/domain/entities/game-line-score.entity';
import {
  GameStat,
  GameStatProps,
  PlayerStatType,
} from '../../../../game-stats/domain/entities/game-stat.entity';
import { SummaryContext } from '../relay-text';

/**
 * 디자인(figma-sample/game-summary-workflow)의 예시 경기 LG 5:3 두산(2026-11-26)을
 * 문자중계 이벤트로 옮긴 픽스처. 선수 이름은 디자인과 같은 가상 이름이다.
 */
export const GAME_ID = '20261126OBLG0';
export const HOME = 'LG';
export const AWAY = 'OB';

const BATTERS: [number, string, string][] = [
  [101, '최유격', AWAY],
  [102, '오른손', AWAY],
  [103, '민포수', AWAY],
  [104, '장대타', AWAY],
  [105, '윤대주', AWAY],
  [201, '구유격', HOME],
  [202, '정내야', HOME],
  [203, '노우익', HOME],
  [204, '표중견', HOME],
  [205, '김타자', HOME],
];

const PITCHERS: [number, string, string, Partial<GameStatProps>][] = [
  [
    301,
    '정두산',
    AWAY,
    { inningsPitched: '5.1', pitchCount: 96, runsAllowed: 4, loss: true },
  ],
  [
    302,
    '이불펜',
    AWAY,
    { inningsPitched: '1.2', pitchCount: 22, runsAllowed: 0 },
  ],
  [
    303,
    '홍좌완',
    AWAY,
    { inningsPitched: '1.0', pitchCount: 18, runsAllowed: 1 },
  ],
  [
    401,
    '남선발',
    HOME,
    { inningsPitched: '5.0', pitchCount: 88, runsAllowed: 3 },
  ],
  [
    402,
    '김직관',
    HOME,
    { inningsPitched: '4.0', pitchCount: 51, runsAllowed: 0, win: true },
  ],
];

function stat(props: Partial<GameStatProps>): GameStat {
  const now = new Date('2026-11-26T13:00:00Z');
  return new GameStat({
    id: 0,
    gameId: GAME_ID,
    teamCode: HOME,
    playerName: '',
    playerNo: null,
    playerId: null,
    statType: PlayerStatType.BATTING,
    atBats: null,
    hits: null,
    doubles: null,
    triples: null,
    homeRuns: null,
    rbi: null,
    runs: null,
    walks: null,
    hitByPitch: null,
    strikeouts: null,
    stolenBases: null,
    battingAverage: null,
    atBatsAgainst: null,
    inningsPitched: null,
    hitsAllowed: null,
    earnedRuns: null,
    strikeoutsPitched: null,
    walksAllowed: null,
    homeRunsAllowed: null,
    win: false,
    loss: false,
    save: false,
    hold: false,
    era: null,
    runsAllowed: null,
    pitchCount: null,
    appearanceOrder: null,
    rawStats: null,
    createdAt: now,
    updatedAt: now,
    ...props,
  });
}

/** 등판 순서(appearanceOrder)가 없는 박스스코어. 투수는 일부러 등판 순서와 다르게 섞어 둔다. */
export function buildStats(withAppearanceOrder = false): GameStat[] {
  const batting = BATTERS.map(([playerId, playerName, teamCode]) =>
    stat({ playerId, playerName, teamCode }),
  );
  const order: Record<number, number> = {
    301: 1,
    302: 2,
    303: 3,
    401: 1,
    402: 2,
  };
  const pitching = [...PITCHERS]
    .reverse()
    .map(([playerId, playerName, teamCode, props]) =>
      stat({
        playerId,
        playerName,
        teamCode,
        statType: PlayerStatType.PITCHING,
        appearanceOrder: withAppearanceOrder ? order[playerId] : null,
        ...props,
      }),
    );
  return [...batting, ...pitching];
}

export function buildContext(stats: GameStat[] = buildStats()): SummaryContext {
  return {
    homeTeamCode: HOME,
    awayTeamCode: AWAY,
    nameById: new Map(
      stats
        .filter((row) => row.playerId !== null)
        .map((row) => [row.playerId as number, row.playerName]),
    ),
  };
}

type EventInput = Partial<GameEventProps> &
  Pick<GameEventProps, 'sequenceNo' | 'inning' | 'isTopInning' | 'type'> & {
    score: [number, number];
    runners?: number[];
  };

export function event(input: EventInput): GameEvent {
  const { score, runners = [], ...rest } = input;
  return new GameEvent({
    id: 0,
    gameId: GAME_ID,
    seasonYear: 2026,
    subSequenceNo: 0,
    text: '',
    battingTeamCode: input.isTopInning ? AWAY : HOME,
    outs: 0,
    runnerOnFirst: runners.includes(1),
    runnerOnSecond: runners.includes(2),
    runnerOnThird: runners.includes(3),
    homeScore: score[0],
    awayScore: score[1],
    batterId: null,
    pitcherId: null,
    inPlayerId: null,
    inPlayerName: null,
    outPlayerId: null,
    outPlayerName: null,
    createdAt: new Date('2026-11-26T13:00:00Z'),
    ...rest,
  });
}

const PA = GameEventType.PLATE_APPEARANCE;

/** 점수는 [홈, 원정] */
export function buildEvents(): GameEvent[] {
  return [
    event({
      sequenceNo: 10,
      inning: 1,
      isTopInning: false,
      type: PA,
      text: '구유격 : 중전 1루타',
      batterId: 201,
      pitcherId: 301,
      score: [1, 0],
    }),
    event({
      sequenceNo: 20,
      inning: 2,
      isTopInning: true,
      type: PA,
      text: '최유격 : 좌월 홈런 (홈런거리:115M)',
      batterId: 101,
      pitcherId: 401,
      score: [1, 1],
    }),
    event({
      sequenceNo: 50,
      inning: 5,
      isTopInning: true,
      type: PA,
      text: '오른손 : 우중간 2루타',
      batterId: 102,
      pitcherId: 401,
      score: [1, 3],
    }),
    event({
      sequenceNo: 59,
      inning: 6,
      isTopInning: true,
      type: GameEventType.PITCHER_CHANGE,
      text: '투수 남선발 : 투수 김직관(으)로 교체',
      inPlayerId: 402,
      inPlayerName: '김직관',
      outPlayerId: 401,
      outPlayerName: '남선발',
      score: [1, 3],
    }),
    event({
      sequenceNo: 60,
      inning: 6,
      isTopInning: true,
      type: PA,
      text: '최유격 : 유격수 땅볼 아웃',
      batterId: 101,
      pitcherId: 402,
      outs: 1,
      score: [1, 3],
    }),
    event({
      sequenceNo: 63,
      inning: 6,
      isTopInning: false,
      type: PA,
      text: '구유격 : 좌전 1루타',
      batterId: 201,
      pitcherId: 301,
      runners: [1],
      score: [1, 3],
    }),
    event({
      sequenceNo: 64,
      inning: 6,
      isTopInning: false,
      type: PA,
      text: '김타자 : 헛스윙 삼진',
      batterId: 205,
      pitcherId: 301,
      outs: 1,
      runners: [1],
      score: [1, 3],
    }),
    event({
      sequenceNo: 65,
      subSequenceNo: 0,
      inning: 6,
      isTopInning: false,
      type: GameEventType.PITCHER_CHANGE,
      text: '투수 정두산 : 투수 이불펜(으)로 교체',
      inPlayerId: 302,
      outPlayerId: 301,
      outs: 1,
      runners: [1],
      score: [1, 3],
    }),
    event({
      sequenceNo: 65,
      subSequenceNo: 1,
      inning: 6,
      isTopInning: false,
      type: PA,
      text: '노우익 : 볼넷',
      batterId: 203,
      pitcherId: 302,
      outs: 1,
      runners: [1, 2],
      score: [1, 3],
    }),
    event({
      sequenceNo: 66,
      inning: 6,
      isTopInning: false,
      type: PA,
      text: '정내야 : 좌월 홈런 (홈런거리:120M)',
      batterId: 202,
      pitcherId: 302,
      outs: 1,
      score: [4, 3],
    }),
    event({
      sequenceNo: 70,
      subSequenceNo: 0,
      inning: 7,
      isTopInning: true,
      type: GameEventType.PINCH_HITTER,
      text: '3번타자 민포수 : 대타 장대타(으)로 교체',
      inPlayerId: 104,
      outPlayerId: 103,
      score: [4, 3],
    }),
    event({
      sequenceNo: 70,
      subSequenceNo: 1,
      inning: 7,
      isTopInning: true,
      type: PA,
      text: '장대타 : 헛스윙 삼진',
      batterId: 104,
      pitcherId: 402,
      outs: 1,
      score: [4, 3],
    }),
    event({
      sequenceNo: 80,
      inning: 8,
      isTopInning: false,
      type: GameEventType.PITCHER_CHANGE,
      text: '투수 이불펜 : 투수 홍좌완(으)로 교체',
      inPlayerId: 303,
      outPlayerId: 302,
      score: [4, 3],
    }),
    event({
      sequenceNo: 81,
      inning: 8,
      isTopInning: false,
      type: PA,
      text: '구유격 : 볼넷',
      batterId: 201,
      pitcherId: 303,
      runners: [1],
      score: [4, 3],
    }),
    event({
      sequenceNo: 82,
      subSequenceNo: 0,
      inning: 8,
      isTopInning: false,
      type: GameEventType.PINCH_HITTER,
      text: '3번타자 노우익 : 대타 표중견(으)로 교체',
      inPlayerId: 204,
      outPlayerId: 203,
      runners: [1],
      score: [4, 3],
    }),
    event({
      sequenceNo: 82,
      subSequenceNo: 1,
      inning: 8,
      isTopInning: false,
      type: PA,
      text: '표중견 : 우중간 2루타',
      batterId: 204,
      pitcherId: 303,
      runners: [2],
      score: [5, 3],
    }),
    event({
      sequenceNo: 90,
      subSequenceNo: 0,
      inning: 9,
      isTopInning: true,
      type: GameEventType.PINCH_HITTER,
      text: '2번타자 오른손 : 대타 윤대주(으)로 교체',
      inPlayerId: 105,
      outPlayerId: 102,
      score: [5, 3],
    }),
    event({
      sequenceNo: 90,
      subSequenceNo: 1,
      inning: 9,
      isTopInning: true,
      type: PA,
      text: '윤대주 : 유격수 땅볼 아웃',
      batterId: 105,
      pitcherId: 402,
      outs: 3,
      score: [5, 3],
    }),
  ];
}

export function buildLineScores(): GameLineScore[] {
  const now = new Date('2026-11-26T13:00:00Z');
  const base = {
    id: 0,
    gameId: GAME_ID,
    scrapedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  return [
    new GameLineScore({
      ...base,
      teamCode: HOME,
      isHome: true,
      innings: [1, 0, 0, 0, 0, 3, 0, 1, null],
      runs: 5,
      hits: 10,
      errors: 0,
      walks: 4,
    }),
    new GameLineScore({
      ...base,
      teamCode: AWAY,
      isHome: false,
      innings: [0, 1, 0, 0, 2, 0, 0, 0, 0],
      runs: 3,
      hits: 8,
      errors: 1,
      walks: 3,
    }),
  ];
}
