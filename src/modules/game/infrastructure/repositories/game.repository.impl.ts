import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import {
  buildPaginatedResult,
  normalizePagination,
  normalizeSortOrder,
  PaginatedResult,
} from '../../../../common/pagination/pagination';
import { Game, GameStatus } from '../../domain/entities/game.entity';
import {
  GameFilter,
  GameRepository,
  GameSortField,
  TeamRunsAggregate,
} from '../../domain/repositories/game.repository';
import { GameOrmEntity } from '../orm/game.orm-entity';

const SORT_FIELD_MAP: Record<GameSortField, keyof GameOrmEntity> = {
  scheduledAt: 'scheduledAt',
  gameDate: 'gameDate',
  seasonYear: 'seasonYear',
  homeScore: 'homeScore',
  awayScore: 'awayScore',
};

interface RawTeamRunsAggregateRow {
  teamCode: string;
  runsScored: string | null;
  runsAllowed: string | null;
}

@Injectable()
export class GameRepositoryImpl implements GameRepository {
  constructor(
    @InjectRepository(GameOrmEntity)
    private readonly ormRepository: Repository<GameOrmEntity>,
  ) {}

  async findAll(filter: GameFilter = {}): Promise<PaginatedResult<Game>> {
    const baseWhere: FindOptionsWhere<GameOrmEntity> = {};
    if (filter.seasonYear !== undefined)
      baseWhere.seasonYear = filter.seasonYear;
    if (filter.gameDate !== undefined) baseWhere.gameDate = filter.gameDate;
    if (filter.status !== undefined) baseWhere.status = filter.status;

    const where:
      FindOptionsWhere<GameOrmEntity> | FindOptionsWhere<GameOrmEntity>[] =
      filter.teamCode
        ? [
            { ...baseWhere, homeTeamCode: filter.teamCode },
            { ...baseWhere, awayTeamCode: filter.teamCode },
          ]
        : baseWhere;

    const { page, limit, skip } = normalizePagination(filter);
    const sortField =
      SORT_FIELD_MAP[filter.sortBy as GameSortField] ?? 'scheduledAt';
    const sortOrder = normalizeSortOrder(filter.sortOrder);

    const [rows, total] = await this.ormRepository.findAndCount({
      where,
      order: { [sortField]: sortOrder },
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

  async findById(id: string): Promise<Game | null> {
    const row = await this.ormRepository.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async upsert(game: Game): Promise<Game> {
    const saved = await this.ormRepository.save(this.toOrm(game));
    return this.toDomain(saved);
  }

  async upsertMany(games: Game[]): Promise<void> {
    if (games.length === 0) return;
    await this.ormRepository.upsert(
      games.map((game) => this.toOrm(game)),
      { conflictPaths: ['id'] },
    );
  }

  async findRecentFinished(teamCode: string, limit: number): Promise<Game[]> {
    const rows = await this.ormRepository.find({
      where: [
        { homeTeamCode: teamCode, status: GameStatus.FINISHED },
        { awayTeamCode: teamCode, status: GameStatus.FINISHED },
      ],
      order: { scheduledAt: 'DESC' },
      take: limit,
    });
    return rows.map((row) => this.toDomain(row));
  }

  async aggregateTeamRuns(seasonYear: number): Promise<TeamRunsAggregate[]> {
    const sql = `
      SELECT
        team_code AS "teamCode",
        SUM(runs_scored)::int AS "runsScored",
        SUM(runs_allowed)::int AS "runsAllowed"
      FROM (
        SELECT home_team_code AS team_code, home_score AS runs_scored, away_score AS runs_allowed
        FROM games WHERE season_year = $1 AND status = 'FINISHED'
        UNION ALL
        SELECT away_team_code AS team_code, away_score AS runs_scored, home_score AS runs_allowed
        FROM games WHERE season_year = $1 AND status = 'FINISHED'
      ) t
      GROUP BY team_code
    `;
    const rows = await this.ormRepository.query<RawTeamRunsAggregateRow[]>(
      sql,
      [seasonYear],
    );
    return rows.map((row) => ({
      teamCode: row.teamCode,
      runsScored: Number(row.runsScored) || 0,
      runsAllowed: Number(row.runsAllowed) || 0,
    }));
  }

  private toDomain(row: GameOrmEntity): Game {
    return new Game({ ...row });
  }

  private toOrm(game: Game): GameOrmEntity {
    return Object.assign(new GameOrmEntity(), game);
  }
}
