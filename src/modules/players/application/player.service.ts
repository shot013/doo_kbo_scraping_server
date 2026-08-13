import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PaginatedResult } from '../../../common/pagination/pagination';
import { GameStatService } from '../../game-stats/application/game-stat.service';
import { Player, PlayerPosition } from '../domain/entities/player.entity';
import {
  PLAYER_REPOSITORY,
  PlayerFilter,
} from '../domain/repositories/player.repository';
import type { PlayerRepository } from '../domain/repositories/player.repository';

export interface PlayerStatLine {
  label: string;
  value: string;
}

@Injectable()
export class PlayerService {
  constructor(
    @Inject(PLAYER_REPOSITORY)
    private readonly playerRepository: PlayerRepository,
    private readonly gameStatService: GameStatService,
  ) {}

  findAll(filter: PlayerFilter = {}): Promise<PaginatedResult<Player>> {
    return this.playerRepository.findAll(filter);
  }

  findByTeamCode(teamCode: string): Promise<Player[]> {
    return this.playerRepository.findByTeamCode(teamCode);
  }

  async findById(id: number): Promise<Player> {
    const player = await this.playerRepository.findById(id);
    if (!player) {
      throw new NotFoundException(`Player not found: ${id}`);
    }
    return player;
  }

  upsert(player: Player): Promise<Player> {
    return this.playerRepository.upsert(player);
  }

  /**
   * 여러 선수의 대표 기록 한 줄(타율/평균자책)을 한 번의 시즌 집계 쿼리로 붙인다.
   * 선수마다 개별 집계 쿼리를 날리지 않기 위해 시즌 전체 타자/투수 집계를 한 번씩만 가져와 매칭한다.
   */
  async attachPrimaryStats(
    players: Player[],
    seasonYear: number,
  ): Promise<Map<number, string>> {
    const [battingRows, pitchingRows] = await Promise.all([
      this.gameStatService.aggregateBatting({ seasonYear }),
      this.gameStatService.aggregatePitching({ seasonYear }),
    ]);
    const battingByKey = new Map(
      battingRows.map((row) => [`${row.teamCode}|${row.playerName}`, row]),
    );
    const pitchingByKey = new Map(
      pitchingRows.map((row) => [`${row.teamCode}|${row.playerName}`, row]),
    );

    const result = new Map<number, string>();
    for (const player of players) {
      const key = `${player.teamCode}|${player.name}`;
      if (player.position === PlayerPosition.PITCHER) {
        const agg = pitchingByKey.get(key);
        result.set(player.id, agg ? `평균자책 ${agg.era}` : '기록 없음');
      } else {
        const agg = battingByKey.get(key);
        result.set(player.id, agg ? `타율 ${agg.battingAverage}` : '기록 없음');
      }
    }
    return result;
  }

  async getStatLines(
    player: Player,
    seasonYear: number,
  ): Promise<PlayerStatLine[]> {
    if (player.position === PlayerPosition.PITCHER) {
      const [agg] = await this.gameStatService.aggregatePitching({
        seasonYear,
        teamCode: player.teamCode,
        playerName: player.name,
      });
      if (!agg) return [];
      return [
        { label: '평균자책', value: agg.era },
        { label: '경기', value: String(agg.games) },
        { label: '승', value: String(agg.wins) },
        { label: '패', value: String(agg.losses) },
        { label: '세이브', value: String(agg.saves) },
        { label: '이닝', value: agg.inningsPitched },
        { label: '탈삼진', value: String(agg.strikeoutsPitched) },
      ];
    }

    const [agg] = await this.gameStatService.aggregateBatting({
      seasonYear,
      teamCode: player.teamCode,
      playerName: player.name,
    });
    if (!agg) return [];
    return [
      { label: '타율', value: agg.battingAverage },
      { label: '경기', value: String(agg.games) },
      { label: '타점', value: String(agg.rbi) },
      { label: '홈런', value: String(agg.homeRuns) },
    ];
  }
}
