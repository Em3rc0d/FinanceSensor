import fs from 'node:fs';

const campaign = JSON.parse(fs.readFileSync('graph/physical-closure-campaign.json', 'utf8'));
const failures = [];
const fail = message => failures.push(message);
const sameSet = (a, b) => a.size === b.size && [...a].every(value => b.has(value));

const p2 = (campaign.phases ?? []).find(phase => phase.id === 'P2');
if (!p2) fail('physical campaign missing P2');
else {
  if (p2.status !== 'PHYSICAL_EVIDENCE_REQUIRED') fail(`P2 must remain PHYSICAL_EVIDENCE_REQUIRED, found ${p2.status}`);
  if (p2.physicalReceiptRequiredForPass !== true) fail('P2 must require physical receipt for overall PASS');

  const expectedClaims = new Set([
    'ANDROID_PROTECTED_OAUTH_CUSTODY',
    'IOS_PROTECTED_OAUTH_CUSTODY',
    'NO_TOKEN_PLAINTEXT_IN_ORDINARY_STORAGE',
    'NO_TOKEN_GMAIL_FINANCIAL_PLAINTEXT_IN_LOGS',
    'DISCONNECT_REMOVES_PROTECTED_CREDENTIAL',
    'RESTORE_BEHAVIOR_DOCUMENTED'
  ]);
  if (!sameSet(new Set(p2.requiredClaims ?? []), expectedClaims)) fail('P2 requiredClaims changed unexpectedly');

  const expectedPassed = new Set(['ANDROID_PROTECTED_OAUTH_CUSTODY', 'RESTORE_BEHAVIOR_DOCUMENTED']);
  if (!sameSet(new Set(p2.passedClaims ?? []), expectedPassed)) fail('P2 passedClaims must be Android custody + documented restore only');

  const expectedOpen = new Set([
    'IOS_PROTECTED_OAUTH_CUSTODY',
    'NO_TOKEN_PLAINTEXT_IN_ORDINARY_STORAGE',
    'NO_TOKEN_GMAIL_FINANCIAL_PLAINTEXT_IN_LOGS',
    'DISCONNECT_REMOVES_PROTECTED_CREDENTIAL'
  ]);
  if (!sameSet(new Set(p2.openClaims ?? []), expectedOpen)) fail('P2 openClaims must contain exactly four remaining cross-platform/iOS claims');

  const states = p2.claimStates ?? {};
  if (states.ANDROID_PROTECTED_OAUTH_CUSTODY !== 'PASS_BOUND_PHYSICAL_RECEIPT') fail('Android custody claim must be receipt-bound physical PASS');
  if (states.RESTORE_BEHAVIOR_DOCUMENTED !== 'CONTRACT_PASS') fail('restore behavior must be contract PASS');
  for (const claim of expectedOpen) {
    if (!String(states[claim] ?? '').includes('OPEN')) fail(`${claim} must remain OPEN`);
  }

  const android = p2.subBoundaries?.android;
  if (android?.status !== 'PASS') fail('P2 Android sub-boundary must be PASS');
  if (android?.claim !== 'ANDROID_PROTECTED_OAUTH_CUSTODY') fail('P2 Android claim mismatch');
  if (android?.receipt !== 'mk0/10-evidence/EV-P2-ANDROID-CREDENTIAL-CUSTODY-PHYSICAL-2026-09-03.md') fail('P2 Android receipt path mismatch');
  if (android?.binding !== 'graph/physical-receipts/P2-ANDROID-2026-09-03.json') fail('P2 Android binding path mismatch');

  const ios = p2.subBoundaries?.ios;
  if (ios?.status !== 'STATIC_READY_PHYSICAL_OPEN') fail('P2 iOS must remain static-ready / physical-open');
  if (ios?.claim !== 'IOS_PROTECTED_OAUTH_CUSTODY') fail('P2 iOS claim mismatch');
  if (ios?.bridge !== 'spikes/mobile-shell/native/ios/GmailCredentialBroker.swift') fail('P2 iOS bridge path mismatch');
  if (ios?.staticValidator !== 'tools/validate-ios-gmail-custody.mjs') fail('P2 iOS validator path mismatch');

  for (const path of [android?.receipt, android?.binding, ios?.bridge, ios?.staticValidator]) {
    if (!path || !fs.existsSync(path)) fail(`P2 bound artifact missing: ${path ?? '<unset>'}`);
  }
}

if (failures.length) {
  console.error('FINANCESENSOR_P2_STATE=FAIL');
  for (const issue of failures) console.error(`- ${issue}`);
  process.exit(1);
}

await import('./validate-p2-android-receipt.mjs');
await import('./validate-ios-gmail-custody.mjs');

console.log('FINANCESENSOR_P2_STATE=PASS');
console.log('ANDROID_PROTECTED_OAUTH_CUSTODY=PHYSICAL_PASS');
console.log('RESTORE_BEHAVIOR_DOCUMENTED=CONTRACT_PASS');
console.log('IOS_PROTECTED_OAUTH_CUSTODY=STATIC_READY_PHYSICAL_OPEN');
console.log('P2_PASSED_CLAIMS=2');
console.log('P2_OPEN_CLAIMS=4');
console.log('P2_OVERALL=PHYSICAL_EVIDENCE_REQUIRED');
