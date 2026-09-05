import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('game_previews')
export class GamePreviewOrmEntity {
  @PrimaryColumn({ name: 'game_id', type: 'varchar', length: 32 })
  gameId: string;

  @Column({
    name: 'away_team_record',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  awayTeamRecord: string | null;

  @Column({
    name: 'away_recent_form',
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  awayRecentForm: string | null;

  @Column({
    name: 'away_team_era',
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  awayTeamEra: string | null;

  @Column({
    name: 'away_team_batting_average',
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  awayTeamBattingAverage: string | null;

  @Column({
    name: 'away_team_avg_runs_scored',
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  awayTeamAvgRunsScored: string | null;

  @Column({
    name: 'away_team_avg_runs_allowed',
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  awayTeamAvgRunsAllowed: string | null;

  @Column({
    name: 'home_team_record',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  homeTeamRecord: string | null;

  @Column({
    name: 'home_recent_form',
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  homeRecentForm: string | null;

  @Column({
    name: 'home_team_era',
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  homeTeamEra: string | null;

  @Column({
    name: 'home_team_batting_average',
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  homeTeamBattingAverage: string | null;

  @Column({
    name: 'home_team_avg_runs_scored',
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  homeTeamAvgRunsScored: string | null;

  @Column({
    name: 'home_team_avg_runs_allowed',
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  homeTeamAvgRunsAllowed: string | null;

  @Column({
    name: 'away_pitcher_style',
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  awayPitcherStyle: string | null;

  @Column({
    name: 'away_pitcher_season_record',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  awayPitcherSeasonRecord: string | null;

  @Column({
    name: 'away_pitcher_head_to_head_record',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  awayPitcherHeadToHeadRecord: string | null;

  @Column({
    name: 'away_pitcher_era',
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  awayPitcherEra: string | null;

  @Column({
    name: 'away_pitcher_war',
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  awayPitcherWar: string | null;

  @Column({
    name: 'away_pitcher_games',
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  awayPitcherGames: string | null;

  @Column({
    name: 'away_pitcher_avg_innings',
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  awayPitcherAvgInnings: string | null;

  @Column({
    name: 'away_pitcher_quality_starts',
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  awayPitcherQualityStarts: string | null;

  @Column({
    name: 'away_pitcher_whip',
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  awayPitcherWhip: string | null;

  @Column({
    name: 'home_pitcher_style',
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  homePitcherStyle: string | null;

  @Column({
    name: 'home_pitcher_season_record',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  homePitcherSeasonRecord: string | null;

  @Column({
    name: 'home_pitcher_head_to_head_record',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  homePitcherHeadToHeadRecord: string | null;

  @Column({
    name: 'home_pitcher_era',
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  homePitcherEra: string | null;

  @Column({
    name: 'home_pitcher_war',
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  homePitcherWar: string | null;

  @Column({
    name: 'home_pitcher_games',
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  homePitcherGames: string | null;

  @Column({
    name: 'home_pitcher_avg_innings',
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  homePitcherAvgInnings: string | null;

  @Column({
    name: 'home_pitcher_quality_starts',
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  homePitcherQualityStarts: string | null;

  @Column({
    name: 'home_pitcher_whip',
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  homePitcherWhip: string | null;

  @Column({ name: 'scraped_at', type: 'timestamptz' })
  scrapedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
