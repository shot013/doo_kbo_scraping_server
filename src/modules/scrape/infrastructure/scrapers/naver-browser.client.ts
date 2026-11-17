import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { SCRAPE_REQUEST_TIMEOUT_MS } from './scrape-request';

/**
 * 페이지 안 `fetch`의 출처가 되는 네이버 문서. 문자중계 API는 네이버 페이지 안에서
 * 호출할 때만 응답하므로 먼저 같은 사이트의 문서를 하나 열어야 한다. 스크립트가 없는
 * 텍스트 문서를 골라 네이버에 보내는 요청 수와 브라우저 메모리를 최소로 유지한다.
 */
export const NAVER_HOST_PAGE_URL = 'https://m.sports.naver.com/robots.txt';

/**
 * 마지막 요청 뒤 이 시간이 지나면 브라우저를 닫는다. 1GB EC2에서 Chromium을 계속
 * 띄워 둘 수 없어서, 한 회차의 연속 요청(문자중계 이닝 순회, 백필의 경기 간 2초 텀)만
 * 같은 브라우저로 처리하고 회차가 끝나면 메모리를 돌려준다.
 */
export const BROWSER_IDLE_CLOSE_MS = 30 * 1000;

/** 페이지 안 fetch의 타임아웃보다 길어야 타임아웃 원인이 네이버 응답 지연으로 보고된다. */
const PROTOCOL_TIMEOUT_MS = SCRAPE_REQUEST_TIMEOUT_MS * 2;

/**
 * `--no-sandbox`: 컨테이너에서 비루트(`node`) 사용자로 실행하면 Chromium 샌드박스가
 * 필요로 하는 사용자 네임스페이스를 쓸 수 없어 실행 자체가 실패한다. 이 브라우저는
 * `NAVER_HOST_PAGE_URL` 한 곳만 열기 때문에 샌드박스 없이 실행한다.
 * `--disable-dev-shm-usage`: Docker 기본 `/dev/shm`(64MB)이 작아 렌더러가 죽는 것을 막는다.
 */
const CHROMIUM_ARGS = [
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
];

interface BrowserSession {
  browser: Browser;
  page: Page;
}

interface InPageResponse {
  status: number;
  text: string;
}

/**
 * 네이버 스포츠 API(`api-gw.sports.naver.com`)를 헤드리스 Chromium 안에서 호출한다.
 * 네이버가 브라우저가 아닌 클라이언트의 요청에는 응답하지 않기 때문이다(헤더를
 * 브라우저와 똑같이 맞춘 `fetch`도 타임아웃, 배경은 `MEMORY.md` 참고).
 *
 * 요청은 한 번에 하나씩 순서대로 보내고, 브라우저는 첫 요청 때 띄워 유휴 시간이
 * 지나면 닫는다.
 */
@Injectable()
export class NaverBrowserClient implements OnModuleDestroy {
  private readonly logger = new Logger(NaverBrowserClient.name);
  private session: BrowserSession | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private idleTimer: NodeJS.Timeout | null = null;
  private requestCount = 0;

  constructor(private readonly config: ConfigService) {}

  /** 2xx가 아니거나 응답이 없으면 예외를 던진다. */
  fetchJson<T>(url: string): Promise<T> {
    return this.enqueue(() => this.request<T>(url));
  }

  async onModuleDestroy(): Promise<void> {
    this.clearIdleTimer();
    await this.enqueue(() => this.closeSession());
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async request<T>(url: string): Promise<T> {
    this.clearIdleTimer();
    this.requestCount += 1;
    try {
      const { page } = await this.openSession();
      const response = await this.fetchInPage(page, url);
      if (response.status < 200 || response.status >= 300) {
        throw new Error(
          `Naver request failed: ${response.status} (${describeUrl(url)})`,
        );
      }
      return JSON.parse(response.text) as T;
    } finally {
      this.scheduleIdleClose();
    }
  }

  private async fetchInPage(page: Page, url: string): Promise<InPageResponse> {
    try {
      return await page.evaluate(
        async (target: string, timeoutMs: number): Promise<InPageResponse> => {
          const response = await fetch(target, {
            signal: AbortSignal.timeout(timeoutMs),
          });
          return { status: response.status, text: await response.text() };
        },
        url,
        SCRAPE_REQUEST_TIMEOUT_MS,
      );
    } catch (error) {
      // 응답이 없었거나 브라우저가 죽은 경우다. 세션 상태를 믿을 수 없으니 버리고
      // 다음 요청에서 새로 띄운다.
      await this.closeSession();
      throw new Error(
        `Naver request got no response (${describeUrl(url)}): ${errorMessage(error)}`,
      );
    }
  }

  private async openSession(): Promise<BrowserSession> {
    if (this.session) return this.session;

    const executablePath = this.config.get<string>('CHROMIUM_PATH');
    if (!executablePath) {
      throw new Error(
        'CHROMIUM_PATH is not set: Naver requests need a Chromium/Chrome executable',
      );
    }

    const browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: CHROMIUM_ARGS,
      protocolTimeout: PROTOCOL_TIMEOUT_MS,
    });
    try {
      const page = (await browser.pages())[0] ?? (await browser.newPage());
      // 헤드리스 Chromium은 User-Agent에 `HeadlessChrome`을 넣는데, 네이버는 이 값이
      // 보이면 연결을 끊는다. 같은 버전의 일반 Chrome 값으로 바꾼다.
      const userAgent = (await browser.userAgent()).replace(
        'HeadlessChrome',
        'Chrome',
      );
      await page.setUserAgent({ userAgent });
      const response = await page.goto(NAVER_HOST_PAGE_URL, {
        waitUntil: 'domcontentloaded',
        timeout: SCRAPE_REQUEST_TIMEOUT_MS,
      });
      if (!response?.ok()) {
        throw new Error(
          `Naver host page request failed: ${response?.status() ?? 'no response'}`,
        );
      }
      const session: BrowserSession = { browser, page };
      browser.once('disconnected', () => {
        if (this.session === session) this.session = null;
      });
      this.session = session;
      return session;
    } catch (error) {
      await this.closeBrowser(browser);
      throw error;
    }
  }

  private scheduleIdleClose(): void {
    this.clearIdleTimer();
    if (!this.session) return;
    const requestCountAtSchedule = this.requestCount;
    this.idleTimer = setTimeout(() => {
      this.idleTimer = null;
      void this.enqueue(async () => {
        // 타이머가 울린 뒤 큐에 먼저 들어온 요청이 있었다면 그 요청이 새 타이머를 건다.
        if (this.requestCount !== requestCountAtSchedule) return;
        await this.closeSession();
      });
    }, BROWSER_IDLE_CLOSE_MS);
    this.idleTimer.unref();
  }

  private clearIdleTimer(): void {
    if (!this.idleTimer) return;
    clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }

  private async closeSession(): Promise<void> {
    const session = this.session;
    if (!session) return;
    this.session = null;
    await this.closeBrowser(session.browser);
  }

  /** 닫기에 실패해도 예외를 던지지 않는다. 프로세스가 남지 않도록 강제 종료한다. */
  private async closeBrowser(browser: Browser): Promise<void> {
    try {
      await browser.close();
    } catch (error) {
      this.logger.warn(
        `Failed to close Chromium, killing the process: ${errorMessage(error)}`,
      );
      browser.process()?.kill('SIGKILL');
    }
  }
}

function describeUrl(url: string): string {
  const { pathname, search } = new URL(url);
  return `${pathname}${search}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
