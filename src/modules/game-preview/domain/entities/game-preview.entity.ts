export interface GamePreviewProps {
  gameId: string;
  awayTeamRecord: string | null;
  awayRecentForm: string | null;
  awayTeamEra: string | null;
  awayTeamBattingAverage: string | null;
  awayTeamAvgRunsScored: string | null;
  awayTeamAvgRunsAllowed: string | null;
  homeTeamRecord: string | null;
  homeRecentForm: string | null;
  homeTeamEra: string | null;
  homeTeamBattingAverage: string | null;
  homeTeamAvgRunsScored: string | null;
  homeTeamAvgRunsAllowed: string | null;
  awayPitcherStyle: string | null;
  awayPitcherSeasonRecord: string | null;
  awayPitcherHeadToHeadRecord: string | null;
  awayPitcherEra: string | null;
  awayPitcherWar: string | null;
  awayPitcherGames: string | null;
  awayPitcherAvgInnings: string | null;
  awayPitcherQualityStarts: string | null;
  awayPitcherWhip: string | null;
  homePitcherStyle: string | null;
  homePitcherSeasonRecord: string | null;
  homePitcherHeadToHeadRecord: string | null;
  homePitcherEra: string | null;
  homePitcherWar: string | null;
  homePitcherGames: string | null;
  homePitcherAvgInnings: string | null;
  homePitcherQualityStarts: string | null;
  homePitcherWhip: string | null;
  scrapedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * KBO GameCenter 프리뷰 탭(경기 시작 전에만 노출)의 팀 전력비교 + 선발투수 매치업 기록.
 * gameId 1:1로 매핑되며, 경기가 시작된 이후에는 더 이상 갱신되지 않고 마지막 스크랩 값이 유지된다.
 */
export class GamePreview {
  readonly gameId: string;
  readonly awayTeamRecord: string | null;
  readonly awayRecentForm: string | null;
  readonly awayTeamEra: string | null;
  readonly awayTeamBattingAverage: string | null;
  readonly awayTeamAvgRunsScored: string | null;
  readonly awayTeamAvgRunsAllowed: string | null;
  readonly homeTeamRecord: string | null;
  readonly homeRecentForm: string | null;
  readonly homeTeamEra: string | null;
  readonly homeTeamBattingAverage: string | null;
  readonly homeTeamAvgRunsScored: string | null;
  readonly homeTeamAvgRunsAllowed: string | null;
  readonly awayPitcherStyle: string | null;
  readonly awayPitcherSeasonRecord: string | null;
  readonly awayPitcherHeadToHeadRecord: string | null;
  readonly awayPitcherEra: string | null;
  readonly awayPitcherWar: string | null;
  readonly awayPitcherGames: string | null;
  readonly awayPitcherAvgInnings: string | null;
  readonly awayPitcherQualityStarts: string | null;
  readonly awayPitcherWhip: string | null;
  readonly homePitcherStyle: string | null;
  readonly homePitcherSeasonRecord: string | null;
  readonly homePitcherHeadToHeadRecord: string | null;
  readonly homePitcherEra: string | null;
  readonly homePitcherWar: string | null;
  readonly homePitcherGames: string | null;
  readonly homePitcherAvgInnings: string | null;
  readonly homePitcherQualityStarts: string | null;
  readonly homePitcherWhip: string | null;
  readonly scrapedAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: GamePreviewProps) {
    this.gameId = props.gameId;
    this.awayTeamRecord = props.awayTeamRecord;
    this.awayRecentForm = props.awayRecentForm;
    this.awayTeamEra = props.awayTeamEra;
    this.awayTeamBattingAverage = props.awayTeamBattingAverage;
    this.awayTeamAvgRunsScored = props.awayTeamAvgRunsScored;
    this.awayTeamAvgRunsAllowed = props.awayTeamAvgRunsAllowed;
    this.homeTeamRecord = props.homeTeamRecord;
    this.homeRecentForm = props.homeRecentForm;
    this.homeTeamEra = props.homeTeamEra;
    this.homeTeamBattingAverage = props.homeTeamBattingAverage;
    this.homeTeamAvgRunsScored = props.homeTeamAvgRunsScored;
    this.homeTeamAvgRunsAllowed = props.homeTeamAvgRunsAllowed;
    this.awayPitcherStyle = props.awayPitcherStyle;
    this.awayPitcherSeasonRecord = props.awayPitcherSeasonRecord;
    this.awayPitcherHeadToHeadRecord = props.awayPitcherHeadToHeadRecord;
    this.awayPitcherEra = props.awayPitcherEra;
    this.awayPitcherWar = props.awayPitcherWar;
    this.awayPitcherGames = props.awayPitcherGames;
    this.awayPitcherAvgInnings = props.awayPitcherAvgInnings;
    this.awayPitcherQualityStarts = props.awayPitcherQualityStarts;
    this.awayPitcherWhip = props.awayPitcherWhip;
    this.homePitcherStyle = props.homePitcherStyle;
    this.homePitcherSeasonRecord = props.homePitcherSeasonRecord;
    this.homePitcherHeadToHeadRecord = props.homePitcherHeadToHeadRecord;
    this.homePitcherEra = props.homePitcherEra;
    this.homePitcherWar = props.homePitcherWar;
    this.homePitcherGames = props.homePitcherGames;
    this.homePitcherAvgInnings = props.homePitcherAvgInnings;
    this.homePitcherQualityStarts = props.homePitcherQualityStarts;
    this.homePitcherWhip = props.homePitcherWhip;
    this.scrapedAt = props.scrapedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
