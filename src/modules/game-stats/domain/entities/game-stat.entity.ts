export enum PlayerStatType {
  BATTING = 'BATTING',
  PITCHING = 'PITCHING',
}

export interface GameStatProps {
  id: number;
  gameId: string;
  teamCode: string;
  playerName: string;
  playerNo: string | null;
  statType: PlayerStatType;
  // batting
  atBats: number | null;
  hits: number | null;
  doubles: number | null;
  triples: number | null;
  homeRuns: number | null;
  rbi: number | null;
  runs: number | null;
  walks: number | null;
  hitByPitch: number | null;
  strikeouts: number | null;
  stolenBases: number | null;
  battingAverage: string | null;
  // pitching
  inningsPitched: string | null;
  hitsAllowed: number | null;
  earnedRuns: number | null;
  strikeoutsPitched: number | null;
  walksAllowed: number | null;
  homeRunsAllowed: number | null;
  win: boolean;
  loss: boolean;
  save: boolean;
  hold: boolean;
  era: string | null;
  rawStats: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export class GameStat {
  readonly id: number;
  readonly gameId: string;
  readonly teamCode: string;
  readonly playerName: string;
  readonly playerNo: string | null;
  readonly statType: PlayerStatType;
  readonly atBats: number | null;
  readonly hits: number | null;
  readonly doubles: number | null;
  readonly triples: number | null;
  readonly homeRuns: number | null;
  readonly rbi: number | null;
  readonly runs: number | null;
  readonly walks: number | null;
  readonly hitByPitch: number | null;
  readonly strikeouts: number | null;
  readonly stolenBases: number | null;
  readonly battingAverage: string | null;
  readonly inningsPitched: string | null;
  readonly hitsAllowed: number | null;
  readonly earnedRuns: number | null;
  readonly strikeoutsPitched: number | null;
  readonly walksAllowed: number | null;
  readonly homeRunsAllowed: number | null;
  readonly win: boolean;
  readonly loss: boolean;
  readonly save: boolean;
  readonly hold: boolean;
  readonly era: string | null;
  readonly rawStats: Record<string, unknown> | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: GameStatProps) {
    Object.assign(this, props);
  }
}
