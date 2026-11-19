import crypto from 'node:crypto';

const encode = value => Buffer.from(JSON.stringify(value), 'utf8');
const decode = value => JSON.parse(Buffer.from(value).toString('utf8'));

export class LocalEncryptedVault {
  constructor(key = crypto.randomBytes(32)) {
    if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('vault key must be 32 bytes');
    this.key = Buffer.from(key);
    this.blob = null;
  }

  write(state) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(encode(state)), cipher.final()]);
    const tag = cipher.getAuthTag();
    this.blob = { iv: iv.toString('base64'), tag: tag.toString('base64'), ciphertext: ciphertext.toString('base64') };
  }

  read() {
    if (!this.blob) return null;
    const iv = Buffer.from(this.blob.iv, 'base64');
    const tag = Buffer.from(this.blob.tag, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(this.blob.ciphertext, 'base64')),
      decipher.final()
    ]);
    return decode(plaintext);
  }

  exportSnapshot() {
    return this.blob ? structuredClone(this.blob) : null;
  }

  importSnapshot(snapshot) {
    this.blob = snapshot ? structuredClone(snapshot) : null;
  }

  serializedAtRest() {
    return JSON.stringify(this.blob ?? {});
  }

  destroy() {
    if (this.key) this.key.fill(0);
    this.blob = null;
  }
}

export class DeviceCredentialStore {
  constructor() {
    this.token = null;
    this.revoked = false;
  }

  save(token) {
    if (!token) throw new Error('token required');
    this.token = String(token);
    this.revoked = false;
  }

  requireToken() {
    if (!this.token || this.revoked) throw new Error('source authorization unavailable');
    return this.token;
  }

  revokeAndDelete() {
    this.revoked = true;
    this.token = null;
  }

  hasCredential() {
    return Boolean(this.token) && !this.revoked;
  }
}
