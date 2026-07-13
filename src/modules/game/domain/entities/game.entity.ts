export enum GameStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED',
  POSTPONED = 'POSTPONED',
}

export interface GameProps {
  id: string;
  seasonYear: number;
  gameDate: string;
  scheduledAt: Date;
  stadium: string | null;
  homeTeamCode: string;
  homeTeamName: string;
  awayTeamCode: string;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
  currentInning: string | null;
  status: GameStatus;
  sourceUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Game {
  readonly id: string;
  readonly seasonYear: number;
  readonly gameDate: string;
  readonly scheduledAt: Date;
  readonly stadium: string | null;
  readonly homeTeamCode: string;
  readonly homeTeamName: string;
  readonly awayTeamCode: string;
  readonly awayTeamName: string;
  readonly homeScore: number | null;
  readonly awayScore: number | null;
  readonly currentInning: string | null;
  readonly status: GameStatus;
  readonly sourceUrl: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: GameProps) {
    this.id = props.id;
    this.seasonYear = props.seasonYear;
    this.gameDate = props.gameDate;
    this.scheduledAt = props.scheduledAt;
    this.stadium = props.stadium;
    this.homeTeamCode = props.homeTeamCode;
    this.homeTeamName = props.homeTeamName;
    this.awayTeamCode = props.awayTeamCode;
    this.awayTeamName = props.awayTeamName;
    this.homeScore = props.homeScore;
    this.awayScore = props.awayScore;
    this.currentInning = props.currentInning;
    this.status = props.status;
    this.sourceUrl = props.sourceUrl;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
