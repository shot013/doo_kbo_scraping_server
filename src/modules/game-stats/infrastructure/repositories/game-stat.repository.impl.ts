import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsOrder, In, Repository } from 'typeorm';
import {
  buildPaginatedResult,
  normalizePagination,
  normalizeSortOrder,
  PaginatedResult,
} from '../../../../common/pagination/pagination';
import { GameStat } from '../../domain/entities/game-stat.entity';
import {
  BattingAggregate,
  GameStatFilter,
  GameStatRepository,
  GameStatSortField,
  PitchingAggregate,
  StatAggregateFilter,
} from '../../domain/repositories/game-stat.repository';
import { GameStatOrmEntity } from '../orm/game-stat.orm-entity';

interface RawBattingAggregateRow {
  teamCode: string;
  playerName: string;
  games: string;
  atBats: string;
  hits: string;
  homeRuns: string;
  rbi: string;
}

interface RawPitchingAggregateRow {
  teamCode: string;
  playerName: string;
  games: string;
  wins: string;
  losses: string;
  saves: string;
  earnedRuns: string;
  strikeoutsPitched: string;
  totalOuts: string;
}

/** KBO 이닝 아웃카운트(N.0/N.1/N.2)를 total outs로 변환하는 SQL 표현식. */
const OUTS_EXPR =
  '(FLOOR(gs.innings_pitched) * 3 + ROUND((gs.innings_pitched - FLOOR(gs.innings_pitched)) * 10))';

const SORT_FIELD_MAP: Record<GameStatSortField, keyof GameStatOrmEntity> = {
  id: 'id',
  teamCode: 'teamCode',
  playerName: 'playerName',
  homeRuns: 'homeRuns',
  rbi: 'rbi',
  battingAverage: 'battingAverage',
  era: 'era',
};

@Injectable()
export class GameStatRepositoryImpl implements GameStatRepository {
  constructor(
    @InjectRepository(GameStatOrmEntity)
    private readonly ormRepository: Repository<GameStatOrmEntity>,
  ) {}

  async findAll(
    filter: GameStatFilter = {},
  ): Promise<PaginatedResult<GameStat>> {
    const where: Record<string, unknown> = {};
    if (filter.gameId !== undefined) where.gameId = filter.gameId;
    if (filter.teamCode !== undefined) where.teamCode = filter.teamCode;
    if (filter.statType !== undefined) where.statType = filter.statType;

    const { page, limit, skip } = normalizePagination(filter);
    const sortField = SORT_FIELD_MAP[filter.sortBy as GameStatSortField];
    const sortOrder = normalizeSortOrder(filter.sortOrder);

    const order: FindOptionsOrder<GameStatOrmEntity> = sortField
      ? sortField === 'id'
        ? { id: sortOrder }
        : { [sortField]: sortOrder, id: 'ASC' }
      : { teamCode: 'ASC', id: 'ASC' };

    const [rows, total] = await this.ormRepository.findAndCount({
      where,
      order,
      skip,
      take: limit,
    });

    return buildPaginatedResult(
      rows.map((row) => this.toDomain(row)),
      total,
      page,
      limit,
    );
  }

  async findByGameIds(gameIds: string[]): Promise<GameStat[]> {
    if (gameIds.length === 0) return [];
    const rows = await this.ormRepository.find({
      where: { gameId: In(gameIds) },
      order: { gameId: 'ASC', teamCode: 'ASC', id: 'ASC' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: number): Promise<GameStat | null> {
    const row = await this.ormRepository.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async upsert(stat: GameStat): Promise<GameStat> {
    const existing = await this.ormRepository.findOne({
      where: {
        gameId: stat.gameId,
        teamCode: stat.teamCode,
        playerName: stat.playerName,
        statType: stat.statType,
      },
    });
    const orm = this.toOrm(stat);
    if (existing) {
      orm.id = existing.id;
    }
    const saved = await this.ormRepository.save(orm);
    return this.toDomain(saved);
  }

  async aggregateBatting(
    filter: StatAggregateFilter,
  ): Promise<BattingAggregate[]> {
    const { sql, params } = buildAggregateQuery({
      statType: 'BATTING',
      filter,
      selectExtra: `
        SUM(gs.at_bats)::int AS "atBats",
        SUM(gs.hits)::int AS hits,
        SUM(gs.home_runs)::int AS "homeRuns",
        SUM(gs.rbi)::int AS rbi`,
      havingExpr: 'SUM(gs.at_bats) > 0',
      orderExpr: '(SUM(gs.hits)::decimal / NULLIF(SUM(gs.at_bats), 0)) DESC',
    });

    const rows = await this.ormRepository.query<RawBattingAggregateRow[]>(
      sql,
      params,
    );
    return rows.map((row) => {
      const atBats = Number(row.atBats);
      const hits = Number(row.hits);
      return {
        teamCode: row.teamCode,
        playerName: row.playerName,
        games: Number(row.games),
        atBats,
        hits,
        homeRuns: Number(row.homeRuns),
        rbi: Number(row.rbi),
        battingAverage: (atBats > 0 ? hits / atBats : 0).toFixed(3),
      };
    });
  }

  async aggregatePitching(
    filter: StatAggregateFilter,
  ): Promise<PitchingAggregate[]> {
    const { sql, params } = buildAggregateQuery({
      statType: 'PITCHING',
      filter,
      selectExtra: `
        SUM(CASE WHEN gs.win THEN 1 ELSE 0 END)::int AS wins,
        SUM(CASE WHEN gs.loss THEN 1 ELSE 0 END)::int AS losses,
        SUM(CASE WHEN gs.save THEN 1 ELSE 0 END)::int AS saves,
        SUM(gs.earned_runs)::int AS "earnedRuns",
        SUM(gs.strikeouts_pitched)::int AS "strikeoutsPitched",
        SUM(${OUTS_EXPR})::int AS "totalOuts"`,
      havingExpr: `SUM(${OUTS_EXPR}) > 0`,
      orderExpr: `(SUM(gs.earned_runs)::decimal * 27.0 / NULLIF(SUM(${OUTS_EXPR}), 0)) ASC`,
    });

    const rows = await this.ormRepository.query<RawPitchingAggregateRow[]>(
      sql,
      params,
    );
    return rows.map((row) => {
      const totalOuts = Number(row.totalOuts);
      const earnedRuns = Number(row.earnedRuns);
      const whole = Math.floor(totalOuts / 3);
      const remainder = totalOuts % 3;
      return {
        teamCode: row.teamCode,
        playerName: row.playerName,
        games: Number(row.games),
        wins: Number(row.wins),
        losses: Number(row.losses),
        saves: Number(row.saves),
        earnedRuns,
        strikeoutsPitched: Number(row.strikeoutsPitched),
        inningsPitched: `${whole}.${remainder}`,
        era: (totalOuts > 0 ? (earnedRuns * 27) / totalOuts : 0).toFixed(2),
      };
    });
  }

  private toDomain(row: GameStatOrmEntity): GameStat {
    return new GameStat({ ...row });
  }

  private toOrm(stat: GameStat): GameStatOrmEntity {
    const orm = Object.assign(new GameStatOrmEntity(), stat);
    if (!stat.id) {
      delete (orm as { id?: number }).id;
    }
    return orm;
  }
}

function buildAggregateQuery(options: {
  statType: 'BATTING' | 'PITCHING';
  filter: StatAggregateFilter;
  selectExtra: string;
  havingExpr: string;
  orderExpr: string;
}): { sql: string; params: unknown[] } {
  const { statType, filter, selectExtra, havingExpr, orderExpr } = options;
  const params: unknown[] = [statType, filter.seasonYear];
  let where = `gs.stat_type = $1 AND g.season_year = $2 AND g.status = 'FINISHED'`;

  if (filter.teamCode) {
    params.push(filter.teamCode);
    where += ` AND gs.team_code = $${params.length}`;
  }
  if (filter.playerName) {
    params.push(filter.playerName);
    where += ` AND gs.player_name = $${params.length}`;
  }

  let limitClause = '';
  if (filter.limit) {
    params.push(filter.limit);
    limitClause = ` LIMIT $${params.length}`;
  }

  const sql = `
    SELECT
      gs.team_code AS "teamCode",
      gs.player_name AS "playerName",
      COUNT(DISTINCT gs.game_id)::int AS games,
      ${selectExtra}
    FROM game_stats gs
    INNER JOIN games g ON g.id = gs.game_id
    WHERE ${where}
    GROUP BY gs.team_code, gs.player_name
    HAVING ${havingExpr}
    ORDER BY ${orderExpr}
    ${limitClause}
  `;

  return { sql, params };
}
