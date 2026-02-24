"""ゲーミフィケーションサービス。XP、レベル、バッジ、ストリークを管理する。"""

from datetime import datetime, timedelta

from models.user_stats import Badge, UserStats
from repositories.session_repository import SessionRepository
from repositories.user_stats_repository import UserStatsRepository


class GamificationService:
    """ゲーミフィケーション機能のビジネスロジック。

    XP計算、レベルアップ、バッジ付与、ストリーク管理を担当する。
    """

    # XP設定
    XP_PER_SESSION = 50
    XP_PER_LEVEL = 100

    # バッジ定義
    BADGE_DEFINITIONS = {
        "first_session": {
            "name": "はじめの一歩",
            "description": "最初のポモドーロを完了",
        },
        "streak_3": {
            "name": "3日連続",
            "description": "3日連続でセッションを完了",
        },
        "streak_7": {
            "name": "1週間連続",
            "description": "7日連続でセッションを完了",
        },
        "sessions_10": {
            "name": "駆け出し",
            "description": "累計10セッション完了",
        },
        "sessions_50": {
            "name": "熟練者",
            "description": "累計50セッション完了",
        },
        "sessions_100": {
            "name": "達人",
            "description": "累計100セッション完了",
        },
        "weekly_10": {
            "name": "今週の集中王",
            "description": "今週10セッション完了",
        },
    }

    def __init__(
        self,
        stats_repository: UserStatsRepository,
        session_repository: SessionRepository,
    ) -> None:
        """サービスを初期化する。

        Args:
            stats_repository: ユーザー統計データの永続化を担当するリポジトリ。
            session_repository: セッションデータの永続化を担当するリポジトリ。
        """
        self.stats_repository = stats_repository
        self.session_repository = session_repository

    def process_session_completion(self) -> dict:
        """セッション完了時のゲーミフィケーション処理を実行する。

        XP付与、レベルアップ、ストリーク更新、バッジチェックを行う。

        Returns:
            更新後の統計情報（xp, level, level_up, new_badges）。
        """
        stats = self.stats_repository.get()
        today = datetime.now().strftime("%Y-%m-%d")

        # XP付与
        old_level = stats.level
        stats.xp += self.XP_PER_SESSION
        stats.level = self._calculate_level(stats.xp)
        level_up = stats.level > old_level

        # ストリーク更新
        stats = self._update_streak(stats, today)

        # バッジチェック
        new_badges = self._check_and_award_badges(stats)

        # 保存
        self.stats_repository.update(stats)

        return {
            "xp": stats.xp,
            "level": stats.level,
            "level_up": level_up,
            "new_badges": [
                {"id": b.id, "name": b.name, "description": b.description}
                for b in new_badges
            ],
        }

    def get_stats(self) -> dict:
        """現在のユーザー統計を取得する。

        Returns:
            ユーザー統計情報の辞書。
        """
        stats = self.stats_repository.get()
        return {
            "xp": stats.xp,
            "level": stats.level,
            "current_streak": stats.current_streak,
            "longest_streak": stats.longest_streak,
            "badges": [
                {
                    "id": b.id,
                    "name": b.name,
                    "description": b.description,
                    "earned_at": b.earned_at.isoformat() if b.earned_at else None,
                }
                for b in stats.badges
            ],
        }

    def get_weekly_stats(self) -> dict:
        """週間統計を取得する。

        Returns:
            今週の完了数、完了率、平均集中時間。
        """
        today = datetime.now()
        start_of_week = today - timedelta(days=today.weekday())
        start_date = start_of_week.strftime("%Y-%m-%d")

        sessions = []
        for i in range(7):
            date = (start_of_week + timedelta(days=i)).strftime("%Y-%m-%d")
            day_sessions = self.session_repository.find_by_date(date)
            sessions.extend(day_sessions)

        total_sessions = len(sessions)
        total_minutes = sum(s.duration_minutes for s in sessions)
        avg_minutes = total_minutes / 7 if total_sessions > 0 else 0
        completion_rate = (total_sessions / 7) * 100 if total_sessions > 0 else 0

        # 日別データ
        daily_data = []
        for i in range(7):
            date = (start_of_week + timedelta(days=i)).strftime("%Y-%m-%d")
            day_sessions = self.session_repository.find_by_date(date)
            daily_data.append(
                {
                    "date": date,
                    "sessions": len(day_sessions),
                    "minutes": sum(s.duration_minutes for s in day_sessions),
                }
            )

        return {
            "total_sessions": total_sessions,
            "total_minutes": total_minutes,
            "avg_minutes_per_day": round(avg_minutes, 1),
            "completion_rate": round(completion_rate, 1),
            "daily_data": daily_data,
        }

    def get_monthly_stats(self) -> dict:
        """月間統計を取得する。

        Returns:
            今月の完了数、完了率、平均集中時間。
        """
        today = datetime.now()
        start_of_month = today.replace(day=1)
        days_in_month = (
            (today.replace(month=today.month + 1, day=1) - timedelta(days=1)).day
            if today.month < 12
            else 31
        )

        sessions = []
        for i in range(days_in_month):
            date = (start_of_month + timedelta(days=i)).strftime("%Y-%m-%d")
            day_sessions = self.session_repository.find_by_date(date)
            sessions.extend(day_sessions)

        total_sessions = len(sessions)
        total_minutes = sum(s.duration_minutes for s in sessions)
        avg_minutes = total_minutes / days_in_month if total_sessions > 0 else 0
        completion_rate = (
            (total_sessions / days_in_month) * 100 if total_sessions > 0 else 0
        )

        # 週別データ
        weekly_data = []
        current_week_start = start_of_month
        week_num = 1
        while current_week_start.month == today.month:
            week_end = min(
                current_week_start + timedelta(days=6),
                today.replace(
                    month=today.month + 1 if today.month < 12 else 1, day=1
                )
                - timedelta(days=1),
            )

            week_sessions = []
            current_date = current_week_start
            while current_date <= week_end and current_date.month == today.month:
                date_str = current_date.strftime("%Y-%m-%d")
                week_sessions.extend(self.session_repository.find_by_date(date_str))
                current_date += timedelta(days=1)

            weekly_data.append(
                {
                    "week": week_num,
                    "sessions": len(week_sessions),
                    "minutes": sum(s.duration_minutes for s in week_sessions),
                }
            )

            current_week_start = week_end + timedelta(days=1)
            week_num += 1

        return {
            "total_sessions": total_sessions,
            "total_minutes": total_minutes,
            "avg_minutes_per_day": round(avg_minutes, 1),
            "completion_rate": round(completion_rate, 1),
            "weekly_data": weekly_data,
        }

    def _calculate_level(self, xp: int) -> int:
        """XPからレベルを計算する。

        Args:
            xp: 経験値。

        Returns:
            計算されたレベル。
        """
        return (xp // self.XP_PER_LEVEL) + 1

    def _update_streak(self, stats: UserStats, today: str) -> UserStats:
        """ストリークを更新する。

        Args:
            stats: 現在のユーザー統計。
            today: 今日の日付（YYYY-MM-DD形式）。

        Returns:
            更新されたユーザー統計。
        """
        if stats.last_session_date is None:
            # 初回セッション
            stats.current_streak = 1
            stats.longest_streak = 1
            stats.last_session_date = today
        elif stats.last_session_date == today:
            # 同じ日の複数セッション：ストリークは変更なし
            pass
        else:
            # 前回のセッション日を解析
            last_date = datetime.strptime(stats.last_session_date, "%Y-%m-%d")
            current_date = datetime.strptime(today, "%Y-%m-%d")
            days_diff = (current_date - last_date).days

            if days_diff == 1:
                # 連続日
                stats.current_streak += 1
                stats.longest_streak = max(stats.longest_streak, stats.current_streak)
            else:
                # ストリーク途切れ
                stats.current_streak = 1

            stats.last_session_date = today

        return stats

    def _check_and_award_badges(self, stats: UserStats) -> list[Badge]:
        """バッジの条件をチェックして付与する。

        Args:
            stats: 現在のユーザー統計。

        Returns:
            新しく獲得したバッジのリスト。
        """
        new_badges = []
        earned_badge_ids = {b.id for b in stats.badges}

        # 全セッション数を取得
        all_sessions = []
        for session_list in [
            self.session_repository.find_by_date(
                (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
            )
            for i in range(365)  # 過去1年分
        ]:
            all_sessions.extend(session_list)

        total_sessions = len(all_sessions)

        # 今週のセッション数を取得
        today = datetime.now()
        start_of_week = today - timedelta(days=today.weekday())
        weekly_sessions = []
        for i in range(7):
            date = (start_of_week + timedelta(days=i)).strftime("%Y-%m-%d")
            weekly_sessions.extend(self.session_repository.find_by_date(date))

        # バッジチェック
        badges_to_check = [
            ("first_session", total_sessions >= 1),
            ("streak_3", stats.current_streak >= 3),
            ("streak_7", stats.current_streak >= 7),
            ("sessions_10", total_sessions >= 10),
            ("sessions_50", total_sessions >= 50),
            ("sessions_100", total_sessions >= 100),
            ("weekly_10", len(weekly_sessions) >= 10),
        ]

        for badge_id, condition in badges_to_check:
            if condition and badge_id not in earned_badge_ids:
                badge_def = self.BADGE_DEFINITIONS[badge_id]
                new_badge = Badge(
                    id=badge_id,
                    name=badge_def["name"],
                    description=badge_def["description"],
                    earned_at=datetime.now(),
                )
                stats.badges.append(new_badge)
                new_badges.append(new_badge)

        return new_badges
