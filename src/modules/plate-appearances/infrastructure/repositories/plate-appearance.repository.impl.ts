import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlateAppearance } from '../../domain/entities/plate-appearance.entity';
import {
  BatterVsPitcherSplit,
  PitcherVsBatterSplit,
  PlateAppearanceRepository,
} from '../../domain/repositories/plate-appearance.repository';
import { PlateAppearanceOrmEntity } from '../orm/plate-appearance.orm-entity';

interface RawBatterVsPitcherRow {
  pitcherId: string;
  pitcherName: string;
  pitcherTeamCode: string;
  atBats: string;
  hits: string;
}

interface RawPitcherVsBatterRow {
  batterId: string;
  batterName: string;
  batterTeamCode: string;
  atBats: string;
  strikeouts: string;
}

@Injectable()
export class PlateAppearanceRepositoryImpl implements PlateAppearanceRepository {
  constructor(
    @InjectRepository(PlateAppearanceOrmEntity)
    private readonly ormRepository: Repository<PlateAppearanceOrmEntity>,
  ) {}

  async upsert(plateAppearance: PlateAppearance): Promise<PlateAppearance> {
    const existing = await this.ormRepository.findOne({
      where: {
        gameId: plateAppearance.gameId,
        sequenceNo: plateAppearance.sequenceNo,
      },
    });
    const orm = this.toOrm(plateAppearance);
    if (existing) {
      orm.id = existing.id;
    }
    const saved = await this.ormRepository.save(orm);
    return this.toDomain(saved);
  }

  async upsertMany(plateAppearances: PlateAppearance[]): Promise<void> {
    if (plateAppearances.length === 0) return;
    await this.ormRepository.upsert(
      plateAppearances.map((plateAppearance) => this.toOrm(plateAppearance)),
      { conflictPaths: ['gameId', 'sequenceNo'] },
    );
  }

  async findBatterVsPitcherSplits(
    batterId: number,
    seasonYear: number,
  ): Promise<BatterVsPitcherSplit[]> {
    const sql = `
      SELECT
        pa.pitcher_id AS "pitcherId",
        pa.pitcher_name AS "pitcherName",
        pa.pitcher_team_code AS "pitcherTeamCode",
        COUNT(*) FILTER (WHERE pa.is_at_bat)::int AS "atBats",
        COUNT(*) FILTER (WHERE pa.result = 'HIT')::int AS hits
      FROM plate_appearances pa
      WHERE pa.batter_id = $1 AND pa.season_year = $2 AND pa.pitcher_id IS NOT NULL
      GROUP BY pa.pitcher_id, pa.pitcher_name, pa.pitcher_team_code
      HAVING COUNT(*) FILTER (WHERE pa.is_at_bat) > 0
      ORDER BY (COUNT(*) FILTER (WHERE pa.result = 'HIT')::decimal
        / NULLIF(COUNT(*) FILTER (WHERE pa.is_at_bat), 0)) DESC
    `;
    const rows = await this.ormRepository.query<RawBatterVsPitcherRow[]>(sql, [
      batterId,
      seasonYear,
    ]);
    return rows.map((row) => {
      const atBats = Number(row.atBats);
      const hits = Number(row.hits);
      return {
        pitcherId: Number(row.pitcherId),
        pitcherName: row.pitcherName,
        pitcherTeamCode: row.pitcherTeamCode,
        atBats,
        hits,
        battingAverage: (atBats > 0 ? hits / atBats : 0).toFixed(3),
      };
    });
  }

  async findPitcherVsBatterSplits(
    pitcherId: number,
    seasonYear: number,
  ): Promise<PitcherVsBatterSplit[]> {
    const sql = `
      SELECT
        pa.batter_id AS "batterId",
        pa.batter_name AS "batterName",
        pa.batter_team_code AS "batterTeamCode",
        COUNT(*) FILTER (WHERE pa.is_at_bat)::int AS "atBats",
        COUNT(*) FILTER (WHERE pa.result = 'STRIKEOUT')::int AS strikeouts
      FROM plate_appearances pa
      WHERE pa.pitcher_id = $1 AND pa.season_year = $2 AND pa.batter_id IS NOT NULL
      GROUP BY pa.batter_id, pa.batter_name, pa.batter_team_code
      HAVING COUNT(*) FILTER (WHERE pa.is_at_bat) > 0
      ORDER BY (COUNT(*) FILTER (WHERE pa.result = 'STRIKEOUT')::decimal
        / NULLIF(COUNT(*) FILTER (WHERE pa.is_at_bat), 0)) DESC
    `;
    const rows = await this.ormRepository.query<RawPitcherVsBatterRow[]>(sql, [
      pitcherId,
      seasonYear,
    ]);
    return rows.map((row) => {
      const atBats = Number(row.atBats);
      const strikeouts = Number(row.strikeouts);
      return {
        batterId: Number(row.batterId),
        batterName: row.batterName,
        batterTeamCode: row.batterTeamCode,
        atBats,
        strikeouts,
        strikeoutRate: (atBats > 0 ? strikeouts / atBats : 0).toFixed(3),
      };
    });
  }

  private toDomain(row: PlateAppearanceOrmEntity): PlateAppearance {
    return new PlateAppearance({ ...row });
  }

  private toOrm(plateAppearance: PlateAppearance): PlateAppearanceOrmEntity {
    const orm = Object.assign(new PlateAppearanceOrmEntity(), plateAppearance);
    if (!plateAppearance.id) {
      delete (orm as { id?: number }).id;
    }
    return orm;
  }
}
