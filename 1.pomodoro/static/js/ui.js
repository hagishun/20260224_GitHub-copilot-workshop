/**
 * ポモドーロタイマー UI 操作モジュール
 *
 * DOM 操作・イベントリスナー・API 通信を担当する。
 * timer.js の純粋関数を利用してタイマーロジックを実行する。
 * @module ui
 */

import {
  STATES,
  DURATIONS,
  formatTime,
  calculateProgress,
  nextState
} from './timer.js';

import {
  calculateLevelProgress,
  calculateXpToNextLevel,
  getStreakMessage,
  sortBadgesByDate
} from './gamification.js';

// ── DOM 要素 ──
const timerDisplay = document.getElementById('timer-display');
const progressRing = document.getElementById('progress-ring');
const statusLabel = document.getElementById('status-label');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const completedCountEl = document.getElementById('completed-count');
const totalFocusTimeEl = document.getElementById('total-focus-time');
const pomodoroIndicators = document.getElementById('pomodoro-indicators');
const historySection = document.getElementById('history-section');
const historyList = document.getElementById('history-list');

// ゲーミフィケーション要素
const userLevelEl = document.getElementById('user-level');
const xpBarEl = document.getElementById('xp-bar');
const xpTextEl = document.getElementById('xp-text');
const streakCurrentEl = document.getElementById('streak-current');
const streakLongestEl = document.getElementById('streak-longest');
const badgesGridEl = document.getElementById('badges-grid');
const weeklySessionsEl = document.getElementById('weekly-sessions');
const weeklyMinutesEl = document.getElementById('weekly-minutes');
const weeklyAvgEl = document.getElementById('weekly-avg');
const monthlySessionsEl = document.getElementById('monthly-sessions');
const monthlyMinutesEl = document.getElementById('monthly-minutes');
const monthlyAvgEl = document.getElementById('monthly-avg');

// ── 定数 ──
const RADIUS = 95;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ≈ 596.90

// ── タイマー状態 ──
let currentState = STATES.IDLE;
let remaining = DURATIONS.WORK;
let totalDuration = DURATIONS.WORK;
let sessionCount = 0;
let intervalId = null;
let isPaused = false;

// ── 初期状態のラベルマップ ──
const STATE_LABELS = {
  [STATES.IDLE]: '準備完了',
  [STATES.WORKING]: '作業中',
  [STATES.SHORT_BREAK]: '休憩中',
  [STATES.LONG_BREAK]: '長い休憩中'
};

// ── 初期化 ──
updateDisplay();
updateProgress(0);
loadTodayStats();
loadGamificationStats();
loadWeeklyStats();
initStatsTabs();

// ── イベントリスナー ──
startBtn.addEventListener('click', handleStartPause);
resetBtn.addEventListener('click', handleReset);

// キーボードショートカット
document.addEventListener('keydown', (e) => {
  // 入力フィールドにフォーカスがある場合はスキップ
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  if (e.code === 'Space') {
    e.preventDefault();
    handleStartPause();
  } else if (e.code === 'KeyR') {
    e.preventDefault();
    handleReset();
  }
});

// ── ハンドラー ──

/**
 * 開始／一時停止ボタンのハンドラー
 */
function handleStartPause() {
  if (intervalId && !isPaused) {
    // 一時停止
    pause();
  } else if (isPaused) {
    // 再開
    resume();
  } else {
    // 新規開始
    start();
  }
}

/**
 * タイマーを開始する
 */
function start() {
  if (currentState === STATES.IDLE) {
    const next = nextState(STATES.IDLE, sessionCount);
    currentState = next.state;
    remaining = next.duration;
    totalDuration = next.duration;
  }

  isPaused = false;
  startBtn.textContent = '一時停止';
  updateStatusLabel();
  tick();
  intervalId = setInterval(tick, 1000);
}

/**
 * タイマーを一時停止する
 */
function pause() {
  isPaused = true;
  clearInterval(intervalId);
  startBtn.textContent = '再開';
}

/**
 * タイマーを再開する
 */
function resume() {
  isPaused = false;
  startBtn.textContent = '一時停止';
  intervalId = setInterval(tick, 1000);
}

/**
 * リセットボタンのハンドラー
 */
function handleReset() {
  clearInterval(intervalId);
  intervalId = null;
  isPaused = false;
  currentState = STATES.IDLE;
  remaining = DURATIONS.WORK;
  totalDuration = DURATIONS.WORK;
  sessionCount = 0;

  startBtn.textContent = '開始';
  updateStatusLabel();
  updateDisplay();
  updateProgress(0);
  updateIndicators();
  document.title = 'ポモドーロタイマー';
}

/**
 * 1秒ごとのカウントダウン処理
 */
function tick() {
  remaining--;
  const elapsed = totalDuration - remaining;
  const progress = calculateProgress(elapsed, totalDuration);

  updateDisplay();
  updateProgress(progress);
  updateDocumentTitle();

  if (remaining <= 0) {
    clearInterval(intervalId);
    intervalId = null;
    onSessionComplete();
  }
}

/**
 * セッション完了時の処理
 */
async function onSessionComplete() {
  // 作業セッション完了時にカウント・API記録
  if (currentState === STATES.WORKING) {
    sessionCount++;
    updateIndicators();
    const result = await recordSession(DURATIONS.WORK / 60);
    await loadTodayStats();
    await loadGamificationStats();
    
    // レベルアップやバッジ獲得の通知
    if (result && result.level_up) {
      showLevelUpNotification(result.level);
    }
    if (result && result.new_badges && result.new_badges.length > 0) {
      showNewBadgesNotification(result.new_badges);
    }
  }

  // 通知
  notifySessionEnd();

  // 次の状態に遷移
  const next = nextState(currentState, sessionCount);
  currentState = next.state;
  remaining = next.duration;
  totalDuration = next.duration;

  if (currentState === STATES.IDLE) {
    // 全サイクル完了
    startBtn.textContent = '開始';
    sessionCount = 0;
    updateIndicators();
    updateStatusLabel();
    updateDisplay();
    updateProgress(0);
    document.title = 'ポモドーロタイマー';
  } else {
    // 次のフェーズを自動開始
    updateStatusLabel();
    updateDisplay();
    updateProgress(0);
    startBtn.textContent = '一時停止';
    intervalId = setInterval(tick, 1000);
  }
}

// ── 表示更新 ──

/**
 * タイマー表示を更新する
 */
function updateDisplay() {
  timerDisplay.textContent = formatTime(remaining);
}

/**
 * SVG 円形プログレスバーを更新する
 * @param {number} progress - 0.0〜1.0 の進捗率
 */
function updateProgress(progress) {
  const offset = CIRCUMFERENCE * (1 - progress);
  progressRing.style.strokeDashoffset = offset;
}

/**
 * 状態ラベルを更新する
 */
function updateStatusLabel() {
  statusLabel.textContent = STATE_LABELS[currentState] || '準備完了';

  // 状態に応じたスタイル変更
  statusLabel.classList.remove('working', 'break');
  if (currentState === STATES.WORKING) {
    statusLabel.classList.add('working');
  } else if (currentState === STATES.SHORT_BREAK || currentState === STATES.LONG_BREAK) {
    statusLabel.classList.add('break');
  }
}

/**
 * ドキュメントタイトルにタイマーを表示する
 */
function updateDocumentTitle() {
  if (currentState === STATES.IDLE) {
    document.title = 'ポモドーロタイマー';
  } else {
    const label = STATE_LABELS[currentState];
    document.title = `${formatTime(remaining)} - ${label}`;
  }
}

/**
 * ポモドーロインジケーター（🍅）を更新する
 */
function updateIndicators() {
  const indicators = pomodoroIndicators.querySelectorAll('.indicator');
  indicators.forEach((el, i) => {
    if (i < sessionCount) {
      el.textContent = '🍅';
      el.classList.add('completed');
    } else {
      el.textContent = '○';
      el.classList.remove('completed');
    }
  });
}

// ── 通知 ──

/**
 * セッション終了時に通知を表示する
 */
function notifySessionEnd() {
  const label = STATE_LABELS[currentState];

  // ブラウザ通知
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('ポモドーロタイマー', {
      body: `${label}が終了しました！`,
      icon: '/static/pomodoro.png'
    });
  } else if ('Notification' in window && Notification.permission !== 'denied') {
    Notification.requestPermission();
  }

  // 通知音
  playNotificationSound();
}

/**
 * 通知音を再生する
 */
function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.3);

    // 2回目のビープ
    setTimeout(() => {
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.frequency.value = 1000;
      osc2.type = 'sine';
      gain2.gain.value = 0.3;
      osc2.start();
      osc2.stop(audioCtx.currentTime + 0.3);
    }, 400);
  } catch {
    // AudioContext 非対応環境では無視
  }
}

// ── ページ離脱警告 ──

window.addEventListener('beforeunload', (e) => {
  if (intervalId) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// ── API 通信 ──

/**
 * セッション完了を API に記録する
 * @param {number} durationMinutes - セッション時間（分）
 */
async function recordSession(durationMinutes) {
  try {
    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration_minutes: durationMinutes })
    });

    if (!response.ok) {
      console.error('セッション記録に失敗しました:', response.status);
      return null;
    }

    const data = await response.json();

    // 履歴に追加
    addHistoryItem(data.completed_at, durationMinutes);

    return data;
  } catch (error) {
    console.error('セッション記録エラー:', error);
    return null;
  }
}

/**
 * 今日の進捗を API から取得して表示する
 */
async function loadTodayStats() {
  try {
    const response = await fetch('/api/sessions/today');

    if (!response.ok) {
      console.error('進捗取得に失敗しました:', response.status);
      return;
    }

    const data = await response.json();
    completedCountEl.textContent = data.completed_count;
    totalFocusTimeEl.textContent = `${data.total_focus_minutes}分`;
  } catch (error) {
    console.error('進捗取得エラー:', error);
  }
}

/**
 * セッション履歴にアイテムを追加する
 * @param {string} completedAt - 完了時刻（ISO形式）
 * @param {number} durationMinutes - セッション時間（分）
 */
function addHistoryItem(completedAt, durationMinutes) {
  historySection.style.display = 'block';

  const li = document.createElement('li');
  li.classList.add('history-item');

  const time = new Date(completedAt);
  const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;

  li.innerHTML = `<span class="history-time">${timeStr}</span> <span class="history-duration">${durationMinutes}分間 集中</span>`;
  historyList.prepend(li);
}

// ── ゲーミフィケーション ──

/**
 * ゲーミフィケーション統計を読み込んで表示する
 */
async function loadGamificationStats() {
  try {
    const response = await fetch('/api/gamification/stats');
    if (!response.ok) {
      console.error('ゲーミフィケーション統計取得に失敗しました:', response.status);
      return;
    }

    const data = await response.json();
    updateGamificationDisplay(data);
  } catch (error) {
    console.error('ゲーミフィケーション統計取得エラー:', error);
  }
}

/**
 * ゲーミフィケーション表示を更新する
 * @param {object} data - 統計データ
 */
function updateGamificationDisplay(data) {
  // レベル＆XP
  userLevelEl.textContent = data.level;
  const progress = calculateLevelProgress(data.xp, 100);
  const xpInLevel = data.xp % 100;
  const xpToNext = calculateXpToNextLevel(data.xp, 100);
  xpBarEl.style.width = `${progress * 100}%`;
  xpTextEl.textContent = `${xpInLevel} / 100 XP (次のレベルまで ${xpToNext} XP)`;

  // ストリーク
  const streakMsg = getStreakMessage(data.current_streak, data.longest_streak);
  streakCurrentEl.textContent = `${data.current_streak}日連続`;
  streakLongestEl.textContent = `最長: ${data.longest_streak}日`;

  // バッジ
  updateBadgesDisplay(data.badges);
}

/**
 * バッジ表示を更新する
 * @param {Array} badges - バッジの配列
 */
function updateBadgesDisplay(badges) {
  if (!badges || badges.length === 0) {
    badgesGridEl.innerHTML = '<div class="badge-placeholder">まだバッジがありません</div>';
    return;
  }

  const sortedBadges = sortBadgesByDate(badges);
  badgesGridEl.innerHTML = sortedBadges.map(badge => `
    <div class="badge-item">
      <div class="badge-icon">🏆</div>
      <div class="badge-name">${badge.name}</div>
      <div class="badge-description">${badge.description}</div>
    </div>
  `).join('');
}

/**
 * レベルアップ通知を表示する
 * @param {number} newLevel - 新しいレベル
 */
function showLevelUpNotification(newLevel) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('レベルアップ！', {
      body: `レベル ${newLevel} に到達しました！🎉`,
      icon: '/static/pomodoro.png'
    });
  }
}

/**
 * 新バッジ獲得通知を表示する
 * @param {Array} newBadges - 新しく獲得したバッジ
 */
function showNewBadgesNotification(newBadges) {
  if ('Notification' in window && Notification.permission === 'granted') {
    newBadges.forEach(badge => {
      new Notification('バッジ獲得！', {
        body: `「${badge.name}」を獲得しました！`,
        icon: '/static/pomodoro.png'
      });
    });
  }
}

/**
 * 週間統計を読み込んで表示する
 */
async function loadWeeklyStats() {
  try {
    const response = await fetch('/api/gamification/history/weekly');
    if (!response.ok) {
      console.error('週間統計取得に失敗しました:', response.status);
      return;
    }

    const data = await response.json();
    updateWeeklyStatsDisplay(data);
  } catch (error) {
    console.error('週間統計取得エラー:', error);
  }
}

/**
 * 週間統計表示を更新する
 * @param {object} data - 週間統計データ
 */
function updateWeeklyStatsDisplay(data) {
  weeklySessionsEl.textContent = data.total_sessions;
  weeklyMinutesEl.textContent = `${data.total_minutes}分`;
  weeklyAvgEl.textContent = `${data.avg_minutes_per_day}分`;

  // Chart.js でグラフ描画
  const canvas = document.getElementById('weekly-chart');
  if (canvas && typeof Chart !== 'undefined') {
    const ctx = canvas.getContext('2d');
    
    // 既存のチャートがあれば破棄
    if (canvas.chart) {
      canvas.chart.destroy();
    }

    const labels = data.daily_data.map(d => {
      const date = new Date(d.date);
      return ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    });

    canvas.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'セッション数',
          data: data.daily_data.map(d => d.sessions),
          backgroundColor: 'rgba(99, 102, 241, 0.5)',
          borderColor: 'rgba(99, 102, 241, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
  }
}

/**
 * 月間統計を読み込んで表示する
 */
async function loadMonthlyStats() {
  try {
    const response = await fetch('/api/gamification/history/monthly');
    if (!response.ok) {
      console.error('月間統計取得に失敗しました:', response.status);
      return;
    }

    const data = await response.json();
    updateMonthlyStatsDisplay(data);
  } catch (error) {
    console.error('月間統計取得エラー:', error);
  }
}

/**
 * 月間統計表示を更新する
 * @param {object} data - 月間統計データ
 */
function updateMonthlyStatsDisplay(data) {
  monthlySessionsEl.textContent = data.total_sessions;
  monthlyMinutesEl.textContent = `${data.total_minutes}分`;
  monthlyAvgEl.textContent = `${data.avg_minutes_per_day}分`;

  // Chart.js でグラフ描画
  const canvas = document.getElementById('monthly-chart');
  if (canvas && typeof Chart !== 'undefined') {
    const ctx = canvas.getContext('2d');
    
    // 既存のチャートがあれば破棄
    if (canvas.chart) {
      canvas.chart.destroy();
    }

    const labels = data.weekly_data.map(d => `第${d.week}週`);

    canvas.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'セッション数',
          data: data.weekly_data.map(d => d.sessions),
          backgroundColor: 'rgba(168, 85, 247, 0.2)',
          borderColor: 'rgba(168, 85, 247, 1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
  }
}

/**
 * 統計タブの初期化
 */
function initStatsTabs() {
  const tabs = document.querySelectorAll('.stats-tab');
  const panels = document.querySelectorAll('.stats-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      
      // タブの active クラス切り替え
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // パネルの表示切り替え
      panels.forEach(panel => {
        if (panel.id === `${targetTab}-stats`) {
          panel.classList.add('active');
        } else {
          panel.classList.remove('active');
        }
      });

      // 月間統計タブがクリックされたら、データを読み込む
      if (targetTab === 'monthly') {
        loadMonthlyStats();
      }
    });
  });
}
