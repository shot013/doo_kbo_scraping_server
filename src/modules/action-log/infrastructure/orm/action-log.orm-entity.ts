import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('action_logs')
@Index(['userId', 'occurredAt'])
@Index(['route'])
export class ActionLogOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'varchar', length: 64, nullable: true })
  userId: string | null;

  @Column({ name: 'route', type: 'varchar', length: 255 })
  route: string;

  @Column({
    name: 'previous_route',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  previousRoute: string | null;

  @Column({ name: 'params', type: 'jsonb', nullable: true })
  params: Record<string, unknown> | null;

  @Column({ name: 'platform', type: 'varchar', length: 32, nullable: true })
  platform: string | null;

  @Column({ name: 'os_version', type: 'varchar', length: 32, nullable: true })
  osVersion: string | null;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
