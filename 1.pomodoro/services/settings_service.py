"""ポモドーロタイマー設定サービス。

設定の検証とビジネスロジックを担当する。
"""

from models.settings import Settings
from repositories.settings_repository import SettingsRepository


class SettingsService:
    """設定に関するビジネスロジックを提供するサービス。

    Flask に依存しない純粋なサービス層。
    リポジトリを DI で受け取る。
    """

    # 許可される設定値
    ALLOWED_WORK_DURATIONS = [15, 25, 35, 45]
    ALLOWED_BREAK_DURATIONS = [5, 10, 15]
    ALLOWED_THEMES = ["light", "dark", "focus"]

    def __init__(self, repository: SettingsRepository) -> None:
        """サービスを初期化する。

        Args:
            repository: 設定リポジトリ
        """
        self.repository = repository

    def get_settings(self) -> dict:
        """現在の設定を取得する。

        Returns:
            設定の辞書表現
        """
        settings = self.repository.get()
        return settings.to_dict()

    def update_settings(self, data: dict) -> dict:
        """設定を更新する。

        Args:
            data: 更新する設定値を含む辞書

        Returns:
            更新後の設定の辞書表現

        Raises:
            ValueError: 不正な設定値が含まれている場合
        """
        # 現在の設定を取得
        current_settings = self.repository.get()

        # 更新データから新しい設定を作成
        new_data = current_settings.to_dict()
        new_data.update(data)

        # 検証
        self._validate_settings(new_data)

        # Settings オブジェクトに変換して保存
        new_settings = Settings.from_dict(new_data)
        self.repository.save(new_settings)

        return new_settings.to_dict()

    def _validate_settings(self, data: dict) -> None:
        """設定値を検証する。

        Args:
            data: 検証する設定データ

        Raises:
            ValueError: 不正な設定値が含まれている場合
        """
        work_duration = data.get("work_duration")
        if work_duration not in self.ALLOWED_WORK_DURATIONS:
            raise ValueError(
                f"work_duration must be one of {self.ALLOWED_WORK_DURATIONS}, got {work_duration}"
            )

        short_break = data.get("short_break_duration")
        if short_break not in self.ALLOWED_BREAK_DURATIONS:
            raise ValueError(
                f"short_break_duration must be one of {self.ALLOWED_BREAK_DURATIONS}, got {short_break}"
            )

        long_break = data.get("long_break_duration")
        if long_break not in self.ALLOWED_BREAK_DURATIONS:
            raise ValueError(
                f"long_break_duration must be one of {self.ALLOWED_BREAK_DURATIONS}, got {long_break}"
            )

        theme = data.get("theme")
        if theme not in self.ALLOWED_THEMES:
            raise ValueError(
                f"theme must be one of {self.ALLOWED_THEMES}, got {theme}"
            )

        # ブール値の検証
        for key in [
            "sound_enabled",
            "start_sound_enabled",
            "end_sound_enabled",
            "tick_sound_enabled",
        ]:
            if not isinstance(data.get(key), bool):
                raise ValueError(f"{key} must be a boolean")
