"""ポモドーロタイマー Flask アプリケーション。

アプリファクトリパターンでアプリを生成し、ルーティングを定義する。
ビジネスロジックは Service 層に委譲する。
"""

from flask import Flask, jsonify, render_template, request

from config import Config
from repositories.session_repository import SessionRepository
from repositories.settings_repository import SettingsRepository
from services.pomodoro_service import PomodoroService
from services.settings_service import SettingsService


def create_app(config: object | None = None) -> Flask:
    """Flask アプリケーションを生成する。

    Args:
        config: 設定オブジェクト。None の場合はデフォルト設定を使用する。

    Returns:
        設定済みの Flask アプリケーションインスタンス。
    """
    app = Flask(__name__)

    if config:
        app.config.from_object(config)
    else:
        app.config.from_object(Config)

    # サービス・リポジトリの初期化
    session_repository = SessionRepository()
    service = PomodoroService(session_repository)
    app.service = service

    settings_repository = SettingsRepository()
    settings_service = SettingsService(settings_repository)
    app.settings_service = settings_service

    @app.route("/")
    def index() -> str:
        """メインページを返す。"""
        return render_template("index.html")

    @app.route("/api/sessions", methods=["POST"])
    def create_session() -> tuple:
        """セッション完了を記録する。

        Returns:
            記録結果の JSON と 201 ステータスコード。
        """
        data = request.get_json()
        duration_minutes = data.get("duration_minutes", 25)
        result = service.complete_session(duration_minutes)
        return jsonify(result), 201

    @app.route("/api/sessions/today", methods=["GET"])
    def get_today_sessions() -> tuple:
        """今日の進捗を返す。

        Returns:
            今日の統計情報の JSON と 200 ステータスコード。
        """
        stats = service.get_today_stats()
        return jsonify(stats), 200

    @app.route("/api/settings", methods=["GET"])
    def get_settings() -> tuple:
        """現在の設定を返す。

        Returns:
            設定の JSON と 200 ステータスコード。
        """
        settings = settings_service.get_settings()
        return jsonify(settings), 200

    @app.route("/api/settings", methods=["PUT"])
    def update_settings() -> tuple:
        """設定を更新する。

        Returns:
            更新後の設定の JSON と 200 ステータスコード。
            エラーの場合は 400 ステータスコード。
        """
        data = request.get_json()
        try:
            result = settings_service.update_settings(data)
            return jsonify(result), 200
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=app.config.get("DEBUG", False))
