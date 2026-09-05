import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { ScrapeGamePreviewRequestDto } from './dto/scrape-game-preview-request.dto';
import { ScrapeGameStatsRequestDto } from './dto/scrape-game-stats-request.dto';
import { ScrapeRequestDto } from './dto/scrape-request.dto';
import { ScrapeRosterRequestDto } from './dto/scrape-roster-request.dto';
import { ScrapeService, ScrapeSummary } from './scrape.service';

@Controller('scrape')
export class ScrapeController {
  constructor(private readonly scrapeService: ScrapeService) {}

  @Post('games')
  scrapeGames(@Body() body?: ScrapeRequestDto): Promise<ScrapeSummary> {
    return this.scrapeService.scrapeGames(
      body?.seasonYear ?? new Date().getFullYear(),
      body?.gameMonth,
    );
  }

  @Post('game-previews')
  scrapeGamePreviews(
    @Body() body?: ScrapeGamePreviewRequestDto,
  ): Promise<ScrapeSummary> {
    return this.scrapeService.scrapeGamePreviews(body?.gameDate);
  }

  @Post('standings')
  scrapeStandings(@Body() body?: ScrapeRequestDto): Promise<ScrapeSummary> {
    return this.scrapeService.scrapeStandings(
      body?.seasonYear ?? new Date().getFullYear(),
    );
  }

  @Post('season-stats')
  scrapeSeasonStats(@Body() body?: ScrapeRequestDto): Promise<ScrapeSummary> {
    return this.scrapeService.scrapeSeasonStats(
      body?.seasonYear ?? new Date().getFullYear(),
    );
  }

  @Post('game-stats')
  scrapeGameStats(
    @Body() body?: ScrapeGameStatsRequestDto,
  ): Promise<ScrapeSummary> {
    if (!body?.gameId) {
      throw new BadRequestException('gameId is required');
    }
    return this.scrapeService.scrapeGameStats(body.gameId);
  }

  @Post('game-stats/backfill')
  scrapeGameStatsBackfill(
    @Body() body?: ScrapeRequestDto,
  ): Promise<ScrapeSummary> {
    return this.scrapeService.scrapeGameStatsBackfill(
      body?.seasonYear ?? new Date().getFullYear(),
    );
  }

  @Post('roster')
  scrapeRoster(@Body() body?: ScrapeRosterRequestDto): Promise<ScrapeSummary> {
    return this.scrapeService.scrapeRoster(body?.teamCode);
  }

  @Post('play-by-play')
  scrapePlayByPlay(
    @Body() body?: ScrapeGameStatsRequestDto,
  ): Promise<ScrapeSummary> {
    if (!body?.gameId) {
      throw new BadRequestException('gameId is required');
    }
    return this.scrapeService.scrapePlayByPlay(body.gameId);
  }

  @Post('play-by-play/backfill')
  scrapePlayByPlayBackfill(
    @Body() body?: ScrapeRequestDto,
  ): Promise<ScrapeSummary> {
    return this.scrapeService.scrapePlayByPlayBackfill(
      body?.seasonYear ?? new Date().getFullYear(),
    );
  }
}
