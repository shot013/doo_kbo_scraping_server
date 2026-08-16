import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('season_batting_stats')
@Index(['seasonYear', 'teamCode', 'playerName'], { unique: true })
@Index(['seasonYear', 'rank'])
export class SeasonBattingStatOrmEntity {
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
    name: 'batting_average',
    type: 'decimal',
    precision: 4,
    scale: 3,
    nullable: true,
  })
  battingAverage: string | null;

  @Column({ name: 'games', type: 'smallint' })
  games: number;

  @Column({ name: 'plate_appearances', type: 'smallint' })
  plateAppearances: number;

  @Column({ name: 'at_bats', type: 'smallint' })
  atBats: number;

  @Column({ name: 'runs', type: 'smallint' })
  runs: number;

  @Column({ name: 'hits', type: 'smallint' })
  hits: number;

  @Column({ name: 'doubles', type: 'smallint' })
  doubles: number;

  @Column({ name: 'triples', type: 'smallint' })
  triples: number;

  @Column({ name: 'home_runs', type: 'smallint' })
  homeRuns: number;

  @Column({ name: 'total_bases', type: 'smallint' })
  totalBases: number;

  @Column({ name: 'rbi', type: 'smallint' })
  rbi: number;

  @Column({ name: 'sacrifice_hits', type: 'smallint' })
  sacrificeHits: number;

  @Column({ name: 'sacrifice_flies', type: 'smallint' })
  sacrificeFlies: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
