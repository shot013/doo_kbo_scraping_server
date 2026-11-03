import {
  Game,
  GameSeries,
  GameStatus,
} from '../../game/domain/entities/game.entity';
import { isEveningHourlySlot, isInGameWindow, toKst } from './scrape-schedule';

/** "2026-11-04T18:30" 같은 KST 시각을 Date로 만든다. */
function kst(localDateTime: string): Date {
  return new Date(`${localDateTime}:00+09:00`);
}

function makeGame(scheduledAtKst: string, status: GameStatus): Game {
  const scheduledAt = kst(scheduledAtKst);
  return new Game({
    id: 'test-game',
    seasonYear: 2026,
    gameDate: scheduledAtKst.slice(0, 10),
    scheduledAt,
    stadium: null,
    homeTeamCode: 'KT',
    homeTeamName: 'kt wiz',
    awayTeamCode: 'SS',
    awayTeamName: '삼성 라이온즈',
    homeScore: null,
    awayScore: null,
    homeStarterPitcher: null,
    awayStarterPitcher: null,
    currentInning: null,
    status,
    series: GameSeries.KOREAN_SERIES,
    seriesGameNumber: 2,
    sourceUrl: null,
    createdAt: scheduledAt,
    updatedAt: scheduledAt,
  });
}

describe('toKst', () => {
  it('서버 타임존과 무관하게 KST 날짜·시각을 구한다 (UTC 15시 = 다음날 KST 0시)', () => {
    expect(toKst(new Date('2026-10-31T15:10:00Z'))).toEqual({
      date: '2026-11-01',
      hour: 0,
      minute: 10,
    });
  });
});

describe('isEveningHourlySlot', () => {
  it.each([
    ['2026-11-04T17:00', true],
    ['2026-11-04T23:00', true],
    ['2026-11-05T00:00', true],
    ['2026-11-05T01:00', true],
    ['2026-11-04T17:05', false],
    ['2026-11-04T16:00', false],
    ['2026-11-05T02:00', false],
    ['2026-11-04T14:00', false],
  ])('KST %s → %s', (time, expected) => {
    expect(isEveningHourlySlot(kst(time))).toBe(expected);
  });
});

describe('isInGameWindow', () => {
  const game = makeGame('2026-11-04T18:30', GameStatus.SCHEDULED);

  it.each([
    ['2026-11-04T18:19', false],
    ['2026-11-04T18:20', true],
    ['2026-11-04T21:00', true],
    ['2026-11-05T00:30', true],
    ['2026-11-05T00:31', false],
  ])('18:30 경기, KST %s → %s', (time, expected) => {
    expect(isInGameWindow(game, kst(time))).toBe(expected);
  });

  it('진행 중인 경기는 시간대 안에 있다', () => {
    const inProgress = makeGame('2026-11-04T18:30', GameStatus.IN_PROGRESS);
    expect(isInGameWindow(inProgress, kst('2026-11-04T21:40'))).toBe(true);
  });

  it.each([GameStatus.FINISHED, GameStatus.CANCELLED, GameStatus.POSTPONED])(
    '%s 경기는 시작 시각 근처여도 시간대에서 뺀다',
    (status) => {
      const done = makeGame('2026-11-04T18:30', status);
      expect(isInGameWindow(done, kst('2026-11-04T21:00'))).toBe(false);
    },
  );
});
