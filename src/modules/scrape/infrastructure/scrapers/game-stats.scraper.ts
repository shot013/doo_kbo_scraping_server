import { Injectable, Logger } from '@nestjs/common';
import { chromium } from 'playwright';
import { PlayerStatType } from '../../../game-stats/domain/entities/game-stat.entity';

export const GAME_CENTER_SOURCE_URL =
  'https://www.koreabaseball.com/Schedule/GameCenter/Main.aspx';

interface KboCell {
  Text: string;
}

interface KboRow {
  row: KboCell[];
}

interface KboTable {
  headers?: KboRow[];
  rows: KboRow[];
  tfoot?: KboRow[];
}

interface HitterBlock {
  table1: string;
  table3: string;
}

interface PitcherBlock {
  table: string;
}

interface BoxScoreResponse {
  arrHitter: HitterBlock[];
  arrPitcher: PitcherBlock[];
  code: string;
}

export interface ScrapedGameStat {
  gameId: string;
  teamCode: string;
  playerName: string;
  statType: PlayerStatType;
  atBats: number | null;
  hits: number | null;
  rbi: number | null;
  runs: number | null;
  battingAverage: string | null;
  inningsPitched: string | null;
  hitsAllowed: number | null;
  earnedRuns: number | null;
  strikeoutsPitched: number | null;
  walksAllowed: number | null;
  homeRunsAllowed: number | null;
  win: boolean;
  loss: boolean;
  save: boolean;
  hold: boolean;
  era: string | null;
}

const cellText = (row: KboRow, index: number): string =>
  (row.row[index]?.Text ?? '').trim();

@Injectable()
export class GameStatsScraper {
  private readonly logger = new Logger(GameStatsScraper.name);

  async scrape(gameId: string): Promise<ScrapedGameStat[]> {
    const gameDate = gameId.slice(0, 8);
    const awayTeamCode = gameId.slice(8, 10);
    const homeTeamCode = gameId.slice(10, 12);
    const url = `${GAME_CENTER_SOURCE_URL}?gameDate=${gameDate}&gameId=${gameId}&section=REVIEW`;

    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      const responsePromise = page.waitForResponse((res) =>
        res.url().includes('/ws/Schedule.asmx/GetBoxScoreScroll'),
      );
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      const response = await responsePromise;
      if (!response.ok()) {
        throw new Error(`KBO box score request failed: ${response.status()}`);
      }
      const data = (await response.json()) as BoxScoreResponse;
      if (data.code !== '100') {
        throw new Error(`KBO box score returned code ${data.code}`);
      }

      const stats = [
        ...this.parseHitters(
          data.arrHitter,
          gameId,
          awayTeamCode,
          homeTeamCode,
        ),
        ...this.parsePitchers(
          data.arrPitcher,
          gameId,
          awayTeamCode,
          homeTeamCode,
        ),
      ];
      this.logger.log(`Scraped ${stats.length} game-stat rows for ${gameId}`);
      return stats;
    } finally {
      await browser.close();
    }
  }

  private parseHitters(
    blocks: HitterBlock[],
    gameId: string,
    awayTeamCode: string,
    homeTeamCode: string,
  ): ScrapedGameStat[] {
    const stats: ScrapedGameStat[] = [];

    blocks.forEach((block, teamIndex) => {
      const teamCode = teamIndex === 0 ? awayTeamCode : homeTeamCode;
      const names = JSON.parse(block.table1) as KboTable;
      const lines = JSON.parse(block.table3) as KboTable;

      names.rows.forEach((nameRow, i) => {
        const playerName = cellText(nameRow, 2);
        const lineRow = lines.rows[i];
        if (!playerName || !lineRow) return;

        stats.push({
          gameId,
          teamCode,
          playerName,
          statType: PlayerStatType.BATTING,
          atBats: toIntOrNull(cellText(lineRow, 0)),
          hits: toIntOrNull(cellText(lineRow, 1)),
          rbi: toIntOrNull(cellText(lineRow, 2)),
          runs: toIntOrNull(cellText(lineRow, 3)),
          battingAverage: cellText(lineRow, 4) || null,
          inningsPitched: null,
          hitsAllowed: null,
          earnedRuns: null,
          strikeoutsPitched: null,
          walksAllowed: null,
          homeRunsAllowed: null,
          win: false,
          loss: false,
          save: false,
          hold: false,
          era: null,
        });
      });
    });

    return stats;
  }

  private parsePitchers(
    blocks: PitcherBlock[],
    gameId: string,
    awayTeamCode: string,
    homeTeamCode: string,
  ): ScrapedGameStat[] {
    const stats: ScrapedGameStat[] = [];

    blocks.forEach((block, teamIndex) => {
      const teamCode = teamIndex === 0 ? awayTeamCode : homeTeamCode;
      const table = JSON.parse(block.table) as KboTable;

      for (const row of table.rows) {
        const playerName = cellText(row, 0);
        if (!playerName) continue;
        const result = cellText(row, 2);

        stats.push({
          gameId,
          teamCode,
          playerName,
          statType: PlayerStatType.PITCHING,
          atBats: null,
          hits: null,
          rbi: null,
          runs: null,
          battingAverage: null,
          inningsPitched: parseInningsPitched(cellText(row, 6)),
          hitsAllowed: toIntOrNull(cellText(row, 10)),
          homeRunsAllowed: toIntOrNull(cellText(row, 11)),
          walksAllowed: toIntOrNull(cellText(row, 12)),
          strikeoutsPitched: toIntOrNull(cellText(row, 13)),
          earnedRuns: toIntOrNull(cellText(row, 15)),
          era: cellText(row, 16) || null,
          win: result === '승',
          loss: result === '패',
          save: result === '세',
          hold: result === '홀드',
        });
      }
    });

    return stats;
  }
}

function toIntOrNull(text: string): number | null {
  if (text === '' || text === '&nbsp;') return null;
  const value = Number(text);
  return Number.isNaN(value) ? null : value;
}

/**
 * KBO 이닝 표기(정수 또는 "1/3"/"2/3", "N 1/3"/"N 2/3")를
 * 야구 통상 표기(N.1 = N+1/3이닝, N.2 = N+2/3이닝)로 변환한다.
 */
function parseInningsPitched(raw: string): string | null {
  if (!raw || raw === '&nbsp;') return null;

  const combined = /^(\d+)\s+([12])\/3$/.exec(raw);
  if (combined) return `${combined[1]}.${combined[2]}`;

  const fractionOnly = /^([12])\/3$/.exec(raw);
  if (fractionOnly) return `0.${fractionOnly[1]}`;

  const whole = /^\d+$/.exec(raw);
  if (whole) return `${raw}.0`;

  return null;
}
