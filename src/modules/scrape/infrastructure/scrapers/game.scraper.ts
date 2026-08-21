import { Injectable, Logger } from '@nestjs/common';
import { GameStatus } from '../../../game/domain/entities/game.entity';
import { resolveKboTeam } from '../../../../common/kbo/kbo-team';

export const SCHEDULE_SOURCE_URL =
  'https://www.koreabaseball.com/Schedule/Schedule.aspx';
export const SCHEDULE_AJAX_URL =
  'https://www.koreabaseball.com/ws/Schedule.asmx/GetScheduleList';
export const NAVER_SCHEDULE_URL =
  'https://api-gw.sports.naver.com/schedule/games';

/** 한 번에 한 달치 일정을 모두 받아오기 위한 페이지 크기 (한 달 최대 ~130경기). */
const NAVER_SCHEDULE_PAGE_SIZE = 500;

interface NaverScheduleGame {
  gameId: string;
  homeTeamScore: number | null;
  awayTeamScore: number | null;
  homeStarterName: string | null;
  awayStarterName: string | null;
}

interface NaverScheduleResponse {
  result: { games: NaverScheduleGame[]; gameTotalCount: number };
}

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
  homeStarterPitcher: string | null;
  awayStarterPitcher: string | null;
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
    const gameMonth = this.resolveCurrentKstMonth();
    const body = new URLSearchParams({
      leId: '1',
      srIdList: '0,9,6',
      seasonId: String(seasonYear),
      gameMonth,
      teamId: '',
    });

    const response = await fetch(SCHEDULE_AJAX_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json, text/javascript, */*; q=0.01',
        Referer: SCHEDULE_SOURCE_URL,
        'User-Agent': 'Mozilla/5.0',
      },
      body: body.toString(),
    });
    if (!response.ok) {
      throw new Error(`KBO schedule request failed: ${response.status}`);
    }
    const data = (await response.json()) as KboScheduleResponse;
    if (!Array.isArray(data.rows)) {
      throw new Error(
        'Unexpected KBO schedule response shape: rows is not an array',
      );
    }
    const games = this.parseRows(data.rows, seasonYear);
    this.logger.log(`Scraped ${games.length} games`);

    await this.enrichFromNaver(games);
    return games;
  }

  /**
   * KBO 일정 페이지가 브라우저에서 로드될 때 자동으로 요청하는 값(현재 KST 기준 월)을
   * 그대로 재현한다. 서버 프로세스의 로컬 타임존과 무관하게 KST 기준으로 계산한다.
   */
  private resolveCurrentKstMonth(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      month: '2-digit',
    }).format(new Date());
  }

  /**
   * KBO 일정 페이지에는 선발투수가 없고, 진행 중인 경기의 점수도 실시간으로 갱신되지
   * 않는다(경기 종료 후 최종 스코어만 정확). 두 가지 모두 네이버 스포츠 일정 API에서
   * 채운다. 네이버 gameId는 KBO gameId 뒤에 연도를 붙인 형식이라 그 부분만 잘라내면
   * 우리 gameId로 되돌릴 수 있다.
   *
   * 스크래핑한 경기 전체 기간을 한 번의 요청으로 받아와 대상 사이트 부하를 최소화한다.
   */
  private async enrichFromNaver(games: ScrapedGame[]): Promise<void> {
    if (games.length === 0) return;

    const gameDates = games.map((game) => game.gameDate).sort();
    const fromDate = gameDates[0];
    const toDate = gameDates[gameDates.length - 1];

    try {
      const url =
        `${NAVER_SCHEDULE_URL}?fields=basic,schedule,baseball` +
        `&fromDate=${fromDate}&toDate=${toDate}` +
        `&size=${NAVER_SCHEDULE_PAGE_SIZE}&categoryId=kbo`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (!response.ok) {
        throw new Error(`Naver schedule request failed: ${response.status}`);
      }
      const body = (await response.json()) as NaverScheduleResponse;
      if (body.result.gameTotalCount > body.result.games.length) {
        this.logger.warn(
          `Naver schedule returned ${body.result.games.length}/${body.result.gameTotalCount} games for ${fromDate}~${toDate}; some games were not enriched`,
        );
      }
      const naverById = new Map(
        body.result.games.map((game) => [game.gameId.slice(0, -4), game]),
      );

      for (const game of games) {
        const naverGame = naverById.get(game.id);
        if (!naverGame) continue;
        // 선발 예고 전인 경기는 선발투수가 빈 문자열로 내려온다.
        game.homeStarterPitcher = naverGame.homeStarterName?.trim() || null;
        game.awayStarterPitcher = naverGame.awayStarterName?.trim() || null;
        if (game.status === GameStatus.IN_PROGRESS) {
          game.homeScore = naverGame.homeTeamScore;
          game.awayScore = naverGame.awayTeamScore;
        }
      }
    } catch (error) {
      this.logger.warn(
        `Failed to enrich games from Naver for ${fromDate}~${toDate}: ${error instanceof Error ? error.message : String(error)}`,
      );
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
      homeStarterPitcher: null,
      awayStarterPitcher: null,
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
