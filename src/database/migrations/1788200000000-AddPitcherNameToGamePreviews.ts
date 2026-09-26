import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPitcherNameToGamePreviews1788200000000
  implements MigrationInterface
{
  name = 'AddPitcherNameToGamePreviews1788200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "game_previews" ADD "away_pitcher_name" character varying(32)`,
    );
    await queryRunner.query(
      `ALTER TABLE "game_previews" ADD "home_pitcher_name" character varying(32)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "game_previews" DROP COLUMN "home_pitcher_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "game_previews" DROP COLUMN "away_pitcher_name"`,
    );
  }
}
