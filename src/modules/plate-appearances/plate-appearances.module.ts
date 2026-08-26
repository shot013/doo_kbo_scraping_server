import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlateAppearanceService } from './application/plate-appearance.service';
import { PLATE_APPEARANCE_REPOSITORY } from './domain/repositories/plate-appearance.repository';
import { PlateAppearanceOrmEntity } from './infrastructure/orm/plate-appearance.orm-entity';
import { PlateAppearanceRepositoryImpl } from './infrastructure/repositories/plate-appearance.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([PlateAppearanceOrmEntity])],
  providers: [
    PlateAppearanceService,
    {
      provide: PLATE_APPEARANCE_REPOSITORY,
      useClass: PlateAppearanceRepositoryImpl,
    },
  ],
  exports: [PlateAppearanceService, PLATE_APPEARANCE_REPOSITORY],
})
export class PlateAppearancesModule {}
