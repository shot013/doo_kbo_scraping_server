import { Logger } from '@nestjs/common';
import { GamePreviewScraper } from './game-preview.scraper';

const KS_GAME_ID = '20261106KTSS0';
const REGULAR_GAME_ID = '20260915LGOB0';

/** GetKboGameList 응답의 경기 한 건 (필요한 필드만). */
function listGame(
  gameId: string,
  srId: number,
  gameState: string,
  pitchers: { awayId: number; homeId: number } | null = null,
) {
  return {
    G_ID: gameId,
    SEASON_ID: 2026,
    SR_ID: srId,
    GAME_STATE_SC: gameState,
    AWAY_ID: gameId.slice(8, 10),
    HOME_ID: gameId.slice(10, 12),
    T_PIT_P_ID: pitchers?.awayId ?? null,
    T_PIT_P_NM: pitchers ? '소형준' : '',
    B_PIT_P_ID: pitchers?.homeId ?? null,
    B_PIT_P_NM: pitchers ? '후라도' : '',
  };
}

function cells(...texts: string[]) {
  return { row: texts.map((text) => ({ Text: text, Class: null })) };
}

function pitcherCell(name: string, seasonRecord: string, vsRecord: string) {
  return `<div class='pitcher-cell'><div class='section-left'><div class='name-wrap'><span class='name'>${name}</span><span class='style'>우투우타</span></div><div class='record'>${seasonRecord}<br />${vsRecord}</div></div></div>`;
}

/** 2026-11-06 KS 3차전을 srId=0으로 조회한 실제 응답 값. */
const TEAM_RECORD_ROWS = [
  cells('KT', '90승 49패 5무', '승승승승승', '4.14', '0.286', '5.7', '4.5'),
  cells('삼성', '83승 58패 3무', '승패패패패', '4.31', '0.273', '5.6', '4.6'),
];
const PITCHER_ROWS = [
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
];

function mockFetch(games: ReturnType<typeof listGame>[]) {
  const requests: { url: string; params: URLSearchParams }[] = [];
  jest.spyOn(global, 'fetch').mockImplementation((input, init) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const body = typeof init?.body === 'string' ? init.body : '';
    requests.push({ url, params: new URLSearchParams(body) });

    const data = url.includes('GetKboGameList')
      ? { game: games }
      : url.includes('GetTeamRecord')
        ? { rows: TEAM_RECORD_ROWS }
        : { rows: PITCHER_ROWS };
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data),
    } as Response);
  });
  return requests;
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
      listGame(KS_GAME_ID, 7, '1', { awayId: 50030, homeId: 53375 }),
      listGame(REGULAR_GAME_ID, 0, '1'),
      listGame('20260315HHLT0', 1, '1'),
      listGame('20261105SSKT0', 7, '2'),
    ]);

    const previews = await scraper.scrape('2026-11-06');

    expect(previews.map((preview) => preview.gameId)).toEqual([
      KS_GAME_ID,
      REGULAR_GAME_ID,
    ]);
  });

  it('포스트시즌 경기도 팀·투수 기록은 정규시즌(srId=0) 기준으로 요청한다', async () => {
    const requests = mockFetch([
      listGame(KS_GAME_ID, 7, '1', { awayId: 50030, homeId: 53375 }),
    ]);

    const [preview] = await scraper.scrape('2026-11-06');

    const statRequests = requests.filter(
      (request) => !request.url.includes('GetKboGameList'),
    );
    expect(statRequests).toHaveLength(2);
    for (const request of statRequests) {
      expect(request.params.get('srId')).toBe('0');
    }
    expect(preview.awayTeam).toEqual({
      record: '90승 49패 5무',
      recentForm: '승승승승승',
      era: '4.14',
      battingAverage: '0.286',
      avgRunsScored: '5.7',
      avgRunsAllowed: '4.5',
    });
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
