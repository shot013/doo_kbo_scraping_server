export enum PlateAppearanceResult {
  HIT = 'HIT',
  STRIKEOUT = 'STRIKEOUT',
  WALK = 'WALK',
  HIT_BY_PITCH = 'HIT_BY_PITCH',
  SACRIFICE = 'SACRIFICE',
  OTHER_OUT = 'OTHER_OUT',
}

export enum HitType {
  SINGLE = 'SINGLE',
  DOUBLE = 'DOUBLE',
  TRIPLE = 'TRIPLE',
  HOME_RUN = 'HOME_RUN',
}

export interface PlateAppearanceProps {
  id: number;
  gameId: string;
  seasonYear: number;
  inning: number;
  isTopInning: boolean;
  sequenceNo: number;
  batterId: number | null;
  batterName: string;
  batterTeamCode: string;
  pitcherId: number | null;
  pitcherName: string;
  pitcherTeamCode: string;
  resultText: string;
  result: PlateAppearanceResult;
  hitType: HitType | null;
  isAtBat: boolean;
  createdAt: Date;
}

export class PlateAppearance {
  readonly id: number;
  readonly gameId: string;
  readonly seasonYear: number;
  readonly inning: number;
  readonly isTopInning: boolean;
  readonly sequenceNo: number;
  readonly batterId: number | null;
  readonly batterName: string;
  readonly batterTeamCode: string;
  readonly pitcherId: number | null;
  readonly pitcherName: string;
  readonly pitcherTeamCode: string;
  readonly resultText: string;
  readonly result: PlateAppearanceResult;
  readonly hitType: HitType | null;
  readonly isAtBat: boolean;
  readonly createdAt: Date;

  constructor(props: PlateAppearanceProps) {
    Object.assign(this, props);
  }
}
