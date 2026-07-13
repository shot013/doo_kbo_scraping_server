import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScrapeSourceHealth } from '../../domain/entities/scrape-source-health.entity';
import {
  LogScrapeAttemptInput,
  ScrapeSourceHealthFilter,
  ScrapeSourceHealthRepository,
} from '../../domain/repositories/scrape-source-health.repository';
import { ScrapeSourceHealthOrmEntity } from '../orm/scrape-source-health.orm-entity';

@Injectable()
export class ScrapeSourceHealthRepositoryImpl implements ScrapeSourceHealthRepository {
  constructor(
    @InjectRepository(ScrapeSourceHealthOrmEntity)
    private readonly ormRepository: Repository<ScrapeSourceHealthOrmEntity>,
  ) {}

  async log(entry: LogScrapeAttemptInput): Promise<ScrapeSourceHealth> {
    const saved = await this.ormRepository.save(
      Object.assign(new ScrapeSourceHealthOrmEntity(), entry),
    );
    return this.toDomain(saved);
  }

  async findAll(
    filter: ScrapeSourceHealthFilter = {},
  ): Promise<ScrapeSourceHealth[]> {
    const where: Record<string, unknown> = {};
    if (filter.sourceName !== undefined) where.sourceName = filter.sourceName;
    if (filter.status !== undefined) where.status = filter.status;

    const rows = await this.ormRepository.find({
      where,
      order: { scrapedAt: 'DESC' },
      take: filter.limit ?? 100,
    });
    return rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: ScrapeSourceHealthOrmEntity): ScrapeSourceHealth {
    return new ScrapeSourceHealth({ ...row });
  }
}
