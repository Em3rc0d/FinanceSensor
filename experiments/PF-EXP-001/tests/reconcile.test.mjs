import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcilePrecheck } from '../src/reconcile.mjs';

const row=(id,amount,date='2026-07-10',extra={}) => ({rowRef:id,signedMinorUnits:amount,postingDate:date,currency:'PEN',accountAlias:'C-001',...extra});
const fixture=()=>({
  runMode:'SYNTHETIC',
  scope:{sourceClass:'BCP_SAVINGS',currency:'PEN',accountAlias:'C-001',period:{start:'2026-07-01',end:'2026-07-31'},
    documentComplete:true,sourceRowsIndependentlyEnumerated:true,
    balanceConvention:{kind:'DEPOSIT_DELTA',verifiedAgainstSource:true}},
  oracle:{origin:'INDEPENDENT_MANUAL',copiedFromParser:false,reviewerAlias:'synthetic-reviewer',accountAlias:'C-001',currency:'PEN',
    openingMinorUnits:30000,closingMinorUnits:34000,adjustmentsMinorUnits:0,
    rows:[row('r1',10000),row('r2',-6000)]},
  observedRows:[{...row('r1',10000),state:'RESOLVED'},{...row('r2',-6000),state:'RESOLVED'}]
});
const run=(modify)=>{const f=fixture();modify?.(f);return reconcilePrecheck(f)};
const assertBlocked=(result,reason)=>{assert.equal(result.status,'BLOCKED');assert.ok(result.errors.includes(reason),JSON.stringify(result.errors));assert.equal(result.gates.G2,'NOT_RUN')};

test('matching rows and independent submitted balance formula: synthetic precheck only',()=>{
  const r=run();assert.equal(r.status,'SYNTHETIC_PRECHECK_PASS');assert.equal(r.gates.G0,'NOT_RUN');assert.equal(r.gates.G2,'NOT_RUN');
  assert.equal(r.counts.matched,2);assert.equal(r.balanceEquationMatches,true);assert.equal(r.rowIdentityMatches,true);
});
test('missing observation not hidden behind matching partial arithmetic',()=>assertBlocked(run(f=>f.observedRows.pop()),'ORACLE_ROWS_MISSING_IN_OUTPUT'));
test('phantom observation rejected',()=>assertBlocked(run(f=>f.observedRows.push({...row('extra',10),state:'RESOLVED'})),'OUTPUT_ROWS_NOT_IN_ORACLE'));
test('duplicate observed row blocked, not collapsed silently',()=>assertBlocked(run(f=>f.observedRows.push({...f.observedRows[0]})),'OBSERVED_DUPLICATE_ROW'));
test('duplicate oracle row blocked',()=>assertBlocked(run(f=>f.oracle.rows.push({...f.oracle.rows[0]})),'ORACLE_DUPLICATE_ROW'));
test('changed amount cannot pass even if document opening/closing matches',()=>assertBlocked(run(f=>f.observedRows[0].signedMinorUnits=9999),'ROW_DETAILS_DISAGREE'));
test('wrong sign cannot pass',()=>assertBlocked(run(f=>f.observedRows[1].signedMinorUnits=6000),'ROW_DETAILS_DISAGREE'));
test('swapped amounts with unchanged net still rejected',()=>assertBlocked(run(f=>{f.oracle.rows=[row('r1',3000),row('r2',1000)];f.observedRows=[{...row('r1',1000),state:'RESOLVED'},{...row('r2',3000),state:'RESOLVED'}]}),'ROW_DETAILS_DISAGREE'));
test('oracle arithmetic cannot be self-certified',()=>assertBlocked(run(f=>f.oracle.closingMinorUnits=35000),'ORACLE_BALANCE_EQUATION_MISMATCH'));
test('wrong account never matched',()=>assertBlocked(run(f=>f.observedRows[0].accountAlias='OTHER'),'OBSERVED_SCOPE_MISMATCH'));
test('different currency is blocked even with equal integers',()=>assertBlocked(run(f=>f.observedRows[0].currency='USD'),'OBSERVED_SCOPE_MISMATCH'));
test('date outside period rejected',()=>assertBlocked(run(f=>f.observedRows[0].postingDate='2026-08-01'),'OBSERVED_DATE_OUT_OF_SCOPE'));
test('invalid leap date rejected',()=>assertBlocked(run(f=>f.observedRows[0].postingDate='2026-02-29'),'OBSERVED_DATE_OUT_OF_SCOPE'));
test('partial original document not considered closed',()=>assertBlocked(run(f=>f.scope.documentComplete=false),'SOURCE_INCOMPLETE_OR_UNVERIFIED'));
test('unverified ledger row universe rejected',()=>assertBlocked(run(f=>f.scope.sourceRowsIndependentlyEnumerated=false),'ROW_UNIVERSE_UNVERIFIED'));
test('missing reviewer independence blocked',()=>assertBlocked(run(f=>f.oracle.copiedFromParser=true),'ORACLE_INDEPENDENCE_UNVERIFIED'));
test('missing original oracle balance blocked',()=>assertBlocked(run(f=>delete f.oracle.openingMinorUnits),'ORACLE_BALANCE_INVALID'));
test('floating-point amount rejected',()=>assertBlocked(run(f=>f.oracle.rows[0].signedMinorUnits=100.2),'ORACLE_AMOUNT_INVALID'));
test('unsafe integer amount rejected',()=>assertBlocked(run(f=>f.oracle.rows[0].signedMinorUnits=Number.MAX_SAFE_INTEGER+1),'ORACLE_AMOUNT_INVALID'));
test('unresolved row prevents completion',()=>assertBlocked(run(f=>f.observedRows[0].state='REVIEW_REQUIRED'),'UNRESOLVED_OBSERVATION'));
test('unknown runMode rejects',()=>assertBlocked(run(f=>f.runMode='CLAIM_G2_PASS'),'UNSUPPORTED_RUN_MODE'));
test('empty input blocks',()=>assertBlocked(reconcilePrecheck({}),'SCOPE_OR_ORACLE_MISSING'));
test('empty statement without independent no-movement confirmation blocked',()=>assertBlocked(run(f=>{f.oracle.rows=[];f.oracle.closingMinorUnits=30000;f.observedRows=[]}),'EMPTY_ORACLE_UNCONFIRMED'));
test('real-mode result still requires human attestation and never G2 PASS',()=>{
  const r=run(f=>f.runMode='PRIVATE_ACCEPTANCE');assert.equal(r.status,'PRECHECK_OK_HUMAN_ATTESTATION_REQUIRED');assert.equal(r.gates.G2,'NOT_RUN');
});
test('credit statement cannot reuse savings balance convention',()=>assertBlocked(run(f=>f.scope.sourceClass='RIPLEY_CREDIT'),'BALANCE_CONVENTION_UNVERIFIED'));
test('credit statement accepted only with reviewer-verified credit balance convention',()=>{
  const r=run(f=>{f.scope.sourceClass='RIPLEY_CREDIT';f.scope.balanceConvention.kind='CREDIT_DEBT_DELTA'});
  assert.equal(r.status,'SYNTHETIC_PRECHECK_PASS');assert.equal(r.gates.G2,'NOT_RUN');
});
test('missing sign convention verification blocks credit',()=>assertBlocked(run(f=>{f.scope.sourceClass='RIPLEY_CREDIT';f.scope.balanceConvention.kind='CREDIT_DEBT_DELTA';f.scope.balanceConvention.verifiedAgainstSource=false}),'BALANCE_CONVENTION_UNVERIFIED'));
test('empty documented period requires independent confirmation to qualify',()=>{
  const r=run(f=>{f.oracle.rows=[];f.oracle.closingMinorUnits=30000;f.observedRows=[];f.scope.zeroActivityIndependentlyConfirmed=true});assert.equal(r.status,'SYNTHETIC_PRECHECK_PASS');
});
test('sanitized public output cannot contain private descriptions, amounts or IDs',()=>{
  const f=fixture();f.oracle.reviewerAlias='do-not-emit-secret';f.oracle.rows[0].rowRef='my-account-1234';f.observedRows[0].rowRef='my-account-1234';
  const r=reconcilePrecheck(f);const s=JSON.stringify(r);
  assert.ok(!s.includes('do-not-emit-secret'));assert.ok(!s.includes('my-account-1234'));assert.ok(!s.includes('30000'));assert.ok(!s.includes('34000'));
});
test('malformed rows blocked, no crash',()=>assertBlocked(run(f=>f.observedRows[0]=null),'OBSERVED_ROW_INVALID'));
test('missing adjustment never silently equals zero',()=>assertBlocked(run(f=>delete f.oracle.adjustmentsMinorUnits),'ORACLE_BALANCE_INVALID'));
