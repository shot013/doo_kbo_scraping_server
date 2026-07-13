import { Injectable } from '@nestjs/common';
import { Example } from '../../domain/entities/example.entity';
import {
  CreateExampleInput,
  ExampleRepository,
} from '../../domain/repositories/example.repository';

@Injectable()
export class ExampleRepositoryImpl implements ExampleRepository {
  private readonly rows: Example[] = [
    new Example({
      id: 1,
      name: 'sample',
      description: '복사해서 새 모듈을 만들 때 참고하는 더미 데이터입니다.',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  ];
  private nextId = 2;

  findAll(): Promise<Example[]> {
    return Promise.resolve(this.rows);
  }

  findById(id: number): Promise<Example | null> {
    return Promise.resolve(this.rows.find((row) => row.id === id) ?? null);
  }

  create(input: CreateExampleInput): Promise<Example> {
    const now = new Date();
    const example = new Example({
      id: this.nextId++,
      name: input.name,
      description: input.description,
      createdAt: now,
      updatedAt: now,
    });
    this.rows.push(example);
    return Promise.resolve(example);
  }
}
