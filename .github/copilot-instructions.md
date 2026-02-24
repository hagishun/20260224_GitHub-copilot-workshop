# Copilot Instructions

## 重要：言語設定

**必ず日本語でレビューを行ってください。すべてのコメント、提案、説明は日本語で記述してください。**

## ファイル配置ルール

- **Pomodoro タイマー**に関する作業では、ファイルを `1.pomodoro/` 配下に保存してください。
- **Copilot Web Relay** に関する作業では、ファイルを `2.copilotWebRelay/` 配下に保存してください。

## ポモドーロタイマー アーキテクチャ

レイヤードアーキテクチャを採用。詳細は `1.pomodoro/architecture.md` を参照。

- **Route（app.py）**: ルーティングのみ。ビジネスロジックは書かない
- **Service（services/）**: Flask 非依存。DI でリポジトリを受け取る
- **Repository（repositories/）**: データ永続化の抽象化
- **Model（models/）**: `@dataclass` によるデータ構造
- **timer.js**: DOM 非依存の純粋関数。Jest でテスト可能
- **ui.js**: DOM 操作・イベント・API 通信

## コーディング規約

- Python: 型ヒント必須、Google スタイル docstring、DI パターン
- JavaScript: ES Modules、純粋関数分離、JSDoc コメント
- テスト: Arrange-Act-Assert パターン、テスト間の独立性確保
