import { GameEventType } from '../../../game-events/domain/entities/game-event.entity';
import {
  buildContext,
  buildEvents,
  buildStats,
  event,
} from './__fixtures__/lg-ob-20261126';
import { buildPitching, toOuts } from './pitching';

describe('buildPitching', () => {
  const expectedAway = [
    {
      playerId: 301,
      playerName: '정두산',
      role: 'STARTER',
      entry: null,
      outs: 16,
      pitchCount: 96,
      runs: 4,
      decision: 'LOSS',
    },
    {
      playerId: 302,
      playerName: '이불펜',
      role: 'RELIEVER',
      entry: {
        inning: 6,
        half: 'BOTTOM',
        outs: 1,
        runners: [1],
        atInningStart: false,
      },
      outs: 5,
      pitchCount: 22,
      runs: 0,
      decision: null,
    },
    {
      playerId: 303,
      playerName: '홍좌완',
      role: 'RELIEVER',
      entry: {
        inning: 8,
        half: 'BOTTOM',
        outs: 0,
        runners: [],
        atInningStart: true,
      },
      outs: 3,
      pitchCount: 18,
      runs: 1,
      decision: null,
    },
  ];
  const expectedHome = [
    {
      playerId: 401,
      playerName: '남선발',
      role: 'STARTER',
      entry: null,
      outs: 15,
      pitchCount: 88,
      runs: 3,
      decision: null,
    },
    {
      playerId: 402,
      playerName: '김직관',
      role: 'RELIEVER',
      entry: {
        inning: 6,
        half: 'TOP',
        outs: 0,
        runners: [],
        atInningStart: true,
      },
      outs: 12,
      pitchCount: 51,
      runs: 0,
      decision: 'WIN',
    },
  ];

  it('등판 순서가 없으면 문자중계에 처음 나온 순서로 정렬하고 등판 상황을 붙인다', () => {
    const stats = buildStats(false);

    const result = buildPitching(stats, buildEvents(), buildContext(stats));

    expect(result).toEqual({ away: expectedAway, home: expectedHome });
  });

  it('박스스코어 등판 순서가 모두 있으면 그 순서를 쓴다', () => {
    const stats = buildStats(true);

    const result = buildPitching(stats, [], buildContext(stats));

    expect(result.away.map((pitcher) => pitcher.playerName)).toEqual([
      '정두산',
      '이불펜',
      '홍좌완',
    ]);
    expect(result.home.map((pitcher) => pitcher.role)).toEqual([
      'STARTER',
      'RELIEVER',
    ]);
    // 문자중계가 없으면 등판 상황은 알 수 없다
    expect(result.away[1].entry).toBeNull();
  });

  it('투수 교체 이벤트가 없으면 첫 타석 직전 상태를 등판 상황으로 쓴다', () => {
    const events = buildEvents().filter(
      (item) => item.type !== GameEventType.PITCHER_CHANGE,
    );
    const stats = buildStats(true);

    const result = buildPitching(stats, events, buildContext(stats));

    // 이불펜의 첫 타석(노우익 볼넷) 직전은 김타자 삼진 뒤: 1아웃 1루
    expect(result.away[1].entry).toEqual({
      inning: 6,
      half: 'BOTTOM',
      outs: 1,
      runners: [1],
      atInningStart: false,
    });
    // 김직관의 첫 타석은 6회초 첫 타석이라 이닝 시작
    expect(result.home[1].entry).toEqual({
      inning: 6,
      half: 'TOP',
      outs: 0,
      runners: [],
      atInningStart: true,
    });
  });

  it('주자 정보가 없는 출처면 runners는 null이다', () => {
    const events = [
      event({
        sequenceNo: 1,
        inning: 7,
        isTopInning: true,
        type: GameEventType.PITCHER_CHANGE,
        inPlayerId: 402,
        outs: null,
        runnerOnFirst: null,
        runnerOnSecond: null,
        runnerOnThird: null,
        score: [4, 3],
      }),
    ];
    const stats = buildStats(true);

    const result = buildPitching(stats, events, buildContext(stats));

    expect(result.home[1].entry).toEqual({
      inning: 7,
      half: 'TOP',
      outs: null,
      runners: null,
      atInningStart: true,
    });
  });
});

describe('toOuts', () => {
  it.each([
    ['5.1', 16],
    ['1.2', 5],
    ['4.0', 12],
    ['0.0', 0],
  ])('%s이닝 → %d아웃', (inningsPitched, outs) => {
    expect(toOuts(inningsPitched)).toBe(outs);
  });

  it('형식이 맞지 않거나 없으면 null', () => {
    expect(toOuts(null)).toBeNull();
    expect(toOuts('5.4')).toBeNull();
    expect(toOuts('-')).toBeNull();
  });
});
