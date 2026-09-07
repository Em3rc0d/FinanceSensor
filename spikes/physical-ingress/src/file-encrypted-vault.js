import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const encode = value => Buffer.from(JSON.stringify(value), 'utf8');
const decode = value => JSON.parse(Buffer.from(value).toString('utf8'));

export class LocalFileEncryptedVault {
  constructor({ key, snapshotPath }) {
    if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('vault key must be 32 bytes');
    if (!snapshotPath || !String(snapshotPath).trim()) throw new Error('snapshotPath is required');
    this.key = Buffer.from(key);
    this.snapshotPath = path.resolve(String(snapshotPath));
    fs.mkdirSync(path.dirname(this.snapshotPath), { recursive: true });
  }

  write(state) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(encode(state)), cipher.final()]);
    const tag = cipher.getAuthTag();
    const payload = {
      schemaVersion: 1,
      algorithm: 'AES-256-GCM',
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      ciphertext: ciphertext.toString('base64')
    };
    const tempPath = `${this.snapshotPath}.tmp`;
    fs.writeFileSync(tempPath, `${JSON.stringify(payload)}\n`, { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(tempPath, this.snapshotPath);
  }

  read() {
    if (!fs.existsSync(this.snapshotPath)) return null;
    const payload = JSON.parse(fs.readFileSync(this.snapshotPath, 'utf8'));
    if (payload?.schemaVersion !== 1 || payload?.algorithm !== 'AES-256-GCM') {
      throw new Error('unsupported encrypted vault snapshot');
    }
    const iv = Buffer.from(String(payload.iv ?? ''), 'base64');
    const tag = Buffer.from(String(payload.tag ?? ''), 'base64');
    const ciphertext = Buffer.from(String(payload.ciphertext ?? ''), 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decode(plaintext);
  }

  serializedAtRest() {
    return fs.existsSync(this.snapshotPath) ? fs.readFileSync(this.snapshotPath, 'utf8') : '';
  }

  destroySnapshot() {
    if (fs.existsSync(this.snapshotPath)) fs.rmSync(this.snapshotPath, { force: true });
  }

  destroyKeyMaterial() {
    this.key.fill(0);
  }
}
