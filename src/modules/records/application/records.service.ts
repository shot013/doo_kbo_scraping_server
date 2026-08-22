import { Injectable } from '@nestjs/common';
import { resolveKboTeamByCode } from '../../../common/kbo/kbo-team';
import { PlayerService } from '../../players/application/player.service';
import { SeasonBattingStatService } from '../../season-stats/application/season-batting-stat.service';
import { SeasonPitchingStatService } from '../../season-stats/application/season-pitching-stat.service';

export interface BatterRecordResponse {
  rank: number;
  playerId: number | null;
  playerName: string;
  teamCode: string;
  teamName: string;
  avg: string | null;
  games: number;
  homeRuns: number;
  rbi: number;
}

export interface PitcherRecordResponse {
  rank: number;
  playerId: number | null;
  playerName: string;
  teamCode: string;
  teamName: string;
  era: string | null;
  games: number;
  wins: number;
  losses: number;
  saves: number;
}

const DEFAULT_LEADERBOARD_LIMIT = 20;

@Injectable()
export class RecordsService {
  constructor(
    private readonly seasonBattingStatService: SeasonBattingStatService,
    private readonly seasonPitchingStatService: SeasonPitchingStatService,
    private readonly playerService: PlayerService,
  ) {}

  async getBatterLeaders(
    seasonYear: number,
    limit = DEFAULT_LEADERBOARD_LIMIT,
  ): Promise<BatterRecordResponse[]> {
    const [rows, playerIdByKey] = await Promise.all([
      this.seasonBattingStatService.findBySeasonYear({
        seasonYear,
        limit,
        qualifiedOnly: true,
      }),
      this.buildPlayerIdByKey(),
    ]);
    return rows.map((row, index) => ({
      rank: index + 1,
      playerId:
        playerIdByKey.get(playerKey(row.teamCode, row.playerName)) ?? null,
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
    const [rows, playerIdByKey] = await Promise.all([
      this.seasonPitchingStatService.findBySeasonYear({
        seasonYear,
        limit,
        qualifiedOnly: true,
      }),
      this.buildPlayerIdByKey(),
    ]);
    return rows.map((row, index) => ({
      rank: index + 1,
      playerId:
        playerIdByKey.get(playerKey(row.teamCode, row.playerName)) ?? null,
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

  private async buildPlayerIdByKey(): Promise<Map<string, number>> {
    const players = await this.playerService.findAllPlayers();
    return new Map(
      players.map((player) => [
        playerKey(player.teamCode, player.name),
        player.id,
      ]),
    );
  }
}

function playerKey(teamCode: string, playerName: string): string {
  return `${teamCode}|${playerName}`;
}
