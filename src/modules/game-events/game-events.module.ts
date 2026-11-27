import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameEventService } from './application/game-event.service';
import { GAME_EVENT_REPOSITORY } from './domain/repositories/game-event.repository';
import { GameEventOrmEntity } from './infrastructure/orm/game-event.orm-entity';
import { GameEventRepositoryImpl } from './infrastructure/repositories/game-event.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([GameEventOrmEntity])],
  providers: [
    GameEventService,
    { provide: GAME_EVENT_REPOSITORY, useClass: GameEventRepositoryImpl },
  ],
  exports: [GameEventService],
})
export class GameEventsModule {}
