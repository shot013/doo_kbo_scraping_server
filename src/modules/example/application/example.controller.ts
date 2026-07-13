import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { Example } from '../domain/entities/example.entity';
import { CreateExampleDto } from './dto/create-example.dto';
import { ExampleService } from './example.service';

@Controller('examples')
export class ExampleController {
  constructor(private readonly exampleService: ExampleService) {}

  @Get()
  findAll(): Promise<Example[]> {
    return this.exampleService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Example> {
    return this.exampleService.findById(id);
  }

  @Post()
  create(@Body() body: CreateExampleDto): Promise<Example> {
    return this.exampleService.create({
      name: body.name,
      description: body.description ?? null,
    });
  }
}
