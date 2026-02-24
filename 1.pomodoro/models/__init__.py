"""セッションモデル。"""

from dataclasses import dataclass
from datetime import datetime


@dataclass
class Session:
    """ポモドーロセッションのデータ構造。

    Attributes:
        id: セッションの一意識別子。
        duration_minutes: セッションの長さ（分）。
        completed_at: セッション完了日時。
    """

    id: int
    duration_minutes: int
    completed_at: datetime
