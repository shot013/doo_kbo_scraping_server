import { Injectable } from '@nestjs/common';
import { GameService } from '../../game/application/game.service';
import { Game, GameStatus } from '../../game/domain/entities/game.entity';
import { GameStatService } from '../../game-stats/application/game-stat.service';
import {
  GameStat,
  PlayerStatType,
} from '../../game-stats/domain/entities/game-stat.entity';

export interface BestPerformerResponse {
  playerName: string;
  teamCode: string;
  atBats: number;
  hits: number;
  rbi: number;
  runs: number;
  line: string;
}

export type PitcherDecision = 'WIN' | 'LOSS' | 'SAVE' | 'HOLD';

export interface PitcherDecisionResponse {
  decision: PitcherDecision;
  playerName: string;
  teamCode: string;
  inningsPitched: string | null;
  earnedRuns: number | null;
  strikeoutsPitched: number | null;
  era: string | null;
}

export interface GameResultResponse {
  gameId: string;
  gameDate: string;
  stadium: string | null;
  homeTeamCode: string;
  homeTeamName: string;
  awayTeamCode: string;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
  bestPerformer: BestPerformerResponse | null;
  pitchers: PitcherDecisionResponse[];
}

export interface GameResultsResponse {
  gameDate: string | null;
  games: GameResultResponse[];
}

const DECISION_PRIORITY: Record<PitcherDecision, number> = {
  WIN: 0,
  LOSS: 1,
  SAVE: 2,
  HOLD: 3,
};

@Injectable()
export class GameResultService {
  constructor(
    private readonly gameService: GameService,
    private readonly gameStatService: GameStatService,
  ) {}

  /**
   * 특정 날짜(없으면 가장 최근에 종료된 경기가 있는 날짜)의 경기 결과를,
   * 경기별 베스트 활약 타자와 승/패/세이브/홀드 투수 기록과 함께 반환한다.
   */
  async getRecentResults(date?: string): Promise<GameResultsResponse> {
    const gameDate = date ?? (await this.resolveLatestFinishedDate());
    if (!gameDate) {
      return { gameDate: null, games: [] };
    }

    const { data: games } = await this.gameService.findAll({
      gameDate,
      status: GameStatus.FINISHED,
      sortBy: 'scheduledAt',
    });
    if (games.length === 0) {
      return { gameDate, games: [] };
    }

    const stats = await this.gameStatService.findByGameIds(
      games.map((game) => game.id),
    );
    const statsByGameId = new Map<string, GameStat[]>();
    for (const stat of stats) {
      const list = statsByGameId.get(stat.gameId) ?? [];
      list.push(stat);
      statsByGameId.set(stat.gameId, list);
    }

    return {
      gameDate,
      games: games.map((game) =>
        this.toGameResultResponse(game, statsByGameId.get(game.id) ?? []),
      ),
    };
  }

  private async resolveLatestFinishedDate(): Promise<string | null> {
    const { data } = await this.gameService.findAll({
      status: GameStatus.FINISHED,
      sortBy: 'gameDate',
      sortOrder: 'DESC',
      limit: 1,
    });
    return data[0]?.gameDate ?? null;
  }

  private toGameResultResponse(
    game: Game,
    stats: GameStat[],
  ): GameResultResponse {
    return {
      gameId: game.id,
      gameDate: game.gameDate,
      stadium: game.stadium,
      homeTeamCode: game.homeTeamCode,
      homeTeamName: game.homeTeamName,
      awayTeamCode: game.awayTeamCode,
      awayTeamName: game.awayTeamName,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      bestPerformer: pickBestPerformer(stats),
      pitchers: pickPitcherDecisions(stats),
    };
  }
}

/** 타점 → 안타 → 득점 순으로 비교해 가장 활약한 타자를 고른다(홈런 데이터가 없어 대체). */
function pickBestPerformer(stats: GameStat[]): BestPerformerResponse | null {
  const batters = stats.filter(
    (stat) => stat.statType === PlayerStatType.BATTING && stat.atBats !== null,
  );
  if (batters.length === 0) return null;

  const best = batters.reduce((top, current) =>
    compareBatters(current, top) > 0 ? current : top,
  );

  const atBats = best.atBats ?? 0;
  const hits = best.hits ?? 0;
  const rbi = best.rbi ?? 0;
  return {
    playerName: best.playerName,
    teamCode: best.teamCode,
    atBats,
    hits,
    rbi,
    runs: best.runs ?? 0,
    line: `${atBats}타수 ${hits}안타 ${rbi}타점`,
  };
}

function compareBatters(a: GameStat, b: GameStat): number {
  return (
    (a.rbi ?? 0) - (b.rbi ?? 0) ||
    (a.hits ?? 0) - (b.hits ?? 0) ||
    (a.runs ?? 0) - (b.runs ?? 0)
  );
}

function pickPitcherDecisions(stats: GameStat[]): PitcherDecisionResponse[] {
  const decisions: PitcherDecisionResponse[] = [];
  for (const stat of stats) {
    if (stat.statType !== PlayerStatType.PITCHING) continue;
    const decision = resolveDecision(stat);
    if (!decision) continue;
    decisions.push({
      decision,
      playerName: stat.playerName,
      teamCode: stat.teamCode,
      inningsPitched: stat.inningsPitched,
      earnedRuns: stat.earnedRuns,
      strikeoutsPitched: stat.strikeoutsPitched,
      era: stat.era,
    });
  }
  return decisions.sort(
    (a, b) => DECISION_PRIORITY[a.decision] - DECISION_PRIORITY[b.decision],
  );
}

function resolveDecision(stat: GameStat): PitcherDecision | null {
  if (stat.win) return 'WIN';
  if (stat.loss) return 'LOSS';
  if (stat.save) return 'SAVE';
  if (stat.hold) return 'HOLD';
  return null;
}
