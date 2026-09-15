import fs from 'node:fs';

const files = {
  quarry: 'mk0/02-quarries/Q-003-GMAIL-POLICY.md',
  adr: 'mk0/11-decisions/ADR-020-GMAIL-RESTRICTED-DATA-SERVER-BOUNDARY.md',
  package: 'mk0/07-plan/GMAIL-PRODUCTION-VERIFICATION-PACKAGE.md',
  evidence: 'mk0/10-evidence/EV-Q003-PRODUCTION-POLICY-REFRESH-2026-09-02.md',
};

const failures = [];

function load(label) {
  const file = files[label];
  if (!fs.existsSync(file)) {
    failures.push(`${file}: missing`);
    return '';
  }
  return fs.readFileSync(file, 'utf8');
}

function requireText(label, text, needle) {
  if (!text.includes(needle)) failures.push(`${files[label]}: missing invariant: ${needle}`);
}

function forbidText(label, text, needle) {
  if (text.includes(needle)) failures.push(`${files[label]}: forbidden assertion present: ${needle}`);
}

const quarry = load('quarry');
const adr = load('adr');
const verification = load('package');
const evidence = load('evidence');

requireText('quarry', quarry, '**Status:** ACTIVE');
requireText('quarry', quarry, 'https://www.googleapis.com/auth/gmail.readonly');
requireText('quarry', quarry, 'LEVEL_C_PASS != Q-003_CLOSED');

requireText('adr', adr, 'GOOGLE ASSESSMENT APPLICABILITY => PROVIDER DETERMINATION REQUIRED');
requireText('adr', adr, 'SERVER-HOSTED GMAIL OAUTH AUTHORITY');
requireText('adr', adr, 'train or improve generalized AI/ML models with raw or derived Workspace API data');
requireText('adr', adr, 'E2EE CIPHERTEXT => SECURITY ASSESSMENT EXEMPT');
requireText('adr', adr, 'PROVIDER DETERMINATION > SELF-DECLARED EXEMPTION');

requireText('package', verification, 'PACKAGE DRAFTED / PUBLICATION + GOOGLE REVIEW OPEN');
requireText('package', verification, 'https://www.googleapis.com/auth/gmail.readonly');
requireText('package', verification, 'gmail.metadata');
requireText('package', verification, 'GOOGLE RESTRICTED-SCOPE REVIEW    NOT SUBMITTED');
requireText('package', verification, 'ASSESSMENT DETERMINATION          OPEN');
requireText('package', verification, 'generalized/foundation AI or ML models');

requireText('evidence', evidence, 'PRODUCTION PATH NARROWED / GOOGLE REVIEW STILL REQUIRED');
requireText('evidence', evidence, 'Q-003                         REMAINS ACTIVE');
requireText('evidence', evidence, 'SECURITY-ASSESSMENT PROVIDER DETERMINATION OPEN');
requireText('evidence', evidence, 'GENERALIZED Gmail-DERIVED MODEL TRAINING    FORBIDDEN');

forbidText('adr', adr, 'SECURITY ASSESSMENT EXEMPT = PASS');
forbidText('package', verification, 'GOOGLE RESTRICTED-SCOPE REVIEW    PASS');
forbidText('evidence', evidence, 'Q-003                         CLOSED');

if (failures.length) {
  console.error('FINANCESENSOR_GMAIL_PRODUCTION_POLICY=FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('FINANCESENSOR_GMAIL_PRODUCTION_POLICY=PASS');
console.log('Q003_STATE=ACTIVE');
console.log('GMAIL_SCOPE=gmail.readonly');
console.log('SERVER_GMAIL_AUTHORITY=FORBIDDEN');
console.log('PRODUCTION_VERIFICATION=OPEN');
console.log('SECURITY_ASSESSMENT_PROVIDER_DETERMINATION=OPEN');
console.log('GENERALIZED_GMAIL_DERIVED_MODEL_TRAINING=FORBIDDEN');
console.log('LEVEL_C_PASS!=Q003_CLOSED');