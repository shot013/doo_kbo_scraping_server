import { Injectable } from '@nestjs/common';
import { resolveKboTeamByCode } from '../../../common/kbo/kbo-team';
import { GameStatService } from '../../game-stats/application/game-stat.service';

export interface BatterRecordResponse {
  rank: number;
  playerName: string;
  teamCode: string;
  teamName: string;
  avg: string;
  games: number;
  homeRuns: number;
  rbi: number;
}

export interface PitcherRecordResponse {
  rank: number;
  playerName: string;
  teamCode: string;
  teamName: string;
  era: string;
  games: number;
  wins: number;
  losses: number;
  saves: number;
}

const DEFAULT_LEADERBOARD_LIMIT = 20;

@Injectable()
export class RecordsService {
  constructor(private readonly gameStatService: GameStatService) {}

  async getBatterLeaders(
    seasonYear: number,
    limit = DEFAULT_LEADERBOARD_LIMIT,
  ): Promise<BatterRecordResponse[]> {
    const rows = await this.gameStatService.aggregateBatting({
      seasonYear,
      limit,
    });
    return rows.map((row, index) => ({
      rank: index + 1,
      playerName: row.playerName,
      teamCode: row.teamCode,
      teamName: resolveKboTeamByCode(row.teamCode).fullName,
      avg: row.battingAverage,
      games: row.games,
      homeRuns: row.homeRuns,
      rbi: row.rbi,
    }));
  }

  async getPitcherLeaders(
    seasonYear: number,
    limit = DEFAULT_LEADERBOARD_LIMIT,
  ): Promise<PitcherRecordResponse[]> {
    const rows = await this.gameStatService.aggregatePitching({
      seasonYear,
      limit,
    });
    return rows.map((row, index) => ({
      rank: index + 1,
      playerName: row.playerName,
      teamCode: row.teamCode,
      teamName: resolveKboTeamByCode(row.teamCode).fullName,
      era: row.era,
      games: row.games,
      wins: row.wins,
      losses: row.losses,
      saves: row.saves,
    }));
  }
}
