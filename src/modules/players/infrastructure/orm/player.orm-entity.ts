import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PlayerPosition } from '../../domain/entities/player.entity';

@Entity('players')
@Index(['teamCode'])
@Index(['teamCode', 'position'])
export class PlayerOrmEntity {
  @PrimaryColumn({ type: 'integer' })
  id: number;

  @Column({ name: 'team_code', type: 'varchar', length: 16 })
  teamCode: string;

  @Column({ name: 'team_name', type: 'varchar', length: 64 })
  teamName: string;

  @Column({ name: 'name', type: 'varchar', length: 64 })
  name: string;

  @Column({ name: 'position', type: 'enum', enum: PlayerPosition })
  position: PlayerPosition;

  @Column({ name: 'back_number', type: 'smallint', nullable: true })
  backNumber: number | null;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate: string | null;

  @Column({ name: 'height_cm', type: 'smallint', nullable: true })
  heightCm: number | null;

  @Column({ name: 'weight_kg', type: 'smallint', nullable: true })
  weightKg: number | null;

  @Column({ name: 'school', type: 'varchar', length: 255, nullable: true })
  school: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
