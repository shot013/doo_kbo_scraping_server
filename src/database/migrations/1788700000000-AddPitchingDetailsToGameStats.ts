import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 경기 요약의 투수 교체 표에 필요한 실점·투구 수·등판 순서 (KAN-11).
 * 기존 행과 출처에 값이 없는 경우를 위해 모두 nullable이다.
 */
export class AddPitchingDetailsToGameStats1788700000000 implements MigrationInterface {
  name = 'AddPitchingDetailsToGameStats1788700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "game_stats" ADD "runs_allowed" smallint`,
    );
    await queryRunner.query(`ALTER TABLE "game_stats" ADD "pitch_count" smallint`);
    await queryRunner.query(
      `ALTER TABLE "game_stats" ADD "appearance_order" smallint`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "game_stats" DROP COLUMN "appearance_order"`,
    );
    await queryRunner.query(`ALTER TABLE "game_stats" DROP COLUMN "pitch_count"`);
    await queryRunner.query(
      `ALTER TABLE "game_stats" DROP COLUMN "runs_allowed"`,
    );
  }
}
