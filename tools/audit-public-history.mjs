import { spawnSync } from 'node:child_process';

const MAX_TEXT_BLOB_BYTES = 2 * 1024 * 1024;

const detectors = [
  {
    id: 'GITHUB_TOKEN',
    regex: /(?:ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/g,
  },
  {
    id: 'GOOGLE_API_KEY',
    regex: /AIza[0-9A-Za-z_-]{20,}/g,
  },
  {
    id: 'PRIVATE_KEY',
    regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  },
  {
    id: 'OAUTH_REFRESH_TOKEN',
    regex: /\b1\/\/[0-9A-Za-z_-]{20,}\b/g,
  },
  {
    id: 'OAUTH_SECRET_JSON',
    regex: /["']client_secret["']\s*:\s*["']([^"']{8,})["']/gi,
    ignore: value => /(?:example|placeholder|redacted|dummy|test|fake|your[_ -]?client[_ -]?secret)/i.test(value),
  },
  {
    id: 'OAUTH_SECRET_ENV',
    regex: /\b(?:GOOGLE_CLIENT_SECRET|CLIENT_SECRET)\s*=\s*([^\s#]{8,})/gi,
    ignore: value => /(?:example|placeholder|redacted|dummy|test|fake|changeme|\$\{|%[A-Z0-9_]+%)/i.test(value),
  },
  {
    id: 'REAL_GMAIL_ADDRESS',
    regex: /\b[A-Z0-9._%+-]+@gmail\.com\b/gi,
    ignore: value => /(?:example|test|demo|fake|user|alice|bob|finance\.sensor)@gmail\.com/i.test(value),
  },
];

function runGit(args, options = {}) {
  const result = spawnSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  });
  if (result.status !== 0) {
    const stderr = String(result.stderr ?? '').trim();
    throw new Error(`git ${args[0]} failed${stderr ? `: ${stderr}` : ''}`);
  }
  return String(result.stdout ?? '');
}

function listHistoricalBlobs() {
  const lines = runGit(['rev-list', '--objects', '--all']).split(/\r?\n/).filter(Boolean);
  const bySha = new Map();
  for (const line of lines) {
    const firstSpace = line.indexOf(' ');
    const sha = firstSpace === -1 ? line : line.slice(0, firstSpace);
    const path = firstSpace === -1 ? '(unknown-path)' : line.slice(firstSpace + 1);
    if (!bySha.has(sha)) bySha.set(sha, path);
  }
  return bySha;
}

function objectType(sha) {
  return runGit(['cat-file', '-t', sha]).trim();
}

function objectSize(sha) {
  return Number(runGit(['cat-file', '-s', sha]).trim());
}

function blobContent(sha) {
  const result = spawnSync('git', ['cat-file', '-p', sha], {
    encoding: 'utf8',
    maxBuffer: MAX_TEXT_BLOB_BYTES + 1024,
  });
  if (result.status !== 0) throw new Error(`git cat-file failed for ${sha.slice(0, 12)}`);
  return String(result.stdout ?? '');
}

function scanContent(content) {
  const hits = [];
  for (const detector of detectors) {
    detector.regex.lastIndex = 0;
    let match;
    while ((match = detector.regex.exec(content)) !== null) {
      const candidate = match[1] ?? match[0];
      if (!detector.ignore?.(candidate)) hits.push(detector.id);
      if (match.index === detector.regex.lastIndex) detector.regex.lastIndex += 1;
    }
  }
  return [...new Set(hits)];
}

const blobs = listHistoricalBlobs();
const findings = [];
let textBlobsScanned = 0;
let binaryBlobsSkipped = 0;
let oversizedBlobsSkipped = 0;

for (const [sha, path] of blobs) {
  if (objectType(sha) !== 'blob') continue;
  const size = objectSize(sha);
  if (size > MAX_TEXT_BLOB_BYTES) {
    oversizedBlobsSkipped += 1;
    continue;
  }
  const content = blobContent(sha);
  if (content.includes('\u0000')) {
    binaryBlobsSkipped += 1;
    continue;
  }
  textBlobsScanned += 1;
  const classes = scanContent(content);
  if (classes.length) findings.push({ sha: sha.slice(0, 12), path, classes });
}

console.log(`FINANCESENSOR_PUBLIC_HISTORY_TEXT_BLOBS_SCANNED=${textBlobsScanned}`);
console.log(`FINANCESENSOR_PUBLIC_HISTORY_BINARY_BLOBS_SKIPPED=${binaryBlobsSkipped}`);
console.log(`FINANCESENSOR_PUBLIC_HISTORY_OVERSIZED_BLOBS_SKIPPED=${oversizedBlobsSkipped}`);

if (oversizedBlobsSkipped > 0) {
  console.error('FINANCESENSOR_PUBLIC_HISTORY_AUDIT=INCOMPLETE');
  console.error('Reason: oversized historical blobs require separate review.');
  process.exit(2);
}

if (findings.length) {
  console.error('FINANCESENSOR_PUBLIC_HISTORY_AUDIT=FAIL');
  for (const finding of findings) {
    console.error(`- ${finding.classes.join(',')} blob=${finding.sha} path=${finding.path}`);
  }
  console.error('Matched secret values are intentionally never printed. Rotate any real credential before rewriting history.');
  process.exit(1);
}

console.log('FINANCESENSOR_PUBLIC_HISTORY_AUDIT=PASS');
console.log('MATCHED_SECRET_VALUES_PRINTED=0');
