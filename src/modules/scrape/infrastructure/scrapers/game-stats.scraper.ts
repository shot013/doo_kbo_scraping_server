import { Injectable, Logger } from '@nestjs/common';
import { PlayerStatType } from '../../../game-stats/domain/entities/game-stat.entity';

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
  era: string;
  wls: string;
}

interface NaverGameRecord {
  gameInfo: { aCode: string; hCode: string };
  battersBoxscore: { away: NaverBatterBox[]; home: NaverBatterBox[] };
  pitchersBoxscore: { away: NaverPitcherBox[]; home: NaverPitcherBox[] };
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
}

/**
 * KBO 공식 게임센터(koreabaseball.com)는 라이브 박스스코어 AJAX 응답이 느리거나
 * 아예 오지 않는 경우가 있어(Playwright로 최대 15초 대기해도 못 받는 사례 확인됨),
 * 더 안정적으로 응답하는 네이버 스포츠 API에서 같은 데이터를 가져온다.
 * 네이버 gameId는 KBO gameId 뒤에 연도(gameId 앞 4자리)를 붙인 형식이다
 * (예: "20260816OBHT0" -> "20260816OBHT02026").
 */
@Injectable()
export class GameStatsScraper {
  private readonly logger = new Logger(GameStatsScraper.name);

  async scrape(gameId: string): Promise<ScrapedGameStat[]> {
    if (!GAME_ID_PATTERN.test(gameId)) {
      throw new Error(`Invalid gameId format: ${gameId}`);
    }
    const naverGameId = `${gameId}${gameId.slice(0, 4)}`;
    const url = `${NAVER_GAME_RECORD_URL}/${naverGameId}/record`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!response.ok) {
      throw new Error(`Naver box score request failed: ${response.status}`);
    }
    const body = (await response.json()) as NaverGameRecordResponse;
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
    this.logger.log(`Scraped ${stats.length} game-stat rows for ${gameId}`);
    return stats;
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
      players.map((player) => ({
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
      })),
    );
  }
}

/**
 * 네이버 API의 이닝 표기는 정수("6")거나 이미 우리 표기(N.1=1/3이닝, N.2=2/3이닝)와
 * 같은 소수 형태("5.1")로 온다. 정수는 ".0"을 붙여 맞추고, 인식할 수 없는 값은 null로 둔다.
 */
function toInningsPitched(raw: string): string | null {
  if (!raw) return null;
  if (/^\d+\.\d$/.test(raw)) return raw;
  if (/^\d+$/.test(raw)) return `${raw}.0`;
  return null;
}
