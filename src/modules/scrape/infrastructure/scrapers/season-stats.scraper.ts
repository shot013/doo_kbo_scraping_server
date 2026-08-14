import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { parseInningsPitched } from '../../../../common/kbo/innings';
import { resolveKboTeam } from '../../../../common/kbo/kbo-team';

export const SEASON_HITTER_SOURCE_URL =
  'https://www.koreabaseball.com/Record/Player/HitterBasic/Basic1.aspx';
export const SEASON_PITCHER_SOURCE_URL =
  'https://www.koreabaseball.com/Record/Player/PitcherBasic/Basic1.aspx';

export interface ScrapedSeasonBattingStat {
  teamCode: string;
  teamName: string;
  playerName: string;
  rank: number;
  battingAverage: string;
  games: number;
  plateAppearances: number;
  atBats: number;
  runs: number;
  hits: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  totalBases: number;
  rbi: number;
  sacrificeHits: number;
  sacrificeFlies: number;
}

export interface ScrapedSeasonPitchingStat {
  teamCode: string;
  teamName: string;
  playerName: string;
  rank: number;
  era: string;
  games: number;
  wins: number;
  losses: number;
  saves: number;
  holds: number;
  winPct: string;
  inningsPitched: string;
  hitsAllowed: number;
  homeRunsAllowed: number;
  walksAllowed: number;
  hitByPitch: number;
  strikeoutsPitched: number;
  runsAllowed: number;
  earnedRuns: number;
  whip: string;
}

/**
 * KBO 공식 기록실(HitterBasic/PitcherBasic Basic1.aspx)은 정렬 기준 통계(타율/평균자책점)
 * 규정타석·규정이닝을 충족한 선수만 순위에 노출한다. 1페이지(약 30명)만 수집한다.
 */
@Injectable()
export class SeasonStatsScraper {
  private readonly logger = new Logger(SeasonStatsScraper.name);

  async scrapeBatting(): Promise<ScrapedSeasonBattingStat[]> {
    const $ = await this.fetchTable(SEASON_HITTER_SOURCE_URL);
    const stats: ScrapedSeasonBattingStat[] = [];

    $('table.tData01 tbody tr').each((_, row) => {
      const cells = $(row)
        .find('td')
        .toArray()
        .map((cell) => $(cell).text().trim());
      if (cells.length < 16) return;

      const [
        rank,
        playerName,
        teamShortName,
        avg,
        games,
        pa,
        ab,
        runs,
        hits,
        doubles,
        triples,
        homeRuns,
        totalBases,
        rbi,
        sac,
        sf,
      ] = cells;

      try {
        const team = resolveKboTeam(teamShortName);
        stats.push({
          teamCode: team.code,
          teamName: team.fullName,
          playerName,
          rank: toStrictInt(rank, 'rank'),
          battingAverage: avg,
          games: toStrictInt(games, 'games'),
          plateAppearances: toStrictInt(pa, 'plateAppearances'),
          atBats: toStrictInt(ab, 'atBats'),
          runs: toStrictInt(runs, 'runs'),
          hits: toStrictInt(hits, 'hits'),
          doubles: toStrictInt(doubles, 'doubles'),
          triples: toStrictInt(triples, 'triples'),
          homeRuns: toStrictInt(homeRuns, 'homeRuns'),
          totalBases: toStrictInt(totalBases, 'totalBases'),
          rbi: toStrictInt(rbi, 'rbi'),
          sacrificeHits: toStrictInt(sac, 'sacrificeHits'),
          sacrificeFlies: toStrictInt(sf, 'sacrificeFlies'),
        });
      } catch (error) {
        this.logger.warn(
          `Skipping malformed season batting row (player=${playerName}): ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });

    this.logger.log(`Scraped ${stats.length} season batting stat rows`);
    return stats;
  }

  async scrapePitching(): Promise<ScrapedSeasonPitchingStat[]> {
    const $ = await this.fetchTable(SEASON_PITCHER_SOURCE_URL);
    const stats: ScrapedSeasonPitchingStat[] = [];

    $('table.tData01 tbody tr').each((_, row) => {
      const cells = $(row)
        .find('td')
        .toArray()
        .map((cell) => $(cell).text().trim());
      if (cells.length < 19) return;

      const [
        rank,
        playerName,
        teamShortName,
        era,
        games,
        wins,
        losses,
        saves,
        holds,
        winPct,
        inningsRaw,
        hitsAllowed,
        homeRunsAllowed,
        walksAllowed,
        hitByPitch,
        strikeoutsPitched,
        runsAllowed,
        earnedRuns,
        whip,
      ] = cells;

      try {
        const team = resolveKboTeam(teamShortName);
        const inningsPitched = parseInningsPitched(inningsRaw);
        if (!inningsPitched) {
          throw new Error(`Invalid innings pitched value: "${inningsRaw}"`);
        }
        stats.push({
          teamCode: team.code,
          teamName: team.fullName,
          playerName,
          rank: toStrictInt(rank, 'rank'),
          era,
          games: toStrictInt(games, 'games'),
          wins: toStrictInt(wins, 'wins'),
          losses: toStrictInt(losses, 'losses'),
          saves: toStrictInt(saves, 'saves'),
          holds: toStrictInt(holds, 'holds'),
          winPct,
          inningsPitched,
          hitsAllowed: toStrictInt(hitsAllowed, 'hitsAllowed'),
          homeRunsAllowed: toStrictInt(homeRunsAllowed, 'homeRunsAllowed'),
          walksAllowed: toStrictInt(walksAllowed, 'walksAllowed'),
          hitByPitch: toStrictInt(hitByPitch, 'hitByPitch'),
          strikeoutsPitched: toStrictInt(
            strikeoutsPitched,
            'strikeoutsPitched',
          ),
          runsAllowed: toStrictInt(runsAllowed, 'runsAllowed'),
          earnedRuns: toStrictInt(earnedRuns, 'earnedRuns'),
          whip,
        });
      } catch (error) {
        this.logger.warn(
          `Skipping malformed season pitching row (player=${playerName}): ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });

    this.logger.log(`Scraped ${stats.length} season pitching stat rows`);
    return stats;
  }

  private async fetchTable(url: string): Promise<cheerio.CheerioAPI> {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!response.ok) {
      throw new Error(`KBO season stats request failed: ${response.status}`);
    }
    const html = await response.text();
    return cheerio.load(html);
  }
}

function toStrictInt(text: string, field: string): number {
  const value = Number(text);
  if (text === '' || Number.isNaN(value)) {
    throw new Error(`Invalid numeric value for ${field}: "${text}"`);
  }
  return value;
}
