import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { PaginatedResult } from '../../../common/pagination/pagination';
import { Standing } from '../domain/entities/standing.entity';
import { StandingSortField } from '../domain/repositories/standing.repository';
import { StandingQueryDto } from './dto/standing-query.dto';
import { StandingService } from './standing.service';

@UseInterceptors(CacheInterceptor)
@Controller('standings')
export class StandingController {
  constructor(private readonly standingService: StandingService) {}

  @Get()
  findBySeasonYear(
    @Query() query: StandingQueryDto,
  ): Promise<PaginatedResult<Standing>> {
    const seasonYear = query.seasonYear
      ? Number(query.seasonYear)
      : new Date().getFullYear();
    return this.standingService.findBySeasonYear({
      seasonYear,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      sortBy: query.sortBy as StandingSortField | undefined,
      sortOrder: query.sortOrder === 'DESC' ? 'DESC' : undefined,
    });
  }
}
