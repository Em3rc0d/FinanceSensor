import json
import sys
import unittest
from pathlib import Path
from copy import deepcopy
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from oracle_precheck import validate_oracle

EXAMPLE=Path(__file__).resolve().parents[1]/'fixtures'/'synthetic'/'ORACLE_SYNTHETIC_EXAMPLE.json'

class OraclePrecheckTests(unittest.TestCase):
    def setUp(self):
        self.fixture=json.loads(EXAMPLE.read_text('utf-8'))
        self.fixture['synthetic']=False
    def test_complete_structure_cannot_self_certify_g0(self):
        r=validate_oracle(self.fixture)
        self.assertEqual(r['status'],'PRECHECK_OK_HUMAN_ATTESTATION_REQUIRED')
        self.assertEqual(r['gates']['G0'],'NOT_RUN')
    def test_marked_synthetic_never_prepasses(self):
        self.fixture['synthetic']=True
        self.assertIn('SYNTHETIC_ORACLE_NOT_REAL_GATE',validate_oracle(self.fixture)['errorCodes'])
    def test_invalid_money_arithmetic_rejects(self):
        self.fixture['oracle']['balances'][0]['closingMinorUnits']=50000
        self.assertIn('BALANCE_MISMATCH',validate_oracle(self.fixture)['errorCodes'])
    def test_duplicate_source_row_rejects(self):
        self.fixture['oracle']['rows'].append(deepcopy(self.fixture['oracle']['rows'][0]))
        self.assertIn('DUPLICATE_OR_MISSING_ROW_REF',validate_oracle(self.fixture)['errorCodes'])
    def test_cannot_use_float_for_minor_units(self):
        self.fixture['oracle']['rows'][0]['signedMinorUnits']=100.20
        self.assertIn('AMOUNT_MUST_USE_INTEGER_MINOR_UNITS',validate_oracle(self.fixture)['errorCodes'])
    def test_without_independent_reviewer_rejects(self):
        self.fixture['oracle']['reviewerAlias']=''
        self.assertIn('INDEPENDENT_REVIEWER_MISSING',validate_oracle(self.fixture)['errorCodes'])

if __name__=='__main__': unittest.main()
