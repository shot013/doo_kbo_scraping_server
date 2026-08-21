import { Injectable, Logger } from '@nestjs/common';
import { resolveKboTeamByCode, KBO_TEAMS } from '../../../common/kbo/kbo-team';
import { GameService } from '../../game/application/game.service';
import { Game } from '../../game/domain/entities/game.entity';
import { GameStatService } from '../../game-stats/application/game-stat.service';
import { GameStat } from '../../game-stats/domain/entities/game-stat.entity';
import { PlayerService } from '../../players/application/player.service';
import { Player } from '../../players/domain/entities/player.entity';
import { ScrapeSourceHealthService } from '../../scrape-source-health/application/scrape-source-health.service';
import { ScrapeStatus } from '../../scrape-source-health/domain/entities/scrape-source-health.entity';
import { SeasonBattingStatService } from '../../season-stats/application/season-batting-stat.service';
import { SeasonPitchingStatService } from '../../season-stats/application/season-pitching-stat.service';
import { SeasonBattingStat } from '../../season-stats/domain/entities/season-batting-stat.entity';
import { SeasonPitchingStat } from '../../season-stats/domain/entities/season-pitching-stat.entity';
import { StandingService } from '../../standings/application/standing.service';
import { Standing } from '../../standings/domain/entities/standing.entity';
import {
  NAVER_GAME_RECORD_URL,
  GameStatsScraper,
} from '../infrastructure/scrapers/game-stats.scraper';
import {
  GameScraper,
  SCHEDULE_SOURCE_URL,
} from '../infrastructure/scrapers/game.scraper';
import {
  ROSTER_SOURCE_URL,
  RosterScraper,
} from '../infrastructure/scrapers/roster.scraper';
import {
  SEASON_HITTER_SOURCE_URL,
  SEASON_PITCHER_SOURCE_URL,
  SeasonStatsScraper,
  toStatKey,
} from '../infrastructure/scrapers/season-stats.scraper';
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
    private readonly rosterScraper: RosterScraper,
    private readonly seasonStatsScraper: SeasonStatsScraper,
    private readonly gameService: GameService,
    private readonly standingService: StandingService,
    private readonly gameStatService: GameStatService,
    private readonly playerService: PlayerService,
    private readonly seasonBattingStatService: SeasonBattingStatService,
    private readonly seasonPitchingStatService: SeasonPitchingStatService,
    private readonly scrapeSourceHealthService: ScrapeSourceHealthService,
  ) {}

  async scrapeGames(
    seasonYear: number,
    gameMonth?: string,
  ): Promise<ScrapeSummary> {
    const sourceName = 'kbo-schedule';
    const startedAt = Date.now();

    try {
      const scraped = await this.gameScraper.scrape(seasonYear, gameMonth);
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
              homeStarterPitcher: item.homeStarterPitcher,
              awayStarterPitcher: item.awayStarterPitcher,
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

  async scrapeSeasonStats(seasonYear: number): Promise<ScrapeSummary> {
    const sourceName = 'kbo-season-stats';
    const targetUrl = `${SEASON_HITTER_SOURCE_URL}, ${SEASON_PITCHER_SOURCE_URL}`;
    const startedAt = Date.now();

    try {
      const [
        scrapedBatting,
        scrapedPitching,
        qualifiedBattingKeys,
        qualifiedPitchingKeys,
      ] = await Promise.all([
        this.seasonStatsScraper.scrapeBatting(),
        this.seasonStatsScraper.scrapePitching(),
        this.seasonStatsScraper.scrapeQualifiedBattingKeys(),
        this.seasonStatsScraper.scrapeQualifiedPitchingKeys(),
      ]);
      if (scrapedBatting.length === 0 && scrapedPitching.length === 0) {
        throw new Error('No season stats scraped from source');
      }
      const now = new Date();

      let savedCount = 0;
      for (const item of scrapedBatting) {
        try {
          await this.seasonBattingStatService.upsert(
            new SeasonBattingStat({
              id: 0,
              seasonYear,
              teamCode: item.teamCode,
              teamName: item.teamName,
              playerName: item.playerName,
              rank: item.rank,
              qualified: qualifiedBattingKeys.has(
                toStatKey(item.teamCode, item.playerName),
              ),
              battingAverage: item.battingAverage,
              games: item.games,
              plateAppearances: item.plateAppearances,
              atBats: item.atBats,
              runs: item.runs,
              hits: item.hits,
              doubles: item.doubles,
              triples: item.triples,
              homeRuns: item.homeRuns,
              totalBases: item.totalBases,
              rbi: item.rbi,
              sacrificeHits: item.sacrificeHits,
              sacrificeFlies: item.sacrificeFlies,
              createdAt: now,
              updatedAt: now,
            }),
          );
          savedCount++;
        } catch (error) {
          this.logger.warn(
            `Failed to save season batting stat for ${item.playerName} (team ${item.teamCode}): ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
      for (const item of scrapedPitching) {
        try {
          await this.seasonPitchingStatService.upsert(
            new SeasonPitchingStat({
              id: 0,
              seasonYear,
              teamCode: item.teamCode,
              teamName: item.teamName,
              playerName: item.playerName,
              rank: item.rank,
              qualified: qualifiedPitchingKeys.has(
                toStatKey(item.teamCode, item.playerName),
              ),
              era: item.era,
              games: item.games,
              wins: item.wins,
              losses: item.losses,
              saves: item.saves,
              holds: item.holds,
              winPct: item.winPct,
              inningsPitched: item.inningsPitched,
              hitsAllowed: item.hitsAllowed,
              homeRunsAllowed: item.homeRunsAllowed,
              walksAllowed: item.walksAllowed,
              hitByPitch: item.hitByPitch,
              strikeoutsPitched: item.strikeoutsPitched,
              runsAllowed: item.runsAllowed,
              earnedRuns: item.earnedRuns,
              whip: item.whip,
              createdAt: now,
              updatedAt: now,
            }),
          );
          savedCount++;
        } catch (error) {
          this.logger.warn(
            `Failed to save season pitching stat for ${item.playerName} (team ${item.teamCode}): ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      const durationMs = Date.now() - startedAt;
      const totalScraped = scrapedBatting.length + scrapedPitching.length;
      const failedCount = totalScraped - savedCount;
      await this.scrapeSourceHealthService.log({
        sourceName,
        targetUrl,
        status: ScrapeStatus.SUCCESS,
        httpStatusCode: 200,
        durationMs,
        itemsScraped: savedCount,
        errorMessage:
          failedCount > 0
            ? `${failedCount}/${totalScraped} season stats failed to save (see server logs)`
            : null,
        scrapedAt: now,
      });
      return { itemsScraped: savedCount, durationMs };
    } catch (error) {
      await this.logFailure(sourceName, targetUrl, startedAt, error);
      throw error;
    }
  }

  async scrapeGameStats(gameId: string): Promise<ScrapeSummary> {
    const sourceName = 'naver-box-score';
    const startedAt = Date.now();
    const targetUrl = `${NAVER_GAME_RECORD_URL}/${gameId}${gameId.slice(0, 4)}/record`;

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

  /**
   * teamCode를 생략하면 KBO 10개 구단 전체를 순회하며 스크래핑한다.
   * 요청 간 지연을 둬 대상 사이트에 과도한 부하를 주지 않는다.
   */
  async scrapeRoster(teamCode?: string): Promise<ScrapeSummary> {
    const sourceName = 'kbo-player-roster';
    const startedAt = Date.now();
    const targetTeams = teamCode ? [resolveKboTeamByCode(teamCode)] : KBO_TEAMS;
    const now = new Date();

    try {
      let scrapedCount = 0;
      let savedCount = 0;

      for (const [index, team] of targetTeams.entries()) {
        if (index > 0) {
          await delay(500);
        }

        const scraped = await this.rosterScraper.scrape(team.code);
        scrapedCount += scraped.length;

        for (const item of scraped) {
          try {
            await this.playerService.upsert(
              new Player({
                id: item.id,
                teamCode: item.teamCode,
                teamName: resolveKboTeamByCode(item.teamCode).fullName,
                name: item.name,
                position: item.position,
                backNumber: item.backNumber,
                birthDate: item.birthDate,
                heightCm: item.heightCm,
                weightKg: item.weightKg,
                school: item.school,
                createdAt: now,
                updatedAt: now,
              }),
            );
            savedCount++;
          } catch (error) {
            this.logger.warn(
              `Failed to save player ${item.name} (${item.teamCode}): ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
      }

      if (scrapedCount === 0) {
        throw new Error('No roster rows scraped from source');
      }

      const durationMs = Date.now() - startedAt;
      const failedCount = scrapedCount - savedCount;
      await this.scrapeSourceHealthService.log({
        sourceName,
        targetUrl: ROSTER_SOURCE_URL,
        status: ScrapeStatus.SUCCESS,
        httpStatusCode: 200,
        durationMs,
        itemsScraped: savedCount,
        errorMessage:
          failedCount > 0
            ? `${failedCount}/${scrapedCount} roster rows failed to save (see server logs)`
            : null,
        scrapedAt: now,
      });
      return { itemsScraped: savedCount, durationMs };
    } catch (error) {
      await this.logFailure(sourceName, ROSTER_SOURCE_URL, startedAt, error);
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
