import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSeasonStats1786723205093 implements MigrationInterface {
    name = 'AddSeasonStats1786723205093'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "season_batting_stats" ("id" SERIAL NOT NULL, "season_year" smallint NOT NULL, "team_code" character varying(16) NOT NULL, "team_name" character varying(64) NOT NULL, "player_name" character varying(64) NOT NULL, "rank" smallint NOT NULL, "batting_average" numeric(4,3) NOT NULL, "games" smallint NOT NULL, "plate_appearances" smallint NOT NULL, "at_bats" smallint NOT NULL, "runs" smallint NOT NULL, "hits" smallint NOT NULL, "doubles" smallint NOT NULL, "triples" smallint NOT NULL, "home_runs" smallint NOT NULL, "total_bases" smallint NOT NULL, "rbi" smallint NOT NULL, "sacrifice_hits" smallint NOT NULL, "sacrifice_flies" smallint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c4c76465b723893f85d5a278537" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a50a9154677b76e597bde488e4" ON "season_batting_stats"  ("season_year", "rank") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_65d43a5fdbe20249519afd23bd" ON "season_batting_stats"  ("season_year", "team_code", "player_name") `);
        await queryRunner.query(`CREATE TABLE "season_pitching_stats" ("id" SERIAL NOT NULL, "season_year" smallint NOT NULL, "team_code" character varying(16) NOT NULL, "team_name" character varying(64) NOT NULL, "player_name" character varying(64) NOT NULL, "rank" smallint NOT NULL, "era" numeric(5,2) NOT NULL, "games" smallint NOT NULL, "wins" smallint NOT NULL, "losses" smallint NOT NULL, "saves" smallint NOT NULL, "holds" smallint NOT NULL, "win_pct" numeric(4,3) NOT NULL, "innings_pitched" character varying(16) NOT NULL, "hits_allowed" smallint NOT NULL, "home_runs_allowed" smallint NOT NULL, "walks_allowed" smallint NOT NULL, "hit_by_pitch" smallint NOT NULL, "strikeouts_pitched" smallint NOT NULL, "runs_allowed" smallint NOT NULL, "earned_runs" smallint NOT NULL, "whip" numeric(4,2) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_4860a90b866fe46fa3b15c3bd03" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0aa76c2d1a6960d617ae393450" ON "season_pitching_stats"  ("season_year", "rank") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a3c925da1e78154d47188ec43f" ON "season_pitching_stats"  ("season_year", "team_code", "player_name") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_a3c925da1e78154d47188ec43f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0aa76c2d1a6960d617ae393450"`);
        await queryRunner.query(`DROP TABLE "season_pitching_stats"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_65d43a5fdbe20249519afd23bd"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a50a9154677b76e597bde488e4"`);
        await queryRunner.query(`DROP TABLE "season_batting_stats"`);
    }

}
