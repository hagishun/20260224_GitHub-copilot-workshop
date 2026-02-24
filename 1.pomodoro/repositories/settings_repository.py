"""ポモドーロタイマー設定リポジトリ。

ユーザー設定の永続化を担当する。
現在はインメモリで実装、将来的にはブラウザ LocalStorage や SQLite に移行可能。
"""

from models.settings import Settings


class SettingsRepository:
    """設定の永続化を抽象化するリポジトリ。

    テスト時にモックとの差し替えが可能。
    現在はシンプルなインメモリ実装。
    """

    def __init__(self) -> None:
        """リポジトリを初期化する。"""
        self._settings = Settings()

    def get(self) -> Settings:
        """現在の設定を取得する。

        Returns:
            現在の Settings インスタンス
        """
        return self._settings

    def save(self, settings: Settings) -> None:
        """設定を保存する。

        Args:
            settings: 保存する Settings インスタンス
        """
        self._settings = settings

    def reset(self) -> None:
        """設定をデフォルトにリセットする（テスト用）。"""
        self._settings = Settings()
