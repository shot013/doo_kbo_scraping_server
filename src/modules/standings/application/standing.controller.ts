import { Controller, Get, Query } from '@nestjs/common';
import { Standing } from '../domain/entities/standing.entity';
import { StandingQueryDto } from './dto/standing-query.dto';
import { StandingService } from './standing.service';

@Controller('standings')
export class StandingController {
  constructor(private readonly standingService: StandingService) {}

  @Get()
  findBySeasonYear(@Query() query: StandingQueryDto): Promise<Standing[]> {
    const seasonYear = query.seasonYear
      ? Number(query.seasonYear)
      : new Date().getFullYear();
    return this.standingService.findBySeasonYear(seasonYear);
  }
}
