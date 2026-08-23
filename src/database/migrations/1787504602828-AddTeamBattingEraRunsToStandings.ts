import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTeamBattingEraRunsToStandings1787504602828
  implements MigrationInterface
{
  name = 'AddTeamBattingEraRunsToStandings1787504602828';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "standings" ADD "batting_average" decimal(4,3) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "standings" ADD "era" decimal(5,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "standings" ADD "runs_scored" smallint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "standings" ADD "runs_allowed" smallint NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "standings" DROP COLUMN "runs_allowed"`,
    );
    await queryRunner.query(
      `ALTER TABLE "standings" DROP COLUMN "runs_scored"`,
    );
    await queryRunner.query(`ALTER TABLE "standings" DROP COLUMN "era"`);
    await queryRunner.query(
      `ALTER TABLE "standings" DROP COLUMN "batting_average"`,
    );
  }
}
