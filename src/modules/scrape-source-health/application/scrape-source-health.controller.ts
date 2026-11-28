import { Controller, Get, Query } from '@nestjs/common';
import { parseEnumQuery } from '../../../common/http/enum-query';
import {
  ScrapeSourceHealth,
  ScrapeStatus,
} from '../domain/entities/scrape-source-health.entity';
import { ScrapeSourceHealthQueryDto } from './dto/scrape-source-health-query.dto';
import { ScrapeSourceHealthService } from './scrape-source-health.service';

@Controller('scrape-source-health')
export class ScrapeSourceHealthController {
  constructor(private readonly service: ScrapeSourceHealthService) {}

  @Get()
  findAll(
    @Query() query: ScrapeSourceHealthQueryDto,
  ): Promise<ScrapeSourceHealth[]> {
    return this.service.findAll({
      sourceName: query.sourceName,
      status: parseEnumQuery('status', query.status, ScrapeStatus),
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }
}
