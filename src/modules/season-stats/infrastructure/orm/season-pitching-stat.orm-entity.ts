import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('season_pitching_stats')
@Index(['seasonYear', 'teamCode', 'playerName'], { unique: true })
@Index(['seasonYear', 'rank'])
export class SeasonPitchingStatOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'season_year', type: 'smallint' })
  seasonYear: number;

  @Column({ name: 'team_code', type: 'varchar', length: 16 })
  teamCode: string;

  @Column({ name: 'team_name', type: 'varchar', length: 64 })
  teamName: string;

  @Column({ name: 'player_name', type: 'varchar', length: 64 })
  playerName: string;

  @Column({ name: 'rank', type: 'smallint' })
  rank: number;

  @Column({
    name: 'era',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  era: string | null;

  @Column({ name: 'games', type: 'smallint' })
  games: number;

  @Column({ name: 'wins', type: 'smallint' })
  wins: number;

  @Column({ name: 'losses', type: 'smallint' })
  losses: number;

  @Column({ name: 'saves', type: 'smallint' })
  saves: number;

  @Column({ name: 'holds', type: 'smallint' })
  holds: number;

  @Column({
    name: 'win_pct',
    type: 'decimal',
    precision: 4,
    scale: 3,
    nullable: true,
  })
  winPct: string | null;

  @Column({ name: 'innings_pitched', type: 'varchar', length: 16 })
  inningsPitched: string;

  @Column({ name: 'hits_allowed', type: 'smallint' })
  hitsAllowed: number;

  @Column({ name: 'home_runs_allowed', type: 'smallint' })
  homeRunsAllowed: number;

  @Column({ name: 'walks_allowed', type: 'smallint' })
  walksAllowed: number;

  @Column({ name: 'hit_by_pitch', type: 'smallint' })
  hitByPitch: number;

  @Column({ name: 'strikeouts_pitched', type: 'smallint' })
  strikeoutsPitched: number;

  @Column({ name: 'runs_allowed', type: 'smallint' })
  runsAllowed: number;

  @Column({ name: 'earned_runs', type: 'smallint' })
  earnedRuns: number;

  @Column({
    name: 'whip',
    type: 'decimal',
    precision: 4,
    scale: 2,
    nullable: true,
  })
  whip: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
