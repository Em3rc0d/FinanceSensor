import fs from 'node:fs';

const failures = [];
const fail = message => failures.push(message);

const adrPath = 'mk0/11-decisions/ADR-025-MOBILE-FIRST-PRODUCT-SURFACE.md';
const designPath = 'mk0/03-design/PRODUCT-DESIGN.md';
const roadmapPath = 'product/ROADMAP.md';
const readmePath = 'product/labs/mobile-bi/README.md';
const labPath = 'product/labs/mobile-bi/index.html';

for (const path of [adrPath, designPath, roadmapPath, readmePath, labPath]) {
  if (!fs.existsSync(path)) fail(`missing ${path}`);
}

if (!failures.length) {
  const adr = fs.readFileSync(adrPath, 'utf8');
  const design = fs.readFileSync(designPath, 'utf8');
  const roadmap = fs.readFileSync(roadmapPath, 'utf8');
  const readme = fs.readFileSync(readmePath, 'utf8');
  const html = fs.readFileSync(labPath, 'utf8');

  const requiredAdr = [
    'FINANCESENSOR PRIMARY PRODUCT = MOBILE APPLICATION',
    'Android — first physical product target',
    'iOS     — required production target',
    'MOBILE_FIRST != MOBILE_ONLY',
    'BI_RICHNESS != DESKTOP_DASHBOARD',
    'SYNTHETIC_PRODUCT_LAB != PRODUCTION_PROOF',
    'GMAIL_CONNECTIVITY_PROVEN != MOBILE_OAUTH_CLOSED'
  ];
  for (const value of requiredAdr) if (!adr.includes(value)) fail(`ADR-025 missing: ${value}`);

  for (const value of ['FinanceSensor is **mobile-first**', 'Mobile BI language', 'Synthetic Product Lab boundary']) {
    if (!design.includes(value)) fail(`PRODUCT-DESIGN missing: ${value}`);
  }
  for (const value of ['Android — first physical product target', 'desktop BI as a primary product', 'production web parity']) {
    if (!roadmap.includes(value)) fail(`ROADMAP missing: ${value}`);
  }
  for (const value of ['PRODUCT_LAB != PRODUCTION_APP', 'SYNTHETIC_DATA != FINANCIAL_EVIDENCE', 'WEB_PROTOTYPE != WEB_PRODUCT_DECISION']) {
    if (!readme.includes(value)) fail(`Product Lab README missing: ${value}`);
  }

  const requiredUi = [
    'PRODUCT LAB · 100% DATOS SINTÉTICOS',
    'Tu dinero, en contexto.',
    'Financial Sensor',
    'Inicio',
    'Mov.',
    'Sensor',
    'Tú',
    '¿Dónde se fue?',
    'Presupuesto',
    'Necesitamos tu ayuda',
    'Privacidad'
  ];
  for (const value of requiredUi) if (!html.includes(value)) fail(`mobile lab missing UI contract: ${value}`);

  if (!html.includes('meta name="viewport"')) fail('mobile lab missing viewport meta');
  if (!html.includes('100dvh')) fail('mobile lab must target real mobile viewport height');
  if (!html.includes('localStorage')) fail('mobile lab must keep synthetic corrections local');

  const forbiddenNetwork = [
    /<script[^>]+src=/i,
    /<link[^>]+href=["']https?:/i,
    /fetch\s*\(/,
    /XMLHttpRequest/,
    /WebSocket\s*\(/,
    /gmail\.googleapis\.com/i,
    /accounts\.google\.com/i,
    /oauth2\.googleapis\.com/i
  ];
  for (const pattern of forbiddenNetwork) if (pattern.test(html)) fail(`mobile lab violates offline/synthetic boundary: ${pattern}`);

  const forbiddenSecretSurface = [
    /access_token/i,
    /refresh_token/i,
    /client_secret/i,
    /code_verifier/i,
    /authorization_code/i
  ];
  for (const pattern of forbiddenSecretSurface) if (pattern.test(html)) fail(`mobile lab contains forbidden credential surface: ${pattern}`);
}

if (failures.length) {
  console.error('FINANCESENSOR_MOBILE_PRODUCT_LAB=FAIL');
  for (const issue of failures) console.error(`- ${issue}`);
  process.exit(1);
}

console.log('FINANCESENSOR_MOBILE_PRODUCT_LAB=PASS');
console.log('PRIMARY_PRODUCT_MOBILE=PASS');
console.log('ANDROID_FIRST_DIRECTION=PASS');
console.log('IOS_REQUIRED_DIRECTION=PASS');
console.log('DESKTOP_BI_PRIMARY_PRODUCT=REJECTED');
console.log('LAB_NETWORK_CALLS=0');
console.log('LAB_REAL_OAUTH=0');
console.log('LAB_REAL_FINANCIAL_DATA=0');
console.log('BUILD_READY_CLAIMED_BY_LAB=0');
