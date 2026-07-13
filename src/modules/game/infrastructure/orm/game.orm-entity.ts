import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GameStatus } from '../../domain/entities/game.entity';

@Entity('games')
@Index(['gameDate'])
@Index(['seasonYear', 'status'])
export class GameOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'varchar', length: 32 })
  id: string;

  @Column({ name: 'season_year', type: 'smallint' })
  seasonYear: number;

  @Column({ name: 'game_date', type: 'date' })
  gameDate: string;

  @Column({ name: 'scheduled_at', type: 'timestamptz' })
  scheduledAt: Date;

  @Column({ name: 'stadium', type: 'varchar', length: 64, nullable: true })
  stadium: string | null;

  @Column({ name: 'home_team_code', type: 'varchar', length: 16 })
  homeTeamCode: string;

  @Column({ name: 'home_team_name', type: 'varchar', length: 64 })
  homeTeamName: string;

  @Column({ name: 'away_team_code', type: 'varchar', length: 16 })
  awayTeamCode: string;

  @Column({ name: 'away_team_name', type: 'varchar', length: 64 })
  awayTeamName: string;

  @Column({ name: 'home_score', type: 'smallint', nullable: true })
  homeScore: number | null;

  @Column({ name: 'away_score', type: 'smallint', nullable: true })
  awayScore: number | null;

  @Column({
    name: 'current_inning',
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  currentInning: string | null;

  @Column({
    name: 'status',
    type: 'enum',
    enum: GameStatus,
    default: GameStatus.SCHEDULED,
  })
  status: GameStatus;

  @Column({ name: 'source_url', type: 'varchar', length: 512, nullable: true })
  sourceUrl: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
