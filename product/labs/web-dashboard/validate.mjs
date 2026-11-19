import { readFile } from 'node:fs/promises';

import { FORBIDDEN_WEB_KEYS, validateProjection } from './projection-model.mjs';

const [html, js, css, fixtureText] = await Promise.all([
  readFile(new URL('./index.html', import.meta.url), 'utf8'),
  readFile(new URL('./app.js', import.meta.url), 'utf8'),
  readFile(new URL('./styles.css', import.meta.url), 'utf8'),
  readFile(new URL('./projection.sample.json', import.meta.url), 'utf8')
]);

const fixture = JSON.parse(fixtureText);
validateProjection(fixture);

for (const marker of ['Entró', 'Salió', 'Movimientos', 'Cobertura', 'Recurrentes observados', 'Vacíos de conocimiento']) {
  if (!html.includes(marker) && !js.includes(marker)) throw new Error(`WEB_REQUIRED_COPY_MISSING:${marker}`);
}
if (!html.includes('viewport')) throw new Error('WEB_RESPONSIVE_VIEWPORT_MISSING');
if (!css.includes('@media (max-width: 820px)')) throw new Error('WEB_RESPONSIVE_RULE_MISSING');
if (!css.includes('prefers-reduced-motion')) throw new Error('WEB_REDUCED_MOTION_RULE_MISSING');
if (!js.includes('window.__FINANCESENSOR_PROJECTION__')) throw new Error('WEB_DECRYPTED_PROJECTION_HOOK_MISSING');

const publicSurface = `${html}\n${js}\n${fixtureText}`;
for (const key of FORBIDDEN_WEB_KEYS) {
  if (fixtureText.includes(`"${key}"`)) throw new Error(`WEB_FIXTURE_FORBIDDEN_KEY:${key}`);
}
if (publicSurface.includes('96% evidencia')) throw new Error('WEB_LEGACY_EVIDENCE_PERCENTAGE_PRESENT');

console.log('ALPHA2_WEB_DASHBOARD_CONTRACT=PASS');
console.log('PUBLIC_PROJECTION_SCHEMA=ALPHA2_PUBLIC_DASHBOARD_V1');
console.log('GLOBAL_EVIDENCE_PERCENTAGE=FORBIDDEN');
console.log('CROSS_CURRENCY_COMBINED_TOTAL=FORBIDDEN');
console.log('RAW_GMAIL_PDF_PASSWORD_WEB=FORBIDDEN');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
