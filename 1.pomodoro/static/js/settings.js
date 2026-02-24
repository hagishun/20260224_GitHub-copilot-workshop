/**
 * ポモドーロタイマー 設定ロジック（純粋関数）
 *
 * DOM に依存しない純粋関数のみを配置する。
 * Jest でテスト可能。
 * @module settings
 */

/** デフォルト設定 */
export const DEFAULT_SETTINGS = {
  work_duration: 25,
  short_break_duration: 5,
  long_break_duration: 15,
  theme: 'light',
  sound_enabled: true,
  start_sound_enabled: true,
  end_sound_enabled: true,
  tick_sound_enabled: false
};

/** 許可される設定値 */
export const ALLOWED_VALUES = {
  work_durations: [15, 25, 35, 45],
  break_durations: [5, 10, 15],
  themes: ['light', 'dark', 'focus']
};

/**
 * 設定値を検証する
 * @param {object} settings - 検証する設定オブジェクト
 * @returns {boolean} 設定が有効な場合 true
 */
export function validateSettings(settings) {
  if (!settings || typeof settings !== 'object') {
    return false;
  }

  // 作業時間の検証
  if (!ALLOWED_VALUES.work_durations.includes(settings.work_duration)) {
    return false;
  }

  // 休憩時間の検証
  if (!ALLOWED_VALUES.break_durations.includes(settings.short_break_duration)) {
    return false;
  }

  if (!ALLOWED_VALUES.break_durations.includes(settings.long_break_duration)) {
    return false;
  }

  // テーマの検証
  if (!ALLOWED_VALUES.themes.includes(settings.theme)) {
    return false;
  }

  // ブール値の検証
  const booleanFields = ['sound_enabled', 'start_sound_enabled', 'end_sound_enabled', 'tick_sound_enabled'];
  for (const field of booleanFields) {
    if (typeof settings[field] !== 'boolean') {
      return false;
    }
  }

  return true;
}

/**
 * デフォルト設定とマージする
 * @param {object} partialSettings - 部分的な設定オブジェクト
 * @returns {object} デフォルト値でマージされた完全な設定オブジェクト
 */
export function mergeWithDefaults(partialSettings) {
  return {
    ...DEFAULT_SETTINGS,
    ...partialSettings
  };
}

/**
 * 分を秒に変換する
 * @param {number} minutes - 分
 * @returns {number} 秒
 */
export function minutesToSeconds(minutes) {
  return minutes * 60;
}

/**
 * 設定から作業時間（秒）を取得する
 * @param {object} settings - 設定オブジェクト
 * @returns {number} 作業時間（秒）
 */
export function getWorkDuration(settings) {
  return minutesToSeconds(settings.work_duration);
}

/**
 * 設定から短い休憩時間（秒）を取得する
 * @param {object} settings - 設定オブジェクト
 * @returns {number} 短い休憩時間（秒）
 */
export function getShortBreakDuration(settings) {
  return minutesToSeconds(settings.short_break_duration);
}

/**
 * 設定から長い休憩時間（秒）を取得する
 * @param {object} settings - 設定オブジェクト
 * @returns {number} 長い休憩時間（秒）
 */
export function getLongBreakDuration(settings) {
  return minutesToSeconds(settings.long_break_duration);
}
