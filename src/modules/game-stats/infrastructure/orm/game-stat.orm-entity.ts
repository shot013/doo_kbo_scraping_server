import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PlayerStatType } from '../../domain/entities/game-stat.entity';

@Entity('game_stats')
@Index(['gameId'])
@Index(['gameId', 'teamCode'])
@Index(['gameId', 'teamCode', 'playerName', 'statType'], { unique: true })
export class GameStatOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'game_id', type: 'varchar', length: 32 })
  gameId: string;

  @Column({ name: 'team_code', type: 'varchar', length: 16 })
  teamCode: string;

  @Column({ name: 'player_name', type: 'varchar', length: 64 })
  playerName: string;

  @Column({ name: 'player_no', type: 'varchar', length: 8, nullable: true })
  playerNo: string | null;

  @Column({ name: 'stat_type', type: 'enum', enum: PlayerStatType })
  statType: PlayerStatType;

  @Column({ name: 'at_bats', type: 'smallint', nullable: true })
  atBats: number | null;

  @Column({ name: 'hits', type: 'smallint', nullable: true })
  hits: number | null;

  @Column({ name: 'doubles', type: 'smallint', nullable: true })
  doubles: number | null;

  @Column({ name: 'triples', type: 'smallint', nullable: true })
  triples: number | null;

  @Column({ name: 'home_runs', type: 'smallint', nullable: true })
  homeRuns: number | null;

  @Column({ name: 'rbi', type: 'smallint', nullable: true })
  rbi: number | null;

  @Column({ name: 'runs', type: 'smallint', nullable: true })
  runs: number | null;

  @Column({ name: 'walks', type: 'smallint', nullable: true })
  walks: number | null;

  @Column({ name: 'hit_by_pitch', type: 'smallint', nullable: true })
  hitByPitch: number | null;

  @Column({ name: 'strikeouts', type: 'smallint', nullable: true })
  strikeouts: number | null;

  @Column({ name: 'stolen_bases', type: 'smallint', nullable: true })
  stolenBases: number | null;

  @Column({
    name: 'batting_average',
    type: 'decimal',
    precision: 4,
    scale: 3,
    nullable: true,
  })
  battingAverage: string | null;

  @Column({
    name: 'innings_pitched',
    type: 'decimal',
    precision: 4,
    scale: 1,
    nullable: true,
  })
  inningsPitched: string | null;

  @Column({ name: 'hits_allowed', type: 'smallint', nullable: true })
  hitsAllowed: number | null;

  @Column({ name: 'earned_runs', type: 'smallint', nullable: true })
  earnedRuns: number | null;

  @Column({ name: 'strikeouts_pitched', type: 'smallint', nullable: true })
  strikeoutsPitched: number | null;

  @Column({ name: 'walks_allowed', type: 'smallint', nullable: true })
  walksAllowed: number | null;

  @Column({ name: 'home_runs_allowed', type: 'smallint', nullable: true })
  homeRunsAllowed: number | null;

  @Column({ name: 'win', type: 'boolean', default: false })
  win: boolean;

  @Column({ name: 'loss', type: 'boolean', default: false })
  loss: boolean;

  @Column({ name: 'save', type: 'boolean', default: false })
  save: boolean;

  @Column({ name: 'hold', type: 'boolean', default: false })
  hold: boolean;

  @Column({
    name: 'era',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  era: string | null;

  @Column({ name: 'raw_stats', type: 'jsonb', nullable: true })
  rawStats: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
