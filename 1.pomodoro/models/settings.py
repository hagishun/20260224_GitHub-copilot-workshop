"""ポモドーロタイマー設定データモデル。"""

from dataclasses import dataclass


@dataclass
class Settings:
    """ポモドーロタイマーの設定を表すデータクラス。

    Attributes:
        work_duration: 作業時間（分）15/25/35/45から選択
        short_break_duration: 短い休憩時間（分）5/10/15から選択
        long_break_duration: 長い休憩時間（分）5/10/15から選択
        theme: テーマ設定 'light'/'dark'/'focus'
        sound_enabled: サウンド有効化フラグ
        start_sound_enabled: 開始音有効化フラグ
        end_sound_enabled: 終了音有効化フラグ
        tick_sound_enabled: tick音有効化フラグ
    """

    work_duration: int = 25
    short_break_duration: int = 5
    long_break_duration: int = 15
    theme: str = "light"
    sound_enabled: bool = True
    start_sound_enabled: bool = True
    end_sound_enabled: bool = True
    tick_sound_enabled: bool = False

    def to_dict(self) -> dict:
        """辞書形式に変換する。

        Returns:
            設定の辞書表現
        """
        return {
            "work_duration": self.work_duration,
            "short_break_duration": self.short_break_duration,
            "long_break_duration": self.long_break_duration,
            "theme": self.theme,
            "sound_enabled": self.sound_enabled,
            "start_sound_enabled": self.start_sound_enabled,
            "end_sound_enabled": self.end_sound_enabled,
            "tick_sound_enabled": self.tick_sound_enabled,
        }

    @staticmethod
    def from_dict(data: dict) -> "Settings":
        """辞書から Settings オブジェクトを生成する。

        Args:
            data: 設定を含む辞書

        Returns:
            Settings インスタンス
        """
        return Settings(
            work_duration=data.get("work_duration", 25),
            short_break_duration=data.get("short_break_duration", 5),
            long_break_duration=data.get("long_break_duration", 15),
            theme=data.get("theme", "light"),
            sound_enabled=data.get("sound_enabled", True),
            start_sound_enabled=data.get("start_sound_enabled", True),
            end_sound_enabled=data.get("end_sound_enabled", True),
            tick_sound_enabled=data.get("tick_sound_enabled", False),
        )
