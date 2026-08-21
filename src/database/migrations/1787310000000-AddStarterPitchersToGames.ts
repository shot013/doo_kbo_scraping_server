import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStarterPitchersToGames1787310000000
  implements MigrationInterface
{
  name = 'AddStarterPitchersToGames1787310000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "games" ADD "home_starter_pitcher" character varying(64)`,
    );
    await queryRunner.query(
      `ALTER TABLE "games" ADD "away_starter_pitcher" character varying(64)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "games" DROP COLUMN "away_starter_pitcher"`,
    );
    await queryRunner.query(
      `ALTER TABLE "games" DROP COLUMN "home_starter_pitcher"`,
    );
  }
}
