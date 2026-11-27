import { Injectable, Logger } from '@nestjs/common';
import { PlayerStatType } from '../../../game-stats/domain/entities/game-stat.entity';
import { GameSeries } from '../../../game/domain/entities/game.entity';
import { NaverBrowserClient } from './naver-browser.client';
import { toNaverGameId } from './naver-game-id';

export const NAVER_GAME_RECORD_URL =
  'https://api-gw.sports.naver.com/schedule/games';

const GAME_ID_PATTERN = /^\d{8}[A-Za-z]{2}[A-Za-z]{2}\d+$/;
const DECISION_WIN = '승';
const DECISION_LOSS = '패';
const DECISION_SAVE = '세';
const DECISION_HOLD = '홀드';

interface NaverBatterBox {
  name: string;
  playerCode: string;
  ab: number;
  hit: number;
  rbi: number;
  run: number;
  hra: string;
}

/**
 * 투수 박스스코어 한 줄. 배열 순서가 팀 안의 등판 순서다(선발이 맨 앞, 문자중계의 교체 순서와
 * 같음을 확인). `bf`는 이름과 달리 투구 수이고, 상대한 타자 수는 `pa`다.
 */
interface NaverPitcherBox {
  name: string;
  pcode: string;
  ab: number;
  inn: string;
  hit: number;
  hr: number;
  bb: number;
  kk: number;
  er: number;
  r?: number;
  bf?: number;
  era: string;
  wls: string;
}

interface NaverRheb {
  r: number;
  h: number;
  e: number;
  b: number;
}

/**
 * 이닝별 득점은 팀마다 실제로 한 이닝까지만 온다. 연장이면 배열이 길어지고, 홈팀이 이기고
 * 있어 9회말을 하지 않으면 홈 배열이 원정보다 하나 짧다(X 표시는 따로 오지 않는다).
 */
interface NaverScoreBoard {
  inn: { away: unknown[]; home: unknown[] };
  rheb: { away: NaverRheb; home: NaverRheb };
}

interface NaverGameRecord {
  gameInfo: { aCode: string; hCode: string };
  battersBoxscore: { away: NaverBatterBox[]; home: NaverBatterBox[] };
  pitchersBoxscore: { away: NaverPitcherBox[]; home: NaverPitcherBox[] };
  scoreBoard?: NaverScoreBoard | null;
}

interface NaverGameRecordResponse {
  result: { recordData: NaverGameRecord | null };
}

export interface ScrapedGameStat {
  gameId: string;
  teamCode: string;
  playerName: string;
  playerId: number | null;
  statType: PlayerStatType;
  atBats: number | null;
  hits: number | null;
  rbi: number | null;
  runs: number | null;
  battingAverage: string | null;
  atBatsAgainst: number | null;
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
  /** 투수 행에서만 채운다. 출처에 없으면 null. */
  runsAllowed: number | null;
  pitchCount: number | null;
  /** 팀 안에서의 등판 순서 (선발 = 1) */
  appearanceOrder: number | null;
}

/** 한 팀의 점수표 한 줄. 하지 않은 이닝은 null이다. */
export interface ScrapedLineScore {
  gameId: string;
  teamCode: string;
  isHome: boolean;
  innings: (number | null)[];
  runs: number;
  hits: number;
  errors: number;
  walks: number;
}

export interface ScrapedGameRecord {
  stats: ScrapedGameStat[];
  /** 원정, 홈 순서. 응답에 점수표가 없으면 빈 배열이다. */
  lineScores: ScrapedLineScore[];
}

/**
 * KBO 공식 게임센터(koreabaseball.com)는 라이브 박스스코어 AJAX 응답이 느리거나
 * 아예 오지 않는 경우가 있어(Playwright로 최대 15초 대기해도 못 받는 사례 확인됨),
 * 더 안정적으로 응답하는 네이버 스포츠 API에서 같은 데이터를 가져온다.
 * 네이버 gameId 변환 규칙은 `toNaverGameId` 참고.
 */
@Injectable()
export class GameStatsScraper {
  private readonly logger = new Logger(GameStatsScraper.name);

  constructor(private readonly naver: NaverBrowserClient) {}

  async scrape(gameId: string, series: GameSeries): Promise<ScrapedGameRecord> {
    if (!GAME_ID_PATTERN.test(gameId)) {
      throw new Error(`Invalid gameId format: ${gameId}`);
    }
    const url = `${NAVER_GAME_RECORD_URL}/${toNaverGameId(gameId, series)}/record`;

    const body = await this.naver.fetchJson<NaverGameRecordResponse>(url);
    const record = body.result.recordData;
    if (!record) {
      throw new Error(
        `Box score not available for game ${gameId} (game may not have started yet)`,
      );
    }

    const { aCode: awayTeamCode, hCode: homeTeamCode } = record.gameInfo;
    const stats = [
      ...this.parseBatters(
        record.battersBoxscore,
        gameId,
        awayTeamCode,
        homeTeamCode,
      ),
      ...this.parsePitchers(
        record.pitchersBoxscore,
        gameId,
        awayTeamCode,
        homeTeamCode,
      ),
    ];
    const lineScores = parseLineScores(
      record.scoreBoard,
      gameId,
      awayTeamCode,
      homeTeamCode,
    );
    this.logger.log(
      `Scraped ${stats.length} game-stat rows and ${lineScores.length} line scores for ${gameId}`,
    );
    return { stats, lineScores };
  }

  private parseBatters(
    box: { away: NaverBatterBox[]; home: NaverBatterBox[] },
    gameId: string,
    awayTeamCode: string,
    homeTeamCode: string,
  ): ScrapedGameStat[] {
    const teams: [string, NaverBatterBox[]][] = [
      [awayTeamCode, box.away],
      [homeTeamCode, box.home],
    ];

    return teams.flatMap(([teamCode, players]) =>
      players.map((player) => ({
        gameId,
        teamCode,
        playerName: player.name,
        playerId: Number(player.playerCode) || null,
        statType: PlayerStatType.BATTING,
        atBats: player.ab,
        hits: player.hit,
        rbi: player.rbi,
        runs: player.run,
        battingAverage: player.hra || null,
        atBatsAgainst: null,
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
        runsAllowed: null,
        pitchCount: null,
        appearanceOrder: null,
      })),
    );
  }

  private parsePitchers(
    box: { away: NaverPitcherBox[]; home: NaverPitcherBox[] },
    gameId: string,
    awayTeamCode: string,
    homeTeamCode: string,
  ): ScrapedGameStat[] {
    const teams: [string, NaverPitcherBox[]][] = [
      [awayTeamCode, box.away],
      [homeTeamCode, box.home],
    ];

    return teams.flatMap(([teamCode, players]) =>
      players.map((player, index) => ({
        gameId,
        teamCode,
        playerName: player.name,
        playerId: Number(player.pcode) || null,
        statType: PlayerStatType.PITCHING,
        atBats: null,
        hits: null,
        rbi: null,
        runs: null,
        battingAverage: null,
        atBatsAgainst: player.ab,
        inningsPitched: toInningsPitched(player.inn),
        hitsAllowed: player.hit,
        earnedRuns: player.er,
        strikeoutsPitched: player.kk,
        walksAllowed: player.bb,
        homeRunsAllowed: player.hr,
        win: player.wls === DECISION_WIN,
        loss: player.wls === DECISION_LOSS,
        save: player.wls === DECISION_SAVE,
        hold: player.wls === DECISION_HOLD,
        era: player.era || null,
        runsAllowed: toNullableCount(player.r),
        pitchCount: toNullableCount(player.bf),
        appearanceOrder: index + 1,
      })),
    );
  }
}

const THIRDS_BY_FRACTION: Record<string, number> = { '⅓': 1, '⅔': 2 };
const INNINGS_PATTERN = /^(\d+)?\s*([⅓⅔])?$/;

/**
 * 네이버 API의 이닝 표기를 우리 표기(N.1=1/3이닝, N.2=2/3이닝)로 맞춘다. 네이버는 정수("6"),
 * 분수 기호("1 ⅓", "0 ⅔", "⅓"), 드물게 이미 우리 표기("5.1")로 준다. 인식할 수 없는 값은 null이다.
 */
export function toInningsPitched(raw: string): string | null {
  const value = raw?.trim();
  if (!value) return null;
  if (/^\d+\.[0-2]$/.test(value)) return value;
  const match = INNINGS_PATTERN.exec(value);
  if (!match || (!match[1] && !match[2])) return null;
  const whole = match[1] ?? '0';
  const thirds = match[2] ? THIRDS_BY_FRACTION[match[2]] : 0;
  return `${Number(whole)}.${thirds}`;
}

function toNullableCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

/**
 * 두 팀의 이닝 수를 긴 쪽에 맞추고, 하지 않은 이닝(9회말 미진행 등)은 null로 채운다.
 * R·H·E·B가 하나라도 숫자가 아니면 점수표 전체를 믿을 수 없어 빈 배열을 돌려준다.
 */
export function parseLineScores(
  scoreBoard: NaverScoreBoard | null | undefined,
  gameId: string,
  awayTeamCode: string,
  homeTeamCode: string,
): ScrapedLineScore[] {
  if (!scoreBoard?.inn || !scoreBoard.rheb) return [];
  const inningCount = Math.max(
    scoreBoard.inn.away?.length ?? 0,
    scoreBoard.inn.home?.length ?? 0,
  );
  if (inningCount === 0) return [];

  const sides: [string, boolean, unknown[], NaverRheb | undefined][] = [
    [awayTeamCode, false, scoreBoard.inn.away ?? [], scoreBoard.rheb.away],
    [homeTeamCode, true, scoreBoard.inn.home ?? [], scoreBoard.rheb.home],
  ];
  const lineScores: ScrapedLineScore[] = [];
  for (const [teamCode, isHome, innings, rheb] of sides) {
    const runs = toNullableCount(rheb?.r);
    const hits = toNullableCount(rheb?.h);
    const errors = toNullableCount(rheb?.e);
    const walks = toNullableCount(rheb?.b);
    if (runs === null || hits === null || errors === null || walks === null) {
      return [];
    }
    lineScores.push({
      gameId,
      teamCode,
      isHome,
      innings: Array.from({ length: inningCount }, (_, index) =>
        toNullableCount(innings[index]),
      ),
      runs,
      hits,
      errors,
      walks,
    });
  }
  return lineScores;
}
