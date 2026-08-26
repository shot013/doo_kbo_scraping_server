import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlateAppearances1787724614073 implements MigrationInterface {
  name = 'AddPlateAppearances1787724614073';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."plate_appearances_result_enum" AS ENUM('HIT', 'STRIKEOUT', 'WALK', 'HIT_BY_PITCH', 'SACRIFICE', 'OTHER_OUT')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."plate_appearances_hit_type_enum" AS ENUM('SINGLE', 'DOUBLE', 'TRIPLE', 'HOME_RUN')`,
    );
    await queryRunner.query(`
      CREATE TABLE "plate_appearances" (
        "id" SERIAL NOT NULL,
        "game_id" character varying(32) NOT NULL,
        "season_year" smallint NOT NULL,
        "inning" smallint NOT NULL,
        "is_top_inning" boolean NOT NULL,
        "sequence_no" smallint NOT NULL,
        "batter_id" integer,
        "batter_name" character varying(64) NOT NULL,
        "batter_team_code" character varying(16) NOT NULL,
        "pitcher_id" integer,
        "pitcher_name" character varying(64) NOT NULL,
        "pitcher_team_code" character varying(16) NOT NULL,
        "result_text" character varying(255) NOT NULL,
        "result" "public"."plate_appearances_result_enum" NOT NULL,
        "hit_type" "public"."plate_appearances_hit_type_enum",
        "is_at_bat" boolean NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_plate_appearances" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_plate_appearances_game_seq" ON "plate_appearances" ("game_id", "sequence_no")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_plate_appearances_batter_season" ON "plate_appearances" ("batter_id", "season_year")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_plate_appearances_pitcher_season" ON "plate_appearances" ("pitcher_id", "season_year")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_plate_appearances_pitcher_season"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_plate_appearances_batter_season"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_plate_appearances_game_seq"`,
    );
    await queryRunner.query(`DROP TABLE "plate_appearances"`);
    await queryRunner.query(
      `DROP TYPE "public"."plate_appearances_hit_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."plate_appearances_result_enum"`,
    );
  }
}
