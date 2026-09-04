import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const preloadPath = fileURLToPath(new URL('../live/audit-web-summary-preload.mjs', import.meta.url));

const script = `
import http from 'node:http';
const server = http.createServer((req, res) => {
  console.log('FINANCESENSOR_STMT_AUDIT_DETAIL;layout=MULTI_PAGE;rawdebitabs=1;rawcreditabs=1;debitnegative=1;creditnegative=0;debitsingle=1;creditsingle=1;signeddebitmatch=1;signedcreditmatch=1;closingalternate=COLUMN_BINDABLE');
  console.log('FINANCESENSOR_STMT_AUDIT_SHAPE;status=FAIL;code=STMT_AUDIT_BALANCE_MISMATCH;period=1;date=1;direction=1;amount=1;summary=1;opening=1;closing=1;openinglabel=1;closinglabel=1;totallabel=1;totaldebit=1;totalcredit=1;debitmatch=0;creditmatch=1;pagedebitcoverage=1;pagecreditcoverage=1;pagedebitmatch=1;pagecreditmatch=1;closingvalue=1;debitrelation=PARSED_GREATER;creditrelation=EXACT;debitbinding=NEARBY_LINE;creditbinding=SAME_LINE;closingbinding=SAME_LINE;range=NONE');
  console.log('FINANCESENSOR_STMT_AUDIT_DETAIL;layout=ONE_PAGE;rawdebitabs=1;rawcreditabs=1;debitnegative=0;creditnegative=0;debitsingle=1;creditsingle=1;signeddebitmatch=0;signedcreditmatch=1;closingalternate=RIGHT_SIDE_NEARBY');
  console.log('FINANCESENSOR_STMT_AUDIT_SHAPE;status=FAIL;code=STMT_AUDIT_DATE_RANGE;period=1;date=0;direction=1;amount=1;summary=1;opening=1;closing=0;openinglabel=1;closinglabel=1;totallabel=1;totaldebit=1;totalcredit=1;debitmatch=0;creditmatch=1;pagedebitcoverage=0;pagecreditcoverage=1;pagedebitmatch=0;pagecreditmatch=1;closingvalue=0;debitrelation=PARSED_LOWER;creditrelation=EXACT;debitbinding=SAME_LINE;creditbinding=SAME_LINE;closingbinding=MISSING;range=PROCESS_BEFORE_VALUE_BEFORE_PERIOD');
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

test('safe web summary exposes only aggregate debit mismatch, sign, and layout categories', () => {
  const result = spawnSync(process.execPath, [
    '--import', preloadPath,
    '--input-type=module',
    '--eval', script
  ], { encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const html = result.stdout.split('HTML_START\n')[1]?.split('\nHTML_END')[0] ?? '';
  assert.match(html, /Cargos parseados = total impreso final:\s*<strong>0\/2<\/strong>/);
  assert.match(html, /Abonos parseados = total impreso final:\s*<strong>2\/2<\/strong>/);
  assert.match(html, /Suma subtotales CARGOS por página = parseado:\s*<strong>1\/2<\/strong>/);
  assert.match(html, /Valor SALDO final enlazable:\s*<strong>1\/2<\/strong>/);
  assert.match(html, /Reconstrucción CARGOS raw absoluta = parser:\s*<strong>2\/2<\/strong>/);
  assert.match(html, /EECC con signo negativo en CARGOS:\s*<strong>1\/2<\/strong>/);
  assert.match(html, /CARGOS respetando signo = total impreso:\s*<strong>1\/2<\/strong>/);
  assert.match(html, /MULTI_PAGE/);
  assert.match(html, /ONE_PAGE/);
  assert.match(html, /RIGHT_SIDE_NEARBY/);
  assert.match(html, /COLUMN_BINDABLE/);
  assert.match(html, /PARSED_GREATER/);
  assert.match(html, /PARSED_LOWER/);
  assert.match(html, /NEARBY_LINE/);
  assert.match(html, /MISSING/);
  assert.match(html, /PROCESS_BEFORE_VALUE_BEFORE_PERIOD/);
  assert.equal(html.includes('125.00'), false);
  assert.equal(html.includes('2026-'), false);
});
