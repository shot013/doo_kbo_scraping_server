export interface SeasonBattingStatProps {
  id: number;
  seasonYear: number;
  teamCode: string;
  teamName: string;
  playerName: string;
  rank: number;
  battingAverage: string;
  games: number;
  plateAppearances: number;
  atBats: number;
  runs: number;
  hits: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  totalBases: number;
  rbi: number;
  sacrificeHits: number;
  sacrificeFlies: number;
  createdAt: Date;
  updatedAt: Date;
}

export class SeasonBattingStat {
  readonly id: number;
  readonly seasonYear: number;
  readonly teamCode: string;
  readonly teamName: string;
  readonly playerName: string;
  readonly rank: number;
  readonly battingAverage: string;
  readonly games: number;
  readonly plateAppearances: number;
  readonly atBats: number;
  readonly runs: number;
  readonly hits: number;
  readonly doubles: number;
  readonly triples: number;
  readonly homeRuns: number;
  readonly totalBases: number;
  readonly rbi: number;
  readonly sacrificeHits: number;
  readonly sacrificeFlies: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: SeasonBattingStatProps) {
    Object.assign(this, props);
  }
}
