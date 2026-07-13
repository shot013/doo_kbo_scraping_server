import { Standing } from '../entities/standing.entity';

export const STANDING_REPOSITORY = Symbol('STANDING_REPOSITORY');

export interface StandingRepository {
  findBySeasonYear(seasonYear: number): Promise<Standing[]>;
  upsertMany(standings: Standing[]): Promise<Standing[]>;
}
