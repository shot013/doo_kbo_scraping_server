export interface StandingProps {
  id: number;
  seasonYear: number;
  teamCode: string;
  teamName: string;
  rank: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: string;
  gamesBehind: string | null;
  streak: string | null;
  last10: string | null;
  homeRecord: string | null;
  awayRecord: string | null;
  calculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class Standing {
  readonly id: number;
  readonly seasonYear: number;
  readonly teamCode: string;
  readonly teamName: string;
  readonly rank: number;
  readonly gamesPlayed: number;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly winRate: string;
  readonly gamesBehind: string | null;
  readonly streak: string | null;
  readonly last10: string | null;
  readonly homeRecord: string | null;
  readonly awayRecord: string | null;
  readonly calculatedAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: StandingProps) {
    Object.assign(this, props);
  }
}
