"""ユーザー統計モデル。"""

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Badge:
    """達成バッジのデータ構造。

    Attributes:
        id: バッジの一意識別子。
        name: バッジ名。
        description: バッジの説明。
        earned_at: バッジ獲得日時。
    """

    id: str
    name: str
    description: str
    earned_at: datetime | None = None


@dataclass
class UserStats:
    """ユーザーのゲーミフィケーション統計データ。

    Attributes:
        xp: 経験値（Experience Points）。
        level: 現在のレベル。
        current_streak: 現在の連続日数。
        longest_streak: 最長連続日数。
        last_session_date: 最後のセッション日付（YYYY-MM-DD形式）。
        badges: 獲得したバッジのリスト。
    """

    xp: int = 0
    level: int = 1
    current_streak: int = 0
    longest_streak: int = 0
    last_session_date: str | None = None
    badges: list[Badge] = field(default_factory=list)
