import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { parseInningsPitched } from '../../../../common/kbo/innings';
import { KBO_TEAMS, resolveKboTeam } from '../../../../common/kbo/kbo-team';

export const SEASON_HITTER_SOURCE_URL =
  'https://www.koreabaseball.com/Record/Player/HitterBasic/Basic1.aspx';
export const SEASON_PITCHER_SOURCE_URL =
  'https://www.koreabaseball.com/Record/Player/PitcherBasic/Basic1.aspx';

const FORM_PREFIX = 'ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$';
const FORM_ID_PREFIX = 'cphContents_cphContents_cphContents_';

export interface ScrapedSeasonBattingStat {
  teamCode: string;
  teamName: string;
  playerName: string;
  rank: number;
  battingAverage: string | null;
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
  era: string | null;
  games: number;
  wins: number;
  losses: number;
  saves: number;
  holds: number;
  winPct: string | null;
  inningsPitched: string;
  hitsAllowed: number;
  homeRunsAllowed: number;
  walksAllowed: number;
  hitByPitch: number;
  strikeoutsPitched: number;
  runsAllowed: number;
  earnedRuns: number;
  whip: string | null;
}

/**
 * KBO 공식 기록실(HitterBasic/PitcherBasic Basic1.aspx)은 필터 없이 GET 요청하면 정렬 기준
 * 통계(타율/평균자책점) 규정타석·규정이닝을 충족한 선수만 노출해, 충족자가 없는 팀은 결과에서
 * 통째로 빠진다(예: 시즌 초 규정이닝 미달 팀). 팀 선택 필터(ddlTeam)로 10개 구단을 순회하며
 * POST 요청을 보내면 규정 충족 여부와 무관하게 해당 팀의 전체 선수 목록을 받을 수 있어,
 * 이 방식으로 팀별 전체 로스터를 수집한다. 이 경우 `rank`는 리그 전체 순위가 아니라
 * 각 팀 내에서의 나열 순서(평균자책점/타율 기준 오름차순)를 의미한다.
 */
@Injectable()
export class SeasonStatsScraper {
  private readonly logger = new Logger(SeasonStatsScraper.name);

  async scrapeBatting(): Promise<ScrapedSeasonBattingStat[]> {
    const stats: ScrapedSeasonBattingStat[] = [];

    for (const [index, team] of KBO_TEAMS.entries()) {
      if (index > 0) {
        await delay(500);
      }
      const $ = await this.fetchTeamTable(SEASON_HITTER_SOURCE_URL, team.code);
      this.parseBattingRows($, stats);
    }

    this.logger.log(`Scraped ${stats.length} season batting stat rows`);
    return stats;
  }

  private parseBattingRows(
    $: cheerio.CheerioAPI,
    stats: ScrapedSeasonBattingStat[],
  ): void {
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
          battingAverage: toRateStatOrNull(avg),
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
  }

  async scrapePitching(): Promise<ScrapedSeasonPitchingStat[]> {
    const stats: ScrapedSeasonPitchingStat[] = [];

    for (const [index, team] of KBO_TEAMS.entries()) {
      if (index > 0) {
        await delay(500);
      }
      const $ = await this.fetchTeamTable(SEASON_PITCHER_SOURCE_URL, team.code);
      this.parsePitchingRows($, stats);
    }

    this.logger.log(`Scraped ${stats.length} season pitching stat rows`);
    return stats;
  }

  private parsePitchingRows(
    $: cheerio.CheerioAPI,
    stats: ScrapedSeasonPitchingStat[],
  ): void {
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
          era: toRateStatOrNull(era),
          games: toStrictInt(games, 'games'),
          wins: toStrictInt(wins, 'wins'),
          losses: toStrictInt(losses, 'losses'),
          saves: toStrictInt(saves, 'saves'),
          holds: toStrictInt(holds, 'holds'),
          winPct: toRateStatOrNull(winPct),
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
          whip: toRateStatOrNull(whip),
        });
      } catch (error) {
        this.logger.warn(
          `Skipping malformed season pitching row (player=${playerName}): ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  }

  /**
   * `ddlTeam` 필터를 특정 팀으로 선택한 뒤 postback(POST)해서, 규정 충족 여부와 무관하게
   * 그 팀의 전체 선수 목록을 받아온다. 시즌/시리즈(정규시즌 등)는 KBO 사이트의 기본 선택값을
   * 그대로 이어받는다.
   */
  private async fetchTeamTable(
    url: string,
    teamCode: string,
  ): Promise<cheerio.CheerioAPI> {
    const getResponse = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!getResponse.ok) {
      throw new Error(`KBO season stats request failed: ${getResponse.status}`);
    }
    const getHtml = await getResponse.text();
    const $get = cheerio.load(getHtml);
    const viewState = $get('#__VIEWSTATE').val() as string | undefined;
    const viewStateGenerator = $get('#__VIEWSTATEGENERATOR').val() as
      string | undefined;
    const eventValidation = $get('#__EVENTVALIDATION').val() as
      string | undefined;
    const sessionCookie = getResponse.headers.get('set-cookie');
    if (!viewState || !eventValidation) {
      throw new Error('KBO season stats page is missing ASP.NET form state');
    }
    const seasonValue =
      $get(`#${FORM_ID_PREFIX}ddlSeason_ddlSeason option[selected]`).attr(
        'value',
      ) ?? '';
    const seriesValue =
      $get(`#${FORM_ID_PREFIX}ddlSeries_ddlSeries option[selected]`).attr(
        'value',
      ) ?? '0';
    const hfPage = ($get(`#${FORM_ID_PREFIX}hfPage`).val() as string) ?? '1';
    const hfOrderByCol =
      ($get(`#${FORM_ID_PREFIX}hfOrderByCol`).val() as string) ?? '';
    const hfOrderBy =
      ($get(`#${FORM_ID_PREFIX}hfOrderBy`).val() as string) ?? '';

    const form = new URLSearchParams();
    form.set('__EVENTTARGET', `${FORM_PREFIX}ddlTeam$ddlTeam`);
    form.set('__EVENTARGUMENT', '');
    form.set('__LASTFOCUS', '');
    form.set('__VIEWSTATE', viewState);
    form.set('__VIEWSTATEGENERATOR', viewStateGenerator ?? '');
    form.set('__EVENTVALIDATION', eventValidation);
    form.set(`${FORM_PREFIX}ddlSeason$ddlSeason`, seasonValue);
    form.set(`${FORM_PREFIX}ddlSeries$ddlSeries`, seriesValue);
    form.set(`${FORM_PREFIX}ddlTeam$ddlTeam`, teamCode);
    form.set(`${FORM_PREFIX}ddlSituation$ddlSituation`, '');
    form.set(`${FORM_PREFIX}ddlSituationDetail$ddlSituationDetail`, '');
    form.set(`${FORM_PREFIX}hfPage`, hfPage);
    form.set(`${FORM_PREFIX}hfOrderByCol`, hfOrderByCol);
    form.set(`${FORM_PREFIX}hfOrderBy`, hfOrderBy);

    const postResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: url,
        ...(sessionCookie ? { Cookie: sessionCookie.split(';')[0] } : {}),
      },
      body: form.toString(),
    });
    if (!postResponse.ok) {
      throw new Error(
        `KBO season stats team filter submit failed: ${postResponse.status}`,
      );
    }
    const postHtml = await postResponse.text();
    return cheerio.load(postHtml);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * KBO는 이닝/타석이 없어 산출할 수 없는 비율 스탯(평균자책점, 승률, WHIP, 타율)을
 * 숫자 대신 "-"로 표시한다. decimal 컬럼에 그대로 넣으면 DB 에러가 나므로 null로 정규화한다.
 */
function toRateStatOrNull(text: string): string | null {
  return text === '-' || text === '' ? null : text;
}

function toStrictInt(text: string, field: string): number {
  const value = Number(text);
  if (text === '' || Number.isNaN(value)) {
    throw new Error(`Invalid numeric value for ${field}: "${text}"`);
  }
  return value;
}
