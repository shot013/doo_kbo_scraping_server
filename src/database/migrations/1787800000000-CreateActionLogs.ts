import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateActionLogs1787800000000 implements MigrationInterface {
  name = 'CreateActionLogs1787800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "action_logs" (
        "id" SERIAL NOT NULL,
        "user_id" character varying(64) NOT NULL,
        "route" character varying(255) NOT NULL,
        "previous_route" character varying(255),
        "params" jsonb,
        "platform" character varying(32),
        "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_action_logs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_action_logs_user_id_occurred_at" ON "action_logs" ("user_id", "occurred_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_action_logs_route" ON "action_logs" ("route")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_action_logs_route"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_action_logs_user_id_occurred_at"`,
    );
    await queryRunner.query(`DROP TABLE "action_logs"`);
  }
}
