export enum PlayerPosition {
  PITCHER = 'PITCHER',
  CATCHER = 'CATCHER',
  INFIELDER = 'INFIELDER',
  OUTFIELDER = 'OUTFIELDER',
}

export interface PlayerProps {
  id: number;
  teamCode: string;
  teamName: string;
  name: string;
  position: PlayerPosition;
  backNumber: number | null;
  birthDate: string | null;
  heightCm: number | null;
  weightKg: number | null;
  school: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Player {
  readonly id: number;
  readonly teamCode: string;
  readonly teamName: string;
  readonly name: string;
  readonly position: PlayerPosition;
  readonly backNumber: number | null;
  readonly birthDate: string | null;
  readonly heightCm: number | null;
  readonly weightKg: number | null;
  readonly school: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: PlayerProps) {
    Object.assign(this, props);
  }
}
