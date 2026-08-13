import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  TeamDetailResponse,
  TeamsService,
  TeamSummaryResponse,
} from './teams.service';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  async findAll(
    @Query('seasonYear') seasonYearRaw?: string,
  ): Promise<{ data: TeamSummaryResponse[] }> {
    const data = await this.teamsService.getTeams(
      resolveSeasonYear(seasonYearRaw),
    );
    return { data };
  }

  @Get(':code')
  findOne(
    @Param('code') code: string,
    @Query('seasonYear') seasonYearRaw?: string,
  ): Promise<TeamDetailResponse> {
    return this.teamsService.getTeamDetail(
      code.toUpperCase(),
      resolveSeasonYear(seasonYearRaw),
    );
  }
}

function resolveSeasonYear(seasonYearRaw?: string): number {
  return seasonYearRaw ? Number(seasonYearRaw) : new Date().getFullYear();
}
