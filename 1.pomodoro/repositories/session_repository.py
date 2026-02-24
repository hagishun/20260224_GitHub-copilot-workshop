"""セッションリポジトリ。データ永続化を抽象化する。"""

from datetime import datetime

from models.session import Session


class SessionRepository:
    """インメモリでセッションデータを管理するリポジトリ。

    将来的に SQLite 等への移行が可能な抽象化層として機能する。
    """

    def __init__(self) -> None:
        """リポジトリを初期化する。"""
        self._sessions: list[Session] = []
        self._next_id: int = 1

    def save(self, session: Session) -> Session:
        """セッションを保存する。

        Args:
            session: 保存するセッションデータ。

        Returns:
            ID が付与されたセッション。
        """
        session.id = self._next_id
        self._next_id += 1
        self._sessions.append(session)
        return session

    def find_by_date(self, date: str) -> list[Session]:
        """指定日付のセッションを検索する。

        Args:
            date: 検索対象の日付（YYYY-MM-DD 形式）。

        Returns:
            該当日付のセッションのリスト。
        """
        return [
            s for s in self._sessions
            if s.completed_at.strftime("%Y-%m-%d") == date
        ]

    def clear(self) -> None:
        """すべてのセッションデータを削除する（テスト用）。"""
        self._sessions.clear()
        self._next_id = 1
