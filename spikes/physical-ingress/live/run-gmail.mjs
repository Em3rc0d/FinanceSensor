import crypto from 'node:crypto';
import { GmailRestProvider } from '../src/gmail-rest-provider.js';
import { FinancialIngressEngine } from '../src/ingress.js';
import { LocalEncryptedVault, DeviceCredentialStore } from '../src/vault.js';
import { PrivacyTelemetrySink } from '../src/privacy.js';

const token = process.env.FINANCESENSOR_GMAIL_ACCESS_TOKEN;
if (!token) throw new Error('FINANCESENSOR_GMAIL_ACCESS_TOKEN is required for the controlled live spike');

const days = Number(process.env.FINANCESENSOR_GMAIL_DAYS ?? 30);
const provider = new GmailRestProvider({ accessToken: token });
const vault = new LocalEncryptedVault(crypto.randomBytes(32));
const credentials = new DeviceCredentialStore();
const telemetry = new PrivacyTelemetrySink();
credentials.save(token);

const engine = new FinancialIngressEngine({ provider, vault, credentials, telemetry });
const started = Date.now();
const state = await engine.initialSync({ days });
const elapsedMs = Date.now() - started;

const result = {
  liveProvider: 'GMAIL',
  scopeExpected: 'gmail.readonly',
  days,
  emailsChecked: state.metrics.emailsChecked,
  fullMessagesFetched: state.metrics.fullMessagesFetched,
  financialCandidates: state.metrics.financialCandidates,
  canonicalCount: state.canonical.length,
  reviewCount: state.review.length,
  rawBodiesRetained: state.metrics.rawBodiesRetained,
  rawAttachmentsRetained: state.metrics.rawAttachmentsRetained,
  plaintextFinancialCloudBytes: state.metrics.plaintextFinancialCloudBytes,
  listCalls: state.metrics.listCalls,
  metadataCalls: state.metrics.metadataCalls,
  fullCalls: state.metrics.fullCalls,
  elapsedMs,
  encryptedSnapshotBytes: Buffer.byteLength(JSON.stringify(vault.exportSnapshot() ?? {})),
  telemetryEventCount: telemetry.events.length
};

if (process.env.FINANCESENSOR_GMAIL_REVOKE === '1') {
  const response = await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: 'POST' });
  if (!response.ok) throw new Error(`OAuth revoke failed: ${response.status}`);
  credentials.revokeAndDelete();
  result.remoteRevocation = 'PASS';
  result.localCredentialDeleted = !credentials.hasCredential();
} else {
  result.remoteRevocation = 'NOT_REQUESTED';
  result.localCredentialDeleted = false;
}

// Only aggregate operational evidence is printed. No source IDs, subjects, merchants,
// amounts, currencies, canonical payloads, tokens or message bodies leave this runner.
console.log(JSON.stringify(result, null, 2));
