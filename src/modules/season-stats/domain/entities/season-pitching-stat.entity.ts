export interface SeasonPitchingStatProps {
  id: number;
  seasonYear: number;
  teamCode: string;
  teamName: string;
  playerName: string;
  rank: number;
  era: string | null;
  games: number;
  wins: number;
  losses: number;
  saves: number;
  holds: number;
  winPct: string | null;
  inningsPitched: string;
  hitsAllowed: number;
  homeRunsAllowed: number;
  walksAllowed: number;
  hitByPitch: number;
  strikeoutsPitched: number;
  runsAllowed: number;
  earnedRuns: number;
  whip: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class SeasonPitchingStat {
  readonly id: number;
  readonly seasonYear: number;
  readonly teamCode: string;
  readonly teamName: string;
  readonly playerName: string;
  readonly rank: number;
  readonly era: string | null;
  readonly games: number;
  readonly wins: number;
  readonly losses: number;
  readonly saves: number;
  readonly holds: number;
  readonly winPct: string | null;
  readonly inningsPitched: string;
  readonly hitsAllowed: number;
  readonly homeRunsAllowed: number;
  readonly walksAllowed: number;
  readonly hitByPitch: number;
  readonly strikeoutsPitched: number;
  readonly runsAllowed: number;
  readonly earnedRuns: number;
  readonly whip: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: SeasonPitchingStatProps) {
    Object.assign(this, props);
  }
}
