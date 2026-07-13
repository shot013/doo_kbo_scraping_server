import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Example } from '../domain/entities/example.entity';
import {
  CreateExampleInput,
  EXAMPLE_REPOSITORY,
} from '../domain/repositories/example.repository';
import type { ExampleRepository } from '../domain/repositories/example.repository';

@Injectable()
export class ExampleService {
  constructor(
    @Inject(EXAMPLE_REPOSITORY)
    private readonly exampleRepository: ExampleRepository,
  ) {}

  findAll(): Promise<Example[]> {
    return this.exampleRepository.findAll();
  }

  async findById(id: number): Promise<Example> {
    const example = await this.exampleRepository.findById(id);
    if (!example) {
      throw new NotFoundException(`Example not found: ${id}`);
    }
    return example;
  }

  create(input: CreateExampleInput): Promise<Example> {
    return this.exampleRepository.create(input);
  }
}
