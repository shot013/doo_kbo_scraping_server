import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GameEventType } from '../../domain/entities/game-event.entity';

@Entity('game_events')
@Index('UQ_game_events_game_seq', ['gameId', 'sequenceNo', 'subSequenceNo'], {
  unique: true,
})
export class GameEventOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'game_id', type: 'varchar', length: 32 })
  gameId: string;

  @Column({ name: 'season_year', type: 'smallint' })
  seasonYear: number;

  @Column({ name: 'sequence_no', type: 'smallint' })
  sequenceNo: number;

  @Column({ name: 'sub_sequence_no', type: 'smallint' })
  subSequenceNo: number;

  @Column({ name: 'inning', type: 'smallint' })
  inning: number;

  @Column({ name: 'is_top_inning', type: 'boolean' })
  isTopInning: boolean;

  @Column({ name: 'type', type: 'enum', enum: GameEventType })
  type: GameEventType;

  @Column({ name: 'text', type: 'text' })
  text: string;

  @Column({ name: 'batting_team_code', type: 'varchar', length: 16 })
  battingTeamCode: string;

  @Column({ name: 'outs', type: 'smallint', nullable: true })
  outs: number | null;

  @Column({ name: 'runner_on_first', type: 'boolean', nullable: true })
  runnerOnFirst: boolean | null;

  @Column({ name: 'runner_on_second', type: 'boolean', nullable: true })
  runnerOnSecond: boolean | null;

  @Column({ name: 'runner_on_third', type: 'boolean', nullable: true })
  runnerOnThird: boolean | null;

  @Column({ name: 'home_score', type: 'smallint', nullable: true })
  homeScore: number | null;

  @Column({ name: 'away_score', type: 'smallint', nullable: true })
  awayScore: number | null;

  @Column({ name: 'batter_id', type: 'int', nullable: true })
  batterId: number | null;

  @Column({ name: 'pitcher_id', type: 'int', nullable: true })
  pitcherId: number | null;

  @Column({ name: 'in_player_id', type: 'int', nullable: true })
  inPlayerId: number | null;

  @Column({
    name: 'in_player_name',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  inPlayerName: string | null;

  @Column({ name: 'out_player_id', type: 'int', nullable: true })
  outPlayerId: number | null;

  @Column({
    name: 'out_player_name',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  outPlayerName: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
