import { Injectable, Logger } from '@nestjs/common';
import { resolveKboTeamByCode, KBO_TEAMS } from '../../../common/kbo/kbo-team';
import { GameService } from '../../game/application/game.service';
import { Game, GameStatus } from '../../game/domain/entities/game.entity';
import { GameStatService } from '../../game-stats/application/game-stat.service';
import { GameStat } from '../../game-stats/domain/entities/game-stat.entity';
import { PlateAppearanceService } from '../../plate-appearances/application/plate-appearance.service';
import { PlateAppearance } from '../../plate-appearances/domain/entities/plate-appearance.entity';
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
  NAVER_RELAY_URL,
  PlayByPlayScraper,
} from '../infrastructure/scrapers/play-by-play.scraper';
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

/** 시즌 전체 백필은 수백 경기를 순회하므로 roster 스크랩(팀 10개, 500ms)보다 넉넉한 텀을 둔다. */
const BACKFILL_DELAY_MS = 2000;

@Injectable()
export class ScrapeService {
  private readonly logger = new Logger(ScrapeService.name);

  constructor(
    private readonly gameScraper: GameScraper,
    private readonly standingsScraper: StandingsScraper,
    private readonly gameStatsScraper: GameStatsScraper,
    private readonly playByPlayScraper: PlayByPlayScraper,
    private readonly rosterScraper: RosterScraper,
    private readonly seasonStatsScraper: SeasonStatsScraper,
    private readonly gameService: GameService,
    private readonly standingService: StandingService,
    private readonly gameStatService: GameStatService,
    private readonly plateAppearanceService: PlateAppearanceService,
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

      const games = scraped.map(
        (item) =>
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
      let savedCount = 0;
      try {
        await this.gameService.upsertMany(games);
        savedCount = games.length;
      } catch (error) {
        this.logger.warn(
          `Batch upsert failed for games (${games.length} items), falling back to per-item save: ${error instanceof Error ? error.message : String(error)}`,
        );
        for (const game of games) {
          try {
            await this.gameService.upsert(game);
            savedCount++;
          } catch (itemError) {
            this.logger.warn(
              `Failed to save game ${game.id}: ${itemError instanceof Error ? itemError.message : String(itemError)}`,
            );
          }
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

      const [teamBatting, teamPitching, teamRuns] = await Promise.all([
        this.gameStatService.aggregateTeamBatting(seasonYear),
        this.gameStatService.aggregateTeamPitching(seasonYear),
        this.gameService.aggregateTeamRuns(seasonYear),
      ]);
      const battingByTeam = new Map(
        teamBatting.map((row) => [row.teamCode, row]),
      );
      const pitchingByTeam = new Map(
        teamPitching.map((row) => [row.teamCode, row]),
      );
      const runsByTeam = new Map(teamRuns.map((row) => [row.teamCode, row]));

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
            battingAverage:
              battingByTeam.get(item.teamCode)?.battingAverage ?? '0.000',
            era: pitchingByTeam.get(item.teamCode)?.era ?? '0.00',
            runsScored: runsByTeam.get(item.teamCode)?.runsScored ?? 0,
            runsAllowed: runsByTeam.get(item.teamCode)?.runsAllowed ?? 0,
            calculatedAt: now,
            createdAt: now,
            updatedAt: now,
          }),
      );
      let savedCount = 0;
      try {
        await this.standingService.upsertMany(standings);
        savedCount = standings.length;
      } catch (error) {
        this.logger.warn(
          `Batch upsert failed for standings (${standings.length} items), falling back to per-item save: ${error instanceof Error ? error.message : String(error)}`,
        );
        for (const standing of standings) {
          try {
            await this.standingService.upsert(standing);
            savedCount++;
          } catch (itemError) {
            this.logger.warn(
              `Failed to save standing for team ${standing.teamCode}: ${itemError instanceof Error ? itemError.message : String(itemError)}`,
            );
          }
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

      const battingStats = scrapedBatting.map(
        (item) =>
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
      const pitchingStats = scrapedPitching.map(
        (item) =>
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

      let savedCount = 0;
      try {
        await this.seasonBattingStatService.upsertMany(battingStats);
        savedCount += battingStats.length;
      } catch (error) {
        this.logger.warn(
          `Batch upsert failed for season batting stats (${battingStats.length} items), falling back to per-item save: ${error instanceof Error ? error.message : String(error)}`,
        );
        for (const stat of battingStats) {
          try {
            await this.seasonBattingStatService.upsert(stat);
            savedCount++;
          } catch (itemError) {
            this.logger.warn(
              `Failed to save season batting stat for ${stat.playerName} (team ${stat.teamCode}): ${itemError instanceof Error ? itemError.message : String(itemError)}`,
            );
          }
        }
      }
      try {
        await this.seasonPitchingStatService.upsertMany(pitchingStats);
        savedCount += pitchingStats.length;
      } catch (error) {
        this.logger.warn(
          `Batch upsert failed for season pitching stats (${pitchingStats.length} items), falling back to per-item save: ${error instanceof Error ? error.message : String(error)}`,
        );
        for (const stat of pitchingStats) {
          try {
            await this.seasonPitchingStatService.upsert(stat);
            savedCount++;
          } catch (itemError) {
            this.logger.warn(
              `Failed to save season pitching stat for ${stat.playerName} (team ${stat.teamCode}): ${itemError instanceof Error ? itemError.message : String(itemError)}`,
            );
          }
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
      const { scraped, saved } = await this.scrapeAndSaveGameStats(gameId);
      if (scraped === 0) {
        throw new Error('No game stats scraped from source');
      }

      const durationMs = Date.now() - startedAt;
      const failedCount = scraped - saved;
      await this.scrapeSourceHealthService.log({
        sourceName,
        targetUrl,
        status: ScrapeStatus.SUCCESS,
        httpStatusCode: 200,
        durationMs,
        itemsScraped: saved,
        errorMessage:
          failedCount > 0
            ? `${failedCount}/${scraped} game stats failed to save (see server logs)`
            : null,
        scrapedAt: new Date(),
      });
      return { itemsScraped: saved, durationMs };
    } catch (error) {
      await this.logFailure(sourceName, targetUrl, startedAt, error);
      throw error;
    }
  }

  /**
   * 시즌 전체 FINISHED 경기의 박스스코어를 재스크랩(upsert)한다. game_stats는 원래
   * 당일 경기만 스크랩하는 크론(scrapeGameStats)으로 채워져 시즌 전체를 커버하지 못하고,
   * player_id/at_bats_against 컬럼 추가 이전에 쌓인 행도 해당 값이 비어 있어 이미 있는
   * 경기도 다시 스크랩해 보강한다. 시즌 전체(수백 경기)를 순회하고 경기당
   * BACKFILL_DELAY_MS 만큼 텀을 둬 네이버 API에 부담을 주지 않으므로 수십 분 정도
   * 걸릴 수 있는 일회성/수동 트리거 작업이라 스케줄러에는 등록하지 않는다.
   */
  async scrapeGameStatsBackfill(seasonYear: number): Promise<ScrapeSummary> {
    const sourceName = 'naver-box-score-backfill';
    const startedAt = Date.now();

    try {
      const { data: finishedGames } = await this.gameService.findAll({
        seasonYear,
        status: GameStatus.FINISHED,
        limit: 1000,
      });
      if (finishedGames.length === 0) {
        throw new Error(`No FINISHED games found for season ${seasonYear}`);
      }

      let savedCount = 0;
      let failedGameCount = 0;

      for (const [index, game] of finishedGames.entries()) {
        if (index > 0) {
          await delay(BACKFILL_DELAY_MS);
        }
        try {
          const { saved } = await this.scrapeAndSaveGameStats(game.id);
          savedCount += saved;
        } catch (error) {
          failedGameCount++;
          this.logger.warn(
            `Failed to backfill game stats for ${game.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      const durationMs = Date.now() - startedAt;
      await this.scrapeSourceHealthService.log({
        sourceName,
        targetUrl: NAVER_GAME_RECORD_URL,
        status: ScrapeStatus.SUCCESS,
        httpStatusCode: 200,
        durationMs,
        itemsScraped: savedCount,
        errorMessage:
          failedGameCount > 0
            ? `${failedGameCount}/${finishedGames.length} games failed to backfill (see server logs)`
            : null,
        scrapedAt: new Date(),
      });
      return { itemsScraped: savedCount, durationMs };
    } catch (error) {
      await this.logFailure(
        sourceName,
        NAVER_GAME_RECORD_URL,
        startedAt,
        error,
      );
      throw error;
    }
  }

  async scrapePlayByPlay(gameId: string): Promise<ScrapeSummary> {
    const sourceName = 'naver-play-by-play';
    const startedAt = Date.now();
    const targetUrl = `${NAVER_RELAY_URL}/${gameId}${gameId.slice(0, 4)}/relay`;

    try {
      const { scraped, saved } = await this.scrapeAndSavePlayByPlay(gameId);
      if (scraped === 0) {
        throw new Error('No plate appearances scraped from source');
      }

      const durationMs = Date.now() - startedAt;
      const failedCount = scraped - saved;
      await this.scrapeSourceHealthService.log({
        sourceName,
        targetUrl,
        status: ScrapeStatus.SUCCESS,
        httpStatusCode: 200,
        durationMs,
        itemsScraped: saved,
        errorMessage:
          failedCount > 0
            ? `${failedCount}/${scraped} plate appearances failed to save (see server logs)`
            : null,
        scrapedAt: new Date(),
      });
      return { itemsScraped: saved, durationMs };
    } catch (error) {
      await this.logFailure(sourceName, targetUrl, startedAt, error);
      throw error;
    }
  }

  /**
   * 시즌 전체 FINISHED 경기의 타석 데이터를 스크랩한다. `scrapeGameStatsBackfill`과 같은 이유로
   * (경기당 이닝 수만큼 요청이 늘어나 시즌 전체는 상당히 오래 걸림) 스케줄러에는 등록하지 않고
   * 수동 트리거 전용으로 둔다.
   */
  async scrapePlayByPlayBackfill(seasonYear: number): Promise<ScrapeSummary> {
    const sourceName = 'naver-play-by-play-backfill';
    const startedAt = Date.now();

    try {
      const { data: finishedGames } = await this.gameService.findAll({
        seasonYear,
        status: GameStatus.FINISHED,
        limit: 1000,
      });
      if (finishedGames.length === 0) {
        throw new Error(`No FINISHED games found for season ${seasonYear}`);
      }

      let savedCount = 0;
      let failedGameCount = 0;

      for (const [index, game] of finishedGames.entries()) {
        if (index > 0) {
          await delay(BACKFILL_DELAY_MS);
        }
        try {
          const { saved } = await this.scrapeAndSavePlayByPlay(game.id);
          savedCount += saved;
        } catch (error) {
          failedGameCount++;
          this.logger.warn(
            `Failed to backfill plate appearances for ${game.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      const durationMs = Date.now() - startedAt;
      await this.scrapeSourceHealthService.log({
        sourceName,
        targetUrl: NAVER_RELAY_URL,
        status: ScrapeStatus.SUCCESS,
        httpStatusCode: 200,
        durationMs,
        itemsScraped: savedCount,
        errorMessage:
          failedGameCount > 0
            ? `${failedGameCount}/${finishedGames.length} games failed to backfill (see server logs)`
            : null,
        scrapedAt: new Date(),
      });
      return { itemsScraped: savedCount, durationMs };
    } catch (error) {
      await this.logFailure(sourceName, NAVER_RELAY_URL, startedAt, error);
      throw error;
    }
  }

  /**
   * 타자/투수 이름은 relay 응답이 아니라 같은 경기의 `game_stats`(박스스코어)에서
   * playerId로 매칭해 채운다 — `PlayByPlayScraper`의 클래스 doc 참고.
   */
  private async scrapeAndSavePlayByPlay(
    gameId: string,
  ): Promise<{ scraped: number; saved: number }> {
    const game = await this.gameService.findById(gameId);
    const scraped = await this.playByPlayScraper.scrape(
      gameId,
      game.homeTeamCode,
      game.awayTeamCode,
    );
    const gameStats = await this.gameStatService.findByGameIds([gameId]);
    const nameByPlayerId = new Map(
      gameStats
        .filter((stat) => stat.playerId !== null)
        .map((stat) => [stat.playerId as number, stat.playerName]),
    );
    const now = new Date();

    const plateAppearances = scraped.map(
      (item) =>
        new PlateAppearance({
          id: 0,
          gameId: item.gameId,
          seasonYear: game.seasonYear,
          inning: item.inning,
          isTopInning: item.isTopInning,
          sequenceNo: item.sequenceNo,
          batterId: item.batterId,
          batterName: resolvePlayerName(nameByPlayerId, item.batterId),
          batterTeamCode: item.batterTeamCode,
          pitcherId: item.pitcherId,
          pitcherName: resolvePlayerName(nameByPlayerId, item.pitcherId),
          pitcherTeamCode: item.pitcherTeamCode,
          resultText: item.resultText,
          result: item.result,
          hitType: item.hitType,
          isAtBat: item.isAtBat,
          createdAt: now,
        }),
    );
    let savedCount = 0;
    try {
      await this.plateAppearanceService.upsertMany(plateAppearances);
      savedCount = plateAppearances.length;
    } catch (error) {
      this.logger.warn(
        `Batch upsert failed for plate appearances in game ${gameId} (${plateAppearances.length} items), falling back to per-item save: ${error instanceof Error ? error.message : String(error)}`,
      );
      for (const plateAppearance of plateAppearances) {
        try {
          await this.plateAppearanceService.upsert(plateAppearance);
          savedCount++;
        } catch (itemError) {
          this.logger.warn(
            `Failed to save plate appearance no=${plateAppearance.sequenceNo} for game ${gameId}: ${itemError instanceof Error ? itemError.message : String(itemError)}`,
          );
        }
      }
    }

    return { scraped: scraped.length, saved: savedCount };
  }

  private async scrapeAndSaveGameStats(
    gameId: string,
  ): Promise<{ scraped: number; saved: number }> {
    const scraped = await this.gameStatsScraper.scrape(gameId);
    const now = new Date();
    const stats = scraped.map(
      (item) =>
        new GameStat({
          id: 0,
          gameId: item.gameId,
          teamCode: item.teamCode,
          playerName: item.playerName,
          playerNo: null,
          playerId: item.playerId,
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
          atBatsAgainst: item.atBatsAgainst,
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
    try {
      await this.gameStatService.upsertMany(stats);
      savedCount = stats.length;
    } catch (error) {
      this.logger.warn(
        `Batch upsert failed for game stats in game ${gameId} (${stats.length} items), falling back to per-item save: ${error instanceof Error ? error.message : String(error)}`,
      );
      for (const stat of stats) {
        try {
          await this.gameStatService.upsert(stat);
          savedCount++;
        } catch (itemError) {
          this.logger.warn(
            `Failed to save game stat for ${stat.playerName} (team ${stat.teamCode}): ${itemError instanceof Error ? itemError.message : String(itemError)}`,
          );
        }
      }
    }

    return { scraped: stats.length, saved: savedCount };
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

        const players = scraped.map(
          (item) =>
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
        try {
          await this.playerService.upsertMany(players);
          savedCount += players.length;
        } catch (error) {
          this.logger.warn(
            `Batch upsert failed for roster team ${team.code} (${players.length} items), falling back to per-item save: ${error instanceof Error ? error.message : String(error)}`,
          );
          for (const player of players) {
            try {
              await this.playerService.upsert(player);
              savedCount++;
            } catch (itemError) {
              this.logger.warn(
                `Failed to save player ${player.name} (${player.teamCode}): ${itemError instanceof Error ? itemError.message : String(itemError)}`,
              );
            }
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

function resolvePlayerName(
  nameByPlayerId: Map<number, string>,
  playerId: number | null,
): string {
  if (playerId === null) return '';
  return nameByPlayerId.get(playerId) ?? `#${playerId}`;
}
