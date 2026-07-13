import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameController } from './application/game.controller';
import { GameService } from './application/game.service';
import { GAME_REPOSITORY } from './domain/repositories/game.repository';
import { GameOrmEntity } from './infrastructure/orm/game.orm-entity';
import { GameRepositoryImpl } from './infrastructure/repositories/game.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([GameOrmEntity])],
  controllers: [GameController],
  providers: [
    GameService,
    { provide: GAME_REPOSITORY, useClass: GameRepositoryImpl },
  ],
  exports: [GameService, GAME_REPOSITORY],
})
export class GameModule {}
