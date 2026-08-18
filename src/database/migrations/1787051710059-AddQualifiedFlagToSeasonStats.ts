import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQualifiedFlagToSeasonStats1787051710059
  implements MigrationInterface
{
  name = 'AddQualifiedFlagToSeasonStats1787051710059';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "season_batting_stats" ADD "qualified" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "season_pitching_stats" ADD "qualified" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "season_pitching_stats" DROP COLUMN "qualified"`,
    );
    await queryRunner.query(
      `ALTER TABLE "season_batting_stats" DROP COLUMN "qualified"`,
    );
  }
}
