import { dedupeByStatKey } from './season-stats.scraper';

function row(teamCode: string, playerName: string, games: number, rank = 1) {
  return { teamCode, playerName, games, rank };
}

describe('dedupeByStatKey', () => {
  it('같은 팀·같은 이름은 경기 수가 많은 행 하나만 남기고 처음 나온 자리를 유지한다', () => {
    const onDuplicate = jest.fn();
    const result = dedupeByStatKey(
      [
        row('LG', '김윤식', 3, 1),
        row('LG', '임찬규', 20, 2),
        row('LG', '김윤식', 25, 3),
      ],
      onDuplicate,
    );

    expect(result).toEqual([
      row('LG', '김윤식', 25, 3),
      row('LG', '임찬규', 20, 2),
    ]);
    expect(onDuplicate).toHaveBeenCalledWith(
      row('LG', '김윤식', 25, 3),
      row('LG', '김윤식', 3, 1),
    );
  });

  it('경기 수가 같으면 먼저 나온 행을 남긴다', () => {
    const result = dedupeByStatKey([
      row('HT', '이승민', 5, 1),
      row('HT', '이승민', 5, 2),
    ]);

    expect(result).toEqual([row('HT', '이승민', 5, 1)]);
  });

  it('이름이 같아도 팀이 다르면 둘 다 남긴다', () => {
    const rows = [row('SS', '이승민', 30), row('HT', '이승민', 4)];

    expect(dedupeByStatKey(rows)).toEqual(rows);
  });
});
