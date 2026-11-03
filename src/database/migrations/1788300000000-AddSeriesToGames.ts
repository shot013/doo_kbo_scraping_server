import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 포스트시즌 경기를 games에 함께 저장하기 위해 시리즈 구분을 추가한다. 기존 행은 모두
 * 정규시즌 일정 API(srIdList=0,9,6)로만 수집됐으므로 기본값 REGULAR가 그대로 맞다.
 */
export class AddSeriesToGames1788300000000 implements MigrationInterface {
  name = 'AddSeriesToGames1788300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."games_series_enum" AS ENUM('REGULAR', 'WILDCARD', 'SEMI_PLAYOFF', 'PLAYOFF', 'KOREAN_SERIES')`,
    );
    await queryRunner.query(
      `ALTER TABLE "games" ADD "series" "public"."games_series_enum" NOT NULL DEFAULT 'REGULAR'`,
    );
    await queryRunner.query(
      `ALTER TABLE "games" ADD "series_game_number" smallint`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "games" DROP COLUMN "series_game_number"`,
    );
    await queryRunner.query(`ALTER TABLE "games" DROP COLUMN "series"`);
    await queryRunner.query(`DROP TYPE "public"."games_series_enum"`);
  }
}
