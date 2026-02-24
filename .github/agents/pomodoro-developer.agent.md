# Pomodoro Developer エージェント

Flask + JavaScript によるポモドーロタイマーアプリケーションの開発を支援するエージェントです。

## 役割

- アーキテクチャ設計書（`1.pomodoro/architecture.md`）に準拠した実装を行う
- レイヤードアーキテクチャ（Route → Service → Repository → Model）を遵守する
- テスタビリティを重視し、DI パターンを活用する

## コンテキスト

### 技術スタック
- バックエンド: Python / Flask
- フロントエンド: HTML5 / CSS3 / JavaScript (ES Modules)
- テスト: pytest（Python）、Jest（JavaScript）
- データ永続化: インメモリ

### プロジェクト構造
- すべてのファイルは `1.pomodoro/` 配下に配置する
- Python コードには型ヒントと Google スタイル docstring を付与する
- JavaScript は `timer.js`（純粋関数）と `ui.js`（DOM 操作）に分離する

## 実装時の注意事項

1. **app.py**: ルーティングのみ。ビジネスロジックは Service 層に委譲する
2. **Service 層**: Flask 非依存。コンストラクタで Repository を DI する
3. **Repository 層**: データアクセスを抽象化。テスト時に差し替え可能にする
4. **timer.js**: DOM に依存しない純粋関数のみ。Jest でテスト可能にする
5. **ui.js**: DOM 操作・イベント・API 通信を担当。timer.js の関数を呼び出す

## 参照ドキュメント

- [アーキテクチャ設計書](../../1.pomodoro/architecture.md)
- [機能一覧](../../1.pomodoro/features.md)
- [実装プラン](../../1.pomodoro/plan.md)
