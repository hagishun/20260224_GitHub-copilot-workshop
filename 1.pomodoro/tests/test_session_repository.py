"""SessionRepository のユニットテスト。"""

from datetime import datetime

from models.session import Session


class TestSessionRepositorySave:
    """save メソッドのテスト。"""

    def test_save_assigns_id(self, repository):
        """保存時に ID が自動付与される。"""
        session = Session(id=0, duration_minutes=25, completed_at=datetime.now())
        saved = repository.save(session)
        assert saved.id == 1

    def test_save_increments_id(self, repository):
        """連続保存で ID がインクリメントされる。"""
        s1 = Session(id=0, duration_minutes=25, completed_at=datetime.now())
        s2 = Session(id=0, duration_minutes=25, completed_at=datetime.now())
        repository.save(s1)
        repository.save(s2)
        assert s1.id == 1
        assert s2.id == 2


class TestSessionRepositoryFindByDate:
    """find_by_date メソッドのテスト。"""

    def test_find_by_date_returns_matching_sessions(self, repository):
        """指定日付のセッションのみ返す。"""
        now = datetime.now()
        session = Session(id=0, duration_minutes=25, completed_at=now)
        repository.save(session)

        today = now.strftime("%Y-%m-%d")
        results = repository.find_by_date(today)
        assert len(results) == 1
        assert results[0].duration_minutes == 25

    def test_find_by_date_returns_empty_for_no_data(self, repository):
        """データがない日付では空リストを返す。"""
        results = repository.find_by_date("2000-01-01")
        assert results == []

    def test_find_by_date_filters_by_date(self, repository):
        """異なる日付のセッションは返さない。"""
        session = Session(
            id=0,
            duration_minutes=25,
            completed_at=datetime(2025, 1, 1, 10, 0, 0),
        )
        repository.save(session)

        results = repository.find_by_date("2025-01-02")
        assert results == []

    def test_find_by_date_returns_multiple_sessions(self, repository):
        """同じ日付の複数セッションを返す。"""
        now = datetime.now()
        for _ in range(3):
            session = Session(id=0, duration_minutes=25, completed_at=now)
            repository.save(session)

        today = now.strftime("%Y-%m-%d")
        results = repository.find_by_date(today)
        assert len(results) == 3


class TestSessionRepositoryClear:
    """clear メソッドのテスト。"""

    def test_clear_removes_all_data(self, repository):
        """clear() ですべてのデータが削除される。"""
        session = Session(id=0, duration_minutes=25, completed_at=datetime.now())
        repository.save(session)
        repository.clear()

        today = datetime.now().strftime("%Y-%m-%d")
        assert repository.find_by_date(today) == []

    def test_clear_resets_id_counter(self, repository):
        """clear() で ID カウンターがリセットされる。"""
        session = Session(id=0, duration_minutes=25, completed_at=datetime.now())
        repository.save(session)
        repository.clear()

        new_session = Session(id=0, duration_minutes=25, completed_at=datetime.now())
        repository.save(new_session)
        assert new_session.id == 1
