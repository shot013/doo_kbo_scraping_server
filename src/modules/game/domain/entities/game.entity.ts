export enum GameStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED',
  POSTPONED = 'POSTPONED',
}

/** 시즌 단위 기록(순위표 집계, 선수 상대 성적, 매치업, 최근 폼)은 REGULAR만 대상으로 한다. */
export enum GameSeries {
  REGULAR = 'REGULAR',
  WILDCARD = 'WILDCARD',
  SEMI_PLAYOFF = 'SEMI_PLAYOFF',
  PLAYOFF = 'PLAYOFF',
  KOREAN_SERIES = 'KOREAN_SERIES',
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
  homeStarterPitcher: string | null;
  awayStarterPitcher: string | null;
  currentInning: string | null;
  status: GameStatus;
  series: GameSeries;
  /** 포스트시즌 시리즈 내 차전(예: KS 3차전 → 3). 정규시즌은 null. */
  seriesGameNumber: number | null;
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
  readonly homeStarterPitcher: string | null;
  readonly awayStarterPitcher: string | null;
  readonly currentInning: string | null;
  readonly status: GameStatus;
  readonly series: GameSeries;
  readonly seriesGameNumber: number | null;
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
    this.homeStarterPitcher = props.homeStarterPitcher;
    this.awayStarterPitcher = props.awayStarterPitcher;
    this.currentInning = props.currentInning;
    this.status = props.status;
    this.series = props.series;
    this.seriesGameNumber = props.seriesGameNumber;
    this.sourceUrl = props.sourceUrl;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
