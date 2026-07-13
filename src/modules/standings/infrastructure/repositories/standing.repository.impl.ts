import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Standing } from '../../domain/entities/standing.entity';
import { StandingRepository } from '../../domain/repositories/standing.repository';
import { StandingOrmEntity } from '../orm/standing.orm-entity';

@Injectable()
export class StandingRepositoryImpl implements StandingRepository {
  constructor(
    @InjectRepository(StandingOrmEntity)
    private readonly ormRepository: Repository<StandingOrmEntity>,
  ) {}

  async findBySeasonYear(seasonYear: number): Promise<Standing[]> {
    const rows = await this.ormRepository.find({
      where: { seasonYear },
      order: { rank: 'ASC' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async upsertMany(standings: Standing[]): Promise<Standing[]> {
    const saved: StandingOrmEntity[] = [];
    for (const standing of standings) {
      const existing = await this.ormRepository.findOne({
        where: {
          seasonYear: standing.seasonYear,
          teamCode: standing.teamCode,
        },
      });
      const orm = this.toOrm(standing);
      if (existing) {
        orm.id = existing.id;
      }
      saved.push(await this.ormRepository.save(orm));
    }
    return saved.map((row) => this.toDomain(row));
  }

  private toDomain(row: StandingOrmEntity): Standing {
    return new Standing({ ...row });
  }

  private toOrm(standing: Standing): StandingOrmEntity {
    const orm = Object.assign(new StandingOrmEntity(), standing);
    if (!standing.id) {
      delete (orm as { id?: number }).id;
    }
    return orm;
  }
}
