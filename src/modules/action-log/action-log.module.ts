import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActionLogController } from './application/action-log.controller';
import { ActionLogService } from './application/action-log.service';
import { ACTION_LOG_REPOSITORY } from './domain/repositories/action-log.repository';
import { ActionLogOrmEntity } from './infrastructure/orm/action-log.orm-entity';
import { ActionLogRepositoryImpl } from './infrastructure/repositories/action-log.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([ActionLogOrmEntity])],
  controllers: [ActionLogController],
  providers: [
    ActionLogService,
    { provide: ACTION_LOG_REPOSITORY, useClass: ActionLogRepositoryImpl },
  ],
  exports: [ActionLogService, ACTION_LOG_REPOSITORY],
})
export class ActionLogModule {}
