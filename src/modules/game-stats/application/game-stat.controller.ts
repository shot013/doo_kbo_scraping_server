import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { parseEnumQuery } from '../../../common/http/enum-query';
import { PaginatedResult } from '../../../common/pagination/pagination';
import { GameStat, PlayerStatType } from '../domain/entities/game-stat.entity';
import { GameStatSortField } from '../domain/repositories/game-stat.repository';
import { GameStatQueryDto } from './dto/game-stat-query.dto';
import { GameStatService } from './game-stat.service';

@Controller('game-stats')
export class GameStatController {
  constructor(private readonly gameStatService: GameStatService) {}

  @Get()
  findAll(
    @Query() query: GameStatQueryDto,
  ): Promise<PaginatedResult<GameStat>> {
    return this.gameStatService.findAll({
      gameId: query.gameId,
      teamCode: query.teamCode,
      statType: parseEnumQuery('statType', query.statType, PlayerStatType),
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      sortBy: query.sortBy as GameStatSortField | undefined,
      sortOrder: query.sortOrder === 'DESC' ? 'DESC' : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<GameStat> {
    return this.gameStatService.findById(id);
  }
}
