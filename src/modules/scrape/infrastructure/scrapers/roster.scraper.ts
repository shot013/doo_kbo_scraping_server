import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { resolveKboTeamByCode } from '../../../../common/kbo/kbo-team';
import { PlayerPosition } from '../../../players/domain/entities/player.entity';

export const ROSTER_SOURCE_URL =
  'https://www.koreabaseball.com/Player/Search.aspx';

const FORM_PREFIX = 'ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$';

const POSITION_TEXT_MAP: Record<string, PlayerPosition> = {
  투수: PlayerPosition.PITCHER,
  포수: PlayerPosition.CATCHER,
  내야수: PlayerPosition.INFIELDER,
  외야수: PlayerPosition.OUTFIELDER,
};

const PLAYER_ID_PATTERN = /playerId=(\d+)/;
const PHYSICAL_PATTERN = /(\d+)\s*cm,\s*(\d+)\s*kg/;

export interface ScrapedRosterPlayer {
  id: number;
  teamCode: string;
  name: string;
  position: PlayerPosition;
  backNumber: number | null;
  birthDate: string | null;
  heightCm: number | null;
  weightKg: number | null;
  school: string | null;
}

interface FormState {
  viewState: string;
  viewStateGenerator: string | undefined;
  eventValidation: string;
}

@Injectable()
export class RosterScraper {
  private readonly logger = new Logger(RosterScraper.name);

  /**
   * KBO 선수 검색(Player/Search.aspx)은 팀당 결과를 페이지당 20명씩 ucPager(GridView 페이징
   * 컨트롤)로 나눠서 보여준다. 첫 페이지만 읽으면 대부분의 팀에서 절반 이상의 선수가 누락되므로,
   * 다음 페이지 버튼(`ucPager$btnNo{n+1}`)이 더 이상 없을 때까지 순회하며 전체 페이지를 수집한다.
   */
  async scrape(teamCode: string): Promise<ScrapedRosterPlayer[]> {
    const team = resolveKboTeamByCode(teamCode);

    const getResponse = await fetch(ROSTER_SOURCE_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!getResponse.ok) {
      throw new Error(
        `KBO player search request failed: ${getResponse.status}`,
      );
    }
    const getHtml = await getResponse.text();
    const $get = cheerio.load(getHtml);
    const initialState = extractFormState($get);
    const sessionCookie = getResponse.headers.get('set-cookie');
    const cookie = sessionCookie ? sessionCookie.split(';')[0] : undefined;

    const searchForm = new URLSearchParams();
    searchForm.set('__EVENTTARGET', '');
    searchForm.set('__EVENTARGUMENT', '');
    searchForm.set('__VIEWSTATE', initialState.viewState);
    searchForm.set(
      '__VIEWSTATEGENERATOR',
      initialState.viewStateGenerator ?? '',
    );
    searchForm.set('__EVENTVALIDATION', initialState.eventValidation);
    searchForm.set(`${FORM_PREFIX}ddlTeam`, team.code);
    searchForm.set(`${FORM_PREFIX}ddlPosition`, '');
    searchForm.set(`${FORM_PREFIX}btnSearch`, '검색');

    let $ = await this.submitForm(searchForm, cookie);

    const players: ScrapedRosterPlayer[] = [];
    let pageNum = 1;
    for (;;) {
      players.push(...this.parsePlayerRows($, team.code));

      const hasNextPage = $(`[id$="ucPager_btnNo${pageNum + 1}"]`).length > 0;
      if (!hasNextPage) break;

      await delay(300);
      pageNum++;
      const pageState = extractFormState($);
      const pageForm = new URLSearchParams();
      pageForm.set('__EVENTTARGET', `${FORM_PREFIX}ucPager$btnNo${pageNum}`);
      pageForm.set('__EVENTARGUMENT', '');
      pageForm.set('__VIEWSTATE', pageState.viewState);
      pageForm.set('__VIEWSTATEGENERATOR', pageState.viewStateGenerator ?? '');
      pageForm.set('__EVENTVALIDATION', pageState.eventValidation);
      pageForm.set(`${FORM_PREFIX}ddlTeam`, team.code);
      pageForm.set(`${FORM_PREFIX}ddlPosition`, '');

      $ = await this.submitForm(pageForm, cookie);
    }

    this.logger.log(`Scraped ${players.length} roster rows for ${team.code}`);
    return players;
  }

  private async submitForm(
    form: URLSearchParams,
    cookie: string | undefined,
  ): Promise<cheerio.CheerioAPI> {
    const response = await fetch(ROSTER_SOURCE_URL, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: ROSTER_SOURCE_URL,
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: form.toString(),
    });
    if (!response.ok) {
      throw new Error(`KBO player search submit failed: ${response.status}`);
    }
    return cheerio.load(await response.text());
  }

  private parsePlayerRows(
    $: cheerio.CheerioAPI,
    teamCode: string,
  ): ScrapedRosterPlayer[] {
    const players: ScrapedRosterPlayer[] = [];

    $('table.tEx tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 7) return;

      const backNumberText = $(cells[0]).text().trim();
      const nameCell = $(cells[1]);
      const name = nameCell.text().trim();
      const href = nameCell.find('a').attr('href') ?? '';
      const positionText = $(cells[3]).text().trim();
      const birthDateText = $(cells[4]).text().trim();
      const physicalText = $(cells[5]).text().trim();
      const school = $(cells[6]).text().trim();

      const idMatch = PLAYER_ID_PATTERN.exec(href);
      const position = POSITION_TEXT_MAP[positionText];
      if (!name || !idMatch || !position) {
        this.logger.warn(
          `Skipping malformed roster row (team=${teamCode}, name="${name}"): missing id or position`,
        );
        return;
      }

      const physicalMatch = PHYSICAL_PATTERN.exec(physicalText);

      players.push({
        id: Number(idMatch[1]),
        teamCode,
        name,
        position,
        backNumber: toIntOrNull(backNumberText),
        birthDate: /^\d{4}-\d{2}-\d{2}$/.test(birthDateText)
          ? birthDateText
          : null,
        heightCm: physicalMatch ? Number(physicalMatch[1]) : null,
        weightKg: physicalMatch ? Number(physicalMatch[2]) : null,
        school: school || null,
      });
    });

    return players;
  }
}

function extractFormState($: cheerio.CheerioAPI): FormState {
  const viewState = $('#__VIEWSTATE').val() as string | undefined;
  const viewStateGenerator = $('#__VIEWSTATEGENERATOR').val() as
    string | undefined;
  const eventValidation = $('#__EVENTVALIDATION').val() as string | undefined;
  if (!viewState || !eventValidation) {
    throw new Error('KBO player search page is missing ASP.NET form state');
  }
  return { viewState, viewStateGenerator, eventValidation };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toIntOrNull(text: string): number | null {
  if (!text) return null;
  const value = Number(text);
  return Number.isNaN(value) ? null : value;
}
