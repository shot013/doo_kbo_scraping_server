import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PaginatedResult } from '../../../common/pagination/pagination';
import { Game } from '../domain/entities/game.entity';
import {
  GAME_REPOSITORY,
  GameFilter,
  TeamRunsAggregate,
} from '../domain/repositories/game.repository';
import type { GameRepository } from '../domain/repositories/game.repository';

@Injectable()
export class GameService {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
  ) {}

  findAll(filter: GameFilter = {}): Promise<PaginatedResult<Game>> {
    return this.gameRepository.findAll(filter);
  }

  async findById(id: string): Promise<Game> {
    const game = await this.gameRepository.findById(id);
    if (!game) {
      throw new NotFoundException(`Game not found: ${id}`);
    }
    return game;
  }

  upsert(game: Game): Promise<Game> {
    return this.gameRepository.upsert(game);
  }

  upsertMany(games: Game[]): Promise<void> {
    return this.gameRepository.upsertMany(games);
  }

  aggregateTeamRuns(seasonYear: number): Promise<TeamRunsAggregate[]> {
    return this.gameRepository.aggregateTeamRuns(seasonYear);
  }

  /**
   * 특정 팀의 최근 N경기 결과를 오래된 경기 → 최신 경기 순으로 반환한다.
   * 무승부/스코어 미확정 경기는 'D'로 처리한다.
   */
  async getRecentForm(
    teamCode: string,
    limit = 5,
  ): Promise<Array<'W' | 'L' | 'D'>> {
    const games = await this.gameRepository.findRecentFinished(teamCode, limit);
    return games
      .map((game): 'W' | 'L' | 'D' => {
        const isHome = game.homeTeamCode === teamCode;
        const teamScore = isHome ? game.homeScore : game.awayScore;
        const opponentScore = isHome ? game.awayScore : game.homeScore;
        if (teamScore === null || opponentScore === null) return 'D';
        if (teamScore > opponentScore) return 'W';
        if (teamScore < opponentScore) return 'L';
        return 'D';
      })
      .reverse();
  }
}
