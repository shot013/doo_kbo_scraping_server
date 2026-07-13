import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('standings')
@Index(['seasonYear', 'teamCode'], { unique: true })
@Index(['seasonYear', 'rank'])
export class StandingOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'season_year', type: 'smallint' })
  seasonYear: number;

  @Column({ name: 'team_code', type: 'varchar', length: 16 })
  teamCode: string;

  @Column({ name: 'team_name', type: 'varchar', length: 64 })
  teamName: string;

  @Column({ name: 'rank', type: 'smallint' })
  rank: number;

  @Column({ name: 'games_played', type: 'smallint' })
  gamesPlayed: number;

  @Column({ name: 'wins', type: 'smallint' })
  wins: number;

  @Column({ name: 'losses', type: 'smallint' })
  losses: number;

  @Column({ name: 'draws', type: 'smallint' })
  draws: number;

  @Column({ name: 'win_rate', type: 'decimal', precision: 4, scale: 3 })
  winRate: string;

  @Column({
    name: 'games_behind',
    type: 'decimal',
    precision: 4,
    scale: 1,
    nullable: true,
  })
  gamesBehind: string | null;

  @Column({ name: 'streak', type: 'varchar', length: 16, nullable: true })
  streak: string | null;

  @Column({ name: 'last_10', type: 'varchar', length: 16, nullable: true })
  last10: string | null;

  @Column({ name: 'home_record', type: 'varchar', length: 32, nullable: true })
  homeRecord: string | null;

  @Column({ name: 'away_record', type: 'varchar', length: 32, nullable: true })
  awayRecord: string | null;

  @Column({ name: 'calculated_at', type: 'timestamptz' })
  calculatedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
