import { Controller, Get, Param, Query } from '@nestjs/common';
import { Game } from '../domain/entities/game.entity';
import { GameQueryDto } from './dto/game-query.dto';
import { GameService } from './game.service';

@Controller('games')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get()
  findAll(@Query() query: GameQueryDto): Promise<Game[]> {
    return this.gameService.findAll({
      seasonYear: query.seasonYear ? Number(query.seasonYear) : undefined,
      gameDate: query.gameDate,
      status: query.status,
      teamCode: query.teamCode,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Game> {
    return this.gameService.findById(id);
  }
}
