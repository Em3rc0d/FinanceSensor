"""RES-001B synthetic SQLite aggregation prototype; NOT a SQLCipher reader."""
import sqlite3
from pathlib import Path
from urllib.parse import quote

READ_ACTIONS = {
    sqlite3.SQLITE_SELECT, sqlite3.SQLITE_READ, sqlite3.SQLITE_FUNCTION,
    sqlite3.SQLITE_TRANSACTION, sqlite3.SQLITE_PRAGMA,
}

class DiagnosticRefused(Exception):
    pass

def _authorizer(action, arg1, arg2, dbname, source):
    if action == sqlite3.SQLITE_PRAGMA:
        return sqlite3.SQLITE_OK if (arg1 or '').lower() in {'query_only', 'table_info'} else sqlite3.SQLITE_DENY
    return sqlite3.SQLITE_OK if action in READ_ACTIONS else sqlite3.SQLITE_DENY

def inventory(db_path: Path) -> dict:
    """Counts only; does not export keys, identifiers or transaction data."""
    path = Path(db_path)
    if not path.is_file() or path.is_symlink():
        raise DiagnosticRefused('DB_NOT_PRESENT')
    uri = 'file:' + quote(str(path.resolve()), safe='/') + '?mode=ro'
    try:
        with sqlite3.connect(uri, uri=True, timeout=1) as con:
            con.execute('PRAGMA query_only=ON')
            con.set_authorizer(_authorizer)
            for table, required in {
                'statement_sources': {'terminal_state'},
                'derived_evidence': {'semantic_type','flow_direction','evidence_channel','account_id','processed_at'},
            }.items():
                cols = {r[1] for r in con.execute(f'PRAGMA table_info({table})')}
                if not required.issubset(cols):
                    raise DiagnosticRefused('UNEXPECTED_SCHEMA')
            total_source = con.execute('SELECT COUNT(*) FROM statement_sources').fetchone()[0]
            states = {'IMPORTED':0,'QUARANTINED':0,'FAILED':0,'DISCARDED':0,'OTHER':0}
            for val, count in con.execute('SELECT terminal_state,COUNT(*) FROM statement_sources GROUP BY terminal_state'):
                states[val if val in states else 'OTHER'] += count
            total = con.execute('SELECT COUNT(*) FROM derived_evidence').fetchone()[0]
            semantic = {'KNOWN':0,'UNKNOWN':0}
            for val, count in con.execute('SELECT semantic_type,COUNT(*) FROM derived_evidence GROUP BY semantic_type'):
                semantic['UNKNOWN' if str(val or '').upper() in {'UNKNOWN','UNCLASSIFIED',''} else 'KNOWN'] += count
            flow = {'INFLOW':0,'OUTFLOW':0,'OTHER':0}
            for val, count in con.execute('SELECT flow_direction,COUNT(*) FROM derived_evidence GROUP BY flow_direction'):
                v = str(val or '').upper()
                flow[v if v in {'INFLOW','OUTFLOW'} else 'OTHER'] += count
            channel = {'STATEMENT':0,'GMAIL':0,'OTHER':0}
            for val, count in con.execute('SELECT evidence_channel,COUNT(*) FROM derived_evidence GROUP BY evidence_channel'):
                v = str(val or '').upper()
                channel['STATEMENT' if v == 'STATEMENT_LEDGER' else 'GMAIL' if v == 'GMAIL_TRANSACTION' else 'OTHER'] += count
            linked = con.execute("SELECT COUNT(*) FROM derived_evidence WHERE account_id IS NOT NULL AND trim(account_id)<>''").fetchone()[0]
            processed = con.execute("SELECT COUNT(*) FROM derived_evidence WHERE processed_at IS NOT NULL AND trim(processed_at)<>''").fetchone()[0]
            assert sum(states.values()) == total_source
            assert sum(semantic.values()) == total
            assert sum(flow.values()) == total
            assert sum(channel.values()) == total
            return {'contract':'RES-001B-DIAG-EXPORT','version':1,'provenance':'SQLITE_SYNTHETIC_ONLY',
                    'sources':total_source,'states':states,'evidenceTotal':total,
                    'semantics':semantic,'flow':flow,'channels':channel,
                    'account':{'LINKED':linked,'UNLINKED':total-linked},
                    'processedAt':{'PRESENT':processed,'ABSENT':total-processed},
                    'historicRejectReasons':'UNAVAILABLE'}
    except sqlite3.Error:
        raise DiagnosticRefused('READ_ONLY_QUERY_FAILED') from None
