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
  /** 여러 경기의 박스스코어 전체(타자+투수)를 한 번에 조회한다. */
  findByGameIds(gameIds: string[]): Promise<GameStat[]>;
}
