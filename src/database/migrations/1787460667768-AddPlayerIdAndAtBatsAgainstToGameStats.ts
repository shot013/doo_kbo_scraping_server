import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlayerIdAndAtBatsAgainstToGameStats1787460667768
  implements MigrationInterface
{
  name = 'AddPlayerIdAndAtBatsAgainstToGameStats1787460667768';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "game_stats" ADD "player_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "game_stats" ADD "at_bats_against" smallint`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "game_stats" DROP COLUMN "at_bats_against"`,
    );
    await queryRunner.query(
      `ALTER TABLE "game_stats" DROP COLUMN "player_id"`,
    );
  }
}
