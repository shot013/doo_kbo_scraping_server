import { readFileSync } from 'fs';
import { join } from 'path';
import { Logger } from '@nestjs/common';
import { GameEventType } from '../../../game-events/domain/entities/game-event.entity';
import { GameSeries } from '../../../game/domain/entities/game.entity';
import { HitType } from '../../../plate-appearances/domain/entities/plate-appearance.entity';
import { GameStatsScraper, ScrapedGameRecord } from './game-stats.scraper';
import { NaverBrowserClient } from './naver-browser.client';
import {
  parseRelayItems,
  parseSubstitution,
  PlayByPlayScraper,
  PlayerLookup,
  ScrapedGameEvent,
  ScrapedPlayByPlay,
} from './play-by-play.scraper';

/**
 * 실제 네이버 `relay?inning=N` 응답(2026 포스트시즌)을 이닝별로 모으고 파서가 읽는 필드만 남긴
 * 것. 투구(type 1) 항목은 문구만 남겼다. 마지막 이닝 다음 키는 실제 응답처럼 빈 배열이다.
 * - 20261108KTSS0: KT@SS, 9회말 없음, 폭투 득점, 대타·대주자
 * - 20261104SSKT0: SS@KT, 12회 연장, 밀어내기 득점
 * - 20261029SSHT0: SS@HT, 홈런 4개, 도루 실패로 끝난 이닝
 */
const GAMES = {
  '20261108KTSS0': {
    series: GameSeries.KOREAN_SERIES,
    home: 'SS',
    away: 'KT',
  },
  '20261104SSKT0': {
    series: GameSeries.KOREAN_SERIES,
    home: 'KT',
    away: 'SS',
  },
  '20261029SSHT0': { series: GameSeries.PLAYOFF, home: 'HT', away: 'SS' },
} as const;
type FixtureGameId = keyof typeof GAMES;

function loadFixture<T>(name: string): T {
  return JSON.parse(
    readFileSync(join(__dirname, '__fixtures__', name), 'utf8'),
  ) as T;
}

function createNaverClient(gameId: FixtureGameId) {
  const relays = loadFixture<Record<string, unknown[]>>(
    `naver-relay-${gameId}.json`,
  );
  const fetchJson = jest.fn((url: string) => {
    const inning = /relay\?inning=(\d+)/.exec(url)?.[1];
    if (inning === undefined) {
      return Promise.resolve(loadFixture(`naver-record-${gameId}.json`));
    }
    return Promise.resolve({
      result: { textRelayData: { textRelays: relays[inning] ?? [] } },
    });
  });
  return { client: { fetchJson } as unknown as NaverBrowserClient, fetchJson };
}

async function scrapeFixture(gameId: FixtureGameId): Promise<{
  record: ScrapedGameRecord;
  result: ScrapedPlayByPlay;
  fetchJson: jest.Mock;
}> {
  const { series, home, away } = GAMES[gameId];
  const { client, fetchJson } = createNaverClient(gameId);
  const record = await new GameStatsScraper(client).scrape(gameId, series);
  const pending = new PlayByPlayScraper(client).scrape(
    gameId,
    series,
    home,
    away,
    record.stats,
  );
  await jest.runAllTimersAsync();
  return { record, result: await pending, fetchJson };
}

function findEvent(
  events: ScrapedGameEvent[],
  type: GameEventType,
  textPart: string,
): ScrapedGameEvent {
  const event = events.find(
    (item) => item.type === type && item.text.includes(textPart),
  );
  if (!event) throw new Error(`${type} "${textPart}" not found`);
  return event;
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('PlayByPlayScraper.scrape', () => {
  it('빈 이닝이 나올 때까지 이닝을 순서대로 요청한다', async () => {
    const { fetchJson } = await scrapeFixture('20261108KTSS0');

    const relayUrls = fetchJson.mock.calls
      .map(([url]) => url as string)
      .filter((url) => url.includes('/relay'));
    expect(relayUrls).toHaveLength(10);
    expect(relayUrls[0]).toBe(
      'https://api-gw.sports.naver.com/schedule/games/77771108KTSS02026/relay?inning=1',
    );
    expect(relayUrls[9]).toMatch(/inning=10$/);
  });

  it.each(Object.keys(GAMES) as FixtureGameId[])(
    '%s: 모든 득점이 타석 또는 타석 외 득점 이벤트에 잡히고 점수표와 맞는다',
    async (gameId) => {
      const { record, result } = await scrapeFixture(gameId);
      const runsByHalf = new Map<string, number>();
      let homeScore = 0;
      let awayScore = 0;

      for (const event of result.events) {
        if (event.homeScore === null || event.awayScore === null) continue;
        const runs = event.homeScore - homeScore + event.awayScore - awayScore;
        if (runs !== 0) {
          expect([
            GameEventType.PLATE_APPEARANCE,
            GameEventType.OTHER_RUN,
          ]).toContain(event.type);
          const key = `${event.inning}-${event.isTopInning ? 'away' : 'home'}`;
          runsByHalf.set(key, (runsByHalf.get(key) ?? 0) + runs);
        }
        homeScore = event.homeScore;
        awayScore = event.awayScore;
      }

      for (const line of record.lineScores) {
        const side = line.isHome ? 'home' : 'away';
        const scrapedInnings = line.innings.map((runs, index) =>
          runs === null ? null : (runsByHalf.get(`${index + 1}-${side}`) ?? 0),
        );
        expect(scrapedInnings).toEqual(line.innings);
      }
    },
  );

  it('같은 경기 안에서 (sequenceNo, subSequenceNo)가 겹치지 않는다', async () => {
    const { result } = await scrapeFixture('20261104SSKT0');
    const keys = result.events.map(
      (event) => `${event.sequenceNo}.${event.subSequenceNo}`,
    );

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('득점 타석(type 23)도 타석과 타석 이벤트로 남긴다', async () => {
    const { result } = await scrapeFixture('20261029SSHT0');

    const homeRuns = result.plateAppearances.filter(
      (item) => item.hitType === HitType.HOME_RUN,
    );
    expect(homeRuns.map((item) => [item.inning, item.batterId])).toEqual([
      [1, 54400],
      [3, 52605],
      [5, 62234],
      [6, 62947],
    ]);
    expect(
      findEvent(
        result.events,
        GameEventType.PLATE_APPEARANCE,
        '디아즈 : 우익수 뒤 홈런',
      ),
    ).toMatchObject({
      inning: 1,
      isTopInning: true,
      battingTeamCode: 'SS',
      outs: 2,
      runnerOnFirst: false,
      runnerOnSecond: false,
      runnerOnThird: false,
      awayScore: 2,
      homeScore: 0,
      batterId: 54400,
      pitcherId: 54843,
    });
  });

  it('타석 이벤트의 점수·주자는 이어진 주자 이동까지 반영한 뒤의 값이다', async () => {
    const { result } = await scrapeFixture('20261108KTSS0');

    // 1·3루에서 땅볼 출루로 2명이 들어와 1-6이 1-8이 된다.
    expect(
      findEvent(
        result.events,
        GameEventType.PLATE_APPEARANCE,
        '강민호 : 2루수 앞 땅볼로 출루',
      ),
    ).toMatchObject({
      inning: 5,
      isTopInning: false,
      outs: 1,
      runnerOnFirst: true,
      runnerOnSecond: false,
      runnerOnThird: true,
      awayScore: 1,
      homeScore: 8,
    });
  });

  it('투수 교체는 나간·들어온 투수 id와 교체 시점 상태를 담는다', async () => {
    const { result } = await scrapeFixture('20261108KTSS0');

    expect(
      findEvent(
        result.events,
        GameEventType.PITCHER_CHANGE,
        '투수 대니엘 : 투수 고영표',
      ),
    ).toMatchObject({
      inning: 4,
      isTopInning: false,
      battingTeamCode: 'SS',
      outs: 0,
      runnerOnFirst: false,
      runnerOnSecond: false,
      runnerOnThird: false,
      outPlayerName: '대니엘',
      outPlayerId: 56002,
      inPlayerName: '고영표',
      inPlayerId: 64001,
      pitcherId: 64001,
    });
    expect(
      result.events.filter(
        (event) => event.type === GameEventType.PITCHER_CHANGE,
      ),
    ).toHaveLength(6);
  });

  it('대타는 원래 타자와 상대 투수를 담는다', async () => {
    const { result } = await scrapeFixture('20261108KTSS0');

    expect(
      findEvent(
        result.events,
        GameEventType.PINCH_HITTER,
        '허경민 : 대타 이정훈',
      ),
    ).toMatchObject({
      inning: 7,
      isTopInning: true,
      battingTeamCode: 'KT',
      outPlayerName: '허경민',
      outPlayerId: 79240,
      inPlayerName: '이정훈',
      inPlayerId: 67644,
      pitcherId: 56459,
    });
  });

  it('대주자·수비 교체·수비 위치 변경을 나눈다', async () => {
    const { result } = await scrapeFixture('20261108KTSS0');

    expect(
      findEvent(
        result.events,
        GameEventType.PINCH_RUNNER,
        '최형우 : 대주자 김성윤',
      ),
    ).toMatchObject({
      outPlayerId: 72443,
      inPlayerId: 67449,
    });
    expect(
      findEvent(
        result.events,
        GameEventType.DEFENSIVE_CHANGE,
        '대타 이정훈 : 3루수 장준원',
      ),
    ).toMatchObject({
      outPlayerName: '이정훈',
      outPlayerId: 67644,
      inPlayerName: '장준원',
      inPlayerId: 64115,
    });
    expect(
      findEvent(
        result.events,
        GameEventType.DEFENSIVE_CHANGE,
        '대주자 김성윤 : 우익수(으)로 수비위치 변경',
      ),
    ).toMatchObject({
      inPlayerName: '김성윤',
      inPlayerId: 67449,
      outPlayerName: null,
      outPlayerId: null,
    });
  });

  it('타석 결과가 아닌 주자 이동은 득점이 나면 OTHER_RUN, 아니면 OTHER', async () => {
    const wildPitchRun = (await scrapeFixture('20261108KTSS0')).result;
    expect(
      findEvent(wildPitchRun.events, GameEventType.OTHER_RUN, '폭투로 홈인'),
    ).toMatchObject({
      inning: 5,
      awayScore: 1,
      homeScore: 11,
      runnerOnThird: false,
      pitcherId: 69041,
    });

    const caughtStealing = (await scrapeFixture('20261029SSHT0')).result;
    expect(
      findEvent(caughtStealing.events, GameEventType.OTHER, '도루실패아웃'),
    ).toMatchObject({ inning: 5, isTopInning: false, outs: 3 });
  });
});

describe('parseRelayItems', () => {
  const context = {
    gameId: 'G',
    homeTeamCode: 'HM',
    awayTeamCode: 'AW',
    roster: new PlayerLookup([]),
  };
  const item = {
    no: 3,
    inn: 1,
    homeOrAway: '0',
    textOptions: [
      {
        type: 13,
        seqno: 12,
        text: '홍길동 : 삼진 아웃',
        currentGameState: {
          out: '1',
          base1: '0',
          base2: '0',
          base3: '0',
          homeScore: '0',
          awayScore: '0',
          batter: '100',
          pitcher: '200',
        },
      },
      {
        type: 8,
        seqno: 10,
        text: '1번타자 홍길동',
        currentGameState: { batter: '100', pitcher: '200' },
      },
    ],
  };

  it('이닝 응답이 겹쳐 같은 항목이 두 번 와도 한 번만 센다', () => {
    const result = parseRelayItems([item, item], context);

    expect(result.plateAppearances).toHaveLength(1);
    expect(result.events).toHaveLength(1);
  });

  it('seqno가 없으면 항목 안 순서를 subSequenceNo로 쓴다', () => {
    const withoutSeqno = {
      ...item,
      textOptions: item.textOptions.map(({ type, text, currentGameState }) => ({
        type,
        text,
        currentGameState,
      })),
    };

    const [event] = parseRelayItems([withoutSeqno], context).events;

    expect(event.subSequenceNo).toBe(0);
    expect(event).toMatchObject({
      type: GameEventType.PLATE_APPEARANCE,
      battingTeamCode: 'AW',
      outs: 1,
      runnerOnFirst: false,
    });
  });
});

describe('parseSubstitution', () => {
  const baseContext = {
    battingTeamCode: 'AW',
    fieldingTeamCode: 'HM',
    previousPitcherId: 300,
    roster: new PlayerLookup([]),
  };

  it('박스스코어에 없는 투수는 상태의 투수와 직전 투수 id로 채운다', () => {
    expect(
      parseSubstitution(
        '투수 김갑 : 투수 이을 (으)로 교체',
        { pitcher: '400' },
        baseContext,
      ),
    ).toEqual({
      type: GameEventType.PITCHER_CHANGE,
      outPlayerName: '김갑',
      outPlayerId: 300,
      inPlayerName: '이을',
      inPlayerId: 400,
    });
  });

  it('이름은 해당 팀 선수부터 찾는다', () => {
    const roster = new PlayerLookup([
      { teamCode: 'HM', playerName: '박병', playerId: 1 },
      { teamCode: 'AW', playerName: '박병', playerId: 2 },
    ]);

    expect(
      parseSubstitution('3번타자 최정 : 대타 박병 (으)로 교체', undefined, {
        ...baseContext,
        roster,
      }),
    ).toMatchObject({ type: GameEventType.PINCH_HITTER, inPlayerId: 2 });
  });

  it('알 수 없는 교체 문구는 OTHER', () => {
    expect(
      parseSubstitution('비디오 판독 결과 원심 유지', undefined, baseContext),
    ).toEqual({
      type: GameEventType.OTHER,
      inPlayerId: null,
      inPlayerName: null,
      outPlayerId: null,
      outPlayerName: null,
    });
  });
});

describe('PlayerLookup', () => {
  it('같은 팀에 같은 이름이 둘이면 어느 쪽인지 모르므로 null', () => {
    const lookup = new PlayerLookup([
      { teamCode: 'HM', playerName: '이승민', playerId: 1 },
      { teamCode: 'HM', playerName: '이승민', playerId: 2 },
      { teamCode: 'HM', playerName: '김태훈', playerId: 3 },
      { teamCode: 'HM', playerName: '김태훈', playerId: 3 },
    ]);

    expect(lookup.find('이승민', 'HM')).toBeNull();
    expect(lookup.find('김태훈', 'HM')).toBe(3);
    expect(lookup.find('없음', 'HM', 'AW')).toBeNull();
  });
});
