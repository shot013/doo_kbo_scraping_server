import { Controller, Get, Param, Query } from '@nestjs/common';
import { PaginatedResult } from '../../../common/pagination/pagination';
import { Game } from '../domain/entities/game.entity';
import { GameSortField } from '../domain/repositories/game.repository';
import { GameQueryDto } from './dto/game-query.dto';
import { GameService } from './game.service';

@Controller('games')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get()
  findAll(@Query() query: GameQueryDto): Promise<PaginatedResult<Game>> {
    return this.gameService.findAll({
      seasonYear: query.seasonYear ? Number(query.seasonYear) : undefined,
      gameDate: query.gameDate,
      status: query.status,
      teamCode: query.teamCode,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      sortBy: query.sortBy as GameSortField | undefined,
      sortOrder: query.sortOrder === 'DESC' ? 'DESC' : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Game> {
    return this.gameService.findById(id);
  }
}
