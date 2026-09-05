import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GamePreviewController } from './application/game-preview.controller';
import { GamePreviewService } from './application/game-preview.service';
import { GAME_PREVIEW_REPOSITORY } from './domain/repositories/game-preview.repository';
import { GamePreviewOrmEntity } from './infrastructure/orm/game-preview.orm-entity';
import { GamePreviewRepositoryImpl } from './infrastructure/repositories/game-preview.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([GamePreviewOrmEntity])],
  controllers: [GamePreviewController],
  providers: [
    GamePreviewService,
    { provide: GAME_PREVIEW_REPOSITORY, useClass: GamePreviewRepositoryImpl },
  ],
  exports: [GamePreviewService, GAME_PREVIEW_REPOSITORY],
})
export class GamePreviewModule {}
