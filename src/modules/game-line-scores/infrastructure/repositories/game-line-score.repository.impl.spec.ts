import { Repository } from 'typeorm';
import { GameLineScore } from '../../domain/entities/game-line-score.entity';
import { GameLineScoreOrmEntity } from '../orm/game-line-score.orm-entity';
import { GameLineScoreRepositoryImpl } from './game-line-score.repository.impl';

function buildLineScore(overrides: Partial<GameLineScore> = {}): GameLineScore {
  const now = new Date('2026-11-26T13:00:00Z');
  return new GameLineScore({
    id: 0,
    gameId: '20261126OBLG0',
    teamCode: 'LG',
    isHome: true,
    innings: [1, 0, 0, 0, 0, 3, 0, 1, null],
    runs: 5,
    hits: 10,
    errors: 0,
    walks: 4,
    scrapedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

describe('GameLineScoreRepositoryImpl', () => {
  let ormRepository: { find: jest.Mock; upsert: jest.Mock };
  let repository: GameLineScoreRepositoryImpl;

  beforeEach(() => {
    ormRepository = {
      find: jest.fn(),
      upsert: jest.fn().mockResolvedValue(undefined),
    };
    repository = new GameLineScoreRepositoryImpl(
      ormRepository as unknown as Repository<GameLineScoreOrmEntity>,
    );
  });

  it('경기 id와 팀 코드 기준으로 upsert하고 새 행의 id는 비운다', async () => {
    await repository.upsertMany([
      buildLineScore(),
      buildLineScore({ teamCode: 'OB', isHome: false }),
    ]);

    const [rows, options] = ormRepository.upsert.mock.calls[0] as [
      GameLineScoreOrmEntity[],
      { conflictPaths: string[] },
    ];
    expect(options.conflictPaths).toEqual(['gameId', 'teamCode']);
    expect(rows.map((row) => row.teamCode)).toEqual(['LG', 'OB']);
    expect(rows.every((row) => !('id' in row))).toBe(true);
    expect(rows[0].innings).toEqual([1, 0, 0, 0, 0, 3, 0, 1, null]);
  });

  it('빈 목록이면 저장하지 않는다', async () => {
    await repository.upsertMany([]);

    expect(ormRepository.upsert).not.toHaveBeenCalled();
  });

  it('원정 → 홈 순서로 조회한다', async () => {
    ormRepository.find.mockResolvedValue([]);

    await repository.findByGameId('20261126OBLG0');

    expect(ormRepository.find).toHaveBeenCalledWith({
      where: { gameId: '20261126OBLG0' },
      order: { isHome: 'ASC' },
    });
  });
});
