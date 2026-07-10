import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const port: number = 3651;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(port);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
