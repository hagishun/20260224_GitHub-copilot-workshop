/**
 * ゲーミフィケーション関連の純粋関数（DOM非依存）
 */

/**
 * XPからレベルを計算する
 * @param {number} xp - 経験値
 * @param {number} xpPerLevel - レベルアップに必要なXP
 * @returns {number} 計算されたレベル
 */
export function calculateLevel(xp, xpPerLevel = 100) {
  return Math.floor(xp / xpPerLevel) + 1;
}

/**
 * 現在のレベルでの進捗率を計算する
 * @param {number} xp - 経験値
 * @param {number} xpPerLevel - レベルアップに必要なXP
 * @returns {number} 進捗率（0.0〜1.0）
 */
export function calculateLevelProgress(xp, xpPerLevel = 100) {
  const remainder = xp % xpPerLevel;
  return remainder / xpPerLevel;
}

/**
 * 次のレベルまでに必要なXPを計算する
 * @param {number} xp - 経験値
 * @param {number} xpPerLevel - レベルアップに必要なXP
 * @returns {number} 次のレベルまでに必要なXP
 */
export function calculateXpToNextLevel(xp, xpPerLevel = 100) {
  const remainder = xp % xpPerLevel;
  return xpPerLevel - remainder;
}

/**
 * バッジを獲得日時順にソートする
 * @param {Array} badges - バッジの配列
 * @returns {Array} ソートされたバッジの配列
 */
export function sortBadgesByDate(badges) {
  return [...badges].sort((a, b) => {
    if (!a.earned_at) return 1;
    if (!b.earned_at) return -1;
    return new Date(b.earned_at) - new Date(a.earned_at);
  });
}

/**
 * ストリークのステータスメッセージを生成する
 * @param {number} currentStreak - 現在の連続日数
 * @param {number} longestStreak - 最長連続日数
 * @returns {string} ステータスメッセージ
 */
export function getStreakMessage(currentStreak, longestStreak) {
  if (currentStreak === 0) {
    return 'セッションを完了してストリークを開始しよう！';
  }
  if (currentStreak === longestStreak) {
    return `${currentStreak}日連続！新記録更新中🔥`;
  }
  return `${currentStreak}日連続！最長記録: ${longestStreak}日`;
}

/**
 * 統計データから完了率を計算する
 * @param {number} totalSessions - 総セッション数
 * @param {number} targetSessions - 目標セッション数
 * @returns {number} 完了率（パーセント）
 */
export function calculateCompletionRate(totalSessions, targetSessions) {
  if (targetSessions === 0) return 0;
  return Math.min(100, (totalSessions / targetSessions) * 100);
}

/**
 * 日別データから最大値を取得する
 * @param {Array} dailyData - 日別データの配列
 * @param {string} key - 取得するキー（'sessions' または 'minutes'）
 * @returns {number} 最大値
 */
export function getMaxValue(dailyData, key) {
  if (!dailyData || dailyData.length === 0) return 0;
  return Math.max(...dailyData.map(d => d[key] || 0));
}
