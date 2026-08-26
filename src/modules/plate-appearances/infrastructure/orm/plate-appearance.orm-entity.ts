import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  HitType,
  PlateAppearanceResult,
} from '../../domain/entities/plate-appearance.entity';

@Entity('plate_appearances')
@Index(['gameId', 'sequenceNo'], { unique: true })
@Index(['batterId', 'seasonYear'])
@Index(['pitcherId', 'seasonYear'])
export class PlateAppearanceOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'game_id', type: 'varchar', length: 32 })
  gameId: string;

  @Column({ name: 'season_year', type: 'smallint' })
  seasonYear: number;

  @Column({ name: 'inning', type: 'smallint' })
  inning: number;

  @Column({ name: 'is_top_inning', type: 'boolean' })
  isTopInning: boolean;

  @Column({ name: 'sequence_no', type: 'smallint' })
  sequenceNo: number;

  @Column({ name: 'batter_id', type: 'int', nullable: true })
  batterId: number | null;

  @Column({ name: 'batter_name', type: 'varchar', length: 64 })
  batterName: string;

  @Column({ name: 'batter_team_code', type: 'varchar', length: 16 })
  batterTeamCode: string;

  @Column({ name: 'pitcher_id', type: 'int', nullable: true })
  pitcherId: number | null;

  @Column({ name: 'pitcher_name', type: 'varchar', length: 64 })
  pitcherName: string;

  @Column({ name: 'pitcher_team_code', type: 'varchar', length: 16 })
  pitcherTeamCode: string;

  @Column({ name: 'result_text', type: 'varchar', length: 255 })
  resultText: string;

  @Column({ name: 'result', type: 'enum', enum: PlateAppearanceResult })
  result: PlateAppearanceResult;

  @Column({ name: 'hit_type', type: 'enum', enum: HitType, nullable: true })
  hitType: HitType | null;

  @Column({ name: 'is_at_bat', type: 'boolean' })
  isAtBat: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
