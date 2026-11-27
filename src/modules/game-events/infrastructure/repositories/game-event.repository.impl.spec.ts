import { EntityManager, Repository } from 'typeorm';
import {
  GameEvent,
  GameEventType,
} from '../../domain/entities/game-event.entity';
import { GameEventOrmEntity } from '../orm/game-event.orm-entity';
import { GameEventRepositoryImpl } from './game-event.repository.impl';

function buildEvent(overrides: Partial<GameEvent> = {}): GameEvent {
  return new GameEvent({
    id: 0,
    gameId: '20261126OBLG0',
    seasonYear: 2026,
    sequenceNo: 1,
    subSequenceNo: 0,
    inning: 1,
    isTopInning: true,
    type: GameEventType.PLATE_APPEARANCE,
    text: '최유격 : 유격수 땅볼 아웃',
    battingTeamCode: 'OB',
    outs: 1,
    runnerOnFirst: false,
    runnerOnSecond: false,
    runnerOnThird: false,
    homeScore: 0,
    awayScore: 0,
    batterId: 1,
    pitcherId: 2,
    inPlayerId: null,
    inPlayerName: null,
    outPlayerId: null,
    outPlayerName: null,
    createdAt: new Date('2026-11-26T12:00:00Z'),
    ...overrides,
  });
}

describe('GameEventRepositoryImpl', () => {
  let manager: { delete: jest.Mock; insert: jest.Mock };
  let ormRepository: { find: jest.Mock; manager: { transaction: jest.Mock } };
  let repository: GameEventRepositoryImpl;

  beforeEach(() => {
    manager = {
      delete: jest.fn().mockResolvedValue(undefined),
      insert: jest.fn().mockResolvedValue(undefined),
    };
    ormRepository = {
      find: jest.fn(),
      manager: {
        transaction: jest.fn(
          (work: (manager: EntityManager) => Promise<void>) =>
            work(manager as unknown as EntityManager),
        ),
      },
    };
    repository = new GameEventRepositoryImpl(
      ormRepository as unknown as Repository<GameEventOrmEntity>,
    );
  });

  it('경기 이벤트를 지운 뒤 새 이벤트를 한 트랜잭션에서 넣는다', async () => {
    await repository.replaceByGameId('20261126OBLG0', [
      buildEvent({ id: 7, sequenceNo: 1 }),
      buildEvent({ sequenceNo: 2 }),
    ]);

    expect(ormRepository.manager.transaction).toHaveBeenCalledTimes(1);
    expect(manager.delete).toHaveBeenCalledWith(GameEventOrmEntity, {
      gameId: '20261126OBLG0',
    });
    const [, inserted] = manager.insert.mock.calls[0] as [
      unknown,
      GameEventOrmEntity[],
    ];
    expect(inserted.map((row) => row.sequenceNo)).toEqual([1, 2]);
    expect(inserted.every((row) => !('id' in row))).toBe(true);
    expect(manager.delete.mock.invocationCallOrder[0]).toBeLessThan(
      manager.insert.mock.invocationCallOrder[0],
    );
  });

  it('다른 경기 id가 섞여 와도 대상 경기 id로 저장한다', async () => {
    await repository.replaceByGameId('20261126OBLG0', [
      buildEvent({ gameId: '20261126HTSS0' }),
    ]);

    const [, inserted] = manager.insert.mock.calls[0] as [
      unknown,
      GameEventOrmEntity[],
    ];
    expect(inserted[0].gameId).toBe('20261126OBLG0');
  });

  it('빈 목록이면 기존 이벤트만 지운다', async () => {
    await repository.replaceByGameId('20261126OBLG0', []);

    expect(manager.delete).toHaveBeenCalledTimes(1);
    expect(manager.insert).not.toHaveBeenCalled();
  });

  it('relay 순서(항목 번호, 항목 안 순서)로 조회한다', async () => {
    ormRepository.find.mockResolvedValue([]);

    await repository.findByGameId('20261126OBLG0');

    expect(ormRepository.find).toHaveBeenCalledWith({
      where: { gameId: '20261126OBLG0' },
      order: { sequenceNo: 'ASC', subSequenceNo: 'ASC' },
    });
  });
});
