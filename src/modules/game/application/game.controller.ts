import { Controller, Get, Param, Query } from '@nestjs/common';
import { PaginatedResult } from '../../../common/pagination/pagination';
import { GamePreview } from '../../game-preview/domain/entities/game-preview.entity';
import { Game, GameStatus } from '../domain/entities/game.entity';
import { GameSortField } from '../domain/repositories/game.repository';
import { GameQueryDto } from './dto/game-query.dto';
import { GameService } from './game.service';

export interface GamePreviewTeamResponse {
  record: string | null;
  recentForm: string | null;
  era: string | null;
  battingAverage: string | null;
  avgRunsScored: string | null;
  avgRunsAllowed: string | null;
}

export interface GamePreviewPitcherResponse {
  style: string | null;
  seasonRecord: string | null;
  headToHeadRecord: string | null;
  era: string | null;
  war: string | null;
  games: string | null;
  avgInnings: string | null;
  qualityStarts: string | null;
  whip: string | null;
}

export interface GamePreviewResponse {
  away: { team: GamePreviewTeamResponse; pitcher: GamePreviewPitcherResponse };
  home: { team: GamePreviewTeamResponse; pitcher: GamePreviewPitcherResponse };
  scrapedAt: Date;
}

export interface GameResponse {
  id: string;
  seasonYear: number;
  gameDate: string;
  scheduledAt: Date;
  stadium: string | null;
  homeTeamCode: string;
  homeTeamName: string;
  awayTeamCode: string;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
  homeStarterPitcher: string | null;
  awayStarterPitcher: string | null;
  currentInning: string | null;
  status: GameStatus;
  sourceUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  preview: GamePreviewResponse | null;
}

@Controller('games')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get()
  async findAll(
    @Query() query: GameQueryDto,
  ): Promise<PaginatedResult<GameResponse>> {
    const result = await this.gameService.findAllWithPreview({
      seasonYear: query.seasonYear ? Number(query.seasonYear) : undefined,
      gameDate: query.gameDate,
      status: query.status,
      teamCode: query.teamCode,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      sortBy: query.sortBy as GameSortField | undefined,
      sortOrder: query.sortOrder === 'DESC' ? 'DESC' : undefined,
    });

    return {
      ...result,
      data: result.data.map(({ game, preview }) =>
        toGameResponse(game, preview),
      ),
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<GameResponse> {
    const { game, preview } = await this.gameService.findByIdWithPreview(id);
    return toGameResponse(game, preview);
  }
}

function toGameResponse(game: Game, preview: GamePreview | null): GameResponse {
  return {
    id: game.id,
    seasonYear: game.seasonYear,
    gameDate: game.gameDate,
    scheduledAt: game.scheduledAt,
    stadium: game.stadium,
    homeTeamCode: game.homeTeamCode,
    homeTeamName: game.homeTeamName,
    awayTeamCode: game.awayTeamCode,
    awayTeamName: game.awayTeamName,
    homeScore: game.homeScore,
    awayScore: game.awayScore,
    homeStarterPitcher: game.homeStarterPitcher,
    awayStarterPitcher: game.awayStarterPitcher,
    currentInning: game.currentInning,
    status: game.status,
    sourceUrl: game.sourceUrl,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
    preview: preview ? toGamePreviewResponse(preview) : null,
  };
}

function toGamePreviewResponse(preview: GamePreview): GamePreviewResponse {
  return {
    away: {
      team: {
        record: preview.awayTeamRecord,
        recentForm: preview.awayRecentForm,
        era: preview.awayTeamEra,
        battingAverage: preview.awayTeamBattingAverage,
        avgRunsScored: preview.awayTeamAvgRunsScored,
        avgRunsAllowed: preview.awayTeamAvgRunsAllowed,
      },
      pitcher: {
        style: preview.awayPitcherStyle,
        seasonRecord: preview.awayPitcherSeasonRecord,
        headToHeadRecord: preview.awayPitcherHeadToHeadRecord,
        era: preview.awayPitcherEra,
        war: preview.awayPitcherWar,
        games: preview.awayPitcherGames,
        avgInnings: preview.awayPitcherAvgInnings,
        qualityStarts: preview.awayPitcherQualityStarts,
        whip: preview.awayPitcherWhip,
      },
    },
    home: {
      team: {
        record: preview.homeTeamRecord,
        recentForm: preview.homeRecentForm,
        era: preview.homeTeamEra,
        battingAverage: preview.homeTeamBattingAverage,
        avgRunsScored: preview.homeTeamAvgRunsScored,
        avgRunsAllowed: preview.homeTeamAvgRunsAllowed,
      },
      pitcher: {
        style: preview.homePitcherStyle,
        seasonRecord: preview.homePitcherSeasonRecord,
        headToHeadRecord: preview.homePitcherHeadToHeadRecord,
        era: preview.homePitcherEra,
        war: preview.homePitcherWar,
        games: preview.homePitcherGames,
        avgInnings: preview.homePitcherAvgInnings,
        qualityStarts: preview.homePitcherQualityStarts,
        whip: preview.homePitcherWhip,
      },
    },
    scrapedAt: preview.scrapedAt,
  };
}
