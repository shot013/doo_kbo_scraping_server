import { Inject, Injectable } from '@nestjs/common';
import { Standing } from '../domain/entities/standing.entity';
import { STANDING_REPOSITORY } from '../domain/repositories/standing.repository';
import type { StandingRepository } from '../domain/repositories/standing.repository';

@Injectable()
export class StandingService {
  constructor(
    @Inject(STANDING_REPOSITORY)
    private readonly standingRepository: StandingRepository,
  ) {}

  findBySeasonYear(seasonYear: number): Promise<Standing[]> {
    return this.standingRepository.findBySeasonYear(seasonYear);
  }

  upsertMany(standings: Standing[]): Promise<Standing[]> {
    return this.standingRepository.upsertMany(standings);
  }
}
