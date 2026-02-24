---
applyTo: "**/*.py"
---

# Python コーディング規約

## 型ヒント

- すべての関数の引数と戻り値に型ヒントを付与する
- `from __future__ import annotations` は不要（Python 3.11+）
- コレクション型は `list[T]`, `dict[K, V]` の小文字記法を使う

```python
# Good
def complete_session(self, duration_minutes: int) -> dict:
    ...

# Bad
def complete_session(self, duration_minutes):
    ...
```

## Docstring

- すべてのクラスと公開メソッドに Google スタイルの docstring を付与する
- 引数・戻り値・例外を明記する

```python
def complete_session(self, duration_minutes: int) -> dict:
    """セッション完了を記録する。

    Args:
        duration_minutes: セッションの長さ（分）

    Returns:
        記録結果を含む辞書（id, completed_at）

    Raises:
        ValueError: duration_minutes が正の整数でない場合
    """
```

## 依存性注入（DI）パターン

- サービス層はコンストラクタでリポジトリを受け取る
- Flask の `app` オブジェクトに依存しない純粋なクラスとして実装する
- テスト時にモックリポジトリを注入可能にする

```python
class PomodoroService:
    def __init__(self, repository: SessionRepository) -> None:
        self.repository = repository
```

## アプリファクトリパターン

- `create_app(config=None)` で Flask アプリを生成する
- テストごとに独立したアプリインスタンスを生成可能にする

## dataclass

- モデルは `@dataclass` で定義する
- フィールドには型ヒントを必ず付与する

## インポート順序

1. 標準ライブラリ
2. サードパーティ（Flask 等）
3. プロジェクト内モジュール

各グループ間は空行1行で区切る。
