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
      where: {
        seasonYear: filter.seasonYear,
        ...(filter.qualifiedOnly ? { qualified: true } : {}),
      },
      // rank는 팀별 순회 스크래핑에서 팀 내 나열 순서로 매겨져 리그 전체 순위가 아니다.
      // 규정타석 충족자만 볼 때는 KBO가 이미 규정타석 기준으로 걸러준 목록이므로
      // 타율 내림차순 자체가 곧 리그 순위가 된다.
      order: filter.qualifiedOnly
        ? { battingAverage: 'DESC' }
        : { rank: 'ASC' },
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

  async upsertMany(stats: SeasonBattingStat[]): Promise<void> {
    if (stats.length === 0) return;
    await this.ormRepository.upsert(
      stats.map((stat) => this.toOrm(stat)),
      { conflictPaths: ['seasonYear', 'teamCode', 'playerName'] },
    );
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
