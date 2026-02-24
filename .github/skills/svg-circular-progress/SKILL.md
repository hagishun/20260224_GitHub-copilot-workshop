# スキル: SVG 円形プログレスバー

## 概要

SVG の `<circle>` 要素と `stroke-dasharray` / `stroke-dashoffset` を使った円形プログレスバーの実装ガイド。

## 原理

```
circumference = 2 * π * radius
offset = circumference * (1 - progress)
```

- `stroke-dasharray`: 円周長を設定（破線パターンの長さ）
- `stroke-dashoffset`: 残り時間に応じてオフセットを設定
- `progress = 0.0` → 完全に隠れる（offset = circumference）
- `progress = 1.0` → 完全に表示（offset = 0）

## HTML 構造

```html
<div class="timer-circle">
  <svg width="200" height="200" viewBox="0 0 200 200">
    <!-- 背景の円 -->
    <circle
      cx="100" cy="100" r="90"
      fill="none"
      stroke="rgba(255, 255, 255, 0.1)"
      stroke-width="8"
    />
    <!-- プログレスの円 -->
    <circle
      id="progress-ring"
      cx="100" cy="100" r="90"
      fill="none"
      stroke="url(#gradient)"
      stroke-width="8"
      stroke-linecap="round"
      stroke-dasharray="565.48"
      stroke-dashoffset="0"
      transform="rotate(-90 100 100)"
    />
  </svg>
  <div class="timer-display" id="timer-display">25:00</div>
</div>
```

## キーポイント

### radius = 90 の場合の計算

```javascript
const radius = 90;
const circumference = 2 * Math.PI * radius; // ≈ 565.48

function updateProgress(progress) {
  const offset = circumference * (1 - progress);
  progressRing.style.strokeDashoffset = offset;
}
```

### transform="rotate(-90 100 100)"

- SVG の円は3時方向（右）から描画が始まる
- `-90` 度回転させて12時方向（上）から開始にする
- `100 100` は回転の中心座標（SVG の中心）

### CSS トランジション

```css
#progress-ring {
  transition: stroke-dashoffset 1s linear;
}
```

- `1s linear` でスムーズなアニメーション
- カウントダウンの1秒ごとに更新される

### グラデーション

```html
<defs>
  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="#a855f7" />
    <stop offset="100%" stop-color="#6366f1" />
  </linearGradient>
</defs>
```

## JavaScript での更新

```javascript
import { calculateProgress } from './timer.js';

function updateTimerDisplay(elapsed, total) {
  const progress = calculateProgress(elapsed, total);
  const circumference = 2 * Math.PI * 90;
  const offset = circumference * (1 - progress);

  const ring = document.getElementById('progress-ring');
  ring.style.strokeDashoffset = offset;
}
```

## よくある間違い

| 問題 | 原因 | 修正 |
|------|------|------|
| プログレスが逆方向に動く | progress の計算が逆 | `1 - progress` に修正 |
| 開始位置が3時方向 | `transform` 未設定 | `rotate(-90 cx cy)` を追加 |
| アニメーションがカクカク | transition 未設定 | CSS に `transition` を追加 |
| 円が途切れる | `stroke-dasharray` が不正 | 正確に `circumference` を設定 |
