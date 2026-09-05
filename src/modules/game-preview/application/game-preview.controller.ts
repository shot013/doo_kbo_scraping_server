import { Controller, Get, Param } from '@nestjs/common';
import { GamePreview } from '../domain/entities/game-preview.entity';
import { GamePreviewService } from './game-preview.service';

@Controller('game-previews')
export class GamePreviewController {
  constructor(private readonly gamePreviewService: GamePreviewService) {}

  @Get(':gameId')
  findOne(@Param('gameId') gameId: string): Promise<GamePreview> {
    return this.gamePreviewService.getByGameId(gameId);
  }
}
