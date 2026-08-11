import { Injectable, Logger } from '@nestjs/common';
import { chromium } from 'playwright';
import { GameStatus } from '../../../game/domain/entities/game.entity';
import { resolveKboTeam } from '../../../../common/kbo/kbo-team';

export const SCHEDULE_SOURCE_URL =
  'https://www.koreabaseball.com/Schedule/Schedule.aspx';

interface KboScheduleCell {
  Text: string;
}

interface KboScheduleRow {
  row: KboScheduleCell[];
}

interface KboScheduleResponse {
  rows: KboScheduleRow[];
}

export interface ScrapedGame {
  id: string;
  gameDate: string;
  scheduledAt: Date;
  stadium: string | null;
  homeTeamCode: string;
  homeTeamName: string;
  awayTeamCode: string;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
  status: GameStatus;
  sourceUrl: string;
}

const DATE_CELL_PATTERN = /^(\d{2})\.(\d{2})\((.+)\)$/;
const TIME_PATTERN = /<b>(\d{2}:\d{2})<\/b>/;
const TEAM_SPANS_PATTERN = /<span>([^<]+)<\/span>/g;
const SCORE_SPANS_PATTERN = /<span class="(?:win|lose|same)">(\d+)<\/span>/g;
const GAME_ID_PATTERN = /gameId=([A-Za-z0-9]+)/;

@Injectable()
export class GameScraper {
  private readonly logger = new Logger(GameScraper.name);

  async scrape(seasonYear: number): Promise<ScrapedGame[]> {
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      const responsePromise = page.waitForResponse((res) =>
        res.url().includes('/ws/Schedule.asmx/GetScheduleList'),
      );
      await page.goto(SCHEDULE_SOURCE_URL, { waitUntil: 'domcontentloaded' });
      const response = await responsePromise;
      if (!response.ok()) {
        throw new Error(`KBO schedule request failed: ${response.status()}`);
      }
      const data = (await response.json()) as KboScheduleResponse;
      if (!Array.isArray(data.rows)) {
        throw new Error(
          'Unexpected KBO schedule response shape: rows is not an array',
        );
      }
      const games = this.parseRows(data.rows, seasonYear);
      this.logger.log(`Scraped ${games.length} games`);
      return games;
    } finally {
      await browser.close();
    }
  }

  private parseRows(rows: KboScheduleRow[], seasonYear: number): ScrapedGame[] {
    const games: ScrapedGame[] = [];
    const gameIndexByKey = new Map<string, number>();
    let currentDate: { month: string; day: string } | null = null;

    for (const { row } of rows) {
      const texts = row.map((cell) => cell.Text);
      const cells = [...texts];

      const dateMatch = DATE_CELL_PATTERN.exec(cells[0] ?? '');
      if (dateMatch) {
        currentDate = { month: dateMatch[1], day: dateMatch[2] };
        cells.shift();
      }
      if (!currentDate) continue;

      const [timeCell, playCell, reviewCell, , , , stadiumCell, noteCell] =
        cells;
      if (!playCell) continue;

      try {
        const game = this.parseGameRow({
          playCell,
          reviewCell,
          stadiumCell,
          noteCell,
          timeCell,
          currentDate,
          seasonYear,
          gameIndexByKey,
        });
        if (game) games.push(game);
      } catch (error) {
        this.logger.warn(
          `Skipping malformed schedule row: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return games;
  }

  private parseGameRow(input: {
    playCell: string;
    reviewCell: string | undefined;
    stadiumCell: string | undefined;
    noteCell: string | undefined;
    timeCell: string | undefined;
    currentDate: { month: string; day: string };
    seasonYear: number;
    gameIndexByKey: Map<string, number>;
  }): ScrapedGame | null {
    const {
      playCell,
      reviewCell,
      stadiumCell,
      noteCell,
      timeCell,
      currentDate,
      seasonYear,
      gameIndexByKey,
    } = input;

    // 클래스 없는 <span>은 팀명(첫/마지막)과 그 사이의 "vs" 마커에도 매칭되므로
    // 첫 번째와 마지막 매치만 팀명으로 취급한다.
    const teamNames = [...playCell.matchAll(TEAM_SPANS_PATTERN)].map(
      (m) => m[1],
    );
    if (teamNames.length < 2) return null;
    const awayShortName = teamNames[0];
    const homeShortName = teamNames[teamNames.length - 1];
    const awayTeam = resolveKboTeam(awayShortName);
    const homeTeam = resolveKboTeam(homeShortName);

    const scores = [...playCell.matchAll(SCORE_SPANS_PATTERN)].map((m) =>
      Number(m[1]),
    );
    const [awayScore, homeScore] = scores.length === 2 ? scores : [null, null];

    const gameIdMatch = GAME_ID_PATTERN.exec(reviewCell ?? '');
    const gameDate = `${seasonYear}-${currentDate.month}-${currentDate.day}`;
    const dateKey = `${seasonYear}${currentDate.month}${currentDate.day}`;

    let gameId = gameIdMatch?.[1] ?? null;
    if (!gameId) {
      const key = `${dateKey}${awayTeam.code}${homeTeam.code}`;
      const index = gameIndexByKey.get(key) ?? 0;
      gameIndexByKey.set(key, index + 1);
      gameId = `${key}${index}`;
    }

    const note = (noteCell ?? '-').trim();
    const status = this.resolveStatus({
      hasScore: scores.length === 2,
      hasReviewLink: Boolean(gameIdMatch),
      note,
    });

    const timeMatch = TIME_PATTERN.exec(timeCell ?? '');
    const time = timeMatch?.[1] ?? '00:00';
    const scheduledAt = new Date(`${gameDate}T${time}:00+09:00`);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new Error(`Invalid scheduled date/time: ${gameDate}T${time}`);
    }

    return {
      id: gameId,
      gameDate,
      scheduledAt,
      stadium: stadiumCell?.trim() || null,
      homeTeamCode: homeTeam.code,
      homeTeamName: homeTeam.fullName,
      awayTeamCode: awayTeam.code,
      awayTeamName: awayTeam.fullName,
      homeScore: homeScore ?? null,
      awayScore: awayScore ?? null,
      status,
      sourceUrl: SCHEDULE_SOURCE_URL,
    };
  }

  private resolveStatus(input: {
    hasScore: boolean;
    hasReviewLink: boolean;
    note: string;
  }): GameStatus {
    if (input.note !== '-') return GameStatus.POSTPONED;
    if (input.hasScore) {
      return input.hasReviewLink ? GameStatus.FINISHED : GameStatus.IN_PROGRESS;
    }
    return GameStatus.SCHEDULED;
  }
}
