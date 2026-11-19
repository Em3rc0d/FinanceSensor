#!/usr/bin/env python3
"""Structural validator for a privately prepared human oracle.

Does not generate an oracle, read source PDF, or prove reviewer independence.
Never prints private rows, balances, amounts, account identifiers, file paths.
No G0 PASS can be issued automatically.
"""
from __future__ import annotations
import argparse
import json
from datetime import date
from pathlib import Path

ALLOWED_CLASSES = {'BCP_SAVINGS','RIPLEY_CREDIT'}
ALLOWED_CCY = {'PEN','USD'}


def validate_oracle(record: dict) -> dict:
    errors = []
    def fail(code: str):
        errors.append(code)
    if record.get('synthetic') is True:
        fail('SYNTHETIC_ORACLE_NOT_REAL_GATE')
    if record.get('sourceClass') not in ALLOWED_CLASSES:
        fail('SOURCE_CLASS_UNRECOGNIZED')
    if record.get('custody') != 'PRIVATE_LOCAL':
        fail('LOCAL_CUSTODY_UNVERIFIED')
    if record.get('consentScopeVerified') is not True:
        fail('CONSENT_SCOPE_UNVERIFIED')
    period = record.get('period') or {}
    try:
        lo,hi=date.fromisoformat(period['start']),date.fromisoformat(period['end'])
        if lo>hi: fail('INVALID_PERIOD')
    except (KeyError,ValueError,TypeError):
        fail('INVALID_PERIOD')
    if record.get('sourceDocumentComplete') is not True:
        fail('SOURCE_COMPLETENESS_UNVERIFIED')
    oracle = record.get('oracle') or {}
    if oracle.get('method') != 'MANUAL_FROM_ORIGINAL_SOURCE':
        fail('INDEPENDENT_ORACLE_METHOD_UNVERIFIED')
    if not oracle.get('reviewerAlias'):
        fail('INDEPENDENT_REVIEWER_MISSING')
    if oracle.get('copiedFromParser') is not False:
        fail('ORACLE_INDEPENDENCE_UNVERIFIED')
    rows = oracle.get('rows')
    if not isinstance(rows,list) or not rows:
        fail('ORACLE_ROWS_MISSING')
        rows=[]
    seen=set()
    currency_totals={}
    for row in rows:
        if not isinstance(row,dict):
            fail('MALFORMED_ORACLE_ROW'); continue
        if not isinstance(row.get('rowRef'),str) or not row['rowRef'] or row['rowRef'] in seen:
            fail('DUPLICATE_OR_MISSING_ROW_REF')
        seen.add(row.get('rowRef'))
        if not isinstance(row.get('page'),int) or row.get('page',0)<1:
            fail('INVALID_SOURCE_PAGE')
        if row.get('currency') not in ALLOWED_CCY:
            fail('UNKNOWN_CURRENCY'); continue
        if type(row.get('signedMinorUnits')) is not int:
            fail('AMOUNT_MUST_USE_INTEGER_MINOR_UNITS'); continue
        if row.get('countsTowardBalance') is True:
            c=row['currency'];currency_totals[c]=currency_totals.get(c,0)+row['signedMinorUnits']
    reconciliations=oracle.get('balances')
    if not isinstance(reconciliations,list) or not reconciliations:
        fail('BALANCE_PROOF_MISSING')
        reconciliations=[]
    used=set()
    for b in reconciliations:
        if not isinstance(b,dict): fail('MALFORMED_BALANCE');continue
        c=b.get('currency')
        if c not in ALLOWED_CCY or c in used:
            fail('UNKNOWN_OR_DUPLICATE_BALANCE_CURRENCY');continue
        used.add(c)
        if record.get('sourceClass')=='BCP_SAVINGS':
            opening=b.get('openingMinorUnits'); closing=b.get('closingMinorUnits')
            if type(opening) is not int or type(closing) is not int:
                fail('BALANCE_MUST_USE_INTEGER_MINOR_UNITS')
            elif opening+currency_totals.get(c,0)!=closing:
                fail('BALANCE_MISMATCH')
        else:
            if b.get('reconciliationMethod') != 'MANUAL_SOURCE_DEFINED' or b.get('reviewerVerified') is not True:
                fail('RIPLEY_SOURCE_SPECIFIC_RECONCILIATION_MISSING')
    if set(currency_totals)-used:
        fail('ROW_CURRENCY_WITHOUT_BALANCE_PROOF')
    result={
        'schema':'PF_EXP_001_ORACLE_STRUCTURAL_PRECHECK_V1',
        'status':'PRECHECK_OK_HUMAN_ATTESTATION_REQUIRED' if not errors else 'BLOCKED',
        'errorCodes':sorted(set(errors)),
        'gates':{'C0':'BLOCKED','G0':'NOT_RUN','G1':'NOT_RUN'},
        'disclaimer':'Structure and supplied arithmetic only; original documents, completeness, independence and financial accuracy NOT certified.'
    }
    return result


def main() -> int:
    p=argparse.ArgumentParser(description='Validate private human oracle structure without disclosure')
    p.add_argument('manifest',help='local private oracle JSON path (never printed)')
    args=p.parse_args()
    try:
        d=json.loads(Path(args.manifest).read_text('utf-8'))
        out=validate_oracle(d)
    except (OSError,ValueError,TypeError,UnicodeDecodeError):
        out={'status':'INVALID_ORACLE_INPUT','errorCodes':['INVALID_ORACLE_INPUT'],'gates':{'G0':'NOT_RUN'}}
    print(json.dumps(out,ensure_ascii=False,sort_keys=True))
    return 0 if out['status']=='PRECHECK_OK_HUMAN_ATTESTATION_REQUIRED' else 3

if __name__=='__main__':
    raise SystemExit(main())
