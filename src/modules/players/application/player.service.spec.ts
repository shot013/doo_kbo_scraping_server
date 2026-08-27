import { computeMinAtBatsThreshold } from './player.service';

describe('computeMinAtBatsThreshold', () => {
  it('시즌 개막 첫 달에는 최소 기준(1타수)을 반환한다', () => {
    const result = computeMinAtBatsThreshold(2026, new Date(2026, 2, 15)); // 2026-03-15
    expect(result).toBe(1);
  });

  it('개막 전에 조회해도 최소 기준(1타수)을 반환한다', () => {
    const result = computeMinAtBatsThreshold(2026, new Date(2026, 0, 1)); // 2026-01-01
    expect(result).toBe(1);
  });

  it('시즌 중반(경과 6개월)에는 비례해 기준이 올라간다', () => {
    const result = computeMinAtBatsThreshold(2026, new Date(2026, 7, 20)); // 2026-08-20
    expect(result).toBe(3); // ceil(6 * 0.5)
  });

  it('정규시즌 종료 이후에는 최대 기준(8개월치)으로 고정된다', () => {
    const duringOffseason = computeMinAtBatsThreshold(
      2026,
      new Date(2026, 11, 1),
    ); // 2026-12-01
    const muchLater = computeMinAtBatsThreshold(2024, new Date(2026, 7, 20));
    expect(duringOffseason).toBe(4); // ceil(8 * 0.5)
    expect(muchLater).toBe(4);
  });
});
