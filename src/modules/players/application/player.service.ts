import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PaginatedResult } from '../../../common/pagination/pagination';
import { SeasonBattingStatService } from '../../season-stats/application/season-batting-stat.service';
import { SeasonPitchingStatService } from '../../season-stats/application/season-pitching-stat.service';
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
    private readonly seasonBattingStatService: SeasonBattingStatService,
    private readonly seasonPitchingStatService: SeasonPitchingStatService,
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
   * 여러 선수의 대표 기록 한 줄(타율/평균자책)을 KBO 공식 시즌 누적 집계(season-stats)에서 붙인다.
   * game-stats(경기별 박스스코어)는 최근 몇 경기치만 쌓여 있어 표본이 작을 땐 시즌 성적과
   * 크게 어긋나므로(예: 4경기치로 계산하면 방어율이 실제 시즌 방어율과 다르게 나옴)
   * season-stats를 대표 기록의 출처로 쓴다. 선수마다 개별 조회하지 않도록 시즌 전체
   * 타자/투수 집계를 한 번씩만 가져와 팀코드+이름으로 매칭한다.
   */
  async attachPrimaryStats(
    players: Player[],
    seasonYear: number,
  ): Promise<Map<number, string>> {
    const [battingRows, pitchingRows] = await Promise.all([
      this.seasonBattingStatService.findBySeasonYear({ seasonYear }),
      this.seasonPitchingStatService.findBySeasonYear({ seasonYear }),
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
        const stat = pitchingByKey.get(key);
        result.set(player.id, stat?.era ? `평균자책 ${stat.era}` : '기록 없음');
      } else {
        const stat = battingByKey.get(key);
        result.set(
          player.id,
          stat?.battingAverage ? `타율 ${stat.battingAverage}` : '기록 없음',
        );
      }
    }
    return result;
  }

  async getStatLines(
    player: Player,
    seasonYear: number,
  ): Promise<PlayerStatLine[]> {
    if (player.position === PlayerPosition.PITCHER) {
      const rows = await this.seasonPitchingStatService.findBySeasonYear({
        seasonYear,
      });
      const stat = rows.find(
        (row) =>
          row.teamCode === player.teamCode && row.playerName === player.name,
      );
      if (!stat) return [];
      return [
        { label: '평균자책', value: stat.era ?? '-' },
        { label: '경기', value: String(stat.games) },
        { label: '승', value: String(stat.wins) },
        { label: '패', value: String(stat.losses) },
        { label: '세이브', value: String(stat.saves) },
        { label: '이닝', value: stat.inningsPitched },
        { label: '탈삼진', value: String(stat.strikeoutsPitched) },
      ];
    }

    const rows = await this.seasonBattingStatService.findBySeasonYear({
      seasonYear,
    });
    const stat = rows.find(
      (row) =>
        row.teamCode === player.teamCode && row.playerName === player.name,
    );
    if (!stat) return [];
    return [
      { label: '타율', value: stat.battingAverage ?? '-' },
      { label: '경기', value: String(stat.games) },
      { label: '타점', value: String(stat.rbi) },
      { label: '홈런', value: String(stat.homeRuns) },
    ];
  }
}
