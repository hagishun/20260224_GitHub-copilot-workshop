"""ポモドーロタイマー アプリケーション設定モジュール。"""


class Config:
    """本番用設定。"""

    WORK_DURATION: int = 25 * 60  # 秒
    SHORT_BREAK_DURATION: int = 5 * 60
    LONG_BREAK_DURATION: int = 15 * 60
    SESSIONS_BEFORE_LONG_BREAK: int = 4


class TestConfig(Config):
    """テスト用設定（短い時間でテスト可能）。"""

    WORK_DURATION: int = 3  # 秒
    SHORT_BREAK_DURATION: int = 1
    LONG_BREAK_DURATION: int = 2
    SESSIONS_BEFORE_LONG_BREAK: int = 4
