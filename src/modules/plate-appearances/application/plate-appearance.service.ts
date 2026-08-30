import { Inject, Injectable } from '@nestjs/common';
import { PlateAppearance } from '../domain/entities/plate-appearance.entity';
import {
  BatterVsPitcherSplit,
  PLATE_APPEARANCE_REPOSITORY,
  PitcherVsBatterSplit,
} from '../domain/repositories/plate-appearance.repository';
import type { PlateAppearanceRepository } from '../domain/repositories/plate-appearance.repository';

@Injectable()
export class PlateAppearanceService {
  constructor(
    @Inject(PLATE_APPEARANCE_REPOSITORY)
    private readonly plateAppearanceRepository: PlateAppearanceRepository,
  ) {}

  upsert(plateAppearance: PlateAppearance): Promise<PlateAppearance> {
    return this.plateAppearanceRepository.upsert(plateAppearance);
  }

  upsertMany(plateAppearances: PlateAppearance[]): Promise<void> {
    return this.plateAppearanceRepository.upsertMany(plateAppearances);
  }

  findBatterVsPitcherSplits(
    batterId: number,
    seasonYear: number,
  ): Promise<BatterVsPitcherSplit[]> {
    return this.plateAppearanceRepository.findBatterVsPitcherSplits(
      batterId,
      seasonYear,
    );
  }

  findPitcherVsBatterSplits(
    pitcherId: number,
    seasonYear: number,
  ): Promise<PitcherVsBatterSplit[]> {
    return this.plateAppearanceRepository.findPitcherVsBatterSplits(
      pitcherId,
      seasonYear,
    );
  }
}
