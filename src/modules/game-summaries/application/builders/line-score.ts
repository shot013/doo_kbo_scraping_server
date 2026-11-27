import { GameLineScore } from '../../../game-line-scores/domain/entities/game-line-score.entity';
import {
  LineScoreResponse,
  LineScoreRowResponse,
} from '../game-summary.response';

/**
 * 원정·홈 점수표를 맞춰 반환한다. 두 팀 중 하나라도 없으면 요약이 없는 것으로 보고 null.
 * 이닝 수는 두 팀 중 긴 쪽에 맞추고, 짧은 쪽 뒤는 null(하지 않은 이닝)로 채운다.
 */
export function buildLineScore(
  homeTeamCode: string,
  awayTeamCode: string,
  lineScores: GameLineScore[],
): LineScoreResponse | null {
  const away = lineScores.find(
    (row) => !row.isHome && row.teamCode === awayTeamCode,
  );
  const home = lineScores.find(
    (row) => row.isHome && row.teamCode === homeTeamCode,
  );
  if (!away || !home) return null;

  const inningCount = Math.max(away.innings.length, home.innings.length);
  return {
    inningCount,
    away: toRow(away, inningCount),
    home: toRow(home, inningCount),
  };
}

function toRow(row: GameLineScore, inningCount: number): LineScoreRowResponse {
  const innings = Array.from({ length: inningCount }, (_, index) => {
    const runs = row.innings[index];
    return typeof runs === 'number' ? runs : null;
  });
  return {
    teamCode: row.teamCode,
    innings,
    runs: row.runs,
    hits: row.hits,
    errors: row.errors,
    walks: row.walks,
  };
}
