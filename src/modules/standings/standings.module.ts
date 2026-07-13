import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StandingController } from './application/standing.controller';
import { StandingService } from './application/standing.service';
import { STANDING_REPOSITORY } from './domain/repositories/standing.repository';
import { StandingOrmEntity } from './infrastructure/orm/standing.orm-entity';
import { StandingRepositoryImpl } from './infrastructure/repositories/standing.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([StandingOrmEntity])],
  controllers: [StandingController],
  providers: [
    StandingService,
    { provide: STANDING_REPOSITORY, useClass: StandingRepositoryImpl },
  ],
  exports: [StandingService, STANDING_REPOSITORY],
})
export class StandingsModule {}
