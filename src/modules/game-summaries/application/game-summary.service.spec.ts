import { NotFoundException } from '@nestjs/common';
import { GameService } from '../../game/application/game.service';
import {
  Game,
  GameSeries,
  GameStatus,
} from '../../game/domain/entities/game.entity';
import { GameEventService } from '../../game-events/application/game-event.service';
import { GameEvent } from '../../game-events/domain/entities/game-event.entity';
import { GameLineScoreService } from '../../game-line-scores/application/game-line-score.service';
import { GameLineScore } from '../../game-line-scores/domain/entities/game-line-score.entity';
import { GameStatService } from '../../game-stats/application/game-stat.service';
import { GameStat } from '../../game-stats/domain/entities/game-stat.entity';
import {
  AWAY,
  GAME_ID,
  HOME,
  buildEvents,
  buildLineScores,
  buildStats,
} from './builders/__fixtures__/lg-ob-20261126';
import { GameSummaryService } from './game-summary.service';

function makeGame(): Game {
  const now = new Date('2026-11-26T09:30:00Z');
  return new Game({
    id: GAME_ID,
    seasonYear: 2026,
    gameDate: '2026-11-26',
    scheduledAt: now,
    stadium: '잠실',
    homeTeamCode: HOME,
    homeTeamName: 'LG 트윈스',
    awayTeamCode: AWAY,
    awayTeamName: '두산 베어스',
    homeScore: 5,
    awayScore: 3,
    homeStarterPitcher: null,
    awayStarterPitcher: null,
    currentInning: null,
    status: GameStatus.FINISHED,
    series: GameSeries.REGULAR,
    seriesGameNumber: null,
    sourceUrl: null,
    createdAt: now,
    updatedAt: now,
  });
}

describe('GameSummaryService.getSummary', () => {
  let findById: jest.Mock<Promise<Game>, [string]>;
  let findLineScores: jest.Mock<Promise<GameLineScore[]>, [string]>;
  let findEvents: jest.Mock<Promise<GameEvent[]>, [string]>;
  let findStats: jest.Mock<Promise<GameStat[]>, [string[]]>;
  let service: GameSummaryService;

  beforeEach(() => {
    findById = jest.fn<Promise<Game>, [string]>().mockResolvedValue(makeGame());
    findLineScores = jest
      .fn<Promise<GameLineScore[]>, [string]>()
      .mockResolvedValue(buildLineScores());
    findEvents = jest
      .fn<Promise<GameEvent[]>, [string]>()
      .mockResolvedValue(buildEvents());
    findStats = jest
      .fn<Promise<GameStat[]>, [string[]]>()
      .mockResolvedValue(buildStats());
    service = new GameSummaryService(
      { findById } as unknown as GameService,
      { findByGameId: findLineScores } as unknown as GameLineScoreService,
      { findByGameId: findEvents } as unknown as GameEventService,
      { findByGameIds: findStats } as unknown as GameStatService,
    );
  });

  it('점수표·득점 장면·투수 교체·대타를 한 응답으로 묶는다', async () => {
    const summary = await service.getSummary(GAME_ID);

    expect(summary.gameId).toBe(GAME_ID);
    expect(summary.homeTeamCode).toBe(HOME);
    expect(summary.awayTeamCode).toBe(AWAY);
    expect(summary.lineScore.away.runs).toBe(3);
    expect(summary.lineScore.home.runs).toBe(5);
    expect(summary.scoringPlays).toHaveLength(5);
    expect(summary.pitching.away.map((pitcher) => pitcher.playerName)).toEqual([
      '정두산',
      '이불펜',
      '홍좌완',
    ]);
    expect(summary.pinchHitters.summary.home.rbi).toBe(1);
    expect(findStats).toHaveBeenCalledWith([GAME_ID]);
  });

  it('점수표가 없으면 404를 던지고 나머지 원본은 읽지 않는다', async () => {
    findLineScores.mockResolvedValue([]);

    await expect(service.getSummary(GAME_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(findEvents).not.toHaveBeenCalled();
    expect(findStats).not.toHaveBeenCalled();
  });

  it('경기가 없으면 GameService의 404를 그대로 전달한다', async () => {
    findById.mockRejectedValue(new NotFoundException('Game not found: x'));

    await expect(service.getSummary('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(findLineScores).not.toHaveBeenCalled();
  });

  it('문자중계가 아직 없어도 점수표가 있으면 빈 목록으로 응답한다', async () => {
    findEvents.mockResolvedValue([]);
    findStats.mockResolvedValue(buildStats(true));

    const summary = await service.getSummary(GAME_ID);

    expect(summary.scoringPlays).toEqual([]);
    expect(summary.pinchHitters.appearances).toEqual([]);
    expect(summary.pitching.home.map((pitcher) => pitcher.playerName)).toEqual([
      '남선발',
      '김직관',
    ]);
  });
});
