import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { resolveKboTeam } from '../../../../common/kbo/kbo-team';

export const STANDINGS_SOURCE_URL =
  'https://www.koreabaseball.com/Record/TeamRank/TeamRank.aspx';

export interface ScrapedStanding {
  teamCode: string;
  teamName: string;
  rank: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: string;
  gamesBehind: string | null;
  streak: string | null;
  last10: string | null;
  homeRecord: string | null;
  awayRecord: string | null;
}

@Injectable()
export class StandingsScraper {
  private readonly logger = new Logger(StandingsScraper.name);

  async scrape(): Promise<ScrapedStanding[]> {
    const response = await fetch(STANDINGS_SOURCE_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!response.ok) {
      throw new Error(`KBO standings request failed: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const standings: ScrapedStanding[] = [];

    $('table.tData')
      .first()
      .find('tbody tr')
      .each((_, row) => {
        const cells = $(row)
          .find('td')
          .toArray()
          .map((cell) => $(cell).text().trim());
        if (cells.length < 12) return;

        const [
          rank,
          teamShortName,
          gamesPlayed,
          wins,
          losses,
          draws,
          winRate,
          gamesBehind,
          last10,
          streak,
          homeRecord,
          awayRecord,
        ] = cells;

        const team = resolveKboTeam(teamShortName);
        standings.push({
          teamCode: team.code,
          teamName: team.fullName,
          rank: Number(rank),
          gamesPlayed: Number(gamesPlayed),
          wins: Number(wins),
          losses: Number(losses),
          draws: Number(draws),
          winRate,
          gamesBehind: gamesBehind === '0' ? '0.0' : gamesBehind,
          streak: streak || null,
          last10: last10 || null,
          homeRecord: homeRecord || null,
          awayRecord: awayRecord || null,
        });
      });

    this.logger.log(`Scraped ${standings.length} standings rows`);
    return standings;
  }
}
