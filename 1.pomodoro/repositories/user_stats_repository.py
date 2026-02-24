"""ユーザー統計リポジトリ。ゲーミフィケーションデータの永続化を抽象化する。"""

from models.user_stats import UserStats


class UserStatsRepository:
    """インメモリでユーザー統計データを管理するリポジトリ。

    将来的に SQLite 等への移行が可能な抽象化層として機能する。
    """

    def __init__(self) -> None:
        """リポジトリを初期化する。"""
        self._stats: UserStats = UserStats()

    def get(self) -> UserStats:
        """ユーザー統計を取得する。

        Returns:
            ユーザーの統計データ。
        """
        return self._stats

    def update(self, stats: UserStats) -> UserStats:
        """ユーザー統計を更新する。

        Args:
            stats: 更新するユーザー統計データ。

        Returns:
            更新されたユーザー統計。
        """
        self._stats = stats
        return self._stats

    def clear(self) -> None:
        """すべての統計データを削除する（テスト用）。"""
        self._stats = UserStats()
