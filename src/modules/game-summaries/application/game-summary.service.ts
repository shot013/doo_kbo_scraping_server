import { Injectable, NotFoundException } from '@nestjs/common';
import { GameService } from '../../game/application/game.service';
import { GameEventService } from '../../game-events/application/game-event.service';
import { GameLineScoreService } from '../../game-line-scores/application/game-line-score.service';
import { GameStatService } from '../../game-stats/application/game-stat.service';
import { buildLineScore } from './builders/line-score';
import { buildPinchHitters } from './builders/pinch-hitters';
import { buildPitching } from './builders/pitching';
import { SummaryContext } from './builders/relay-text';
import { buildScoringPlays } from './builders/scoring-plays';
import { GameSummaryResponse } from './game-summary.response';

/**
 * 경기 요약(이닝별 득·실점, 투수 교체, 대타)을 저장된 원본에서 요청 때 계산한다.
 * 점수표가 저장된 경기만 요약이 있다고 보고, 없으면 404로 앱이 "아직 이 경기의 요약
 * 정보가 없습니다."를 보이게 한다.
 */
@Injectable()
export class GameSummaryService {
  constructor(
    private readonly gameService: GameService,
    private readonly gameLineScoreService: GameLineScoreService,
    private readonly gameEventService: GameEventService,
    private readonly gameStatService: GameStatService,
  ) {}

  async getSummary(gameId: string): Promise<GameSummaryResponse> {
    const game = await this.gameService.findById(gameId);
    const lineScore = buildLineScore(
      game.homeTeamCode,
      game.awayTeamCode,
      await this.gameLineScoreService.findByGameId(gameId),
    );
    if (!lineScore) {
      throw new NotFoundException(`Game summary not found: ${gameId}`);
    }

    const [events, stats] = await Promise.all([
      this.gameEventService.findByGameId(gameId),
      this.gameStatService.findByGameIds([gameId]),
    ]);
    const context: SummaryContext = {
      homeTeamCode: game.homeTeamCode,
      awayTeamCode: game.awayTeamCode,
      nameById: new Map(
        stats
          .filter((stat) => stat.playerId !== null)
          .map((stat) => [stat.playerId as number, stat.playerName]),
      ),
    };

    return {
      gameId: game.id,
      homeTeamCode: game.homeTeamCode,
      awayTeamCode: game.awayTeamCode,
      lineScore,
      scoringPlays: buildScoringPlays(events, context),
      pitching: buildPitching(stats, events, context),
      pinchHitters: buildPinchHitters(events, context),
    };
  }
}
