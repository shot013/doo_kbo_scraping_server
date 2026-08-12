import { Injectable, Logger } from '@nestjs/common';
import { GameService } from '../../game/application/game.service';
import { Game } from '../../game/domain/entities/game.entity';
import { GameStatService } from '../../game-stats/application/game-stat.service';
import { GameStat } from '../../game-stats/domain/entities/game-stat.entity';
import { ScrapeSourceHealthService } from '../../scrape-source-health/application/scrape-source-health.service';
import { ScrapeStatus } from '../../scrape-source-health/domain/entities/scrape-source-health.entity';
import { StandingService } from '../../standings/application/standing.service';
import { Standing } from '../../standings/domain/entities/standing.entity';
import {
  GAME_CENTER_SOURCE_URL,
  GameStatsScraper,
} from '../infrastructure/scrapers/game-stats.scraper';
import {
  GameScraper,
  SCHEDULE_SOURCE_URL,
} from '../infrastructure/scrapers/game.scraper';
import {
  STANDINGS_SOURCE_URL,
  StandingsScraper,
} from '../infrastructure/scrapers/standings.scraper';

export interface ScrapeSummary {
  itemsScraped: number;
  durationMs: number;
}

@Injectable()
export class ScrapeService {
  private readonly logger = new Logger(ScrapeService.name);

  constructor(
    private readonly gameScraper: GameScraper,
    private readonly standingsScraper: StandingsScraper,
    private readonly gameStatsScraper: GameStatsScraper,
    private readonly gameService: GameService,
    private readonly standingService: StandingService,
    private readonly gameStatService: GameStatService,
    private readonly scrapeSourceHealthService: ScrapeSourceHealthService,
  ) {}

  async scrapeGames(seasonYear: number): Promise<ScrapeSummary> {
    const sourceName = 'kbo-schedule';
    const startedAt = Date.now();

    try {
      const scraped = await this.gameScraper.scrape(seasonYear);
      if (scraped.length === 0) {
        throw new Error('No games scraped from source');
      }
      const now = new Date();

      let savedCount = 0;
      for (const item of scraped) {
        try {
          await this.gameService.upsert(
            new Game({
              id: item.id,
              seasonYear,
              gameDate: item.gameDate,
              scheduledAt: item.scheduledAt,
              stadium: item.stadium,
              homeTeamCode: item.homeTeamCode,
              homeTeamName: item.homeTeamName,
              awayTeamCode: item.awayTeamCode,
              awayTeamName: item.awayTeamName,
              homeScore: item.homeScore,
              awayScore: item.awayScore,
              currentInning: null,
              status: item.status,
              sourceUrl: item.sourceUrl,
              createdAt: now,
              updatedAt: now,
            }),
          );
          savedCount++;
        } catch (error) {
          this.logger.warn(
            `Failed to save game ${item.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      const durationMs = Date.now() - startedAt;
      const failedCount = scraped.length - savedCount;
      await this.scrapeSourceHealthService.log({
        sourceName,
        targetUrl: SCHEDULE_SOURCE_URL,
        status: ScrapeStatus.SUCCESS,
        httpStatusCode: 200,
        durationMs,
        itemsScraped: savedCount,
        errorMessage:
          failedCount > 0
            ? `${failedCount}/${scraped.length} games failed to save (see server logs)`
            : null,
        scrapedAt: now,
      });
      return { itemsScraped: savedCount, durationMs };
    } catch (error) {
      await this.logFailure(sourceName, SCHEDULE_SOURCE_URL, startedAt, error);
      throw error;
    }
  }

  async scrapeStandings(seasonYear: number): Promise<ScrapeSummary> {
    const sourceName = 'kbo-team-rank';
    const startedAt = Date.now();

    try {
      const scraped = await this.standingsScraper.scrape();
      if (scraped.length === 0) {
        throw new Error('No standings scraped from source');
      }
      const now = new Date();
      const standings = scraped.map(
        (item) =>
          new Standing({
            id: 0,
            seasonYear,
            teamCode: item.teamCode,
            teamName: item.teamName,
            rank: item.rank,
            gamesPlayed: item.gamesPlayed,
            wins: item.wins,
            losses: item.losses,
            draws: item.draws,
            winRate: item.winRate,
            gamesBehind: item.gamesBehind,
            streak: item.streak,
            last10: item.last10,
            homeRecord: item.homeRecord,
            awayRecord: item.awayRecord,
            calculatedAt: now,
            createdAt: now,
            updatedAt: now,
          }),
      );
      let savedCount = 0;
      for (const standing of standings) {
        try {
          await this.standingService.upsert(standing);
          savedCount++;
        } catch (error) {
          this.logger.warn(
            `Failed to save standing for team ${standing.teamCode}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      const durationMs = Date.now() - startedAt;
      const failedCount = standings.length - savedCount;
      await this.scrapeSourceHealthService.log({
        sourceName,
        targetUrl: STANDINGS_SOURCE_URL,
        status: ScrapeStatus.SUCCESS,
        httpStatusCode: 200,
        durationMs,
        itemsScraped: savedCount,
        errorMessage:
          failedCount > 0
            ? `${failedCount}/${standings.length} standings failed to save (see server logs)`
            : null,
        scrapedAt: now,
      });
      return { itemsScraped: savedCount, durationMs };
    } catch (error) {
      await this.logFailure(sourceName, STANDINGS_SOURCE_URL, startedAt, error);
      throw error;
    }
  }

  async scrapeGameStats(gameId: string): Promise<ScrapeSummary> {
    const sourceName = 'kbo-box-score';
    const startedAt = Date.now();
    const targetUrl = `${GAME_CENTER_SOURCE_URL}?gameId=${gameId}`;

    try {
      const scraped = await this.gameStatsScraper.scrape(gameId);
      if (scraped.length === 0) {
        throw new Error('No game stats scraped from source');
      }
      const now = new Date();
      const stats = scraped.map(
        (item) =>
          new GameStat({
            id: 0,
            gameId: item.gameId,
            teamCode: item.teamCode,
            playerName: item.playerName,
            playerNo: null,
            statType: item.statType,
            atBats: item.atBats,
            hits: item.hits,
            doubles: null,
            triples: null,
            homeRuns: null,
            rbi: item.rbi,
            runs: item.runs,
            walks: null,
            hitByPitch: null,
            strikeouts: null,
            stolenBases: null,
            battingAverage: item.battingAverage,
            inningsPitched: item.inningsPitched,
            hitsAllowed: item.hitsAllowed,
            earnedRuns: item.earnedRuns,
            strikeoutsPitched: item.strikeoutsPitched,
            walksAllowed: item.walksAllowed,
            homeRunsAllowed: item.homeRunsAllowed,
            win: item.win,
            loss: item.loss,
            save: item.save,
            hold: item.hold,
            era: item.era,
            rawStats: null,
            createdAt: now,
            updatedAt: now,
          }),
      );
      let savedCount = 0;
      for (const stat of stats) {
        try {
          await this.gameStatService.upsert(stat);
          savedCount++;
        } catch (error) {
          this.logger.warn(
            `Failed to save game stat for ${stat.playerName} (team ${stat.teamCode}): ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      const durationMs = Date.now() - startedAt;
      const failedCount = stats.length - savedCount;
      await this.scrapeSourceHealthService.log({
        sourceName,
        targetUrl,
        status: ScrapeStatus.SUCCESS,
        httpStatusCode: 200,
        durationMs,
        itemsScraped: savedCount,
        errorMessage:
          failedCount > 0
            ? `${failedCount}/${stats.length} game stats failed to save (see server logs)`
            : null,
        scrapedAt: now,
      });
      return { itemsScraped: savedCount, durationMs };
    } catch (error) {
      await this.logFailure(sourceName, targetUrl, startedAt, error);
      throw error;
    }
  }

  private async logFailure(
    sourceName: string,
    targetUrl: string,
    startedAt: number,
    error: unknown,
  ): Promise<void> {
    const durationMs = Date.now() - startedAt;
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logger.error(`${sourceName} scrape failed: ${errorMessage}`);
    try {
      await this.scrapeSourceHealthService.log({
        sourceName,
        targetUrl,
        status: ScrapeStatus.FAILURE,
        httpStatusCode: null,
        durationMs,
        itemsScraped: null,
        errorMessage,
        scrapedAt: new Date(),
      });
    } catch (logError) {
      this.logger.error(
        `Failed to record scrape failure for ${sourceName}: ${logError instanceof Error ? logError.message : String(logError)}`,
      );
    }
  }
}
