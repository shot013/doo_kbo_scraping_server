import { GameEventType } from '../../../game-events/domain/entities/game-event.entity';
import {
  AWAY,
  HOME,
  buildContext,
  buildEvents,
  event,
} from './__fixtures__/lg-ob-20261126';
import { buildScoringPlays } from './scoring-plays';

describe('buildScoringPlays', () => {
  it('점수가 바뀐 이벤트마다 득점 장면을 만들고 동점·역전을 표시한다', () => {
    const plays = buildScoringPlays(buildEvents(), buildContext());

    expect(
      plays.map(
        ({ inning, half, teamCode, description, homeScore, awayScore }) => ({
          inning,
          half,
          teamCode,
          description,
          score: `${homeScore}:${awayScore}`,
        }),
      ),
    ).toEqual([
      {
        inning: 1,
        half: 'BOTTOM',
        teamCode: HOME,
        description: '구유격 적시타',
        score: '1:0',
      },
      {
        inning: 2,
        half: 'TOP',
        teamCode: AWAY,
        description: '최유격 솔로 홈런',
        score: '1:1',
      },
      {
        inning: 5,
        half: 'TOP',
        teamCode: AWAY,
        description: '오른손 2타점 2루타',
        score: '1:3',
      },
      {
        inning: 6,
        half: 'BOTTOM',
        teamCode: HOME,
        description: '정내야 3점 홈런',
        score: '4:3',
      },
      {
        inning: 8,
        half: 'BOTTOM',
        teamCode: HOME,
        description: '대타 표중견 1타점 2루타',
        score: '5:3',
      },
    ]);
    expect(plays.map((play) => play.isTying)).toEqual([
      false,
      true,
      false,
      false,
      false,
    ]);
    expect(plays.map((play) => play.isReversal)).toEqual([
      false,
      false,
      false,
      true,
      false,
    ]);
  });

  it('동점에서 앞서 나가는 것은 역전이 아니다', () => {
    const plays = buildScoringPlays(buildEvents(), buildContext());

    // 2회초 1:1 동점 뒤 5회초 원정이 앞서 나감
    expect(plays[2]).toMatchObject({ isReversal: false, isTying: false });
  });

  it('타석 외 득점은 문자중계 원문을 쓰고, 점수를 모르는 이벤트는 건너뛴다', () => {
    const events = [
      event({
        sequenceNo: 1,
        inning: 3,
        isTopInning: true,
        type: GameEventType.OTHER_RUN,
        text: '폭투로 3루주자 최유격 홈인',
        score: [0, 1],
      }),
      event({
        sequenceNo: 2,
        inning: 3,
        isTopInning: true,
        type: GameEventType.PLATE_APPEARANCE,
        text: '오른손 : 볼넷',
        score: [0, 0],
        homeScore: null,
        awayScore: null,
      }),
      event({
        sequenceNo: 3,
        inning: 3,
        isTopInning: true,
        type: GameEventType.PLATE_APPEARANCE,
        text: '민포수 : 볼넷',
        batterId: 103,
        score: [0, 2],
      }),
    ];

    const plays = buildScoringPlays(events, buildContext());

    expect(plays.map((play) => play.description)).toEqual([
      '폭투로 3루주자 최유격 홈인',
      '민포수 밀어내기 볼넷',
    ]);
  });

  it('만루 홈런과 여러 타점 적시타를 구분한다', () => {
    const events = [
      event({
        sequenceNo: 1,
        inning: 1,
        isTopInning: false,
        type: GameEventType.PLATE_APPEARANCE,
        text: '김타자 : 좌중간 1루타',
        score: [2, 0],
      }),
      event({
        sequenceNo: 2,
        inning: 1,
        isTopInning: false,
        type: GameEventType.PLATE_APPEARANCE,
        text: '정내야 : 좌월 홈런',
        score: [6, 0],
      }),
    ];

    const plays = buildScoringPlays(events, buildContext());

    expect(plays.map((play) => play.description)).toEqual([
      '김타자 2타점 적시타',
      '정내야 만루 홈런',
    ]);
  });
});
