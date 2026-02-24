"""ポモドーロサービス。ビジネスロジックを担当する。"""

from datetime import datetime

from models.session import Session
from repositories.session_repository import SessionRepository


class PomodoroService:
    """ポモドーロタイマーのビジネスロジック。

    Flask に依存しない純粋なサービス層。
    DI でリポジトリを受け取り、テスト時にモック差し替えが可能。
    """

    def __init__(self, repository: SessionRepository) -> None:
        """サービスを初期化する。

        Args:
            repository: セッションデータの永続化を担当するリポジトリ。
        """
        self.repository = repository

    def complete_session(self, duration_minutes: int) -> dict:
        """セッション完了を記録する。

        Args:
            duration_minutes: セッションの長さ（分）。

        Returns:
            記録結果を含む辞書（id, completed_at）。

        Raises:
            ValueError: duration_minutes が正の整数でない場合。
        """
        if duration_minutes <= 0:
            raise ValueError("duration_minutes は正の整数である必要があります")

        now = datetime.now()
        session = Session(id=0, duration_minutes=duration_minutes, completed_at=now)
        saved = self.repository.save(session)

        return {
            "id": saved.id,
            "completed_at": saved.completed_at.isoformat(),
        }

    def get_today_stats(self) -> dict:
        """今日の進捗統計を取得する。

        Returns:
            完了セッション数と累計集中時間を含む辞書。
        """
        today = datetime.now().strftime("%Y-%m-%d")
        sessions = self.repository.find_by_date(today)

        completed_count = len(sessions)
        total_focus_minutes = sum(s.duration_minutes for s in sessions)

        return {
            "completed_count": completed_count,
            "total_focus_minutes": total_focus_minutes,
        }
