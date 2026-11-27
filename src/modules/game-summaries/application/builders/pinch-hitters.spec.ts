import { GameEventType } from '../../../game-events/domain/entities/game-event.entity';
import {
  AWAY,
  HOME,
  buildContext,
  buildEvents,
  event,
} from './__fixtures__/lg-ob-20261126';
import { buildPinchHitters, findPinchHitterUses } from './pinch-hitters';

describe('buildPinchHitters', () => {
  it('대타마다 교체 대상, 상대 투수, 타석 결과, 타점을 붙이고 팀별로 합산한다', () => {
    const result = buildPinchHitters(buildEvents(), buildContext());

    expect(result.appearances).toEqual([
      {
        inning: 7,
        half: 'TOP',
        teamCode: AWAY,
        playerId: 104,
        playerName: '장대타',
        replacedPlayerId: 103,
        replacedPlayerName: '민포수',
        pitcherId: 402,
        pitcherName: '김직관',
        resultText: '삼진',
        isHit: false,
        rbi: 0,
      },
      {
        inning: 8,
        half: 'BOTTOM',
        teamCode: HOME,
        playerId: 204,
        playerName: '표중견',
        replacedPlayerId: 203,
        replacedPlayerName: '노우익',
        pitcherId: 303,
        pitcherName: '홍좌완',
        resultText: '2루타',
        isHit: true,
        rbi: 1,
      },
      {
        inning: 9,
        half: 'TOP',
        teamCode: AWAY,
        playerId: 105,
        playerName: '윤대주',
        replacedPlayerId: 102,
        replacedPlayerName: '오른손',
        pitcherId: 402,
        pitcherName: '김직관',
        resultText: '유격수 땅볼',
        isHit: false,
        rbi: 0,
      },
    ]);
    expect(result.summary).toEqual({
      away: { teamCode: AWAY, count: 2, atBats: 2, hits: 0, rbi: 0 },
      home: { teamCode: HOME, count: 1, atBats: 1, hits: 1, rbi: 1 },
    });
  });

  it('대타가 타석 전에 다시 교체되면 결과 없이 남기고 타수로 세지 않는다', () => {
    const events = [
      event({
        sequenceNo: 1,
        subSequenceNo: 0,
        inning: 9,
        isTopInning: true,
        type: GameEventType.PINCH_HITTER,
        inPlayerId: 104,
        outPlayerId: 103,
        score: [5, 3],
      }),
      event({
        sequenceNo: 1,
        subSequenceNo: 1,
        inning: 9,
        isTopInning: true,
        type: GameEventType.PINCH_HITTER,
        inPlayerId: 105,
        outPlayerId: 104,
        score: [5, 3],
      }),
      event({
        sequenceNo: 1,
        subSequenceNo: 2,
        inning: 9,
        isTopInning: true,
        type: GameEventType.PLATE_APPEARANCE,
        text: '윤대주 : 볼넷',
        batterId: 105,
        score: [5, 3],
      }),
    ];

    const result = buildPinchHitters(events, buildContext());

    expect(result.appearances[0]).toMatchObject({
      playerName: '장대타',
      pitcherId: null,
      resultText: null,
      isHit: false,
      rbi: 0,
    });
    expect(result.appearances[1]).toMatchObject({
      playerName: '윤대주',
      replacedPlayerName: '장대타',
      resultText: '볼넷',
    });
    // 볼넷은 타수가 아니다
    expect(result.summary.away).toEqual({
      teamCode: AWAY,
      count: 2,
      atBats: 0,
      hits: 0,
      rbi: 0,
    });
  });

  it('점수를 모르는 타석이면 타점은 null이고 합계에서는 0으로 센다', () => {
    const events = [
      event({
        sequenceNo: 1,
        subSequenceNo: 0,
        inning: 8,
        isTopInning: false,
        type: GameEventType.PINCH_HITTER,
        inPlayerId: 204,
        outPlayerId: 203,
        score: [4, 3],
      }),
      event({
        sequenceNo: 1,
        subSequenceNo: 1,
        inning: 8,
        isTopInning: false,
        type: GameEventType.PLATE_APPEARANCE,
        text: '표중견 : 우중간 2루타',
        batterId: 204,
        score: [0, 0],
        homeScore: null,
        awayScore: null,
      }),
    ];

    const result = buildPinchHitters(events, buildContext());

    expect(result.appearances[0].rbi).toBeNull();
    expect(result.summary.home).toEqual({
      teamCode: HOME,
      count: 1,
      atBats: 1,
      hits: 1,
      rbi: 0,
    });
  });
});

describe('findPinchHitterUses', () => {
  it('상대 팀 타석은 건너뛰고 같은 팀의 다음 타석과 짝짓는다', () => {
    const events = [
      event({
        sequenceNo: 1,
        inning: 9,
        isTopInning: true,
        type: GameEventType.PINCH_HITTER,
        inPlayerId: 104,
        score: [5, 3],
      }),
      event({
        sequenceNo: 2,
        inning: 9,
        isTopInning: false,
        type: GameEventType.PLATE_APPEARANCE,
        batterId: 201,
        score: [5, 3],
      }),
      event({
        sequenceNo: 3,
        inning: 10,
        isTopInning: true,
        type: GameEventType.PLATE_APPEARANCE,
        batterId: 104,
        score: [5, 3],
      }),
    ];

    expect(findPinchHitterUses(events)).toEqual([
      { substitutionIndex: 0, plateAppearanceIndex: 2 },
    ]);
  });
});
