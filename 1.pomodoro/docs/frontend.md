# フロントエンドドキュメント

ポモドーロタイマーのフロントエンド実装に関するドキュメント。

---

## 概要

フロントエンドは以下の技術で構築されている：

- **HTML5**: セマンティックなマークアップ
- **CSS3**: 紫グラデーション背景、カード型 UI、SVG 円形プログレスバー
- **JavaScript (ES Modules)**: タイマーロジックと UI 操作

---

## ファイル構成

````
static/
├── css/
│   └── style.css              # スタイル定義
└── js/
    ├── timer.js               # タイマーロジック（純粋関数、DOM 非依存）
    ├── ui.js                  # DOM 操作・イベント・API 通信
    └── tests/
        └── timer.test.js      # Jest ユニットテスト

templates/
└── index.html                 # メインページテンプレート
````

---

## JavaScript モジュール設計

### 責務分離の方針

| モジュール | 責務 | テスト |
|----------|------|--------|
| `timer.js` | 純粋関数のみ。時間計算、状態遷移、フォーマット | Jest でテスト可能 |
| `ui.js` | DOM 操作、イベントリスナー、API 通信、通知 | ブラウザ / 手動テスト |

### なぜ分離するのか？

- **timer.js**: DOM に依存しない純粋関数として実装することで、Node.js 上での単体テストが可能
- **ui.js**: ブラウザ API に依存する部分を集約し、timer.js の関数を利用して UI を構築

---

## timer.js（タイマーロジック）

### エクスポート

````javascript
// 定数
export const STATES = { IDLE, WORKING, SHORT_BREAK, LONG_BREAK };
export const DURATIONS = { WORK, SHORT_BREAK, LONG_BREAK, SESSIONS_BEFORE_LONG_BREAK };

// 関数
export function formatTime(totalSeconds)
export function calculateProgress(elapsed, total)
export function nextState(currentState, sessionCount)
````

### formatTime(totalSeconds)

秒数を `MM:SS` 形式にフォーマットする。

**パラメータ**:
- `totalSeconds` (number): 合計秒数（0 以上の整数）

**戻り値**: `"MM:SS"` 形式の文字列

**例**:
````javascript
formatTime(1500) // "25:00"
formatTime(65)   // "01:05"
formatTime(0)    // "00:00"
````

**実装**:
````javascript
export function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
````

### calculateProgress(elapsed, total)

経過時間から進捗率を計算する（SVG プログレスバー用）。

**パラメータ**:
- `elapsed` (number): 経過秒数
- `total` (number): 合計秒数

**戻り値**: `0.0〜1.0` の進捗率

**例**:
````javascript
calculateProgress(0, 1500)    // 0.0
calculateProgress(750, 1500)  // 0.5
calculateProgress(1500, 1500) // 1.0
````

**実装**:
````javascript
export function calculateProgress(elapsed, total) {
  if (total === 0) return 0;
  return Math.min(elapsed / total, 1.0);
}
````

### nextState(currentState, sessionCount)

現在の状態と完了セッション数から次の状態と時間を返す。

**パラメータ**:
- `currentState` (string): 現在の状態（STATES の値）
- `sessionCount` (number): 完了した作業セッション数

**戻り値**: `{ state: string, duration: number }` 次の状態と継続時間（秒）

**状態遷移**:

````
IDLE → WORKING(25分)

WORKING → SHORT_BREAK(5分)（セッション数 < 4）
WORKING → LONG_BREAK(15分)（セッション数 >= 4）

SHORT_BREAK → WORKING(25分)

LONG_BREAK → IDLE
````

**例**:
````javascript
nextState('IDLE', 0)           // { state: 'WORKING', duration: 1500 }
nextState('WORKING', 1)        // { state: 'SHORT_BREAK', duration: 300 }
nextState('WORKING', 4)        // { state: 'LONG_BREAK', duration: 900 }
nextState('SHORT_BREAK', 1)    // { state: 'WORKING', duration: 1500 }
nextState('LONG_BREAK', 4)     // { state: 'IDLE', duration: 0 }
````

---

## ui.js（UI 操作）

### 主要な責務

1. **DOM 要素の取得と操作**
2. **イベントリスナーの登録**
3. **タイマーのカウントダウン処理**
4. **SVG プログレスバーの更新**
5. **API 通信**
6. **通知**
7. **キーボードショートカット**
8. **ページ離脱警告**

### 状態管理

````javascript
let currentState = STATES.IDLE;      // 現在の状態
let remaining = DURATIONS.WORK;      // 残り時間（秒）
let totalDuration = DURATIONS.WORK;  // 現在フェーズの合計時間
let sessionCount = 0;                // 完了した作業セッション数
let intervalId = null;               // setInterval の ID
let isPaused = false;                // 一時停止中フラグ
````

### DOM 要素

````javascript
const timerDisplay = document.getElementById('timer-display');
const progressRing = document.getElementById('progress-ring');
const statusLabel = document.getElementById('status-label');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const completedCountEl = document.getElementById('completed-count');
const totalFocusTimeEl = document.getElementById('total-focus-time');
const pomodoroIndicators = document.getElementById('pomodoro-indicators');
const historyList = document.getElementById('history-list');
````

### イベントハンドラー

#### handleStartPause()

開始/一時停止/再開を制御する。

- 開始前: `start()` を呼び出し
- 実行中: `pause()` を呼び出し
- 一時停止中: `resume()` を呼び出し

#### handleReset()

タイマーを初期状態にリセットする。

- `setInterval` を停止
- 状態を `IDLE` に戻す
- `sessionCount` を 0 にリセット
- UI を初期表示に更新

### カウントダウン処理（tick()）

1秒ごとに呼び出される関数。

````javascript
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
````

### セッション完了処理（onSessionComplete()）

- 作業セッション完了時:
  - `sessionCount` をインクリメント
  - API にセッションを記録
  - 進捗統計を再取得
- 通知を表示
- 次の状態に遷移
- 全サイクル完了（`IDLE` に戻る）場合はリセット
- それ以外は次のフェーズを自動開始

### SVG プログレスバー更新

````javascript
function updateProgress(progress) {
  const offset = CIRCUMFERENCE * (1 - progress);
  progressRing.style.strokeDashoffset = offset;
}
````

**計算式**:
- 円周長（CIRCUMFERENCE）: `2 * π * 95 ≈ 596.90`
- オフセット: `円周長 * (1 - 進捗率)`
- 進捗 0%: オフセット = 596.90（円が見えない）
- 進捗 100%: オフセット = 0（円が完全に表示）

---

## API 通信

### recordSession(durationMinutes)

セッション完了を API に記録する。

````javascript
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
    addHistoryItem(data.completed_at, durationMinutes);
    return data;
  } catch (error) {
    console.error('セッション記録エラー:', error);
    return null;
  }
}
````

### loadTodayStats()

今日の進捗を API から取得して表示する。

````javascript
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
````

---

## 通知機能

### ブラウザ通知

Notification API を使用してデスクトップ通知を表示する。

````javascript
if ('Notification' in window && Notification.permission === 'granted') {
  new Notification('ポモドーロタイマー', {
    body: `${label}が終了しました！`,
    icon: '/static/pomodoro.png'
  });
} else if ('Notification' in window && Notification.permission !== 'denied') {
  Notification.requestPermission();
}
````

### 通知音

AudioContext を使用してビープ音を生成する。

````javascript
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
    
    // 2回目のビープ（400ms 後）
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
````

---

## キーボードショートカット

| キー | 動作 |
|------|------|
| Space | 開始/一時停止/再開 |
| R | リセット |

**実装**:
````javascript
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
````

---

## ページ離脱警告

タイマー実行中にタブを閉じようとした際に警告を表示する。

````javascript
window.addEventListener('beforeunload', (e) => {
  if (intervalId) {
    e.preventDefault();
    e.returnValue = '';
  }
});
````

---

## ポモドーロインジケーター

完了したセッション数を視覚的に表示する（🍅×4）。

````javascript
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
````

---

## セッション履歴

完了したセッションを時刻付きリストで表示する。

````javascript
function addHistoryItem(completedAt, durationMinutes) {
  historySection.style.display = 'block';
  
  const li = document.createElement('li');
  li.classList.add('history-item');
  
  const time = new Date(completedAt);
  const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
  
  li.innerHTML = `<span class="history-time">${timeStr}</span> <span class="history-duration">${durationMinutes}分間 集中</span>`;
  historyList.prepend(li);
}
````

---

## ドキュメントタイトル更新

タイマー実行中はブラウザタブに残り時間を表示する。

````javascript
function updateDocumentTitle() {
  if (currentState === STATES.IDLE) {
    document.title = 'ポモドーロタイマー';
  } else {
    const label = STATE_LABELS[currentState];
    document.title = `${formatTime(remaining)} - ${label}`;
  }
}
````

---

## HTML 構造（index.html）

### 主要なセクション

````html
<div class="card">
  <!-- ヘッダー -->
  <div class="card-header">
    <h1 class="card-title">ポモドーロタイマー</h1>
    <div class="window-controls">...</div>
  </div>
  
  <!-- 状態表示 -->
  <div class="status-label" id="status-label">作業中</div>
  
  <!-- 円形タイマー -->
  <div class="timer-circle">
    <svg>
      <circle ...> <!-- 背景円 -->
      <circle id="progress-ring" ...> <!-- プログレス円 -->
    </svg>
    <div class="timer-display" id="timer-display">25:00</div>
  </div>
  
  <!-- 操作ボタン -->
  <div class="controls">
    <button class="btn btn-primary" id="start-btn">開始</button>
    <button class="btn btn-outline" id="reset-btn">リセット</button>
  </div>
  
  <!-- 今日の進捗 -->
  <div class="progress-section">...</div>
  
  <!-- ポモドーロインジケーター -->
  <div class="pomodoro-indicators" id="pomodoro-indicators">...</div>
  
  <!-- セッション履歴 -->
  <div class="history-section" id="history-section">...</div>
</div>
````

### SVG 円形プログレスバー

````html
<svg width="220" height="220" viewBox="0 0 220 220">
  <defs>
    <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#6366f1" />
      <stop offset="100%" stop-color="#a855f7" />
    </linearGradient>
  </defs>
  <!-- 背景の円 -->
  <circle cx="110" cy="110" r="95" fill="none" stroke="rgba(0, 0, 0, 0.06)" stroke-width="8" />
  <!-- プログレスの円 -->
  <circle
    id="progress-ring"
    cx="110" cy="110" r="95"
    fill="none"
    stroke="url(#progress-gradient)"
    stroke-width="8"
    stroke-linecap="round"
    stroke-dasharray="596.90"
    stroke-dashoffset="0"
    transform="rotate(-90 110 110)"
  />
</svg>
````

**ポイント**:
- `stroke-dasharray="596.90"`: 円周長を設定
- `stroke-dashoffset`: JavaScript で動的に変更して進捗を表現
- `transform="rotate(-90 110 110)"`: 12時方向から開始

---

## CSS スタイリング

主要なスタイル（`style.css` に定義）：

- 紫グラデーション背景
- カード型 UI（白背景、影、角丸）
- ボタン（塗りつぶし/アウトライン）
- 状態ラベル（作業中=紫、休憩中=緑）
- レスポンシブデザイン

---

## テスト

### timer.test.js（Jest）

timer.js の純粋関数をテストする。

**テストケース例**:
````javascript
import { formatTime, calculateProgress, nextState, STATES, DURATIONS } from '../timer.js';

describe('formatTime', () => {
  test('秒数を MM:SS 形式にフォーマットする', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(65)).toBe('01:05');
    expect(formatTime(1500)).toBe('25:00');
  });
});

describe('nextState', () => {
  test('IDLE から WORKING に遷移する', () => {
    const result = nextState(STATES.IDLE, 0);
    expect(result.state).toBe(STATES.WORKING);
    expect(result.duration).toBe(DURATIONS.WORK);
  });
});
````

---

## 今後の拡張案

- **ダークモード対応**: CSS カスタムプロパティと `prefers-color-scheme` を使用
- **設定パネル**: 作業時間・休憩時間をユーザーがカスタマイズ可能に
- **LocalStorage**: タイマー状態を保存し、ページリロードしても継続可能に
- **グラフ表示**: Chart.js を使って過去7日間の集中時間を可視化
