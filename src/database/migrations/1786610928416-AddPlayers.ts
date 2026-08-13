import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPlayers1786610928416 implements MigrationInterface {
    name = 'AddPlayers1786610928416'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."players_position_enum" AS ENUM('PITCHER', 'CATCHER', 'INFIELDER', 'OUTFIELDER')`);
        await queryRunner.query(`CREATE TABLE "players" ("id" integer NOT NULL, "team_code" character varying(16) NOT NULL, "team_name" character varying(64) NOT NULL, "name" character varying(64) NOT NULL, "position" "public"."players_position_enum" NOT NULL, "back_number" smallint, "birth_date" date, "height_cm" smallint, "weight_kg" smallint, "school" character varying(255), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_de22b8fdeee0c33ab55ae71da3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_748848d1f9c5c15f791eb7f0dc" ON "players"  ("team_code", "position") `);
        await queryRunner.query(`CREATE INDEX "IDX_0469e7ef312c7baea7cd413092" ON "players"  ("team_code") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_0469e7ef312c7baea7cd413092"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_748848d1f9c5c15f791eb7f0dc"`);
        await queryRunner.query(`DROP TABLE "players"`);
        await queryRunner.query(`DROP TYPE "public"."players_position_enum"`);
    }

}
