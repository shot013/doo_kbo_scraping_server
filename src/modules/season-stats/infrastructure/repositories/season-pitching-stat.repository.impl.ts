import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SeasonPitchingStat } from '../../domain/entities/season-pitching-stat.entity';
import {
  SeasonPitchingStatFilter,
  SeasonPitchingStatRepository,
} from '../../domain/repositories/season-pitching-stat.repository';
import { SeasonPitchingStatOrmEntity } from '../orm/season-pitching-stat.orm-entity';

@Injectable()
export class SeasonPitchingStatRepositoryImpl implements SeasonPitchingStatRepository {
  constructor(
    @InjectRepository(SeasonPitchingStatOrmEntity)
    private readonly ormRepository: Repository<SeasonPitchingStatOrmEntity>,
  ) {}

  async findBySeasonYear(
    filter: SeasonPitchingStatFilter,
  ): Promise<SeasonPitchingStat[]> {
    const rows = await this.ormRepository.find({
      where: { seasonYear: filter.seasonYear },
      order: { rank: 'ASC' },
      take: filter.limit,
    });
    return rows.map((row) => this.toDomain(row));
  }

  async upsert(stat: SeasonPitchingStat): Promise<SeasonPitchingStat> {
    const existing = await this.ormRepository.findOne({
      where: {
        seasonYear: stat.seasonYear,
        teamCode: stat.teamCode,
        playerName: stat.playerName,
      },
    });
    const orm = this.toOrm(stat);
    if (existing) {
      orm.id = existing.id;
    }
    const saved = await this.ormRepository.save(orm);
    return this.toDomain(saved);
  }

  private toDomain(row: SeasonPitchingStatOrmEntity): SeasonPitchingStat {
    return new SeasonPitchingStat({ ...row });
  }

  private toOrm(stat: SeasonPitchingStat): SeasonPitchingStatOrmEntity {
    const orm = Object.assign(new SeasonPitchingStatOrmEntity(), stat);
    if (!stat.id) {
      delete (orm as { id?: number }).id;
    }
    return orm;
  }
}
