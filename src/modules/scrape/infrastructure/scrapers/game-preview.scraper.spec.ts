import { Logger } from '@nestjs/common';
import { GamePreviewScraper } from './game-preview.scraper';

const KS_GAME_ID = '20261106KTSS0';
const REGULAR_GAME_ID = '20260915KTSS0';
const KS_SR_ID = 7;
const REGULAR_SR_ID = 0;

/** GetKboGameList 응답의 경기 한 건 (필요한 필드만). */
function listGame(
  gameId: string,
  srId: number,
  gameState: string,
  withPitchers = true,
) {
  return {
    G_ID: gameId,
    SEASON_ID: 2026,
    SR_ID: srId,
    GAME_STATE_SC: gameState,
    AWAY_ID: gameId.slice(8, 10),
    HOME_ID: gameId.slice(10, 12),
    T_PIT_P_ID: withPitchers ? 50030 : null,
    T_PIT_P_NM: withPitchers ? '소형준' : '',
    B_PIT_P_ID: withPitchers ? 53375 : null,
    B_PIT_P_NM: withPitchers ? '후라도' : '',
  };
}

function cells(...texts: string[]) {
  return { row: texts.map((text) => ({ Text: text, Class: null })) };
}

function pitcherCell(name: string, seasonRecord: string, vsRecord: string) {
  return `<div class='pitcher-cell'><div class='section-left'><div class='name-wrap'><span class='name'>${name}</span><span class='style'>우투우타</span></div><div class='record'>${seasonRecord}<br />${vsRecord}</div></div></div>`;
}

/** 2026-11-06 KS 3차전(KT vs 삼성)을 srId별로 조회한 실제 응답 값. */
const RESPONSES_BY_SR_ID: Record<
  string,
  { team: ReturnType<typeof cells>[]; pitcher: ReturnType<typeof cells>[] }
> = {
  [REGULAR_SR_ID]: {
    team: [
      cells('KT', '90승 49패 5무', '승승승승승', '4.14', '0.286', '5.7', '4.5'),
      cells(
        '삼성',
        '83승 58패 3무',
        '승패패패패',
        '4.31',
        '0.273',
        '5.6',
        '4.6',
      ),
    ],
    pitcher: [
      cells(
        pitcherCell('소형준', '시즌 10승 3패', 'VS 삼성 2승'),
        '3.15',
        '3.68',
        '23',
        '5.2',
        '14',
        '1.20',
      ),
      cells(
        pitcherCell('후라도', '시즌 9승 3패', 'VS KT 1승 1패'),
        '3.54',
        '2.91',
        '24',
        '6.1',
        '17',
        '1.25',
      ),
    ],
  },
  /** 시리즈 기록만 돌아오고, 이 시리즈에 아직 등판하지 않은 투수는 전부 비어 있다. */
  [KS_SR_ID]: {
    team: [
      cells('KT', '1승 1패 0무', '승패', '3.86', '0.263', '5.0', '5.0'),
      cells('삼성', '1승 1패 0무', '패승', '4.05', '0.289', '5.0', '5.0'),
    ],
    pitcher: [
      cells(
        pitcherCell('소형준', '&nbsp;', '&nbsp;'),
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
      ),
      cells(
        pitcherCell('후라도', '&nbsp;', '&nbsp;'),
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
      ),
    ],
  },
};

function mockFetch(games: ReturnType<typeof listGame>[]) {
  const requests: { url: string; params: URLSearchParams }[] = [];
  jest.spyOn(global, 'fetch').mockImplementation((input, init) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const params = new URLSearchParams(
      typeof init?.body === 'string' ? init.body : '',
    );
    requests.push({ url, params });

    const bySrId = RESPONSES_BY_SR_ID[params.get('srId') ?? ''];
    const data = url.includes('GetKboGameList')
      ? { game: games }
      : url.includes('GetTeamRecord')
        ? { rows: bySrId.team }
        : { rows: bySrId.pitcher };
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data),
    } as Response);
  });
  return {
    statRequestSrIds: () =>
      requests
        .filter((request) => !request.url.includes('GetKboGameList'))
        .map((request) => request.params.get('srId')),
  };
}

describe('GamePreviewScraper', () => {
  let scraper: GamePreviewScraper;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    scraper = new GamePreviewScraper();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('경기 전인 정규시즌·포스트시즌 경기만 프리뷰를 스크랩한다', async () => {
    mockFetch([
      listGame(KS_GAME_ID, KS_SR_ID, '1'),
      listGame(REGULAR_GAME_ID, REGULAR_SR_ID, '1', false),
      listGame('20260315HHLT0', 1, '1', false),
      listGame('20261105SSKT0', KS_SR_ID, '2'),
    ]);

    const previews = await scraper.scrape('2026-11-06');

    expect(previews.map((preview) => preview.gameId)).toEqual([
      KS_GAME_ID,
      REGULAR_GAME_ID,
    ]);
  });

  it('포스트시즌 경기는 그 시리즈의 기록만 받고, 비어 있는 항목은 null로 둔다', async () => {
    const fetchMock = mockFetch([listGame(KS_GAME_ID, KS_SR_ID, '1')]);

    const [preview] = await scraper.scrape('2026-11-06');

    expect(fetchMock.statRequestSrIds()).toEqual(['7', '7']);
    expect(preview.awayTeam).toEqual({
      record: '1승 1패 0무',
      recentForm: '승패',
      era: '3.86',
      battingAverage: '0.263',
      avgRunsScored: '5.0',
      avgRunsAllowed: '5.0',
    });
    expect(preview.awayPitcher).toEqual({
      name: '소형준',
      style: '우투우타',
      seasonRecord: null,
      headToHeadRecord: null,
      era: null,
      war: null,
      games: null,
      avgInnings: null,
      qualityStarts: null,
      whip: null,
    });
  });

  it('정규시즌 경기는 정규시즌 기록을 받는다', async () => {
    const fetchMock = mockFetch([
      listGame(REGULAR_GAME_ID, REGULAR_SR_ID, '1'),
    ]);

    const [preview] = await scraper.scrape('2026-09-15');

    expect(fetchMock.statRequestSrIds()).toEqual(['0', '0']);
    expect(preview.awayTeam.record).toBe('90승 49패 5무');
    expect(preview.awayPitcher).toEqual({
      name: '소형준',
      style: '우투우타',
      seasonRecord: '시즌 10승 3패',
      headToHeadRecord: 'VS 삼성 2승',
      era: '3.15',
      war: '3.68',
      games: '23',
      avgInnings: '5.2',
      qualityStarts: '14',
      whip: '1.20',
    });
  });
});
