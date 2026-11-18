import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 선수 상세의 상대팀별 성적(findOpponentBattingSplits/PitchingSplits)은 game_stats를
 * player_id + stat_type으로 거르는데, 기존 인덱스는 모두 game_id로 시작해 쓰이지 않고
 * 매 조회가 game_stats 전체를 스캔했다.
 */
export class AddPlayerIdIndexToGameStats1788400000000 implements MigrationInterface {
  name = 'AddPlayerIdIndexToGameStats1788400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_game_stats_player_id_stat_type" ON "game_stats" ("player_id", "stat_type")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_game_stats_player_id_stat_type"`,
    );
  }
}
