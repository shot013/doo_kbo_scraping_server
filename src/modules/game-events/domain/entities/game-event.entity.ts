/**
 * 문자중계(relay)에서 경기 흐름을 바꾸는 이벤트의 종류.
 * 경기 요약의 득점 장면·투수 교체·대타는 이 이벤트들로 계산한다.
 */
export enum GameEventType {
  /** 타석 결과 (안타, 아웃, 볼넷 등) */
  PLATE_APPEARANCE = 'PLATE_APPEARANCE',
  PITCHER_CHANGE = 'PITCHER_CHANGE',
  PINCH_HITTER = 'PINCH_HITTER',
  PINCH_RUNNER = 'PINCH_RUNNER',
  DEFENSIVE_CHANGE = 'DEFENSIVE_CHANGE',
  /** 타석 결과가 아닌 득점 (폭투, 포일, 도루, 보크 등) */
  OTHER_RUN = 'OTHER_RUN',
  OTHER = 'OTHER',
}

export interface GameEventProps {
  id: number;
  gameId: string;
  seasonYear: number;
  /** relay 항목 번호(`textRelays[].no`). 타석 하나가 항목 하나다. */
  sequenceNo: number;
  /** 같은 relay 항목 안에서의 순서 (교체·투구·결과가 한 항목에 함께 온다). */
  subSequenceNo: number;
  inning: number;
  isTopInning: boolean;
  type: GameEventType;
  /** relay 원문 */
  text: string;
  battingTeamCode: string;
  /** 이벤트 뒤 상태. 출처에 없으면 null. */
  outs: number | null;
  runnerOnFirst: boolean | null;
  runnerOnSecond: boolean | null;
  runnerOnThird: boolean | null;
  homeScore: number | null;
  awayScore: number | null;
  batterId: number | null;
  pitcherId: number | null;
  /** 교체 이벤트에서 들어온 선수 */
  inPlayerId: number | null;
  inPlayerName: string | null;
  /** 교체 이벤트에서 나간 선수 */
  outPlayerId: number | null;
  outPlayerName: string | null;
  createdAt: Date;
}

export class GameEvent {
  readonly id: number;
  readonly gameId: string;
  readonly seasonYear: number;
  readonly sequenceNo: number;
  readonly subSequenceNo: number;
  readonly inning: number;
  readonly isTopInning: boolean;
  readonly type: GameEventType;
  readonly text: string;
  readonly battingTeamCode: string;
  readonly outs: number | null;
  readonly runnerOnFirst: boolean | null;
  readonly runnerOnSecond: boolean | null;
  readonly runnerOnThird: boolean | null;
  readonly homeScore: number | null;
  readonly awayScore: number | null;
  readonly batterId: number | null;
  readonly pitcherId: number | null;
  readonly inPlayerId: number | null;
  readonly inPlayerName: string | null;
  readonly outPlayerId: number | null;
  readonly outPlayerName: string | null;
  readonly createdAt: Date;

  constructor(props: GameEventProps) {
    Object.assign(this, props);
  }
}
