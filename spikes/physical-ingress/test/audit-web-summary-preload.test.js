import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const preloadPath = fileURLToPath(new URL('../live/audit-web-summary-preload.mjs', import.meta.url));

const script = `
import http from 'node:http';
const server = http.createServer((req, res) => {
  console.log('FINANCESENSOR_STMT_AUDIT_SHAPE;status=OPEN;code=STMT_AUDIT_BALANCE_ANCHOR_OPEN;period=1;date=1;direction=1;amount=1;summary=1;opening=0;closing=1;range=NONE');
  console.log('FINANCESENSOR_STMT_AUDIT_SHAPE;status=FAIL;code=STMT_AUDIT_DATE_RANGE;period=1;date=0;direction=1;amount=1;summary=1;opening=1;closing=1;range=AFTER_PERIOD');
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end('<!doctype html><html><body><div>audit</div></body></html>');
});
server.listen(0, '127.0.0.1', async () => {
  const { port } = server.address();
  const html = await fetch('http://127.0.0.1:' + port).then(response => response.text());
  process.stdout.write('\\nHTML_START\\n' + html + '\\nHTML_END\\n');
  server.close();
});
`;

test('audit preload injects safe aggregate HTML when sendHtml uses writeHead headers', () => {
  const result = spawnSync(process.execPath, [
    '--import', preloadPath,
    '--input-type=module',
    '--eval', script
  ], { encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const html = result.stdout.split('HTML_START\n')[1]?.split('\nHTML_END')[0] ?? '';
  assert.match(html, /Diagnóstico estructural seguro/);
  assert.match(html, /Periodo único:\s*<strong>2\/2<\/strong>/);
  assert.match(html, /Fechas dentro del periodo:\s*<strong>1\/2<\/strong>/);
  assert.match(html, /SALDO ANTERIOR único:\s*<strong>1\/2<\/strong>/);
  assert.match(html, /SALDO final único:\s*<strong>2\/2<\/strong>/);
  assert.match(html, /AFTER_PERIOD<\/code>:\s*<strong>1<\/strong>/);
  assert.match(html, /STMT_AUDIT_BALANCE_ANCHOR_OPEN/);
  assert.match(html, /STMT_AUDIT_DATE_RANGE/);
  assert.equal(html.includes('2026-'), false);
  assert.equal(html.includes('gmail'), false);
});
