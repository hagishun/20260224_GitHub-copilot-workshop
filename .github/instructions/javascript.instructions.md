---
applyTo: "**/*.js"
---

# JavaScript コーディング規約

## ES Modules

- `import` / `export` を使用する（`require` は使わない）
- ファイル先頭で依存を明示的にインポートする

```javascript
// Good
export function formatTime(totalSeconds) { ... }

// Bad
module.exports = { formatTime };
```

## 純粋関数の分離

- `timer.js` には DOM に依存しない純粋関数のみを配置する
- DOM 操作・イベントリスナー・API 通信は `ui.js` に配置する
- 純粋関数は入力のみに基づいて出力を返し、副作用を持たない

```javascript
// timer.js — 純粋関数（テスト可能）
export function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ui.js — DOM 操作（timer.js を利用）
import { formatTime } from './timer.js';
document.getElementById('timer-display').textContent = formatTime(remaining);
```

## 命名規則

- 関数名・変数名: `camelCase`
- 定数: `UPPER_SNAKE_CASE`
- クラス名: `PascalCase`

## 状態管理

- タイマーの状態は文字列定数で管理する: `'IDLE'`, `'WORKING'`, `'SHORT_BREAK'`, `'LONG_BREAK'`
- 状態遷移ロジックは `nextState()` 関数に集約する

## API 通信

- `fetch` API を使用する
- レスポンスは `response.json()` でパースする
- エラーハンドリングは `try/catch` で行う

## コメント

- 複雑なロジックには日本語でコメントを付与する
- JSDoc 形式で関数の引数・戻り値を記述する

```javascript
/**
 * 秒数を MM:SS 形式にフォーマットする
 * @param {number} totalSeconds - 合計秒数
 * @returns {string} "MM:SS" 形式の文字列
 */
export function formatTime(totalSeconds) { ... }
```
