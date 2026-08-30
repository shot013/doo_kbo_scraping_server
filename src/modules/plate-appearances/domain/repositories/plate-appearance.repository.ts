import { PlateAppearance } from '../entities/plate-appearance.entity';

export const PLATE_APPEARANCE_REPOSITORY = Symbol(
  'PLATE_APPEARANCE_REPOSITORY',
);

/** 타자 한 명의 타석을 상대 투수 기준으로 GROUP BY 집계한 결과 (안타율). */
export interface BatterVsPitcherSplit {
  pitcherId: number;
  pitcherName: string;
  pitcherTeamCode: string;
  atBats: number;
  hits: number;
  battingAverage: string;
}

/** 투수 한 명의 타석을 상대 타자 기준으로 GROUP BY 집계한 결과 (삼진율). */
export interface PitcherVsBatterSplit {
  batterId: number;
  batterName: string;
  batterTeamCode: string;
  atBats: number;
  strikeouts: number;
  strikeoutRate: string;
}

export interface PlateAppearanceRepository {
  upsert(plateAppearance: PlateAppearance): Promise<PlateAppearance>;
  upsertMany(plateAppearances: PlateAppearance[]): Promise<void>;
  findBatterVsPitcherSplits(
    batterId: number,
    seasonYear: number,
  ): Promise<BatterVsPitcherSplit[]>;
  findPitcherVsBatterSplits(
    pitcherId: number,
    seasonYear: number,
  ): Promise<PitcherVsBatterSplit[]>;
}
