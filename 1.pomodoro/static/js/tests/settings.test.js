/**
 * ポモドーロタイマー 設定ロジック テスト
 * @module settings.test
 */

import {
  DEFAULT_SETTINGS,
  ALLOWED_VALUES,
  validateSettings,
  mergeWithDefaults,
  minutesToSeconds,
  getWorkDuration,
  getShortBreakDuration,
  getLongBreakDuration
} from '../settings.js';

// ============================================
// 定数
// ============================================
describe('DEFAULT_SETTINGS', () => {
  it('デフォルト設定が正しく定義されている', () => {
    expect(DEFAULT_SETTINGS.work_duration).toBe(25);
    expect(DEFAULT_SETTINGS.short_break_duration).toBe(5);
    expect(DEFAULT_SETTINGS.long_break_duration).toBe(15);
    expect(DEFAULT_SETTINGS.theme).toBe('light');
    expect(DEFAULT_SETTINGS.sound_enabled).toBe(true);
    expect(DEFAULT_SETTINGS.start_sound_enabled).toBe(true);
    expect(DEFAULT_SETTINGS.end_sound_enabled).toBe(true);
    expect(DEFAULT_SETTINGS.tick_sound_enabled).toBe(false);
  });
});

describe('ALLOWED_VALUES', () => {
  it('許可される値が正しく定義されている', () => {
    expect(ALLOWED_VALUES.work_durations).toEqual([15, 25, 35, 45]);
    expect(ALLOWED_VALUES.break_durations).toEqual([5, 10, 15]);
    expect(ALLOWED_VALUES.themes).toEqual(['light', 'dark', 'focus']);
  });
});

// ============================================
// validateSettings
// ============================================
describe('validateSettings', () => {
  it('有効な設定を true と判定する', () => {
    const valid = {
      work_duration: 25,
      short_break_duration: 5,
      long_break_duration: 15,
      theme: 'light',
      sound_enabled: true,
      start_sound_enabled: true,
      end_sound_enabled: true,
      tick_sound_enabled: false
    };
    expect(validateSettings(valid)).toBe(true);
  });

  it('不正な作業時間を false と判定する', () => {
    const invalid = { ...DEFAULT_SETTINGS, work_duration: 30 };
    expect(validateSettings(invalid)).toBe(false);
  });

  it('不正な短い休憩時間を false と判定する', () => {
    const invalid = { ...DEFAULT_SETTINGS, short_break_duration: 7 };
    expect(validateSettings(invalid)).toBe(false);
  });

  it('不正な長い休憩時間を false と判定する', () => {
    const invalid = { ...DEFAULT_SETTINGS, long_break_duration: 20 };
    expect(validateSettings(invalid)).toBe(false);
  });

  it('不正なテーマを false と判定する', () => {
    const invalid = { ...DEFAULT_SETTINGS, theme: 'invalid' };
    expect(validateSettings(invalid)).toBe(false);
  });

  it('ブール値でないサウンド設定を false と判定する', () => {
    const invalid = { ...DEFAULT_SETTINGS, sound_enabled: 'yes' };
    expect(validateSettings(invalid)).toBe(false);
  });

  it('null を false と判定する', () => {
    expect(validateSettings(null)).toBe(false);
  });

  it('オブジェクトでない値を false と判定する', () => {
    expect(validateSettings('string')).toBe(false);
    expect(validateSettings(123)).toBe(false);
  });
});

// ============================================
// mergeWithDefaults
// ============================================
describe('mergeWithDefaults', () => {
  it('空オブジェクトに対してデフォルト設定を返す', () => {
    const result = mergeWithDefaults({});
    expect(result).toEqual(DEFAULT_SETTINGS);
  });

  it('部分的な設定をマージする', () => {
    const partial = { work_duration: 45, theme: 'dark' };
    const result = mergeWithDefaults(partial);
    expect(result.work_duration).toBe(45);
    expect(result.theme).toBe('dark');
    expect(result.short_break_duration).toBe(5); // デフォルト値
    expect(result.sound_enabled).toBe(true); // デフォルト値
  });

  it('完全な設定をそのまま返す', () => {
    const full = {
      work_duration: 35,
      short_break_duration: 10,
      long_break_duration: 15,
      theme: 'focus',
      sound_enabled: false,
      start_sound_enabled: false,
      end_sound_enabled: false,
      tick_sound_enabled: true
    };
    const result = mergeWithDefaults(full);
    expect(result).toEqual(full);
  });
});

// ============================================
// minutesToSeconds
// ============================================
describe('minutesToSeconds', () => {
  it('5分を300秒に変換する', () => {
    expect(minutesToSeconds(5)).toBe(300);
  });

  it('25分を1500秒に変換する', () => {
    expect(minutesToSeconds(25)).toBe(1500);
  });

  it('0分を0秒に変換する', () => {
    expect(minutesToSeconds(0)).toBe(0);
  });
});

// ============================================
// getDuration関数
// ============================================
describe('getWorkDuration', () => {
  it('設定から作業時間（秒）を返す', () => {
    const settings = { work_duration: 25 };
    expect(getWorkDuration(settings)).toBe(1500);
  });

  it('カスタム作業時間を返す', () => {
    const settings = { work_duration: 45 };
    expect(getWorkDuration(settings)).toBe(2700);
  });
});

describe('getShortBreakDuration', () => {
  it('設定から短い休憩時間（秒）を返す', () => {
    const settings = { short_break_duration: 5 };
    expect(getShortBreakDuration(settings)).toBe(300);
  });

  it('カスタム短い休憩時間を返す', () => {
    const settings = { short_break_duration: 10 };
    expect(getShortBreakDuration(settings)).toBe(600);
  });
});

describe('getLongBreakDuration', () => {
  it('設定から長い休憩時間（秒）を返す', () => {
    const settings = { long_break_duration: 15 };
    expect(getLongBreakDuration(settings)).toBe(900);
  });

  it('カスタム長い休憩時間を返す', () => {
    const settings = { long_break_duration: 10 };
    expect(getLongBreakDuration(settings)).toBe(600);
  });
});
