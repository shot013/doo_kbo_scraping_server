import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../common/pagination/pagination';
import { Standing } from '../domain/entities/standing.entity';
import {
  STANDING_REPOSITORY,
  StandingFilter,
} from '../domain/repositories/standing.repository';
import type { StandingRepository } from '../domain/repositories/standing.repository';

@Injectable()
export class StandingService {
  constructor(
    @Inject(STANDING_REPOSITORY)
    private readonly standingRepository: StandingRepository,
  ) {}

  findBySeasonYear(filter: StandingFilter): Promise<PaginatedResult<Standing>> {
    return this.standingRepository.findBySeasonYear(filter);
  }

  upsert(standing: Standing): Promise<Standing> {
    return this.standingRepository.upsert(standing);
  }
}
