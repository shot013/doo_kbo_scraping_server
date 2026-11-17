import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BROWSER_IDLE_CLOSE_MS,
  NAVER_HOST_PAGE_URL,
  NaverBrowserClient,
} from './naver-browser.client';

const mockLaunch = jest.fn();

jest.mock('puppeteer-core', () => ({
  __esModule: true,
  default: { launch: (options: unknown): unknown => mockLaunch(options) },
}));

const CHROMIUM_PATH = '/usr/bin/chromium';
const HEADLESS_USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/156.0.0.0 Safari/537.36';
const RECORD_URL =
  'https://api-gw.sports.naver.com/schedule/games/20260501LGSS02026/record';

interface InPageResponse {
  status: number;
  text: string;
}

function jsonResponse(body: unknown, status = 200): InPageResponse {
  return { status, text: JSON.stringify(body) };
}

function createBrowser(evaluate: jest.Mock) {
  const page = {
    setUserAgent: jest.fn().mockResolvedValue(undefined),
    goto: jest.fn().mockResolvedValue({ ok: () => true, status: () => 200 }),
    evaluate,
  };
  const browser = {
    pages: jest.fn().mockResolvedValue([page]),
    newPage: jest.fn().mockResolvedValue(page),
    userAgent: jest.fn().mockResolvedValue(HEADLESS_USER_AGENT),
    once: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
    process: jest.fn().mockReturnValue(null),
  };
  return { browser, page };
}

function createClient(chromiumPath: string | undefined = CHROMIUM_PATH) {
  const config = {
    get: jest.fn().mockReturnValue(chromiumPath),
  } as unknown as ConfigService;
  return new NaverBrowserClient(config);
}

describe('NaverBrowserClient', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    mockLaunch.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('네이버 문서를 연 페이지 안에서 요청하고 연속 요청에는 브라우저를 다시 띄우지 않는다', async () => {
    const evaluate = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ result: 1 }))
      .mockResolvedValueOnce(jsonResponse({ result: 2 }));
    const { browser, page } = createBrowser(evaluate);
    mockLaunch.mockResolvedValue(browser);
    const client = createClient();

    const first = await client.fetchJson<{ result: number }>(RECORD_URL);
    const second = await client.fetchJson<{ result: number }>(RECORD_URL);

    expect([first.result, second.result]).toEqual([1, 2]);
    expect(mockLaunch).toHaveBeenCalledTimes(1);
    expect(mockLaunch).toHaveBeenCalledWith(
      expect.objectContaining({ executablePath: CHROMIUM_PATH }),
    );
    expect(page.goto).toHaveBeenCalledTimes(1);
    expect(page.goto).toHaveBeenCalledWith(
      NAVER_HOST_PAGE_URL,
      expect.anything(),
    );
    expect(evaluate).toHaveBeenCalledWith(
      expect.any(Function),
      RECORD_URL,
      expect.any(Number),
    );
  });

  it('User-Agent의 HeadlessChrome 표시를 일반 Chrome으로 바꾼다', async () => {
    const { browser, page } = createBrowser(
      jest.fn().mockResolvedValue(jsonResponse({})),
    );
    mockLaunch.mockResolvedValue(browser);

    await createClient().fetchJson(RECORD_URL);

    expect(page.setUserAgent).toHaveBeenCalledWith({
      userAgent: HEADLESS_USER_AGENT.replace('HeadlessChrome', 'Chrome'),
    });
  });

  it('2xx가 아니면 상태 코드를 담아 던지고 브라우저는 유지한다', async () => {
    const evaluate = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 404))
      .mockResolvedValueOnce(jsonResponse({ result: 1 }));
    const { browser } = createBrowser(evaluate);
    mockLaunch.mockResolvedValue(browser);
    const client = createClient();

    await expect(client.fetchJson(RECORD_URL)).rejects.toThrow(
      'Naver request failed: 404 (/schedule/games/20260501LGSS02026/record)',
    );
    await expect(client.fetchJson(RECORD_URL)).resolves.toEqual({ result: 1 });

    expect(browser.close).not.toHaveBeenCalled();
    expect(mockLaunch).toHaveBeenCalledTimes(1);
  });

  it('응답이 없으면 브라우저를 닫고 다음 요청에서 새로 띄운다', async () => {
    const stuck = createBrowser(
      jest.fn().mockRejectedValue(new Error('signal timed out')),
    );
    const healthy = createBrowser(
      jest.fn().mockResolvedValue(jsonResponse({ result: 1 })),
    );
    mockLaunch
      .mockResolvedValueOnce(stuck.browser)
      .mockResolvedValueOnce(healthy.browser);
    const client = createClient();

    await expect(client.fetchJson(RECORD_URL)).rejects.toThrow(
      'Naver request got no response (/schedule/games/20260501LGSS02026/record): signal timed out',
    );
    expect(stuck.browser.close).toHaveBeenCalledTimes(1);

    await expect(client.fetchJson(RECORD_URL)).resolves.toEqual({ result: 1 });
    expect(mockLaunch).toHaveBeenCalledTimes(2);
  });

  it('네이버 문서를 열지 못하면 브라우저를 닫고 던진다', async () => {
    const { browser, page } = createBrowser(jest.fn());
    page.goto.mockResolvedValue({ ok: () => false, status: () => 403 });
    mockLaunch.mockResolvedValue(browser);

    await expect(createClient().fetchJson(RECORD_URL)).rejects.toThrow(
      'Naver host page request failed: 403',
    );
    expect(browser.close).toHaveBeenCalledTimes(1);
  });

  it('동시에 들어온 요청을 한 번에 하나씩 보낸다', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const evaluate = jest.fn().mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 100));
      inFlight -= 1;
      return jsonResponse({});
    });
    const { browser } = createBrowser(evaluate);
    mockLaunch.mockResolvedValue(browser);
    const client = createClient();

    const requests = Promise.all([
      client.fetchJson(RECORD_URL),
      client.fetchJson(RECORD_URL),
      client.fetchJson(RECORD_URL),
    ]);
    await jest.advanceTimersByTimeAsync(300);
    await requests;

    expect(evaluate).toHaveBeenCalledTimes(3);
    expect(maxInFlight).toBe(1);
    expect(mockLaunch).toHaveBeenCalledTimes(1);
  });

  it('마지막 요청 뒤 유휴 시간이 지나면 브라우저를 닫는다', async () => {
    const { browser } = createBrowser(
      jest.fn().mockResolvedValue(jsonResponse({})),
    );
    mockLaunch.mockResolvedValue(browser);
    const client = createClient();

    await client.fetchJson(RECORD_URL);
    await jest.advanceTimersByTimeAsync(BROWSER_IDLE_CLOSE_MS - 1);
    await client.fetchJson(RECORD_URL);
    await jest.advanceTimersByTimeAsync(BROWSER_IDLE_CLOSE_MS - 1);
    expect(browser.close).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    expect(browser.close).toHaveBeenCalledTimes(1);
  });

  it('모듈이 내려갈 때 브라우저를 닫는다', async () => {
    const { browser } = createBrowser(
      jest.fn().mockResolvedValue(jsonResponse({})),
    );
    mockLaunch.mockResolvedValue(browser);
    const client = createClient();
    await client.fetchJson(RECORD_URL);

    await client.onModuleDestroy();

    expect(browser.close).toHaveBeenCalledTimes(1);
  });

  it('CHROMIUM_PATH가 없으면 브라우저를 띄우지 않고 던진다', async () => {
    const client = createClient('');

    await expect(client.fetchJson(RECORD_URL)).rejects.toThrow(
      'CHROMIUM_PATH is not set',
    );
    expect(mockLaunch).not.toHaveBeenCalled();
  });
});
