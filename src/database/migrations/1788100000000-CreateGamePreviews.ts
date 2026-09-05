import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGamePreviews1788100000000 implements MigrationInterface {
  name = 'CreateGamePreviews1788100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "game_previews" (
        "game_id" character varying(32) NOT NULL,
        "away_team_record" character varying(32),
        "away_recent_form" character varying(16),
        "away_team_era" character varying(16),
        "away_team_batting_average" character varying(16),
        "away_team_avg_runs_scored" character varying(16),
        "away_team_avg_runs_allowed" character varying(16),
        "home_team_record" character varying(32),
        "home_recent_form" character varying(16),
        "home_team_era" character varying(16),
        "home_team_batting_average" character varying(16),
        "home_team_avg_runs_scored" character varying(16),
        "home_team_avg_runs_allowed" character varying(16),
        "away_pitcher_style" character varying(16),
        "away_pitcher_season_record" character varying(32),
        "away_pitcher_head_to_head_record" character varying(32),
        "away_pitcher_era" character varying(16),
        "away_pitcher_war" character varying(16),
        "away_pitcher_games" character varying(16),
        "away_pitcher_avg_innings" character varying(16),
        "away_pitcher_quality_starts" character varying(16),
        "away_pitcher_whip" character varying(16),
        "home_pitcher_style" character varying(16),
        "home_pitcher_season_record" character varying(32),
        "home_pitcher_head_to_head_record" character varying(32),
        "home_pitcher_era" character varying(16),
        "home_pitcher_war" character varying(16),
        "home_pitcher_games" character varying(16),
        "home_pitcher_avg_innings" character varying(16),
        "home_pitcher_quality_starts" character varying(16),
        "home_pitcher_whip" character varying(16),
        "scraped_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_game_previews" PRIMARY KEY ("game_id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "game_previews"`);
  }
}
