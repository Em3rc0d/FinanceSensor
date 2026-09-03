import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LocalFileEncryptedVault } from '../src/file-encrypted-vault.js';

function tempSnapshot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'financesensor-vault-'));
  return { dir, snapshotPath: path.join(dir, 'history-state.aesgcm.json') };
}

test('persistent local vault round-trips derived state through AES-256-GCM', () => {
  const { dir, snapshotPath } = tempSnapshot();
  try {
    const key = crypto.randomBytes(32);
    const vault = new LocalFileEncryptedVault({ key, snapshotPath });
    const state = {
      historicalBootstrap: { status: 'PAUSED', nextPageToken: 'LOCAL-CURSOR-ONLY' },
      evidence: [{ amount: 42.35, currency: 'PEN', rawMerchant: 'DEMO MARKET' }]
    };
    vault.write(state);
    assert.deepEqual(vault.read(), state);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('serialized at-rest snapshot contains no derived financial plaintext or cursor literal', () => {
  const { dir, snapshotPath } = tempSnapshot();
  try {
    const vault = new LocalFileEncryptedVault({ key: crypto.randomBytes(32), snapshotPath });
    vault.write({
      historicalBootstrap: { nextPageToken: 'SECRET-PAGE-CURSOR' },
      evidence: [{ amount: 1234.56, currency: 'PEN', rawMerchant: 'PRIVATE MERCHANT NAME' }]
    });
    const disk = vault.serializedAtRest();
    for (const forbidden of ['SECRET-PAGE-CURSOR', 'PRIVATE MERCHANT NAME', '1234.56']) {
      assert.equal(disk.includes(forbidden), false);
    }
    assert.match(disk, /"algorithm":"AES-256-GCM"/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('tampered ciphertext fails closed', () => {
  const { dir, snapshotPath } = tempSnapshot();
  try {
    const vault = new LocalFileEncryptedVault({ key: crypto.randomBytes(32), snapshotPath });
    vault.write({ evidence: [{ amount: 1 }] });
    const payload = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    const bytes = Buffer.from(payload.ciphertext, 'base64');
    bytes[0] ^= 0xff;
    payload.ciphertext = bytes.toString('base64');
    fs.writeFileSync(snapshotPath, JSON.stringify(payload));
    assert.throws(() => vault.read());
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
