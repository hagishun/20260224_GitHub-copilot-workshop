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
  nextState,
  createDurationsFromSettings
} from './timer.js';

import { initSettings, getCurrentSettings } from './settings-ui.js';

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
let customDurations = DURATIONS; // 設定から読み込んだカスタム時間設定

// ── 初期状態のラベルマップ ──
const STATE_LABELS = {
  [STATES.IDLE]: '準備完了',
  [STATES.WORKING]: '作業中',
  [STATES.SHORT_BREAK]: '休憩中',
  [STATES.LONG_BREAK]: '長い休憩中'
};

// ── 初期化 ──
async function init() {
  await initSettings();
  const settings = getCurrentSettings();
  customDurations = createDurationsFromSettings(settings);
  remaining = customDurations.WORK;
  totalDuration = customDurations.WORK;
  updateDisplay();
  updateProgress(0);
  loadTodayStats();
}

init();

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
    const next = nextState(STATES.IDLE, sessionCount, customDurations);
    currentState = next.state;
    remaining = next.duration;
    totalDuration = next.duration;
  }

  isPaused = false;
  startBtn.textContent = '一時停止';
  updateStatusLabel();
  
  // 開始音を再生
  const settings = getCurrentSettings();
  if (settings.sound_enabled && settings.start_sound_enabled) {
    playStartSound();
  }
  
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
  const settings = getCurrentSettings();
  customDurations = createDurationsFromSettings(settings);
  remaining = customDurations.WORK;
  totalDuration = customDurations.WORK;
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

  // tick音を再生
  const settings = getCurrentSettings();
  if (settings.sound_enabled && settings.tick_sound_enabled) {
    playTickSound();
  }

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
    await recordSession(customDurations.WORK / 60);
    await loadTodayStats();
  }

  // 通知
  notifySessionEnd();

  // 次の状態に遷移
  const next = nextState(currentState, sessionCount, customDurations);
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

  // 終了音を再生
  const settings = getCurrentSettings();
  if (settings.sound_enabled && settings.end_sound_enabled) {
    playNotificationSound();
  }
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

/**
 * 開始音を再生する
 */
function playStartSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.frequency.value = 600;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.2;

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.15);
  } catch {
    // AudioContext 非対応環境では無視
  }
}

/**
 * tick音を再生する
 */
function playTickSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.frequency.value = 440;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.05;

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.05);
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
