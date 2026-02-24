/**
 * ポモドーロタイマー 設定UI操作モジュール
 *
 * 設定パネルのDOM操作・イベントリスナー・API通信を担当する。
 * @module settings-ui
 */

import {
  DEFAULT_SETTINGS,
  ALLOWED_VALUES,
  validateSettings,
  mergeWithDefaults
} from './settings.js';

// ── 設定状態 ──
let currentSettings = { ...DEFAULT_SETTINGS };

// ── 初期化 ──
export async function initSettings() {
  await loadSettings();
  applyTheme(currentSettings.theme);
  setupEventListeners();
}

// ── API 通信 ──

/**
 * サーバーから設定を読み込む
 */
async function loadSettings() {
  try {
    const response = await fetch('/api/settings');
    if (!response.ok) {
      console.error('設定の読み込みに失敗しました:', response.status);
      return;
    }
    const data = await response.json();
    currentSettings = mergeWithDefaults(data);
    updateSettingsUI();
  } catch (error) {
    console.error('設定の読み込みエラー:', error);
  }
}

/**
 * 設定をサーバーに保存する
 * @param {object} settings - 保存する設定
 */
async function saveSettings(settings) {
  try {
    const response = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });

    if (!response.ok) {
      console.error('設定の保存に失敗しました:', response.status);
      return false;
    }

    const data = await response.json();
    currentSettings = data;
    applyTheme(currentSettings.theme);
    return true;
  } catch (error) {
    console.error('設定の保存エラー:', error);
    return false;
  }
}

// ── UI 更新 ──

/**
 * 設定UIを現在の設定値で更新する
 */
function updateSettingsUI() {
  // 作業時間
  const workDurationEl = document.getElementById('work-duration');
  if (workDurationEl) {
    workDurationEl.value = currentSettings.work_duration;
  }

  // 短い休憩時間
  const shortBreakEl = document.getElementById('short-break-duration');
  if (shortBreakEl) {
    shortBreakEl.value = currentSettings.short_break_duration;
  }

  // 長い休憩時間
  const longBreakEl = document.getElementById('long-break-duration');
  if (longBreakEl) {
    longBreakEl.value = currentSettings.long_break_duration;
  }

  // テーマ
  const themeButtons = document.querySelectorAll('[data-theme]');
  themeButtons.forEach(btn => {
    if (btn.dataset.theme === currentSettings.theme) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // サウンド設定
  const soundEnabledEl = document.getElementById('sound-enabled');
  if (soundEnabledEl) {
    soundEnabledEl.checked = currentSettings.sound_enabled;
  }

  const startSoundEl = document.getElementById('start-sound-enabled');
  if (startSoundEl) {
    startSoundEl.checked = currentSettings.start_sound_enabled;
  }

  const endSoundEl = document.getElementById('end-sound-enabled');
  if (endSoundEl) {
    endSoundEl.checked = currentSettings.end_sound_enabled;
  }

  const tickSoundEl = document.getElementById('tick-sound-enabled');
  if (tickSoundEl) {
    tickSoundEl.checked = currentSettings.tick_sound_enabled;
  }
}

// ── イベントリスナー ──

/**
 * 設定パネルのイベントリスナーを設定する
 */
function setupEventListeners() {
  // 設定ボタン（設定パネルの開閉）
  const settingsBtn = document.getElementById('settings-btn');
  const settingsPanel = document.getElementById('settings-panel');
  const settingsClose = document.getElementById('settings-close');

  if (settingsBtn && settingsPanel) {
    settingsBtn.addEventListener('click', () => {
      settingsPanel.classList.add('show');
    });
  }

  if (settingsClose && settingsPanel) {
    settingsClose.addEventListener('click', () => {
      settingsPanel.classList.remove('show');
    });
  }

  // 設定保存ボタン
  const saveBtn = document.getElementById('save-settings-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', handleSaveSettings);
  }

  // テーマボタン
  const themeButtons = document.querySelectorAll('[data-theme]');
  themeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      handleThemeChange(theme);
    });
  });
}

/**
 * 設定保存ボタンのハンドラー
 */
async function handleSaveSettings() {
  const newSettings = {
    work_duration: parseInt(document.getElementById('work-duration').value),
    short_break_duration: parseInt(document.getElementById('short-break-duration').value),
    long_break_duration: parseInt(document.getElementById('long-break-duration').value),
    theme: currentSettings.theme,
    sound_enabled: document.getElementById('sound-enabled').checked,
    start_sound_enabled: document.getElementById('start-sound-enabled').checked,
    end_sound_enabled: document.getElementById('end-sound-enabled').checked,
    tick_sound_enabled: document.getElementById('tick-sound-enabled').checked
  };

  if (!validateSettings(newSettings)) {
    alert('不正な設定値が含まれています。');
    return;
  }

  const success = await saveSettings(newSettings);
  if (success) {
    // 設定パネルを閉じる
    const settingsPanel = document.getElementById('settings-panel');
    if (settingsPanel) {
      settingsPanel.classList.remove('show');
    }

    // ページリロードを促す（タイマーに新しい設定を反映するため）
    if (confirm('設定を保存しました。変更を反映するにはページをリロードします。よろしいですか？')) {
      window.location.reload();
    }
  } else {
    alert('設定の保存に失敗しました。');
  }
}

/**
 * テーマ変更ハンドラー
 * @param {string} theme - 新しいテーマ名
 */
function handleThemeChange(theme) {
  currentSettings.theme = theme;
  applyTheme(theme);

  // ボタンのアクティブ状態を更新
  const themeButtons = document.querySelectorAll('[data-theme]');
  themeButtons.forEach(btn => {
    if (btn.dataset.theme === theme) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

/**
 * テーマをbody要素に適用する
 * @param {string} theme - テーマ名
 */
function applyTheme(theme) {
  document.body.classList.remove('light-mode', 'dark-mode', 'focus-mode');
  
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
  } else if (theme === 'focus') {
    document.body.classList.add('focus-mode');
  } else {
    document.body.classList.add('light-mode');
  }
}

/**
 * 現在の設定を取得する
 * @returns {object} 現在の設定オブジェクト
 */
export function getCurrentSettings() {
  return { ...currentSettings };
}
