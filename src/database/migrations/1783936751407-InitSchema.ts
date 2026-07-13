import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1783936751407 implements MigrationInterface {
    name = 'InitSchema1783936751407'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."games_status_enum" AS ENUM('SCHEDULED', 'IN_PROGRESS', 'FINISHED', 'CANCELLED', 'POSTPONED')`);
        await queryRunner.query(`CREATE TABLE "games" ("id" character varying(32) NOT NULL, "season_year" smallint NOT NULL, "game_date" date NOT NULL, "scheduled_at" TIMESTAMP WITH TIME ZONE NOT NULL, "stadium" character varying(64), "home_team_code" character varying(16) NOT NULL, "home_team_name" character varying(64) NOT NULL, "away_team_code" character varying(16) NOT NULL, "away_team_name" character varying(64) NOT NULL, "home_score" smallint, "away_score" smallint, "current_inning" character varying(16), "status" "public"."games_status_enum" NOT NULL DEFAULT 'SCHEDULED', "source_url" character varying(512), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c9b16b62917b5595af982d66337" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6b7c85239887d99495ba851509" ON "games"  ("season_year", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_ffceb81c5559075c8ce48ba9c3" ON "games"  ("game_date") `);
        await queryRunner.query(`CREATE TYPE "public"."game_stats_stat_type_enum" AS ENUM('BATTING', 'PITCHING')`);
        await queryRunner.query(`CREATE TABLE "game_stats" ("id" SERIAL NOT NULL, "game_id" character varying(32) NOT NULL, "team_code" character varying(16) NOT NULL, "player_name" character varying(64) NOT NULL, "player_no" character varying(8), "stat_type" "public"."game_stats_stat_type_enum" NOT NULL, "at_bats" smallint, "hits" smallint, "doubles" smallint, "triples" smallint, "home_runs" smallint, "rbi" smallint, "runs" smallint, "walks" smallint, "hit_by_pitch" smallint, "strikeouts" smallint, "stolen_bases" smallint, "batting_average" numeric(4,3), "innings_pitched" numeric(4,1), "hits_allowed" smallint, "earned_runs" smallint, "strikeouts_pitched" smallint, "walks_allowed" smallint, "home_runs_allowed" smallint, "win" boolean NOT NULL DEFAULT false, "loss" boolean NOT NULL DEFAULT false, "save" boolean NOT NULL DEFAULT false, "hold" boolean NOT NULL DEFAULT false, "era" numeric(5,2), "raw_stats" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_289bd8cd7cadaeb5f3f75746196" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_24fc6cb0bceeccbeff691c7067" ON "game_stats"  ("game_id", "team_code", "player_name", "stat_type") `);
        await queryRunner.query(`CREATE INDEX "IDX_eae9290f4a1de9109c928aac65" ON "game_stats"  ("game_id", "team_code") `);
        await queryRunner.query(`CREATE INDEX "IDX_a8e2b0df27f8baa40c5aef8d3e" ON "game_stats"  ("game_id") `);
        await queryRunner.query(`CREATE TYPE "public"."scrape_source_health_status_enum" AS ENUM('SUCCESS', 'FAILURE')`);
        await queryRunner.query(`CREATE TABLE "scrape_source_health" ("id" SERIAL NOT NULL, "source_name" character varying(64) NOT NULL, "target_url" character varying(512), "status" "public"."scrape_source_health_status_enum" NOT NULL, "http_status_code" smallint, "duration_ms" integer, "items_scraped" integer, "error_message" text, "scraped_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7dcd6fc4eb5e249d82d2e4f3ef6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_548d79b3ae5f4711b2bf4defae" ON "scrape_source_health"  ("source_name", "scraped_at") `);
        await queryRunner.query(`CREATE TABLE "standings" ("id" SERIAL NOT NULL, "season_year" smallint NOT NULL, "team_code" character varying(16) NOT NULL, "team_name" character varying(64) NOT NULL, "rank" smallint NOT NULL, "games_played" smallint NOT NULL, "wins" smallint NOT NULL, "losses" smallint NOT NULL, "draws" smallint NOT NULL, "win_rate" numeric(4,3) NOT NULL, "games_behind" numeric(4,1), "streak" character varying(16), "last_10" character varying(16), "home_record" character varying(32), "away_record" character varying(32), "calculated_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ca695befaab9b01d05dd453dbdb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_46f65d912c93a2dfffcaff5fea" ON "standings"  ("season_year", "rank") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_072031ef645dc9ee2010f314f0" ON "standings"  ("season_year", "team_code") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_072031ef645dc9ee2010f314f0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_46f65d912c93a2dfffcaff5fea"`);
        await queryRunner.query(`DROP TABLE "standings"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_548d79b3ae5f4711b2bf4defae"`);
        await queryRunner.query(`DROP TABLE "scrape_source_health"`);
        await queryRunner.query(`DROP TYPE "public"."scrape_source_health_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a8e2b0df27f8baa40c5aef8d3e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_eae9290f4a1de9109c928aac65"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_24fc6cb0bceeccbeff691c7067"`);
        await queryRunner.query(`DROP TABLE "game_stats"`);
        await queryRunner.query(`DROP TYPE "public"."game_stats_stat_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ffceb81c5559075c8ce48ba9c3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6b7c85239887d99495ba851509"`);
        await queryRunner.query(`DROP TABLE "games"`);
        await queryRunner.query(`DROP TYPE "public"."games_status_enum"`);
    }

}
