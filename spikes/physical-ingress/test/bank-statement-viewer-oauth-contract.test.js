import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../live/owned-oauth-bank-statements-viewer.mjs', import.meta.url), 'utf8');

test('bank statement viewer uses the exact same OAuth redirect URI for authorization and token exchange', () => {
  assert.match(source, /function oauthRedirectUri\(\)\s*\{\s*return `\$\{rootRedirectUri\(\)\}\/oauth\/callback`;\s*\}/s);

  const uses = [...source.matchAll(/redirectUri:\s*oauthRedirectUri\(\)/g)];
  assert.equal(uses.length, 2, 'authorization and token exchange must both use oauthRedirectUri()');

  assert.equal(/buildTokenExchangeRequest\(\{[\s\S]*?redirectUri:\s*rootRedirectUri\(\)/.test(source), false);
});
