/** `GET /game-summaries/:gameId` 응답. 필드 규칙은 Jira KAN-8 명세를 따른다. */

export type InningHalf = 'TOP' | 'BOTTOM';
export type PitcherRole = 'STARTER' | 'RELIEVER';
/** `/game-results/recent`의 결정 투수 값과 같다. */
export type PitcherDecision = 'WIN' | 'LOSS' | 'SAVE' | 'HOLD';

export interface LineScoreRowResponse {
  teamCode: string;
  /** 길이는 `inningCount`. 하지 않은 이닝은 null이고 앱은 그 칸을 비워 둔다 (이미 이긴 홈 팀의 9회말 등). */
  innings: (number | null)[];
  runs: number;
  hits: number;
  errors: number;
  walks: number;
}

export interface LineScoreResponse {
  inningCount: number;
  away: LineScoreRowResponse;
  home: LineScoreRowResponse;
}

export interface ScoringPlayResponse {
  inning: number;
  half: InningHalf;
  teamCode: string;
  description: string;
  homeScore: number;
  awayScore: number;
  /** 이 득점으로 리드한 팀이 바뀌었다. */
  isReversal: boolean;
  /** 이 득점으로 동점이 됐다. */
  isTying: boolean;
}

export interface PitcherEntryResponse {
  inning: number;
  half: InningHalf;
  /** 등판 때 아웃 수. 출처에 없으면 null. */
  outs: number | null;
  /** 등판 때 주자가 있는 루 번호(빈 배열 = 주자 없음). 출처에 없으면 null. */
  runners: number[] | null;
  /** 이닝 시작과 함께 등판했다 ("8회말 시작"). */
  atInningStart: boolean;
}

export interface PitcherAppearanceResponse {
  playerId: number | null;
  playerName: string;
  role: PitcherRole;
  /** 선발은 null */
  entry: PitcherEntryResponse | null;
  /** 잡은 아웃 수 (16 = 5.1이닝) */
  outs: number | null;
  pitchCount: number | null;
  runs: number | null;
  decision: PitcherDecision | null;
}

export interface PitchingResponse {
  away: PitcherAppearanceResponse[];
  home: PitcherAppearanceResponse[];
}

export interface PinchHitterSummaryResponse {
  teamCode: string;
  count: number;
  atBats: number;
  hits: number;
  rbi: number;
}

export interface PinchHitterAppearanceResponse {
  inning: number;
  half: InningHalf;
  teamCode: string;
  playerId: number | null;
  playerName: string;
  replacedPlayerId: number | null;
  replacedPlayerName: string | null;
  /** 타석 결과가 없으면(타석 전에 이닝 종료, 다시 교체) 아래 결과 필드는 null·false·0 */
  pitcherId: number | null;
  pitcherName: string | null;
  resultText: string | null;
  isHit: boolean;
  /** 그 타석 전후 점수 차로 계산한 타점. 점수를 모르면 null. */
  rbi: number | null;
}

export interface PinchHittersResponse {
  summary: {
    away: PinchHitterSummaryResponse;
    home: PinchHitterSummaryResponse;
  };
  appearances: PinchHitterAppearanceResponse[];
}

export interface GameSummaryResponse {
  gameId: string;
  homeTeamCode: string;
  awayTeamCode: string;
  lineScore: LineScoreResponse;
  scoringPlays: ScoringPlayResponse[];
  pitching: PitchingResponse;
  pinchHitters: PinchHittersResponse;
}
