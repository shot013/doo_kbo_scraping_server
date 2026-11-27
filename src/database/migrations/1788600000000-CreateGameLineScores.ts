import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 경기 요약의 점수표(이닝별 득점, R·H·E·B) 원본 (KAN-10).
 * 이 행이 있는 경기만 요약이 있다고 보고, 없으면 `GET /game-summaries/:gameId`가 404다.
 */
export class CreateGameLineScores1788600000000 implements MigrationInterface {
  name = 'CreateGameLineScores1788600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "game_line_scores" (
        "id" SERIAL NOT NULL,
        "game_id" character varying(32) NOT NULL,
        "team_code" character varying(16) NOT NULL,
        "is_home" boolean NOT NULL,
        "innings" jsonb NOT NULL,
        "runs" smallint NOT NULL,
        "hits" smallint NOT NULL,
        "errors" smallint NOT NULL,
        "walks" smallint NOT NULL,
        "scraped_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_game_line_scores" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_game_line_scores_game_team" ON "game_line_scores" ("game_id", "team_code")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_game_line_scores_game_team"`,
    );
    await queryRunner.query(`DROP TABLE "game_line_scores"`);
  }
}
