import { Injectable, Logger } from '@nestjs/common';
import {
  HitType,
  PlateAppearanceResult,
} from '../../../plate-appearances/domain/entities/plate-appearance.entity';

export const NAVER_RELAY_URL = 'https://api-gw.sports.naver.com/schedule/games';

const GAME_ID_PATTERN = /^\d{8}[A-Za-z]{2}[A-Za-z]{2}\d+$/;
const RESULT_TEXT_OPTION_TYPE = 13;
const BATTER_UP_TEXT_OPTION_TYPE = 8;
const HOME_BATTING = '1';
const MAX_INNINGS_TO_TRY = 20;
const INNING_REQUEST_DELAY_MS = 300;

interface NaverGameState {
  batter: string;
  pitcher: string;
}

interface NaverTextOption {
  type: number;
  text: string;
  currentGameState?: NaverGameState;
}

interface NaverTextRelayItem {
  no: number;
  inn: number;
  homeOrAway: string;
  textOptions: NaverTextOption[];
}

interface NaverTextRelayData {
  textRelays: NaverTextRelayItem[];
}

interface NaverRelayResponse {
  result: { textRelayData: NaverTextRelayData | null };
}

export interface ScrapedPlateAppearance {
  gameId: string;
  inning: number;
  isTopInning: boolean;
  sequenceNo: number;
  batterId: number | null;
  batterTeamCode: string;
  pitcherId: number | null;
  pitcherTeamCode: string;
  resultText: string;
  result: PlateAppearanceResult;
  hitType: HitType | null;
  isAtBat: boolean;
}

/**
 * `game-stats.scraper.ts`와 같은 Naver Sports 문자중계 API를 쓰지만, 여기서는
 * `relay?inning=N` 엔드포인트로 타석 단위(타자+투수+결과) 데이터를 얻는다.
 * `inning`을 1부터 늘려가며 빈 배열이 나올 때까지 순회하면 경기 전체 타석을 모을 수 있다
 * (실측: 9이닝 경기에 inning=10을 요청하면 `textRelays: []`가 온다).
 *
 * 선수 이름은 여기서 채우지 않는다 — 이 응답에 함께 오는 로스터 메타데이터(`homeEntry`/
 * `awayEntry`)는 "현재 시점" 등록 선수 기준이라 과거 경기(백필 등)를 다시 스크랩할 때
 * 그 사이 방출/말소된 선수가 누락될 수 있다. 대신 이름은 같은 경기의 `game_stats`
 * 박스스코어(선수별 실제 출전 기록)에서 playerId로 매칭해 채운다(`ScrapeService` 참고).
 */
@Injectable()
export class PlayByPlayScraper {
  private readonly logger = new Logger(PlayByPlayScraper.name);

  async scrape(
    gameId: string,
    homeTeamCode: string,
    awayTeamCode: string,
  ): Promise<ScrapedPlateAppearance[]> {
    if (!GAME_ID_PATTERN.test(gameId)) {
      throw new Error(`Invalid gameId format: ${gameId}`);
    }
    const naverGameId = `${gameId}${gameId.slice(0, 4)}`;
    const plateAppearances: ScrapedPlateAppearance[] = [];

    for (let inning = 1; inning <= MAX_INNINGS_TO_TRY; inning++) {
      if (inning > 1) {
        await delay(INNING_REQUEST_DELAY_MS);
      }
      const items = await this.fetchInning(naverGameId, inning);
      if (items.length === 0) break;

      for (const item of items) {
        const plateAppearance = this.toPlateAppearance(
          item,
          gameId,
          homeTeamCode,
          awayTeamCode,
        );
        if (plateAppearance) {
          plateAppearances.push(plateAppearance);
        }
      }
    }

    this.logger.log(
      `Scraped ${plateAppearances.length} plate appearances for ${gameId}`,
    );
    return plateAppearances;
  }

  private async fetchInning(
    naverGameId: string,
    inning: number,
  ): Promise<NaverTextRelayItem[]> {
    const url = `${NAVER_RELAY_URL}/${naverGameId}/relay?inning=${inning}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!response.ok) {
      throw new Error(`Naver relay request failed: ${response.status}`);
    }
    const body = (await response.json()) as NaverRelayResponse;
    return body.result.textRelayData?.textRelays ?? [];
  }

  private toPlateAppearance(
    item: NaverTextRelayItem,
    gameId: string,
    homeTeamCode: string,
    awayTeamCode: string,
  ): ScrapedPlateAppearance | null {
    const batterUpOption = item.textOptions.find(
      (option) => option.type === BATTER_UP_TEXT_OPTION_TYPE,
    );
    const resultOption = item.textOptions.find(
      (option) => option.type === RESULT_TEXT_OPTION_TYPE,
    );
    if (!resultOption?.currentGameState) {
      if (batterUpOption) {
        this.logger.warn(
          `No result found for plate appearance no=${item.no} in game ${gameId} (may be a suspended/cancelled game)`,
        );
      }
      return null;
    }

    const isTopInning = item.homeOrAway !== HOME_BATTING;
    const batterTeamCode = isTopInning ? awayTeamCode : homeTeamCode;
    const pitcherTeamCode = isTopInning ? homeTeamCode : awayTeamCode;
    const resultText = extractResultText(resultOption.text);
    const { result, hitType, isAtBat } = classifyResultText(resultText);

    return {
      gameId,
      inning: item.inn,
      isTopInning,
      sequenceNo: item.no,
      batterId: Number(resultOption.currentGameState.batter) || null,
      batterTeamCode,
      pitcherId: Number(resultOption.currentGameState.pitcher) || null,
      pitcherTeamCode,
      resultText,
      result,
      hitType,
      isAtBat,
    };
  }
}

/** relay 텍스트는 `"{타자명} : {결과}"` 형식이라 " : " 뒤의 결과 설명만 취한다. */
function extractResultText(text: string): string {
  const separatorIndex = text.indexOf(' : ');
  return separatorIndex === -1
    ? text.trim()
    : text.slice(separatorIndex + 3).trim();
}

function classifyResultText(text: string): {
  result: PlateAppearanceResult;
  hitType: HitType | null;
  isAtBat: boolean;
} {
  if (text.includes('홈런')) {
    return {
      result: PlateAppearanceResult.HIT,
      hitType: HitType.HOME_RUN,
      isAtBat: true,
    };
  }
  if (text.includes('3루타')) {
    return {
      result: PlateAppearanceResult.HIT,
      hitType: HitType.TRIPLE,
      isAtBat: true,
    };
  }
  if (text.includes('2루타')) {
    return {
      result: PlateAppearanceResult.HIT,
      hitType: HitType.DOUBLE,
      isAtBat: true,
    };
  }
  if (text.includes('1루타')) {
    return {
      result: PlateAppearanceResult.HIT,
      hitType: HitType.SINGLE,
      isAtBat: true,
    };
  }
  if (text.includes('삼진')) {
    return {
      result: PlateAppearanceResult.STRIKEOUT,
      hitType: null,
      isAtBat: true,
    };
  }
  if (text.includes('고의4구') || text.includes('볼넷')) {
    return {
      result: PlateAppearanceResult.WALK,
      hitType: null,
      isAtBat: false,
    };
  }
  if (text.includes('몸에 맞는 볼') || text.includes('사구')) {
    return {
      result: PlateAppearanceResult.HIT_BY_PITCH,
      hitType: null,
      isAtBat: false,
    };
  }
  if (text.includes('희생')) {
    return {
      result: PlateAppearanceResult.SACRIFICE,
      hitType: null,
      isAtBat: false,
    };
  }
  if (text.includes('실책') || text.includes('아웃')) {
    return {
      result: PlateAppearanceResult.OTHER_OUT,
      hitType: null,
      isAtBat: true,
    };
  }
  return {
    result: PlateAppearanceResult.OTHER_OUT,
    hitType: null,
    isAtBat: false,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
