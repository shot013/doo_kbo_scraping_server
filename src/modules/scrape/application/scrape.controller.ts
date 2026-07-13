import { Body, Controller, Post } from '@nestjs/common';
import { ScrapeGameStatsRequestDto } from './dto/scrape-game-stats-request.dto';
import { ScrapeRequestDto } from './dto/scrape-request.dto';
import { ScrapeService, ScrapeSummary } from './scrape.service';

@Controller('scrape')
export class ScrapeController {
  constructor(private readonly scrapeService: ScrapeService) {}

  @Post('games')
  scrapeGames(@Body() body: ScrapeRequestDto): Promise<ScrapeSummary> {
    return this.scrapeService.scrapeGames(
      body.seasonYear ?? new Date().getFullYear(),
    );
  }

  @Post('standings')
  scrapeStandings(@Body() body: ScrapeRequestDto): Promise<ScrapeSummary> {
    return this.scrapeService.scrapeStandings(
      body.seasonYear ?? new Date().getFullYear(),
    );
  }

  @Post('game-stats')
  scrapeGameStats(
    @Body() body: ScrapeGameStatsRequestDto,
  ): Promise<ScrapeSummary> {
    return this.scrapeService.scrapeGameStats(body.gameId);
  }
}
