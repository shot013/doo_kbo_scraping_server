import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('game_line_scores')
@Index('UQ_game_line_scores_game_team', ['gameId', 'teamCode'], {
  unique: true,
})
export class GameLineScoreOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'game_id', type: 'varchar', length: 32 })
  gameId: string;

  @Column({ name: 'team_code', type: 'varchar', length: 16 })
  teamCode: string;

  @Column({ name: 'is_home', type: 'boolean' })
  isHome: boolean;

  @Column({ name: 'innings', type: 'jsonb' })
  innings: (number | null)[];

  @Column({ name: 'runs', type: 'smallint' })
  runs: number;

  @Column({ name: 'hits', type: 'smallint' })
  hits: number;

  @Column({ name: 'errors', type: 'smallint' })
  errors: number;

  @Column({ name: 'walks', type: 'smallint' })
  walks: number;

  @Column({ name: 'scraped_at', type: 'timestamptz' })
  scrapedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
