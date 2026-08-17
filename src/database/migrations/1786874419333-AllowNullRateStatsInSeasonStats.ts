import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowNullRateStatsInSeasonStats1786874419333
  implements MigrationInterface
{
  name = 'AllowNullRateStatsInSeasonStats1786874419333';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "season_pitching_stats" ALTER COLUMN "era" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "season_pitching_stats" ALTER COLUMN "win_pct" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "season_pitching_stats" ALTER COLUMN "whip" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "season_batting_stats" ALTER COLUMN "batting_average" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "season_batting_stats" ALTER COLUMN "batting_average" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "season_pitching_stats" ALTER COLUMN "whip" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "season_pitching_stats" ALTER COLUMN "win_pct" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "season_pitching_stats" ALTER COLUMN "era" SET NOT NULL`,
    );
  }
}
