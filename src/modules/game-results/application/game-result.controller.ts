import { Controller, Get, Query } from '@nestjs/common';
import { GameResultQueryDto } from './dto/game-result-query.dto';
import { GameResultService, GameResultsResponse } from './game-result.service';

@Controller('game-results')
export class GameResultController {
  constructor(private readonly gameResultService: GameResultService) {}

  @Get('recent')
  findRecent(@Query() query: GameResultQueryDto): Promise<GameResultsResponse> {
    return this.gameResultService.getRecentResults(query.date);
  }
}
