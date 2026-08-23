import {
  PaginatedResult,
  SortOrder,
} from '../../../../common/pagination/pagination';
import { GameStat, PlayerStatType } from '../entities/game-stat.entity';

export const GAME_STAT_REPOSITORY = Symbol('GAME_STAT_REPOSITORY');

/**
 * `game_stats`(개별 경기 박스스코어)를 시즌 단위로 GROUP BY 집계한 결과.
 * 선수 고유 id가 없는 소스 데이터 특성상 (teamCode, playerName) 조합이 키가 된다.
 */
export interface BattingAggregate {
  teamCode: string;
  playerName: string;
  games: number;
  atBats: number;
  hits: number;
  homeRuns: number;
  rbi: number;
  battingAverage: string;
}

export interface PitchingAggregate {
  teamCode: string;
  playerName: string;
  games: number;
  wins: number;
  losses: number;
  saves: number;
  earnedRuns: number;
  strikeoutsPitched: number;
  inningsPitched: string;
  era: string;
}

export interface StatAggregateFilter {
  seasonYear: number;
  teamCode?: string;
  playerName?: string;
  limit?: number;
}

/** `game_stats`를 팀 단위(선수 구분 없이)로 GROUP BY 집계한 결과. 팀 타율/평균자책 계산에 쓰인다. */
export interface TeamBattingAggregate {
  teamCode: string;
  atBats: number;
  hits: number;
  battingAverage: string;
}

export interface TeamPitchingAggregate {
  teamCode: string;
  earnedRuns: number;
  inningsPitched: string;
  era: string;
}

/**
 * 선수 한 명의 경기 기록을 상대팀 기준으로 GROUP BY 집계한 결과.
 * `game_stats.player_id`(스크래핑 소스의 KBO 선수 고유 id)로 직접 필터링하므로
 * `BattingAggregate`/`PitchingAggregate`와 달리 teamCode+playerName 매칭이 필요 없다.
 */
export interface OpponentBattingSplit {
  opponentTeamCode: string;
  games: number;
  atBats: number;
  hits: number;
  battingAverage: string;
}

export interface OpponentPitchingSplit {
  opponentTeamCode: string;
  games: number;
  atBatsAgainst: number;
  hitsAllowed: number;
  battingAverageAllowed: string;
}

export type GameStatSortField =
  | 'id'
  | 'teamCode'
  | 'playerName'
  | 'homeRuns'
  | 'rbi'
  | 'battingAverage'
  | 'era';

export interface GameStatFilter {
  gameId?: string;
  teamCode?: string;
  statType?: PlayerStatType;
  page?: number;
  limit?: number;
  sortBy?: GameStatSortField;
  sortOrder?: SortOrder;
}

export interface GameStatRepository {
  findAll(filter?: GameStatFilter): Promise<PaginatedResult<GameStat>>;
  findById(id: number): Promise<GameStat | null>;
  upsert(stat: GameStat): Promise<GameStat>;
  aggregateBatting(filter: StatAggregateFilter): Promise<BattingAggregate[]>;
  aggregatePitching(filter: StatAggregateFilter): Promise<PitchingAggregate[]>;
  aggregateTeamBatting(seasonYear: number): Promise<TeamBattingAggregate[]>;
  aggregateTeamPitching(seasonYear: number): Promise<TeamPitchingAggregate[]>;
  /** 여러 경기의 박스스코어 전체(타자+투수)를 한 번에 조회한다. */
  findByGameIds(gameIds: string[]): Promise<GameStat[]>;
  findOpponentBattingSplits(
    playerId: number,
    seasonYear: number,
  ): Promise<OpponentBattingSplit[]>;
  findOpponentPitchingSplits(
    playerId: number,
    seasonYear: number,
  ): Promise<OpponentPitchingSplit[]>;
}
