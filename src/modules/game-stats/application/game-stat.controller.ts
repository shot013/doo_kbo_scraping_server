import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { GameStat } from '../domain/entities/game-stat.entity';
import { GameStatQueryDto } from './dto/game-stat-query.dto';
import { GameStatService } from './game-stat.service';

@Controller('game-stats')
export class GameStatController {
  constructor(private readonly gameStatService: GameStatService) {}

  @Get()
  findAll(@Query() query: GameStatQueryDto): Promise<GameStat[]> {
    return this.gameStatService.findAll({
      gameId: query.gameId,
      teamCode: query.teamCode,
      statType: query.statType,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<GameStat> {
    return this.gameStatService.findById(id);
  }
}
