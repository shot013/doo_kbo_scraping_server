import { Injectable, Logger } from '@nestjs/common';

export const GAME_CENTER_SOURCE_URL =
  'https://www.koreabaseball.com/Schedule/GameCenter/Main.aspx';
const GAME_LIST_URL =
  'https://www.koreabaseball.com/ws/Main.asmx/GetKboGameList';
const TEAM_RECORD_URL =
  'https://www.koreabaseball.com/ws/Schedule.asmx/GetTeamRecord';
const PITCHER_RECORD_URL =
  'https://www.koreabaseball.com/ws/Schedule.asmx/GetPitcherRecordAnalysis';

/** GAME_STATE_SC: 1=경기 전(프리뷰), 2=경기중, 3=경기종료. */
const PREVIEW_GAME_STATE = '1';
/** srId 0 = 정규시즌. 시범경기/올스타전/국제전은 KBO 사이트 자체에서도 프리뷰를 제공하지 않는다. */
const REGULAR_SEASON_SR_ID = 0;

interface KboGameListGame {
  G_ID: string;
  SEASON_ID: number;
  SR_ID: number;
  GAME_STATE_SC: string;
  AWAY_ID: string;
  HOME_ID: string;
  T_PIT_P_ID: number | null;
  B_PIT_P_ID: number | null;
}

interface KboGameListResponse {
  game: KboGameListGame[];
}

interface KboTableCell {
  Text: string;
  Class: string | null;
}

interface KboTableRow {
  row: KboTableCell[];
}

interface KboTableResponse {
  rows: KboTableRow[];
}

export interface ScrapedTeamRecord {
  record: string | null;
  recentForm: string | null;
  era: string | null;
  battingAverage: string | null;
  avgRunsScored: string | null;
  avgRunsAllowed: string | null;
}

export interface ScrapedPitcherMatchup {
  style: string | null;
  seasonRecord: string | null;
  headToHeadRecord: string | null;
  era: string | null;
  war: string | null;
  games: string | null;
  avgInnings: string | null;
  qualityStarts: string | null;
  whip: string | null;
}

export interface ScrapedGamePreview {
  gameId: string;
  awayTeam: ScrapedTeamRecord;
  homeTeam: ScrapedTeamRecord;
  awayPitcher: ScrapedPitcherMatchup | null;
  homePitcher: ScrapedPitcherMatchup | null;
}

const STYLE_PATTERN = /<span class='style'>([^<]*)<\/span>/;
const RECORD_PATTERN = /<div class='record'>([\s\S]*?)<\/div>/;

/**
 * KBO GameCenter(`/Schedule/GameCenter/Main.aspx`)는 경기 시작 전(GAME_STATE_SC=1)인
 * 경기에 한해 "프리뷰" 탭(팀 전력비교/선발투수 매치업)을 노출한다. 이 스크래퍼는 그 탭이
 * 내부적으로 호출하는 두 AJAX 엔드포인트(GetTeamRecord, GetPitcherRecordAnalysis)를 직접
 * 호출해 값을 파싱한다. 경기가 시작된 이후에는 이 데이터가 더 이상 갱신되지 않으므로
 * 시작 전 경기만 대상으로 한다.
 */
@Injectable()
export class GamePreviewScraper {
  private readonly logger = new Logger(GamePreviewScraper.name);

  /** gameDate는 `Game.gameDate`와 동일한 "YYYY-MM-DD" 형식을 받는다. */
  async scrape(gameDate: string): Promise<ScrapedGamePreview[]> {
    const games = await this.fetchGameList(gameDate.replace(/-/g, ''));
    const targets = games.filter(
      (game) =>
        game.GAME_STATE_SC === PREVIEW_GAME_STATE &&
        game.SR_ID === REGULAR_SEASON_SR_ID,
    );

    const previews: ScrapedGamePreview[] = [];
    for (const game of targets) {
      try {
        previews.push(await this.scrapeGame(game));
      } catch (error) {
        this.logger.warn(
          `Skipping game preview for ${game.G_ID}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    return previews;
  }

  private async scrapeGame(game: KboGameListGame): Promise<ScrapedGamePreview> {
    const teamRecordRows = await this.fetchTable(TEAM_RECORD_URL, {
      leId: '1',
      srId: String(game.SR_ID),
      seasonId: String(game.SEASON_ID),
      gameId: game.G_ID,
      groupSc: 'SEASON',
    });
    const [awayTeam, homeTeam] = this.parseTeamRecordRows(teamRecordRows);

    let awayPitcher: ScrapedPitcherMatchup | null = null;
    let homePitcher: ScrapedPitcherMatchup | null = null;
    if (game.T_PIT_P_ID !== null && game.B_PIT_P_ID !== null) {
      const pitcherRows = await this.fetchTable(PITCHER_RECORD_URL, {
        leId: '1',
        srId: String(game.SR_ID),
        seasonId: String(game.SEASON_ID),
        awayTeamId: game.AWAY_ID,
        awayPitId: String(game.T_PIT_P_ID),
        homeTeamId: game.HOME_ID,
        homePitId: String(game.B_PIT_P_ID),
        groupSc: 'SEASON',
      });
      [awayPitcher, homePitcher] = this.parsePitcherRows(pitcherRows);
    }

    return { gameId: game.G_ID, awayTeam, homeTeam, awayPitcher, homePitcher };
  }

  private async fetchGameList(gameDate: string): Promise<KboGameListGame[]> {
    const response = await this.postForm(GAME_LIST_URL, {
      leId: '1',
      srId: '0,1,3,4,5,6,7,9',
      date: gameDate,
    });
    const data = (await response.json()) as KboGameListResponse;
    if (!Array.isArray(data.game)) {
      throw new Error(
        'Unexpected KBO game list response shape: game is not an array',
      );
    }
    return data.game;
  }

  private async fetchTable(
    url: string,
    params: Record<string, string>,
  ): Promise<KboTableRow[]> {
    const response = await this.postForm(url, params);
    const data = (await response.json()) as KboTableResponse;
    if (!Array.isArray(data.rows)) {
      throw new Error(
        `Unexpected KBO table response shape from ${url}: rows is not an array`,
      );
    }
    return data.rows;
  }

  private async postForm(
    url: string,
    params: Record<string, string>,
  ): Promise<Response> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json, text/javascript, */*; q=0.01',
        Referer: GAME_CENTER_SOURCE_URL,
        'User-Agent': 'Mozilla/5.0',
      },
      body: new URLSearchParams(params).toString(),
    });
    if (!response.ok) {
      throw new Error(
        `KBO game center request failed (${url}): ${response.status}`,
      );
    }
    return response;
  }

  private parseTeamRecordRows(
    rows: KboTableRow[],
  ): [ScrapedTeamRecord, ScrapedTeamRecord] {
    const [away, home] = rows;
    return [this.toTeamRecord(away), this.toTeamRecord(home)];
  }

  private toTeamRecord(row: KboTableRow | undefined): ScrapedTeamRecord {
    const cells = row?.row.map((cell) => cell.Text) ?? [];
    const [
      ,
      record,
      recentForm,
      era,
      battingAverage,
      avgRunsScored,
      avgRunsAllowed,
    ] = cells;
    return {
      record: toTextOrNull(record),
      recentForm: toTextOrNull(recentForm),
      era: toTextOrNull(era),
      battingAverage: toTextOrNull(battingAverage),
      avgRunsScored: toTextOrNull(avgRunsScored),
      avgRunsAllowed: toTextOrNull(avgRunsAllowed),
    };
  }

  private parsePitcherRows(
    rows: KboTableRow[],
  ): [ScrapedPitcherMatchup | null, ScrapedPitcherMatchup | null] {
    const [away, home] = rows;
    return [this.toPitcherMatchup(away), this.toPitcherMatchup(home)];
  }

  private toPitcherMatchup(
    row: KboTableRow | undefined,
  ): ScrapedPitcherMatchup | null {
    if (!row) return null;
    const cells = row.row.map((cell) => cell.Text);
    const [pitcherCell, era, war, games, avgInnings, qualityStarts, whip] =
      cells;
    if (!pitcherCell) return null;

    const recordMatch = RECORD_PATTERN.exec(pitcherCell);
    const [seasonRecord, headToHeadRecord] = (recordMatch?.[1] ?? '')
      .split(/<br\s*\/?>/)
      .map((part) => toTextOrNull(part.trim()));

    return {
      style: toTextOrNull(STYLE_PATTERN.exec(pitcherCell)?.[1]),
      seasonRecord: seasonRecord ?? null,
      headToHeadRecord: headToHeadRecord ?? null,
      era: toTextOrNull(era),
      war: toTextOrNull(war),
      games: toTextOrNull(games),
      avgInnings: toTextOrNull(avgInnings),
      qualityStarts: toTextOrNull(qualityStarts),
      whip: toTextOrNull(whip),
    };
  }
}

/** KBO는 표본이 없는 항목을 "-" 또는 빈 문자열로 내려준다. 둘 다 null로 정규화한다. */
function toTextOrNull(text: string | null | undefined): string | null {
  const trimmed = text?.trim();
  return !trimmed || trimmed === '-' ? null : trimmed;
}
