/**
 * ポモドーロタイマー ロジック テスト
 * @module timer.test
 */

import { formatTime, calculateProgress, calculateColor, nextState, STATES, DURATIONS } from '../timer.js';

// ============================================
// formatTime
// ============================================
describe('formatTime', () => {
  it('0秒を "00:00" にフォーマットする', () => {
    expect(formatTime(0)).toBe('00:00');
  });

  it('1秒を "00:01" にフォーマットする', () => {
    expect(formatTime(1)).toBe('00:01');
  });

  it('59秒を "00:59" にフォーマットする', () => {
    expect(formatTime(59)).toBe('00:59');
  });

  it('60秒を "01:00" にフォーマットする', () => {
    expect(formatTime(60)).toBe('01:00');
  });

  it('65秒を "01:05" にフォーマットする', () => {
    expect(formatTime(65)).toBe('01:05');
  });

  it('1500秒（25分）を "25:00" にフォーマットする', () => {
    expect(formatTime(1500)).toBe('25:00');
  });

  it('300秒（5分）を "05:00" にフォーマットする', () => {
    expect(formatTime(300)).toBe('05:00');
  });

  it('900秒（15分）を "15:00" にフォーマットする', () => {
    expect(formatTime(900)).toBe('15:00');
  });
});

// ============================================
// calculateProgress
// ============================================
describe('calculateProgress', () => {
  it('未開始の場合 0.0 を返す', () => {
    expect(calculateProgress(0, 1500)).toBe(0.0);
  });

  it('半分経過で 0.5 を返す', () => {
    expect(calculateProgress(750, 1500)).toBe(0.5);
  });

  it('完了時に 1.0 を返す', () => {
    expect(calculateProgress(1500, 1500)).toBe(1.0);
  });

  it('total が 0 の場合 0 を返す', () => {
    expect(calculateProgress(0, 0)).toBe(0);
  });

  it('elapsed が total を超えても 1.0 を返す', () => {
    expect(calculateProgress(2000, 1500)).toBe(1.0);
  });

  it('1/3 経過で約 0.333 を返す', () => {
    expect(calculateProgress(500, 1500)).toBeCloseTo(0.333, 2);
  });
});

// ============================================
// calculateColor
// ============================================
describe('calculateColor', () => {
  it('進捗0%で青色を返す', () => {
    const color = calculateColor(0);
    expect(color).toBe('rgb(99, 102, 241)');
  });

  it('進捗25%で青と黄の中間色を返す', () => {
    const color = calculateColor(0.25);
    expect(color).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
  });

  it('進捗50%で黄色を返す', () => {
    const color = calculateColor(0.5);
    expect(color).toBe('rgb(234, 179, 8)');
  });

  it('進捗75%で黄と赤の中間色を返す', () => {
    const color = calculateColor(0.75);
    expect(color).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
  });

  it('進捗100%で赤色を返す', () => {
    const color = calculateColor(1.0);
    expect(color).toBe('rgb(239, 68, 68)');
  });

  it('RGB形式の文字列を返す', () => {
    const color = calculateColor(0.3);
    expect(color).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
  });
});

// ============================================
// nextState
// ============================================
describe('nextState', () => {
  it('IDLE から WORKING に遷移する', () => {
    const result = nextState(STATES.IDLE, 0);
    expect(result).toEqual({ state: STATES.WORKING, duration: DURATIONS.WORK });
  });

  it('WORKING(セッション1回目) から SHORT_BREAK に遷移する', () => {
    const result = nextState(STATES.WORKING, 1);
    expect(result).toEqual({ state: STATES.SHORT_BREAK, duration: DURATIONS.SHORT_BREAK });
  });

  it('WORKING(セッション3回目) から SHORT_BREAK に遷移する', () => {
    const result = nextState(STATES.WORKING, 3);
    expect(result).toEqual({ state: STATES.SHORT_BREAK, duration: DURATIONS.SHORT_BREAK });
  });

  it('WORKING(セッション4回目) から LONG_BREAK に遷移する', () => {
    const result = nextState(STATES.WORKING, 4);
    expect(result).toEqual({ state: STATES.LONG_BREAK, duration: DURATIONS.LONG_BREAK });
  });

  it('SHORT_BREAK から WORKING に遷移する', () => {
    const result = nextState(STATES.SHORT_BREAK, 1);
    expect(result).toEqual({ state: STATES.WORKING, duration: DURATIONS.WORK });
  });

  it('LONG_BREAK から IDLE に遷移する', () => {
    const result = nextState(STATES.LONG_BREAK, 4);
    expect(result).toEqual({ state: STATES.IDLE, duration: 0 });
  });

  it('不正な状態では IDLE に遷移する', () => {
    const result = nextState('INVALID', 0);
    expect(result).toEqual({ state: STATES.IDLE, duration: 0 });
  });
});

// ============================================
// 定数
// ============================================
describe('STATES', () => {
  it('4つの状態が定義されている', () => {
    expect(Object.keys(STATES)).toHaveLength(4);
    expect(STATES.IDLE).toBe('IDLE');
    expect(STATES.WORKING).toBe('WORKING');
    expect(STATES.SHORT_BREAK).toBe('SHORT_BREAK');
    expect(STATES.LONG_BREAK).toBe('LONG_BREAK');
  });
});

describe('DURATIONS', () => {
  it('作業時間が25分（1500秒）である', () => {
    expect(DURATIONS.WORK).toBe(1500);
  });

  it('短い休憩が5分（300秒）である', () => {
    expect(DURATIONS.SHORT_BREAK).toBe(300);
  });

  it('長い休憩が15分（900秒）である', () => {
    expect(DURATIONS.LONG_BREAK).toBe(900);
  });

  it('長い休憩前のセッション数が4である', () => {
    expect(DURATIONS.SESSIONS_BEFORE_LONG_BREAK).toBe(4);
  });
});
