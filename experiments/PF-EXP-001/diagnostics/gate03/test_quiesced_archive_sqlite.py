"""Synthetic SQLite only; requires externally coordinated quiescence."""
import hashlib
import shutil
import sqlite3
import tempfile
import unittest
from pathlib import Path


def snapshot(path):
    result = {}
    for suffix in ("", "-wal", "-shm", "-journal"):
        file = Path(str(path) + suffix)
        if file.exists():
            result[suffix or "db"] = (file.stat().st_size, hashlib.sha256(file.read_bytes()).hexdigest())
    return result


class QuiescedArchiveTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.source = Path(self.tmp.name) / "live.db"
        self.archive = Path(self.tmp.name) / "copy.db"
        self.db = sqlite3.connect(self.source)
        self.addCleanup(self.db.close)
        self.assertEqual(self.db.execute("PRAGMA journal_mode=WAL").fetchone()[0], "wal")
        self.db.execute("PRAGMA wal_autocheckpoint=0")
        self.db.execute("CREATE TABLE ledger(id INTEGER PRIMARY KEY, value TEXT)")
        self.db.executemany("INSERT INTO ledger(value) VALUES(?)", [(str(i),) for i in range(15)])
        self.db.commit()

    def archive_bundle(self):
        # SYNTHETIC test has a single controlled DB connection and no concurrent writers.
        # Production must prove in-process quiescence across ALL connections.
        for suffix in ("", "-wal", "-shm"):
            original = Path(str(self.source) + suffix)
            if original.exists():
                shutil.copyfile(original, Path(str(self.archive) + suffix))

    def test_copy_is_consistent_and_source_is_untouched(self):
        before = snapshot(self.source)
        self.archive_bundle()
        self.assertEqual(before, snapshot(self.source))
        with sqlite3.connect(self.archive) as copy:
            self.assertEqual(copy.execute("SELECT COUNT(*) FROM ledger").fetchone()[0], 15)
            self.assertEqual(copy.execute("PRAGMA integrity_check").fetchone()[0], "ok")

    def test_source_updates_after_copy_do_not_affect_snapshot(self):
        self.archive_bundle()
        self.db.execute("INSERT INTO ledger(value) VALUES('later')")
        self.db.commit()
        with sqlite3.connect(self.archive) as copy:
            self.assertEqual(copy.execute("SELECT COUNT(*) FROM ledger").fetchone()[0], 15)

    def test_copying_only_main_database_is_not_sufficient_with_wal(self):
        shutil.copyfile(self.source, self.archive)
        with sqlite3.connect(self.archive) as copy:
            with self.assertRaises(sqlite3.DatabaseError):
                copy.execute("SELECT COUNT(*) FROM ledger").fetchone()


if __name__ == "__main__":
    unittest.main(verbosity=2)
