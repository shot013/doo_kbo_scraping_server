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

@Injectable()
export class RosterScraper {
  private readonly logger = new Logger(RosterScraper.name);

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
    const viewState = $get('#__VIEWSTATE').val() as string | undefined;
    const viewStateGenerator = $get('#__VIEWSTATEGENERATOR').val() as
      string | undefined;
    const eventValidation = $get('#__EVENTVALIDATION').val() as
      string | undefined;
    const sessionCookie = getResponse.headers.get('set-cookie');
    if (!viewState || !eventValidation) {
      throw new Error('KBO player search page is missing ASP.NET form state');
    }

    const form = new URLSearchParams();
    form.set('__EVENTTARGET', '');
    form.set('__EVENTARGUMENT', '');
    form.set('__VIEWSTATE', viewState);
    form.set('__VIEWSTATEGENERATOR', viewStateGenerator ?? '');
    form.set('__EVENTVALIDATION', eventValidation);
    form.set(`${FORM_PREFIX}ddlTeam`, team.code);
    form.set(`${FORM_PREFIX}ddlPosition`, '');
    form.set(`${FORM_PREFIX}btnSearch`, '검색');

    const postResponse = await fetch(ROSTER_SOURCE_URL, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(sessionCookie ? { Cookie: sessionCookie.split(';')[0] } : {}),
      },
      body: form.toString(),
    });
    if (!postResponse.ok) {
      throw new Error(
        `KBO player search submit failed: ${postResponse.status}`,
      );
    }
    const postHtml = await postResponse.text();
    const $ = cheerio.load(postHtml);
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
          `Skipping malformed roster row (team=${team.code}, name="${name}"): missing id or position`,
        );
        return;
      }

      const physicalMatch = PHYSICAL_PATTERN.exec(physicalText);

      players.push({
        id: Number(idMatch[1]),
        teamCode: team.code,
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

    this.logger.log(`Scraped ${players.length} roster rows for ${team.code}`);
    return players;
  }
}

function toIntOrNull(text: string): number | null {
  if (!text) return null;
  const value = Number(text);
  return Number.isNaN(value) ? null : value;
}
