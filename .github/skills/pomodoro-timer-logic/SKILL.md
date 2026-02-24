# スキル: ポモドーロタイマーロジック

## 概要

ポモドーロタイマーの状態遷移とタイマーロジックの実装ガイド。
`timer.js` の純粋関数として実装し、Jest でテスト可能にする。

## 状態遷移図

```
IDLE → WORKING(25:00) → SHORT_BREAK(5:00) → WORKING(25:00) → ...
                                              (4回目) → LONG_BREAK(15:00) → IDLE
```

## 定数

```javascript
export const STATES = {
  IDLE: 'IDLE',
  WORKING: 'WORKING',
  SHORT_BREAK: 'SHORT_BREAK',
  LONG_BREAK: 'LONG_BREAK'
};

export const DURATIONS = {
  WORK: 25 * 60,        // 1500秒
  SHORT_BREAK: 5 * 60,  // 300秒
  LONG_BREAK: 15 * 60,  // 900秒
  SESSIONS_BEFORE_LONG_BREAK: 4
};
```

## コア関数

### formatTime(totalSeconds)

秒数を `"MM:SS"` 形式にフォーマットする。

- **入力**: `number` — 0 以上の整数（秒）
- **出力**: `string` — `"MM:SS"` 形式
- **例**: `formatTime(1500)` → `"25:00"`, `formatTime(65)` → `"01:05"`, `formatTime(0)` → `"00:00"`

### calculateProgress(elapsed, total)

経過時間から進捗率を計算する（SVG プログレスバー用）。

- **入力**: `elapsed: number`（経過秒）, `total: number`（合計秒）
- **出力**: `number` — 0.0〜1.0
- **例**: `calculateProgress(750, 1500)` → `0.5`
- **注意**: `total` が 0 の場合は `0` を返す

### nextState(currentState, sessionCount)

現在の状態と完了セッション数から、次の状態と時間を返す。

- **入力**: `currentState: string`, `sessionCount: number`
- **出力**: `{ state: string, duration: number }`
- **遷移ルール**:
  - `IDLE` → `{ state: 'WORKING', duration: 1500 }`
  - `WORKING` + sessionCount < 4 → `{ state: 'SHORT_BREAK', duration: 300 }`
  - `WORKING` + sessionCount >= 4 → `{ state: 'LONG_BREAK', duration: 900 }`
  - `SHORT_BREAK` → `{ state: 'WORKING', duration: 1500 }`
  - `LONG_BREAK` → `{ state: 'IDLE', duration: 0 }`

## テストケース

| 関数 | ケース | 入力 | 期待値 |
|------|--------|------|--------|
| formatTime | 25分 | 1500 | "25:00" |
| formatTime | 0秒 | 0 | "00:00" |
| formatTime | 1秒 | 1 | "00:01" |
| formatTime | 59秒 | 59 | "00:59" |
| formatTime | 1分5秒 | 65 | "01:05" |
| calculateProgress | 半分経過 | (750, 1500) | 0.5 |
| calculateProgress | 未開始 | (0, 1500) | 0.0 |
| calculateProgress | 完了 | (1500, 1500) | 1.0 |
| calculateProgress | total=0 | (0, 0) | 0 |
| nextState | IDLE開始 | ('IDLE', 0) | { state: 'WORKING', duration: 1500 } |
| nextState | 作業→短休憩 | ('WORKING', 1) | { state: 'SHORT_BREAK', duration: 300 } |
| nextState | 作業→長休憩(4回目) | ('WORKING', 4) | { state: 'LONG_BREAK', duration: 900 } |
| nextState | 短休憩→作業 | ('SHORT_BREAK', 1) | { state: 'WORKING', duration: 1500 } |
| nextState | 長休憩→IDLE | ('LONG_BREAK', 4) | { state: 'IDLE', duration: 0 } |
