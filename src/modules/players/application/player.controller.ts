import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { PaginatedResult } from '../../../common/pagination/pagination';
import { Player, PlayerPosition } from '../domain/entities/player.entity';
import { PlayerQueryDto } from './dto/player-query.dto';
import {
  PlayerService,
  PlayerStatLine,
  PlayerVsTeamStat,
} from './player.service';

// KBO 선수 id는 숫자지만, 이 API를 쓰는 클라이언트(doo_kbo_app)의 선수 id 타입이
// 문자열(팀 로스터/선수 목록 어디서든 동일 id로 라우팅)이라 문자열로 직렬화한다.
export interface PlayerSummaryResponse {
  id: string;
  name: string;
  teamCode: string;
  teamName: string;
  position: string;
  backNumber: number;
  primaryStat: string;
}

export interface PlayerDetailResponse {
  id: string;
  name: string;
  teamCode: string;
  teamName: string;
  position: string;
  backNumber: number;
  statLines: PlayerStatLine[];
  vsTeamStats: PlayerVsTeamStat[];
}

@Controller('players')
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  @Get()
  async findAll(
    @Query() query: PlayerQueryDto,
  ): Promise<PaginatedResult<PlayerSummaryResponse>> {
    const seasonYear = query.seasonYear
      ? Number(query.seasonYear)
      : new Date().getFullYear();
    const result = await this.playerService.findAll(
      {
        teamCode: query.teamCode,
        position: query.position
          ? (query.position.toUpperCase() as PlayerPosition)
          : undefined,
        search: query.search,
        page: query.page ? Number(query.page) : undefined,
        limit: query.limit ? Number(query.limit) : undefined,
      },
      seasonYear,
    );

    return {
      ...result,
      data: result.data.map(({ player, primaryStat }) =>
        toSummaryResponse(player, primaryStat),
      ),
    };
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('seasonYear') seasonYearRaw?: string,
  ): Promise<PlayerDetailResponse> {
    const seasonYear = seasonYearRaw
      ? Number(seasonYearRaw)
      : new Date().getFullYear();
    const player = await this.playerService.findById(id);
    const [statLines, vsTeamStats] = await Promise.all([
      this.playerService.getStatLines(player, seasonYear),
      this.playerService.getVsTeamStats(player, seasonYear),
    ]);

    return {
      id: String(player.id),
      name: player.name,
      teamCode: player.teamCode,
      teamName: player.teamName,
      position: player.position.toLowerCase(),
      backNumber: player.backNumber ?? 0,
      statLines,
      vsTeamStats,
    };
  }
}

function toSummaryResponse(
  player: Player,
  primaryStat: string,
): PlayerSummaryResponse {
  return {
    id: String(player.id),
    name: player.name,
    teamCode: player.teamCode,
    teamName: player.teamName,
    position: player.position.toLowerCase(),
    backNumber: player.backNumber ?? 0,
    primaryStat,
  };
}
