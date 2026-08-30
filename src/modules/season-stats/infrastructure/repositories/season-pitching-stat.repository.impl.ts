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
      where: {
        seasonYear: filter.seasonYear,
        ...(filter.qualifiedOnly ? { qualified: true } : {}),
      },
      // rank는 팀별 순회 스크래핑에서 팀 내 나열 순서로 매겨져 리그 전체 순위가 아니다.
      // 규정이닝 충족자만 볼 때는 KBO가 이미 규정이닝 기준으로 걸러준 목록이므로
      // 평균자책 오름차순 자체가 곧 리그 순위가 된다.
      order: filter.qualifiedOnly ? { era: 'ASC' } : { rank: 'ASC' },
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

  async upsertMany(stats: SeasonPitchingStat[]): Promise<void> {
    if (stats.length === 0) return;
    await this.ormRepository.upsert(
      stats.map((stat) => this.toOrm(stat)),
      { conflictPaths: ['seasonYear', 'teamCode', 'playerName'] },
    );
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
