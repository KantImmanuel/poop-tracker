import { isReadyForInsights } from './insightReadiness';

describe('isReadyForInsights', () => {
  // ── Primary path: meals >= 3 AND poops >= 2 ──

  test('ready when meals >= 3 and poops >= 2', () => {
    expect(isReadyForInsights({ mealsCount: 3, poopsCount: 2, daysCovered: 1 })).toBe(true);
  });

  test('ready when meals and poops well above threshold', () => {
    expect(isReadyForInsights({ mealsCount: 10, poopsCount: 5, daysCovered: 0 })).toBe(true);
  });

  // ── Alternative path: days >= 2 AND meals >= 2 AND poops >= 1 ──

  test('ready when days >= 2, meals >= 2, and poops >= 1', () => {
    expect(isReadyForInsights({ mealsCount: 2, poopsCount: 1, daysCovered: 2 })).toBe(true);
  });

  test('ready via alternative path with higher day count', () => {
    expect(isReadyForInsights({ mealsCount: 2, poopsCount: 1, daysCovered: 7 })).toBe(true);
  });

  // ── Not ready: zero logs ──

  test('not ready with zero logs', () => {
    expect(isReadyForInsights({ mealsCount: 0, poopsCount: 0, daysCovered: 0 })).toBe(false);
  });

  // ── Not ready: meals only ──

  test('not ready with meals only (no poops)', () => {
    expect(isReadyForInsights({ mealsCount: 5, poopsCount: 0, daysCovered: 3 })).toBe(false);
  });

  test('not ready with many meals but zero poops and days', () => {
    expect(isReadyForInsights({ mealsCount: 10, poopsCount: 0, daysCovered: 0 })).toBe(false);
  });

  // ── Not ready: poops only ──

  test('not ready with poops only (no meals)', () => {
    expect(isReadyForInsights({ mealsCount: 0, poopsCount: 5, daysCovered: 3 })).toBe(false);
  });

  // ── Not ready: just below thresholds ──

  test('not ready with meals=2, poops=2, days=1 (neither path satisfied)', () => {
    expect(isReadyForInsights({ mealsCount: 2, poopsCount: 2, daysCovered: 1 })).toBe(false);
  });

  test('not ready with meals=1, poops=1, days=2 (alt path needs meals>=2)', () => {
    expect(isReadyForInsights({ mealsCount: 1, poopsCount: 1, daysCovered: 2 })).toBe(false);
  });

  test('not ready with meals=2, poops=0, days=2 (alt path needs poops>=1)', () => {
    expect(isReadyForInsights({ mealsCount: 2, poopsCount: 0, daysCovered: 2 })).toBe(false);
  });

  // ── Edge: missing/undefined values default to 0 ──

  test('handles empty object', () => {
    expect(isReadyForInsights({})).toBe(false);
  });

  test('handles partial object (mealsCount only)', () => {
    expect(isReadyForInsights({ mealsCount: 3 })).toBe(false);
  });

  test('handles no arguments', () => {
    expect(isReadyForInsights()).toBe(false);
  });
});
