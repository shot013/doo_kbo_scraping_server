import { Module } from '@nestjs/common';
import { ExampleController } from './application/example.controller';
import { ExampleService } from './application/example.service';
import { EXAMPLE_REPOSITORY } from './domain/repositories/example.repository';
import { ExampleRepositoryImpl } from './infrastructure/repositories/example.repository.impl';

@Module({
  controllers: [ExampleController],
  providers: [
    ExampleService,
    { provide: EXAMPLE_REPOSITORY, useClass: ExampleRepositoryImpl },
  ],
})
export class ExampleModule {}
