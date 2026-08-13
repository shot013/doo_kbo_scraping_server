import { Injectable, NotFoundException } from '@nestjs/common';
import { GameService } from '../../game/application/game.service';
import { PlayerService } from '../../players/application/player.service';
import { Standing } from '../../standings/domain/entities/standing.entity';
import { StandingService } from '../../standings/application/standing.service';

const TEAM_COUNT = 10;

export interface TeamSummaryResponse {
  code: string;
  name: string;
  rank: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: string;
  gamesBehind: string;
  recentForm: Array<'W' | 'L' | 'D'>;
}

export interface TeamRosterPlayerResponse {
  id: string;
  name: string;
  teamCode: string;
  teamName: string;
  position: string;
  backNumber: number;
  primaryStat: string;
}

export interface TeamDetailResponse {
  summary: TeamSummaryResponse;
  roster: TeamRosterPlayerResponse[];
}

@Injectable()
export class TeamsService {
  constructor(
    private readonly standingService: StandingService,
    private readonly gameService: GameService,
    private readonly playerService: PlayerService,
  ) {}

  async getTeams(seasonYear: number): Promise<TeamSummaryResponse[]> {
    const { data: standings } = await this.standingService.findBySeasonYear({
      seasonYear,
      limit: TEAM_COUNT,
      sortBy: 'rank',
    });
    return Promise.all(standings.map((standing) => this.toSummary(standing)));
  }

  async getTeamDetail(
    teamCode: string,
    seasonYear: number,
  ): Promise<TeamDetailResponse> {
    const { data: standings } = await this.standingService.findBySeasonYear({
      seasonYear,
      limit: TEAM_COUNT,
    });
    const standing = standings.find((row) => row.teamCode === teamCode);
    if (!standing) {
      throw new NotFoundException(
        `Standing not found for team ${teamCode} (season ${seasonYear})`,
      );
    }

    const roster = await this.playerService.findByTeamCode(teamCode);
    const [summary, primaryStats] = await Promise.all([
      this.toSummary(standing),
      this.playerService.attachPrimaryStats(roster, seasonYear),
    ]);

    return {
      summary,
      roster: roster.map((player) => ({
        id: String(player.id),
        name: player.name,
        teamCode: player.teamCode,
        teamName: player.teamName,
        position: player.position.toLowerCase(),
        backNumber: player.backNumber ?? 0,
        primaryStat: primaryStats.get(player.id) ?? '기록 없음',
      })),
    };
  }

  private async toSummary(standing: Standing): Promise<TeamSummaryResponse> {
    const recentForm = await this.gameService.getRecentForm(
      standing.teamCode,
      5,
    );
    return {
      code: standing.teamCode,
      name: standing.teamName,
      rank: standing.rank,
      wins: standing.wins,
      losses: standing.losses,
      draws: standing.draws,
      winRate: standing.winRate,
      gamesBehind: standing.gamesBehind ?? '0.0',
      recentForm,
    };
  }
}
