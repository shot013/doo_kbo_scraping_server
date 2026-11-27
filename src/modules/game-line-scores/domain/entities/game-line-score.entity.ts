/** 한 경기에서 한 팀의 점수표 한 줄 (이닝별 득점과 R·H·E·B). */
export interface GameLineScoreProps {
  id: number;
  gameId: string;
  teamCode: string;
  isHome: boolean;
  /**
   * 1회부터 마지막 이닝까지의 득점 (연장 포함). 하지 않은 이닝은 null
   * (예: 홈팀이 이기고 있어 9회말을 하지 않으면 마지막 값이 null).
   */
  innings: (number | null)[];
  runs: number;
  hits: number;
  errors: number;
  /** 볼넷·사구 (점수표의 B) */
  walks: number;
  scrapedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class GameLineScore {
  readonly id: number;
  readonly gameId: string;
  readonly teamCode: string;
  readonly isHome: boolean;
  readonly innings: (number | null)[];
  readonly runs: number;
  readonly hits: number;
  readonly errors: number;
  readonly walks: number;
  readonly scrapedAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: GameLineScoreProps) {
    Object.assign(this, props);
  }
}
