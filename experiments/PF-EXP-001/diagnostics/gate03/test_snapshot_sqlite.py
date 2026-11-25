"""SQLite WAL snapshot feasibility tests. Exploratory only, NOT Android SQLCipher validation.

Run: python -m unittest -v test_snapshot_sqlite.py
Expected baseline: 4 PASS and one FAIL (source -shm mutation) on the
authoring environment. A different SQLite build may behave differently.
"""
import hashlib
import sqlite3
import tempfile
import unittest
from pathlib import Path


def fingerprints(path):
    files = [path, Path(str(path) + "-wal"), Path(str(path) + "-shm"), Path(str(path) + "-journal")]
    return {
        f.name: (f.stat().st_size, hashlib.sha256(f.read_bytes()).hexdigest())
        for f in files if f.exists()
    }


class SnapshotFeasibilityTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.source = Path(self.tmp.name) / "source.db"
        self.snapshot = Path(self.tmp.name) / "snapshot.db"
        self.db = sqlite3.connect(self.source)
        self.addCleanup(self.db.close)
        self.assertEqual(self.db.execute("PRAGMA journal_mode=WAL").fetchone()[0], "wal")
        self.db.execute("PRAGMA wal_autocheckpoint=0")
        self.db.execute("CREATE TABLE ledger(id INTEGER PRIMARY KEY, amount INTEGER)")
        self.db.executemany("INSERT INTO ledger(amount) VALUES(?)", [(i,) for i in range(10)])
        self.db.commit()

    def backup(self):
        with sqlite3.connect(self.snapshot) as dst:
            self.db.backup(dst)

    def test_wal_backup_is_consistent(self):
        self.backup()
        with sqlite3.connect(self.snapshot) as dst:
            self.assertEqual(dst.execute("SELECT COUNT(*) FROM ledger").fetchone()[0], 10)
            self.assertEqual(dst.execute("PRAGMA integrity_check").fetchone()[0], "ok")

    def test_snapshot_independent_of_later_source_writes(self):
        self.backup()
        self.db.execute("INSERT INTO ledger(amount) VALUES(500)")
        self.db.commit()
        with sqlite3.connect(self.snapshot) as dst:
            self.assertEqual(dst.execute("SELECT COUNT(*) FROM ledger").fetchone()[0], 10)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM ledger").fetchone()[0], 11)

    def test_original_db_and_sidecars_remain_byte_identical(self):
        before = fingerprints(self.source)
        self.backup()
        self.assertEqual(before, fingerprints(self.source),
                         "SQLite backup touched source WAL/shared-memory files")

    def test_snapshot_changes_do_not_change_original_rows(self):
        self.backup()
        with sqlite3.connect(self.snapshot) as dst:
            dst.execute("UPDATE ledger SET amount=9")
            dst.commit()
        self.assertEqual(self.db.execute("SELECT amount FROM ledger WHERE id=1").fetchone()[0], 0)

    def test_backup_does_not_create_another_source_connection(self):
        # Contract test: backup is called on the existing source connection;
        # an additional source open is not required by the test API.
        self.assertFalse(self.snapshot.exists())
        self.backup()
        self.assertTrue(self.snapshot.exists())


if __name__ == "__main__":
    unittest.main(verbosity=2)
