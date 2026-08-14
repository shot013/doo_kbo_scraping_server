import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SeasonBattingStat } from '../../domain/entities/season-batting-stat.entity';
import {
  SeasonBattingStatFilter,
  SeasonBattingStatRepository,
} from '../../domain/repositories/season-batting-stat.repository';
import { SeasonBattingStatOrmEntity } from '../orm/season-batting-stat.orm-entity';

@Injectable()
export class SeasonBattingStatRepositoryImpl implements SeasonBattingStatRepository {
  constructor(
    @InjectRepository(SeasonBattingStatOrmEntity)
    private readonly ormRepository: Repository<SeasonBattingStatOrmEntity>,
  ) {}

  async findBySeasonYear(
    filter: SeasonBattingStatFilter,
  ): Promise<SeasonBattingStat[]> {
    const rows = await this.ormRepository.find({
      where: { seasonYear: filter.seasonYear },
      order: { rank: 'ASC' },
      take: filter.limit,
    });
    return rows.map((row) => this.toDomain(row));
  }

  async upsert(stat: SeasonBattingStat): Promise<SeasonBattingStat> {
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

  private toDomain(row: SeasonBattingStatOrmEntity): SeasonBattingStat {
    return new SeasonBattingStat({ ...row });
  }

  private toOrm(stat: SeasonBattingStat): SeasonBattingStatOrmEntity {
    const orm = Object.assign(new SeasonBattingStatOrmEntity(), stat);
    if (!stat.id) {
      delete (orm as { id?: number }).id;
    }
    return orm;
  }
}
