import { Example } from '../entities/example.entity';

export const EXAMPLE_REPOSITORY = Symbol('EXAMPLE_REPOSITORY');

export interface CreateExampleInput {
  name: string;
  description: string | null;
}

export interface ExampleRepository {
  findAll(): Promise<Example[]>;
  findById(id: number): Promise<Example | null>;
  create(input: CreateExampleInput): Promise<Example>;
}
