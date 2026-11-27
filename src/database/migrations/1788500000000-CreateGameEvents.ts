import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 경기 요약(득점 장면·투수 교체·대타)을 계산할 문자중계 이벤트 원본 (KAN-9).
 * relay 항목 하나에 교체·투구·결과가 함께 오므로 항목 번호와 항목 안 순서로 유일하게 한다.
 */
export class CreateGameEvents1788500000000 implements MigrationInterface {
  name = 'CreateGameEvents1788500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."game_events_type_enum" AS ENUM('PLATE_APPEARANCE', 'PITCHER_CHANGE', 'PINCH_HITTER', 'PINCH_RUNNER', 'DEFENSIVE_CHANGE', 'OTHER_RUN', 'OTHER')`,
    );
    await queryRunner.query(`
      CREATE TABLE "game_events" (
        "id" SERIAL NOT NULL,
        "game_id" character varying(32) NOT NULL,
        "season_year" smallint NOT NULL,
        "sequence_no" smallint NOT NULL,
        "sub_sequence_no" smallint NOT NULL,
        "inning" smallint NOT NULL,
        "is_top_inning" boolean NOT NULL,
        "type" "public"."game_events_type_enum" NOT NULL,
        "text" text NOT NULL,
        "batting_team_code" character varying(16) NOT NULL,
        "outs" smallint,
        "runner_on_first" boolean,
        "runner_on_second" boolean,
        "runner_on_third" boolean,
        "home_score" smallint,
        "away_score" smallint,
        "batter_id" integer,
        "pitcher_id" integer,
        "in_player_id" integer,
        "in_player_name" character varying(64),
        "out_player_id" integer,
        "out_player_name" character varying(64),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_game_events" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_game_events_game_seq" ON "game_events" ("game_id", "sequence_no", "sub_sequence_no")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_game_events_game_seq"`);
    await queryRunner.query(`DROP TABLE "game_events"`);
    await queryRunner.query(`DROP TYPE "public"."game_events_type_enum"`);
  }
}
