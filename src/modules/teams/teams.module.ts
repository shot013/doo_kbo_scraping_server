import { Module } from '@nestjs/common';
import { GameModule } from '../game/game.module';
import { PlayersModule } from '../players/players.module';
import { StandingsModule } from '../standings/standings.module';
import { TeamsController } from './application/teams.controller';
import { TeamsService } from './application/teams.service';

@Module({
  imports: [StandingsModule, GameModule, PlayersModule],
  controllers: [TeamsController],
  providers: [TeamsService],
})
export class TeamsModule {}
