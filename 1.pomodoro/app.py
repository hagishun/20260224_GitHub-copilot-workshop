"""ポモドーロタイマー Flask アプリケーション。

アプリファクトリパターンでアプリを生成し、ルーティングを定義する。
ビジネスロジックは Service 層に委譲する。
"""

from flask import Flask, jsonify, render_template, request

from config import Config
from repositories.session_repository import SessionRepository
from repositories.user_stats_repository import UserStatsRepository
from services.gamification_service import GamificationService
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
    session_repository = SessionRepository()
    stats_repository = UserStatsRepository()
    service = PomodoroService(session_repository)
    gamification_service = GamificationService(stats_repository, session_repository)
    app.service = service
    app.gamification_service = gamification_service

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

        # ゲーミフィケーション処理
        gamification_result = gamification_service.process_session_completion()
        result.update(gamification_result)

        return jsonify(result), 201

    @app.route("/api/sessions/today", methods=["GET"])
    def get_today_sessions() -> tuple:
        """今日の進捗を返す。

        Returns:
            今日の統計情報の JSON と 200 ステータスコード。
        """
        stats = service.get_today_stats()
        return jsonify(stats), 200

    @app.route("/api/gamification/stats", methods=["GET"])
    def get_gamification_stats() -> tuple:
        """ゲーミフィケーション統計を返す。

        Returns:
            XP、レベル、ストリーク、バッジの JSON と 200 ステータスコード。
        """
        stats = gamification_service.get_stats()
        return jsonify(stats), 200

    @app.route("/api/gamification/badges", methods=["GET"])
    def get_badges() -> tuple:
        """獲得したバッジ一覧を返す。

        Returns:
            バッジのリストの JSON と 200 ステータスコード。
        """
        stats = gamification_service.get_stats()
        return jsonify({"badges": stats["badges"]}), 200

    @app.route("/api/gamification/history/weekly", methods=["GET"])
    def get_weekly_history() -> tuple:
        """週間統計を返す。

        Returns:
            週間統計の JSON と 200 ステータスコード。
        """
        stats = gamification_service.get_weekly_stats()
        return jsonify(stats), 200

    @app.route("/api/gamification/history/monthly", methods=["GET"])
    def get_monthly_history() -> tuple:
        """月間統計を返す。

        Returns:
            月間統計の JSON と 200 ステータスコード。
        """
        stats = gamification_service.get_monthly_stats()
        return jsonify(stats), 200

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=app.config.get("DEBUG", False))
