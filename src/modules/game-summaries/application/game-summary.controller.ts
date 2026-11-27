import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { GameSummaryResponse } from './game-summary.response';
import { GameSummaryService } from './game-summary.service';

/** 순위·팀·기록 조회처럼 인메모리 캐시(`CACHE_TTL_MS`)를 쓴다. 404는 캐시되지 않는다. */
@UseInterceptors(CacheInterceptor)
@Controller('game-summaries')
export class GameSummaryController {
  constructor(private readonly gameSummaryService: GameSummaryService) {}

  @Get(':gameId')
  findOne(@Param('gameId') gameId: string): Promise<GameSummaryResponse> {
    return this.gameSummaryService.getSummary(gameId);
  }
}
