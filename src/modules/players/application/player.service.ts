import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { resolveKboTeamByCode } from '../../../common/kbo/kbo-team';
import {
  buildPaginatedResult,
  normalizePagination,
  PaginatedResult,
} from '../../../common/pagination/pagination';
import { GameStatService } from '../../game-stats/application/game-stat.service';
import {
  OpponentBattingSplit,
  OpponentPitchingSplit,
} from '../../game-stats/domain/repositories/game-stat.repository';
import { PlateAppearanceService } from '../../plate-appearances/application/plate-appearance.service';
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

export interface PlayerListFilter extends PlayerFilter {
  page?: number;
  limit?: number;
}

export interface PlayerWithPrimaryStat {
  player: Player;
  primaryStat: string;
}

export interface PlayerVsTeamStat {
  teamCode: string;
  teamName: string;
  games: number;
  avg: string; // 타자: 상대팀 타율, 투수: 상대팀 피안타율
}

export interface PlayerVsPitcherStat {
  pitcherId: number;
  pitcherName: string;
  pitcherTeamCode: string;
  atBats: number;
  hits: number;
  avg: string;
}

export interface PlayerVsBatterStat {
  batterId: number;
  batterName: string;
  batterTeamCode: string;
  atBats: number;
  strikeouts: number;
  strikeoutRate: string;
}

interface PrimaryStat {
  label: string;
  sortValue: number | null;
}

/** KBO 정규시즌 개막월(3월)부터 시작해 경과 개월 수를 센다. */
const SEASON_START_MONTH = 3;
/** 정규시즌 종료월(10월) 이후로는 표본이 더 늘지 않으므로 경과 개월 수를 여기서 고정한다. */
const SEASON_FULL_MONTHS = 8;
/**
 * 매치업(상대 투수/타자) 표본 최소 타수 기준.
 * 선발은 로테이션·이닝 특성상 불펜보다 특정 상대와 더 자주 마주치지만, 선발이 1~2이닝만
 * 던지고 조기 강판되는 경우도 있어 선발/불펜을 구분하지 않고 더 보수적인(낮은) 불펜 기준
 * 하나로 통일한다: 상대팀과의 경기 빈도·불펜 등판 확률을 러프하게 추정하면 월 0.5타수 정도
 * 쌓인다고 보고, 시즌 개막(3월) 이후 경과 개월 수에 비례해 기준을 올린다.
 * 자세한 산출 근거는 docs/MATCHUP_SAMPLE_THRESHOLD.md 참고.
 */
const MIN_AT_BATS_PER_MONTH = 0.5;

/**
 * seasonYear 시즌 개막 이후 경과 개월 수(최소 1, 정규시즌 종료 이후엔 SEASON_FULL_MONTHS로 고정)를
 * 기준으로 매치업 표본의 최소 타수를 계산한다. 시즌 시작 전에 조회하면 1개월 치(최소값)로 취급한다.
 */
export function computeMinAtBatsThreshold(
  seasonYear: number,
  referenceDate: Date = new Date(),
): number {
  const referenceYearMonth =
    referenceDate.getFullYear() * 12 + referenceDate.getMonth();
  const seasonStartYearMonth = seasonYear * 12 + (SEASON_START_MONTH - 1);
  const monthsElapsed = Math.min(
    Math.max(referenceYearMonth - seasonStartYearMonth + 1, 1),
    SEASON_FULL_MONTHS,
  );
  return Math.max(1, Math.ceil(monthsElapsed * MIN_AT_BATS_PER_MONTH));
}

@Injectable()
export class PlayerService {
  constructor(
    @Inject(PLAYER_REPOSITORY)
    private readonly playerRepository: PlayerRepository,
    private readonly seasonBattingStatService: SeasonBattingStatService,
    private readonly seasonPitchingStatService: SeasonPitchingStatService,
    private readonly gameStatService: GameStatService,
    private readonly plateAppearanceService: PlateAppearanceService,
  ) {}

  /**
   * 타자는 타율 내림차순, 투수는 평균자책 오름차순으로 정렬한다(기록 없는 선수는 각 그룹 맨 뒤).
   * position 필터가 없어 두 그룹이 섞이면 타자 그룹 다음에 투수 그룹을 이어 붙인다.
   * 정렬 기준이 season-stats(팀코드+이름 매칭)에서 오므로 필터에 해당하는 선수 전체를 먼저
   * 가져와 메모리에서 정렬한 뒤 페이지네이션한다.
   */
  async findAll(
    filter: PlayerListFilter,
    seasonYear: number,
  ): Promise<PaginatedResult<PlayerWithPrimaryStat>> {
    const players = await this.playerRepository.findAll(filter);
    const primaryStats = await this.buildPrimaryStats(players, seasonYear);

    const batters = players.filter(
      (player) => player.position !== PlayerPosition.PITCHER,
    );
    const pitchers = players.filter(
      (player) => player.position === PlayerPosition.PITCHER,
    );
    const sorted = [
      ...sortByPrimaryStat(batters, primaryStats, 'DESC'),
      ...sortByPrimaryStat(pitchers, primaryStats, 'ASC'),
    ];

    const { page, limit, skip } = normalizePagination(filter);
    const paged = sorted.slice(skip, skip + limit);

    return buildPaginatedResult(
      paged.map((player) => ({
        player,
        primaryStat: primaryStats.get(player.id)?.label ?? '기록 없음',
      })),
      sorted.length,
      page,
      limit,
    );
  }

  findByTeamCode(teamCode: string): Promise<Player[]> {
    return this.playerRepository.findByTeamCode(teamCode);
  }

  findAllPlayers(): Promise<Player[]> {
    return this.playerRepository.findAll();
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

  upsertMany(players: Player[]): Promise<void> {
    return this.playerRepository.upsertMany(players);
  }

  /**
   * 선수의 대표 기록 한 줄(타율/평균자책)을 KBO 공식 시즌 누적 집계(season-stats)에서 붙인다.
   * game-stats(경기별 박스스코어)는 최근 몇 경기치만 쌓여 있어 표본이 작을 땐 시즌 성적과
   * 크게 어긋나므로(예: 4경기치로 계산하면 방어율이 실제 시즌 방어율과 다르게 나옴)
   * season-stats를 대표 기록의 출처로 쓴다. 선수마다 개별 조회하지 않도록 시즌 전체
   * 타자/투수 집계를 한 번씩만 가져와 팀코드+이름으로 매칭한다.
   */
  async buildPrimaryStats(
    players: Player[],
    seasonYear: number,
  ): Promise<Map<number, PrimaryStat>> {
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

    const result = new Map<number, PrimaryStat>();
    for (const player of players) {
      const key = `${player.teamCode}|${player.name}`;
      if (player.position === PlayerPosition.PITCHER) {
        const stat = pitchingByKey.get(key);
        result.set(player.id, {
          label: stat?.era ? `평균자책 ${stat.era}` : '기록 없음',
          sortValue: stat?.era ? Number(stat.era) : null,
        });
      } else {
        const stat = battingByKey.get(key);
        result.set(player.id, {
          label: stat?.battingAverage
            ? `타율 ${stat.battingAverage}`
            : '기록 없음',
          sortValue: stat?.battingAverage ? Number(stat.battingAverage) : null,
        });
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

  /**
   * 상대팀별 타율(타자) / 피안타율(투수)을 game_stats + games 조인으로 집계한다.
   * game_stats.player_id로 직접 필터링하므로 다른 곳과 달리 teamCode+이름 매칭이 필요 없다.
   */
  async getVsTeamStats(
    player: Player,
    seasonYear: number,
  ): Promise<PlayerVsTeamStat[]> {
    if (player.position === PlayerPosition.PITCHER) {
      const splits = await this.gameStatService.findOpponentPitchingSplits(
        player.id,
        seasonYear,
      );
      return splits.map((split) =>
        toVsTeamStat(split, split.battingAverageAllowed),
      );
    }

    const splits = await this.gameStatService.findOpponentBattingSplits(
      player.id,
      seasonYear,
    );
    return splits.map((split) => toVsTeamStat(split, split.battingAverage));
  }

  /** 타자 전용: 상대 투수별 안타율. 투수에게 호출하면 빈 배열을 반환한다. */
  async getVsPitcherStats(
    player: Player,
    seasonYear: number,
  ): Promise<PlayerVsPitcherStat[]> {
    if (player.position === PlayerPosition.PITCHER) return [];
    const splits = await this.plateAppearanceService.findBatterVsPitcherSplits(
      player.id,
      seasonYear,
    );
    const minAtBats = computeMinAtBatsThreshold(seasonYear);
    return splits
      .filter((split) => split.atBats >= minAtBats)
      .map((split) => ({
        pitcherId: split.pitcherId,
        pitcherName: split.pitcherName,
        pitcherTeamCode: split.pitcherTeamCode,
        atBats: split.atBats,
        hits: split.hits,
        avg: split.battingAverage,
      }));
  }

  /** 투수 전용: 상대 타자별 삼진율. 타자에게 호출하면 빈 배열을 반환한다. */
  async getVsBatterStats(
    player: Player,
    seasonYear: number,
  ): Promise<PlayerVsBatterStat[]> {
    if (player.position !== PlayerPosition.PITCHER) return [];
    const splits = await this.plateAppearanceService.findPitcherVsBatterSplits(
      player.id,
      seasonYear,
    );
    const minAtBats = computeMinAtBatsThreshold(seasonYear);
    return splits
      .filter((split) => split.atBats >= minAtBats)
      .map((split) => ({
        batterId: split.batterId,
        batterName: split.batterName,
        batterTeamCode: split.batterTeamCode,
        atBats: split.atBats,
        strikeouts: split.strikeouts,
        strikeoutRate: split.strikeoutRate,
      }));
  }
}

function toVsTeamStat(
  split: OpponentBattingSplit | OpponentPitchingSplit,
  avg: string,
): PlayerVsTeamStat {
  return {
    teamCode: split.opponentTeamCode,
    teamName: resolveKboTeamByCode(split.opponentTeamCode).fullName,
    games: split.games,
    avg,
  };
}

function sortByPrimaryStat(
  players: Player[],
  stats: Map<number, PrimaryStat>,
  direction: 'ASC' | 'DESC',
): Player[] {
  return [...players].sort((a, b) => {
    const valueA = stats.get(a.id)?.sortValue ?? null;
    const valueB = stats.get(b.id)?.sortValue ?? null;
    if (valueA === null && valueB === null) return 0;
    if (valueA === null) return 1;
    if (valueB === null) return -1;
    return direction === 'ASC' ? valueA - valueB : valueB - valueA;
  });
}
