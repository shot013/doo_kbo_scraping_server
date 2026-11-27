import { Injectable, Logger } from '@nestjs/common';
import { GameEventType } from '../../../game-events/domain/entities/game-event.entity';
import { GameSeries } from '../../../game/domain/entities/game.entity';
import {
  HitType,
  PlateAppearanceResult,
} from '../../../plate-appearances/domain/entities/plate-appearance.entity';
import { NaverBrowserClient } from './naver-browser.client';
import { toNaverGameId } from './naver-game-id';

export const NAVER_RELAY_URL = 'https://api-gw.sports.naver.com/schedule/games';

const GAME_ID_PATTERN = /^\d{8}[A-Za-z]{2}[A-Za-z]{2}\d+$/;
const HOME_BATTING = '1';
const MAX_INNINGS_TO_TRY = 20;
const INNING_REQUEST_DELAY_MS = 300;
const EMPTY_BASE = '0';

/**
 * 문자중계 textOption의 `type`. 실측(2026 포스트시즌 3경기)으로 확인한 값만 쓴다.
 * 타석 결과는 득점이 없으면 13, 득점이 나면 23으로 온다(홈런은 항상 23). 주자 이동도
 * 득점이 없는 플레이는 14, 득점 플레이에 딸린 것은 24다. 그 밖에 0(이닝 시작), 1(투구),
 * 7(마운드 방문·비디오 판독 등), 8(타자 등장), 99(경기 종료 문구)가 온다.
 */
export const RelayOptionType = {
  RESULT: 13,
  SCORING_RESULT: 23,
  RUNNER: 14,
  SCORING_RUNNER: 24,
  SUBSTITUTION: 2,
  BATTER_UP: 8,
} as const;

const RESULT_TYPES: ReadonlySet<number> = new Set([
  RelayOptionType.RESULT,
  RelayOptionType.SCORING_RESULT,
]);
const RUNNER_TYPES: ReadonlySet<number> = new Set([
  RelayOptionType.RUNNER,
  RelayOptionType.SCORING_RUNNER,
]);
/** 투수가 누구인지 믿을 수 있는 상태. 이닝 시작(0) 상태의 투수 값은 상대 팀일 때가 있다. */
const PITCHER_TRACKING_TYPES: ReadonlySet<number> = new Set([
  RelayOptionType.BATTER_UP,
  ...RESULT_TYPES,
  ...RUNNER_TYPES,
]);

interface NaverGameState {
  homeScore?: string;
  awayScore?: string;
  out?: string;
  base1?: string;
  base2?: string;
  base3?: string;
  batter?: string;
  pitcher?: string;
}

interface NaverTextOption {
  type: number;
  seqno?: number;
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

/** `game_events` 한 줄. 상태 값(아웃·주자·점수)은 그 이벤트를 반영한 뒤의 값이다. */
export interface ScrapedGameEvent {
  gameId: string;
  sequenceNo: number;
  subSequenceNo: number;
  inning: number;
  isTopInning: boolean;
  type: GameEventType;
  text: string;
  battingTeamCode: string;
  outs: number | null;
  runnerOnFirst: boolean | null;
  runnerOnSecond: boolean | null;
  runnerOnThird: boolean | null;
  homeScore: number | null;
  awayScore: number | null;
  batterId: number | null;
  pitcherId: number | null;
  inPlayerId: number | null;
  inPlayerName: string | null;
  outPlayerId: number | null;
  outPlayerName: string | null;
}

export interface ScrapedPlayByPlay {
  plateAppearances: ScrapedPlateAppearance[];
  events: ScrapedGameEvent[];
}

/** 교체 문구의 선수 이름을 id로 바꿀 때 쓰는 그 경기의 출전 선수 (박스스코어). */
export interface RosterEntry {
  teamCode: string;
  playerName: string;
  playerId: number | null;
}

interface GameContext {
  gameId: string;
  homeTeamCode: string;
  awayTeamCode: string;
  roster: PlayerLookup;
}

/**
 * `game-stats.scraper.ts`와 같은 Naver Sports 문자중계 API를 쓰지만, 여기서는
 * `relay?inning=N` 엔드포인트로 타석과 경기 이벤트(득점·교체)를 얻는다.
 * `inning`을 1부터 늘려가며 빈 배열이 나올 때까지 순회하면 경기 전체를 모을 수 있다
 * (실측: 9이닝 경기에 inning=10을 요청하면 `textRelays: []`가 온다).
 *
 * 선수 이름은 relay의 로스터 메타데이터(`homeEntry`/`awayEntry`)로 채우지 않는다. 그 값은
 * "현재 시점" 등록 선수 기준이라 과거 경기를 다시 스크랩할 때 그 사이 방출/말소된 선수가
 * 누락될 수 있다. 대신 같은 경기의 박스스코어(`roster`)로 이름과 id를 맞춘다.
 */
@Injectable()
export class PlayByPlayScraper {
  private readonly logger = new Logger(PlayByPlayScraper.name);

  constructor(private readonly naver: NaverBrowserClient) {}

  async scrape(
    gameId: string,
    series: GameSeries,
    homeTeamCode: string,
    awayTeamCode: string,
    roster: readonly RosterEntry[] = [],
  ): Promise<ScrapedPlayByPlay> {
    if (!GAME_ID_PATTERN.test(gameId)) {
      throw new Error(`Invalid gameId format: ${gameId}`);
    }
    const naverGameId = toNaverGameId(gameId, series);
    const items: NaverTextRelayItem[] = [];

    for (let inning = 1; inning <= MAX_INNINGS_TO_TRY; inning++) {
      if (inning > 1) {
        await delay(INNING_REQUEST_DELAY_MS);
      }
      const inningItems = await this.fetchInning(naverGameId, inning);
      if (inningItems.length === 0) break;
      items.push(...inningItems);
    }

    const result = parseRelayItems(items, {
      gameId,
      homeTeamCode,
      awayTeamCode,
      roster: new PlayerLookup(roster),
    });
    // 대타 발표만 있는 항목이나 주자 아웃으로 이닝이 끝난 항목은 원래 결과가 없다.
    for (const no of result.unfinishedPlateAppearances) {
      this.logger.debug(
        `No result found for plate appearance no=${no} in game ${gameId}`,
      );
    }
    this.logger.log(
      `Scraped ${result.plateAppearances.length} plate appearances and ${result.events.length} events for ${gameId}`,
    );
    return { plateAppearances: result.plateAppearances, events: result.events };
  }

  private async fetchInning(
    naverGameId: string,
    inning: number,
  ): Promise<NaverTextRelayItem[]> {
    const url = `${NAVER_RELAY_URL}/${naverGameId}/relay?inning=${inning}`;
    const body = await this.naver.fetchJson<NaverRelayResponse>(url);
    return body.result.textRelayData?.textRelays ?? [];
  }
}

/**
 * relay 항목들을 경기 순서(항목 번호, 항목 안 seqno)대로 훑어 타석과 이벤트를 만든다.
 * 이닝별 응답을 합친 배열을 그대로 넘기면 되고, 같은 항목이 두 번 들어와도 한 번만 센다.
 */
export function parseRelayItems(
  rawItems: readonly NaverTextRelayItem[],
  context: GameContext,
): ScrapedPlayByPlay & { unfinishedPlateAppearances: number[] } {
  const items = dedupeAndSort(rawItems);
  const plateAppearances: ScrapedPlateAppearance[] = [];
  const events: ScrapedGameEvent[] = [];
  const unfinishedPlateAppearances: number[] = [];
  const lastPitcherByFieldingTeam = new Map<string, number>();
  let previousState: NaverGameState | undefined;

  for (const item of items) {
    const isTopInning = item.homeOrAway !== HOME_BATTING;
    const battingTeamCode = isTopInning
      ? context.awayTeamCode
      : context.homeTeamCode;
    const fieldingTeamCode = isTopInning
      ? context.homeTeamCode
      : context.awayTeamCode;
    const options = sortOptions(item.textOptions);

    const plateAppearance = toPlateAppearance(
      item,
      options,
      context.gameId,
      battingTeamCode,
      fieldingTeamCode,
    );
    if (plateAppearance) {
      plateAppearances.push(plateAppearance);
    } else if (
      options.some((option) => option.type === RelayOptionType.BATTER_UP) &&
      !options.some((option) => RESULT_TYPES.has(option.type))
    ) {
      unfinishedPlateAppearances.push(item.no);
    }

    for (let index = 0; index < options.length; index++) {
      const option = options[index];
      const state = option.currentGameState;
      const base = {
        gameId: context.gameId,
        sequenceNo: item.no,
        subSequenceNo: option.seqno ?? index,
        inning: item.inn,
        isTopInning,
        text: option.text,
        battingTeamCode,
      };

      if (RESULT_TYPES.has(option.type)) {
        // 득점이 나는 타석은 결과 문구 뒤에 주자 이동(14/24)이 이어지고, 점수와 주자는
        // 그 마지막 이동에서야 다 반영된다. 이어진 이동은 타석 이벤트 하나로 묶는다.
        let lastIndex = index;
        while (
          lastIndex + 1 < options.length &&
          RUNNER_TYPES.has(options[lastIndex + 1].type)
        ) {
          lastIndex++;
        }
        const afterState = options[lastIndex].currentGameState ?? state;
        events.push({
          ...base,
          type: GameEventType.PLATE_APPEARANCE,
          ...toStateFields(afterState),
          batterId: toPlayerId(state?.batter),
          pitcherId: toPlayerId(state?.pitcher),
          ...NO_SUBSTITUTION,
        });
        trackPitcher(lastPitcherByFieldingTeam, fieldingTeamCode, state);
        previousState = afterState;
        index = lastIndex;
        continue;
      }

      if (RUNNER_TYPES.has(option.type)) {
        // 타석 결과에 딸리지 않은 주자 이동: 도루, 견제사, 폭투·포일·보크로 인한 진루·득점 등.
        events.push({
          ...base,
          type: scoreChanged(previousState, state)
            ? GameEventType.OTHER_RUN
            : GameEventType.OTHER,
          ...toStateFields(state),
          batterId: toPlayerId(state?.batter),
          pitcherId: toPlayerId(state?.pitcher),
          ...NO_SUBSTITUTION,
        });
        trackPitcher(lastPitcherByFieldingTeam, fieldingTeamCode, state);
        previousState = state ?? previousState;
        continue;
      }

      if (option.type === RelayOptionType.SUBSTITUTION) {
        events.push({
          ...base,
          ...toStateFields(state),
          batterId: toPlayerId(state?.batter),
          pitcherId: toPlayerId(state?.pitcher),
          ...parseSubstitution(option.text, state, {
            battingTeamCode,
            fieldingTeamCode,
            previousPitcherId:
              lastPitcherByFieldingTeam.get(fieldingTeamCode) ?? null,
            roster: context.roster,
          }),
        });
        previousState = state ?? previousState;
        continue;
      }

      if (PITCHER_TRACKING_TYPES.has(option.type)) {
        trackPitcher(lastPitcherByFieldingTeam, fieldingTeamCode, state);
      }
      previousState = state ?? previousState;
    }
  }

  return { plateAppearances, events, unfinishedPlateAppearances };
}

const NO_SUBSTITUTION = {
  inPlayerId: null,
  inPlayerName: null,
  outPlayerId: null,
  outPlayerName: null,
} as const;

const PITCHER_CHANGE_PATTERN = /^투수 (.+?) : 투수 (.+?) ?\(으\)로 교체$/;
const PINCH_HITTER_PATTERN = /^\d+번타자 (.+?) : 대타 (.+?) ?\(으\)로 교체$/;
const PINCH_RUNNER_PATTERN = /^\d루주자 (.+?) : 대주자 (.+?) ?\(으\)로 교체$/;
const DEFENSIVE_SWAP_PATTERN = /^\S+ (.+?) : \S+ (.+?) ?\(으\)로 교체$/;
const POSITION_CHANGE_PATTERN = /^\S+ (.+?) : \S+?\(으\)로 수비위치 변경$/;

interface SubstitutionContext {
  battingTeamCode: string;
  fieldingTeamCode: string;
  previousPitcherId: number | null;
  roster: PlayerLookup;
}

type SubstitutionFields = Pick<
  ScrapedGameEvent,
  'type' | 'inPlayerId' | 'inPlayerName' | 'outPlayerId' | 'outPlayerName'
>;

/**
 * 교체 문구는 이름만 준다. 이름은 박스스코어에서 id로 바꾸고(같은 팀 우선), 찾지 못하면
 * 그 시점 상태의 투수/타자 id(들어온 선수)나 직전 투수 id(나간 투수)로 채운다.
 *   투수 고영표 : 투수 손동현 (으)로 교체
 *   9번타자 강민호 : 대타 김현준 (으)로 교체
 *   2루주자 최형우 : 대주자 김성윤 (으)로 교체
 *   좌익수 최형우 : 좌익수 김헌곤 (으)로 교체
 *   대타 김영웅 : 3루수(으)로 수비위치 변경
 */
export function parseSubstitution(
  text: string,
  state: NaverGameState | undefined,
  context: SubstitutionContext,
): SubstitutionFields {
  const { battingTeamCode, fieldingTeamCode, roster } = context;

  const pitcherChange = PITCHER_CHANGE_PATTERN.exec(text);
  if (pitcherChange) {
    const [, outName, inName] = pitcherChange;
    return {
      type: GameEventType.PITCHER_CHANGE,
      inPlayerName: inName,
      inPlayerId:
        roster.find(inName, fieldingTeamCode, battingTeamCode) ??
        toPlayerId(state?.pitcher),
      outPlayerName: outName,
      outPlayerId:
        roster.find(outName, fieldingTeamCode, battingTeamCode) ??
        context.previousPitcherId,
    };
  }

  const pinchHitter = PINCH_HITTER_PATTERN.exec(text);
  if (pinchHitter) {
    const [, outName, inName] = pinchHitter;
    return {
      type: GameEventType.PINCH_HITTER,
      inPlayerName: inName,
      inPlayerId:
        roster.find(inName, battingTeamCode, fieldingTeamCode) ??
        toPlayerId(state?.batter),
      outPlayerName: outName,
      outPlayerId: roster.find(outName, battingTeamCode, fieldingTeamCode),
    };
  }

  const pinchRunner = PINCH_RUNNER_PATTERN.exec(text);
  if (pinchRunner) {
    const [, outName, inName] = pinchRunner;
    return {
      type: GameEventType.PINCH_RUNNER,
      inPlayerName: inName,
      inPlayerId: roster.find(inName, battingTeamCode, fieldingTeamCode),
      outPlayerName: outName,
      outPlayerId: roster.find(outName, battingTeamCode, fieldingTeamCode),
    };
  }

  const defensiveSwap = DEFENSIVE_SWAP_PATTERN.exec(text);
  if (defensiveSwap) {
    const [, outName, inName] = defensiveSwap;
    return {
      type: GameEventType.DEFENSIVE_CHANGE,
      inPlayerName: inName,
      inPlayerId: roster.find(inName, fieldingTeamCode, battingTeamCode),
      outPlayerName: outName,
      outPlayerId: roster.find(outName, fieldingTeamCode, battingTeamCode),
    };
  }

  const positionChange = POSITION_CHANGE_PATTERN.exec(text);
  if (positionChange) {
    // 같은 선수가 수비 위치만 바꾼다. 나간 선수는 없다.
    const [, name] = positionChange;
    return {
      type: GameEventType.DEFENSIVE_CHANGE,
      inPlayerName: name,
      inPlayerId: roster.find(name, fieldingTeamCode, battingTeamCode),
      outPlayerName: null,
      outPlayerId: null,
    };
  }

  return { type: GameEventType.OTHER, ...NO_SUBSTITUTION };
}

/** 팀별 "이름 → id". 같은 팀에 같은 이름이 둘이면 어느 쪽인지 모르므로 null로 둔다. */
export class PlayerLookup {
  private readonly idsByTeam = new Map<string, Map<string, number | null>>();

  constructor(roster: readonly RosterEntry[]) {
    for (const { teamCode, playerName, playerId } of roster) {
      if (playerId === null) continue;
      const byName =
        this.idsByTeam.get(teamCode) ?? new Map<string, number | null>();
      const existing = byName.get(playerName);
      byName.set(
        playerName,
        existing === undefined || existing === playerId ? playerId : null,
      );
      this.idsByTeam.set(teamCode, byName);
    }
  }

  /** 앞에 넘긴 팀부터 찾는다. */
  find(name: string, ...teamCodes: string[]): number | null {
    for (const teamCode of teamCodes) {
      const id = this.idsByTeam.get(teamCode)?.get(name);
      if (id !== undefined) return id;
    }
    return null;
  }
}

function toPlateAppearance(
  item: NaverTextRelayItem,
  options: NaverTextOption[],
  gameId: string,
  batterTeamCode: string,
  pitcherTeamCode: string,
): ScrapedPlateAppearance | null {
  const resultOption = options.find((option) => RESULT_TYPES.has(option.type));
  if (!resultOption?.currentGameState) return null;

  const resultText = extractResultText(resultOption.text);
  const { result, hitType, isAtBat } = classifyResultText(resultText);
  return {
    gameId,
    inning: item.inn,
    isTopInning: item.homeOrAway !== HOME_BATTING,
    sequenceNo: item.no,
    batterId: toPlayerId(resultOption.currentGameState.batter),
    batterTeamCode,
    pitcherId: toPlayerId(resultOption.currentGameState.pitcher),
    pitcherTeamCode,
    resultText,
    result,
    hitType,
    isAtBat,
  };
}

function dedupeAndSort(
  items: readonly NaverTextRelayItem[],
): NaverTextRelayItem[] {
  const byNo = new Map<number, NaverTextRelayItem>();
  for (const item of items) byNo.set(item.no, item);
  return [...byNo.values()].sort((a, b) => a.no - b.no);
}

function sortOptions(options: readonly NaverTextOption[]): NaverTextOption[] {
  return options
    .map((option, index) => ({ option, index }))
    .sort(
      (a, b) =>
        (a.option.seqno ?? a.index) - (b.option.seqno ?? b.index) ||
        a.index - b.index,
    )
    .map(({ option }) => option);
}

function toStateFields(
  state: NaverGameState | undefined,
): Pick<
  ScrapedGameEvent,
  | 'outs'
  | 'runnerOnFirst'
  | 'runnerOnSecond'
  | 'runnerOnThird'
  | 'homeScore'
  | 'awayScore'
> {
  return {
    outs: toNullableNumber(state?.out),
    runnerOnFirst: toRunner(state?.base1),
    runnerOnSecond: toRunner(state?.base2),
    runnerOnThird: toRunner(state?.base3),
    homeScore: toNullableNumber(state?.homeScore),
    awayScore: toNullableNumber(state?.awayScore),
  };
}

/** 루 값은 그 루에 있는 주자의 타순이고, 비어 있으면 "0"이다. */
function toRunner(value: string | undefined): boolean | null {
  if (value === undefined || value === '') return null;
  return value !== EMPTY_BASE;
}

function toNullableNumber(value: string | undefined): number | null {
  if (value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function toPlayerId(value: string | undefined): number | null {
  return Number(value) || null;
}

function scoreChanged(
  before: NaverGameState | undefined,
  after: NaverGameState | undefined,
): boolean {
  if (!before || !after) return false;
  return (
    toNullableNumber(before.homeScore) !== toNullableNumber(after.homeScore) ||
    toNullableNumber(before.awayScore) !== toNullableNumber(after.awayScore)
  );
}

function trackPitcher(
  lastPitcherByFieldingTeam: Map<string, number>,
  fieldingTeamCode: string,
  state: NaverGameState | undefined,
): void {
  const pitcherId = toPlayerId(state?.pitcher);
  if (pitcherId !== null) {
    lastPitcherByFieldingTeam.set(fieldingTeamCode, pitcherId);
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
  if (text.includes('1루타') || text.includes('내야안타')) {
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
  if (text.includes('실책') || text.includes('아웃') || text.includes('출루')) {
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
