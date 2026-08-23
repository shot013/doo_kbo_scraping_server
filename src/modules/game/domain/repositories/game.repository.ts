import {
  PaginatedResult,
  SortOrder,
} from '../../../../common/pagination/pagination';
import { Game, GameStatus } from '../entities/game.entity';

export const GAME_REPOSITORY = Symbol('GAME_REPOSITORY');

export type GameSortField =
  'scheduledAt' | 'gameDate' | 'seasonYear' | 'homeScore' | 'awayScore';

export interface GameFilter {
  seasonYear?: number;
  gameDate?: string;
  status?: GameStatus;
  teamCode?: string;
  page?: number;
  limit?: number;
  sortBy?: GameSortField;
  sortOrder?: SortOrder;
}

/** 시즌 종료 경기의 홈/원정 점수를 팀 단위로 합산한 결과. 팀 득점/실점 계산에 쓰인다. */
export interface TeamRunsAggregate {
  teamCode: string;
  runsScored: number;
  runsAllowed: number;
}

export interface GameRepository {
  findAll(filter?: GameFilter): Promise<PaginatedResult<Game>>;
  findById(id: string): Promise<Game | null>;
  upsert(game: Game): Promise<Game>;
  /** 특정 팀의 최근 종료 경기를 최신순으로 조회한다. */
  findRecentFinished(teamCode: string, limit: number): Promise<Game[]>;
  aggregateTeamRuns(seasonYear: number): Promise<TeamRunsAggregate[]>;
}
