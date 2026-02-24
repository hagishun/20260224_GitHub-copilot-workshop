/**
 * ポモドーロタイマー ロジック（純粋関数）
 *
 * DOM に依存しない純粋関数のみを配置する。
 * Jest でテスト可能。
 * @module timer
 */

/** タイマーの状態定数 */
export const STATES = {
  IDLE: 'IDLE',
  WORKING: 'WORKING',
  SHORT_BREAK: 'SHORT_BREAK',
  LONG_BREAK: 'LONG_BREAK'
};

/** デフォルトの時間設定（秒） */
export const DURATIONS = {
  WORK: 25 * 60,
  SHORT_BREAK: 5 * 60,
  LONG_BREAK: 15 * 60,
  SESSIONS_BEFORE_LONG_BREAK: 4
};

/**
 * カスタム設定を使用した DURATIONS を生成する
 * @param {object} settings - 設定オブジェクト（work_duration, short_break_duration, long_break_duration を含む）
 * @returns {object} カスタマイズされた DURATIONS オブジェクト
 */
export function createDurationsFromSettings(settings) {
  return {
    WORK: (settings.work_duration || 25) * 60,
    SHORT_BREAK: (settings.short_break_duration || 5) * 60,
    LONG_BREAK: (settings.long_break_duration || 15) * 60,
    SESSIONS_BEFORE_LONG_BREAK: 4
  };
}

/**
 * 秒数を MM:SS 形式にフォーマットする
 * @param {number} totalSeconds - 合計秒数（0 以上の整数）
 * @returns {string} "MM:SS" 形式の文字列
 */
export function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * 経過時間から進捗率を計算する（SVG プログレスバー用）
 * @param {number} elapsed - 経過秒数
 * @param {number} total - 合計秒数
 * @returns {number} 0.0〜1.0 の進捗率
 */
export function calculateProgress(elapsed, total) {
  if (total === 0) return 0;
  return Math.min(elapsed / total, 1.0);
}

/**
 * 現在の状態と完了セッション数から次の状態と時間を返す
 * @param {string} currentState - 現在の状態（STATES の値）
 * @param {number} sessionCount - 完了した作業セッション数
 * @param {object} [durations=DURATIONS] - 使用する時間設定（オプション）
 * @returns {{ state: string, duration: number }} 次の状態と継続時間（秒）
 */
export function nextState(currentState, sessionCount, durations = DURATIONS) {
  switch (currentState) {
    case STATES.IDLE:
      return { state: STATES.WORKING, duration: durations.WORK };

    case STATES.WORKING:
      if (sessionCount >= durations.SESSIONS_BEFORE_LONG_BREAK) {
        return { state: STATES.LONG_BREAK, duration: durations.LONG_BREAK };
      }
      return { state: STATES.SHORT_BREAK, duration: durations.SHORT_BREAK };

    case STATES.SHORT_BREAK:
      return { state: STATES.WORKING, duration: durations.WORK };

    case STATES.LONG_BREAK:
      return { state: STATES.IDLE, duration: 0 };

    default:
      return { state: STATES.IDLE, duration: 0 };
  }
}
