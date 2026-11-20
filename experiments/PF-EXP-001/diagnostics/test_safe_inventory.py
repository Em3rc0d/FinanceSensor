import hashlib
import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from safe_inventory import inventory, DiagnosticRefused

class InventoryTests(unittest.TestCase):
    def setUp(self):
        self.t = tempfile.TemporaryDirectory()
        self.path = Path(self.t.name)/'synthetic.db'
        with closing(sqlite3.connect(self.path)) as con:
            con.executescript("""
            CREATE TABLE statement_sources(source_receipt_id TEXT PRIMARY KEY, terminal_state TEXT);
            CREATE TABLE derived_evidence(evidence_id TEXT, semantic_type TEXT, flow_direction TEXT,
                evidence_channel TEXT, account_id TEXT, processed_at TEXT);
            INSERT INTO statement_sources VALUES('private-fixture-a','IMPORTED');
            INSERT INTO statement_sources VALUES('private-fixture-b','FAILED');
            INSERT INTO derived_evidence VALUES('one','UNKNOWN','OUTFLOW','STATEMENT_LEDGER',NULL,NULL);
            INSERT INTO derived_evidence VALUES('two','fee','OUTFLOW','STATEMENT_LEDGER','secret-account','2026-01-01');
            INSERT INTO derived_evidence VALUES('three','unexpected','INFLOW','GMAIL_TRANSACTION',NULL,NULL);
            """)
    def tearDown(self):
        self.t.cleanup()
    def test_counts_and_no_identifiers(self):
        result=inventory(self.path)
        self.assertEqual(result['evidenceTotal'],3)
        self.assertEqual(result['semantics']['UNKNOWN'],1)
        self.assertEqual(result['flow']['OUTFLOW'],2)
        self.assertEqual(result['account']['LINKED'],1)
        self.assertNotIn('private-fixture',str(result))
        self.assertNotIn('secret-account',str(result))
    def test_does_not_modify_file(self):
        before=(self.path.stat().st_mtime_ns, hashlib.sha256(self.path.read_bytes()).hexdigest())
        self.assertEqual(inventory(self.path), inventory(self.path))
        after=(self.path.stat().st_mtime_ns, hashlib.sha256(self.path.read_bytes()).hexdigest())
        self.assertEqual(before,after)
    def test_missing_db_does_not_create(self):
        p=self.path.parent/'missing.db'
        with self.assertRaises(DiagnosticRefused): inventory(p)
        self.assertFalse(p.exists())
    def test_unexpected_schema(self):
        with closing(sqlite3.connect(self.path)) as con:
            con.execute('DROP TABLE derived_evidence')
            con.commit()
        with self.assertRaises(DiagnosticRefused): inventory(self.path)
    def test_no_write_permission(self):
        self.path.chmod(0o444)
        self.assertEqual(inventory(self.path)['evidenceTotal'],3)

if __name__=='__main__': unittest.main()
