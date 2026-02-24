/**
 * gamification.js のユニットテスト
 */

import {
  calculateLevel,
  calculateLevelProgress,
  calculateXpToNextLevel,
  sortBadgesByDate,
  getStreakMessage,
  calculateCompletionRate,
  getMaxValue,
} from '../gamification.js';

describe('gamification', () => {
  describe('calculateLevel', () => {
    test('0 XP should be level 1', () => {
      expect(calculateLevel(0)).toBe(1);
    });

    test('50 XP should be level 1', () => {
      expect(calculateLevel(50)).toBe(1);
    });

    test('100 XP should be level 2', () => {
      expect(calculateLevel(100)).toBe(2);
    });

    test('250 XP should be level 3', () => {
      expect(calculateLevel(250)).toBe(3);
    });

    test('custom XP per level', () => {
      expect(calculateLevel(200, 50)).toBe(5);
    });
  });

  describe('calculateLevelProgress', () => {
    test('0 XP should be 0% progress', () => {
      expect(calculateLevelProgress(0)).toBe(0);
    });

    test('50 XP should be 50% progress', () => {
      expect(calculateLevelProgress(50)).toBe(0.5);
    });

    test('100 XP should be 0% progress (new level)', () => {
      expect(calculateLevelProgress(100)).toBe(0);
    });

    test('150 XP should be 50% progress', () => {
      expect(calculateLevelProgress(150)).toBe(0.5);
    });

    test('custom XP per level', () => {
      expect(calculateLevelProgress(75, 50)).toBe(0.5);
    });
  });

  describe('calculateXpToNextLevel', () => {
    test('0 XP needs 100 XP to next level', () => {
      expect(calculateXpToNextLevel(0)).toBe(100);
    });

    test('50 XP needs 50 XP to next level', () => {
      expect(calculateXpToNextLevel(50)).toBe(50);
    });

    test('100 XP needs 100 XP to next level', () => {
      expect(calculateXpToNextLevel(100)).toBe(100);
    });

    test('175 XP needs 25 XP to next level', () => {
      expect(calculateXpToNextLevel(175)).toBe(25);
    });

    test('custom XP per level', () => {
      expect(calculateXpToNextLevel(120, 50)).toBe(30);
    });
  });

  describe('sortBadgesByDate', () => {
    test('sorts badges by earned_at in descending order', () => {
      const badges = [
        { id: 'b1', earned_at: '2026-02-20T10:00:00' },
        { id: 'b2', earned_at: '2026-02-22T10:00:00' },
        { id: 'b3', earned_at: '2026-02-21T10:00:00' },
      ];

      const sorted = sortBadgesByDate(badges);

      expect(sorted[0].id).toBe('b2');
      expect(sorted[1].id).toBe('b3');
      expect(sorted[2].id).toBe('b1');
    });

    test('handles badges without earned_at', () => {
      const badges = [
        { id: 'b1', earned_at: '2026-02-20T10:00:00' },
        { id: 'b2', earned_at: null },
        { id: 'b3', earned_at: '2026-02-21T10:00:00' },
      ];

      const sorted = sortBadgesByDate(badges);

      expect(sorted[0].id).toBe('b3');
      expect(sorted[1].id).toBe('b1');
      expect(sorted[2].id).toBe('b2');
    });

    test('does not mutate original array', () => {
      const badges = [
        { id: 'b1', earned_at: '2026-02-20T10:00:00' },
        { id: 'b2', earned_at: '2026-02-22T10:00:00' },
      ];

      sortBadgesByDate(badges);

      expect(badges[0].id).toBe('b1');
      expect(badges[1].id).toBe('b2');
    });
  });

  describe('getStreakMessage', () => {
    test('returns message for 0 streak', () => {
      const message = getStreakMessage(0, 0);
      expect(message).toContain('セッションを完了してストリークを開始しよう');
    });

    test('returns message for current streak matching longest', () => {
      const message = getStreakMessage(5, 5);
      expect(message).toContain('5日連続');
      expect(message).toContain('新記録更新中');
    });

    test('returns message for current streak less than longest', () => {
      const message = getStreakMessage(3, 7);
      expect(message).toContain('3日連続');
      expect(message).toContain('最長記録: 7日');
    });
  });

  describe('calculateCompletionRate', () => {
    test('returns 0 when target is 0', () => {
      expect(calculateCompletionRate(5, 0)).toBe(0);
    });

    test('calculates correct percentage', () => {
      expect(calculateCompletionRate(5, 10)).toBe(50);
    });

    test('caps at 100%', () => {
      expect(calculateCompletionRate(15, 10)).toBe(100);
    });

    test('returns 0 when no sessions completed', () => {
      expect(calculateCompletionRate(0, 10)).toBe(0);
    });
  });

  describe('getMaxValue', () => {
    test('returns 0 for empty array', () => {
      expect(getMaxValue([], 'sessions')).toBe(0);
    });

    test('returns 0 for null input', () => {
      expect(getMaxValue(null, 'sessions')).toBe(0);
    });

    test('finds maximum sessions value', () => {
      const data = [
        { sessions: 3, minutes: 75 },
        { sessions: 7, minutes: 175 },
        { sessions: 2, minutes: 50 },
      ];
      expect(getMaxValue(data, 'sessions')).toBe(7);
    });

    test('finds maximum minutes value', () => {
      const data = [
        { sessions: 3, minutes: 75 },
        { sessions: 7, minutes: 175 },
        { sessions: 2, minutes: 50 },
      ];
      expect(getMaxValue(data, 'minutes')).toBe(175);
    });

    test('handles missing key values', () => {
      const data = [
        { sessions: 3 },
        { sessions: 5, minutes: 100 },
      ];
      expect(getMaxValue(data, 'minutes')).toBe(100);
    });
  });
});
