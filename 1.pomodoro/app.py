"""ポモドーロタイマー Flask アプリケーション。

アプリファクトリパターンでアプリを生成し、ルーティングを定義する。
ビジネスロジックは Service 層に委譲する。
"""

from flask import Flask, jsonify, render_template, request

from config import Config
from repositories.session_repository import SessionRepository
from services.pomodoro_service import PomodoroService


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
    repository = SessionRepository()
    service = PomodoroService(repository)
    app.service = service

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

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
