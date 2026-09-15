const DAY_MS = 86_400_000;
const DEFAULT_HISTORY_DAYS = 730;
const MAX_HISTORY_DAYS = 730;
const DEFAULT_MAX_MESSAGES_PER_PROFILE = 500;
const MAX_MESSAGES_PER_PROFILE = 1000;
const DEFAULT_MAX_PAGES_PER_PROFILE = 20;
const MAX_PAGES_PER_PROFILE = 40;
const PDF_MIME = 'application/pdf';

const normalize = (value = '') => String(value ?? '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

const domainOf = (from = '') => {
  const address = String(from).match(/<?([a-z0-9._%+-]+@([a-z0-9.-]+))>?/i);
  return normalize(address?.[2] ?? '');
};

const boundedInteger = (value, fallback, maximum) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, maximum);
};

const yyyyMmDd = value => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('STATEMENT_DISCOVERY_DATE_INVALID');
  return date.toISOString().slice(0, 10).replaceAll('-', '/');
};

const messageAgeBucket = (headerDate, now) => {
  const timestamp = new Date(headerDate).getTime();
  if (!Number.isFinite(timestamp)) return 'UNKNOWN';
  const ageDays = Math.max(0, Math.floor((now - timestamp) / DAY_MS));
  if (ageDays <= 31) return 'DAYS_0_31';
  if (ageDays <= 92) return 'DAYS_32_92';
  if (ageDays <= 366) return 'DAYS_93_366';
  return 'DAYS_367_PLUS';
};

const sizeBucket = size => {
  if (size <= 0) return 'EMPTY';
  if (size <= 1_048_576) return 'UP_TO_1_MIB';
  if (size <= 5_242_880) return 'ONE_TO_5_MIB';
  if (size <= 20_971_520) return 'FIVE_TO_20_MIB';
  return 'OVER_20_MIB';
};

const matchesAny = (value, markers = []) => markers.some(marker => normalize(value).includes(normalize(marker)));
const filenameMatches = (filename, patterns = []) => patterns.some(pattern => pattern.test(String(filename ?? '')));
const discoverySourceKey = (messageId, attachmentId) =>
  `STATEMENT_DISCOVERY_V1:${encodeURIComponent(String(messageId))}:${encodeURIComponent(String(attachmentId))}`;

export const StatementCandidateState = Object.freeze({
  REJECTED: 'REJECTED',
  WEAK: 'WEAK',
  PROBABLE: 'PROBABLE',
  STRONG: 'STRONG',
  CONFLICT: 'CONFLICT'
});

export const STATEMENT_DISCOVERY_PROFILES_V1 = Object.freeze([
  Object.freeze({
    id: 'PE-BCP-CREDIT-MONTHLY-DISCOVERY-V1',
    institution: 'BCP',
    productType: 'CREDIT_CARD',
    statementFamily: 'MONTHLY_CARD_STATEMENT',
    senderDomains: Object.freeze(['notificacionesbcp.com.pe']),
    subjectMarkers: Object.freeze(['estado de cuenta de tu tarjeta visa']),
    filenamePatterns: Object.freeze([/^eecc_visa\.pdf$/i]),
    delivery: 'AUTO_GMAIL_ATTACHMENT',
    requiresLocalPassword: true
  }),
  Object.freeze({
    id: 'PE-BCP-SAVINGS-REQUESTED-DISCOVERY-V1',
    institution: 'BCP',
    productType: 'SAVINGS',
    statementFamily: 'REQUESTED_ACCOUNT_STATEMENT',
    senderDomains: Object.freeze(['notificacionesbcp.com.pe', 'bcp.com.pe']),
    subjectMarkers: Object.freeze([
      'constancia de envío de estado de cuenta',
      'constancia de solicitud de copia de estado de cuenta'
    ]),
    filenamePatterns: Object.freeze([/^eecc[^/\\]*\.pdf$/i]),
    delivery: 'REQUESTED_GMAIL_ATTACHMENT',
    requiresLocalPassword: true
  }),
  Object.freeze({
    id: 'PE-RIPLEY-CREDIT-MONTHLY-DISCOVERY-V1',
    institution: 'BANCO_RIPLEY',
    productType: 'CREDIT_CARD',
    statementFamily: 'MONTHLY_CARD_STATEMENT',
    senderDomains: Object.freeze(['bancoripley.com.pe']),
    subjectMarkers: Object.freeze(['estado de cuenta banco ripley']),
    filenamePatterns: Object.freeze([/\.pdf$/i]),
    delivery: 'AUTO_GMAIL_ATTACHMENT',
    requiresLocalPassword: true
  })
]);

export function validateDiscoveryProfiles(profiles = STATEMENT_DISCOVERY_PROFILES_V1) {
  if (!Array.isArray(profiles) || profiles.length === 0) throw new Error('STATEMENT_DISCOVERY_PROFILE_REGISTRY_EMPTY');
  const ids = new Set();
  for (const profile of profiles) {
    if (!profile?.id || ids.has(profile.id)) throw new Error('STATEMENT_DISCOVERY_PROFILE_ID_INVALID');
    ids.add(profile.id);
    if (!profile.institution || !profile.productType || !profile.statementFamily) throw new Error('STATEMENT_DISCOVERY_PROFILE_IDENTITY_INVALID');
    if (!Array.isArray(profile.senderDomains) || profile.senderDomains.length === 0) throw new Error('STATEMENT_DISCOVERY_PROFILE_SENDERS_EMPTY');
    if (!Array.isArray(profile.subjectMarkers) || profile.subjectMarkers.length === 0) throw new Error('STATEMENT_DISCOVERY_PROFILE_SUBJECTS_EMPTY');
    if (!Array.isArray(profile.filenamePatterns) || profile.filenamePatterns.length === 0) throw new Error('STATEMENT_DISCOVERY_PROFILE_FILENAMES_EMPTY');
    for (const domain of profile.senderDomains) {
      if (domainOf(`x@${domain}`) !== normalize(domain)) throw new Error('STATEMENT_DISCOVERY_PROFILE_SENDER_INVALID');
    }
  }
  return true;
}

export function planStatementDiscoveryQueries({
  profiles = STATEMENT_DISCOVERY_PROFILES_V1,
  now = Date.now(),
  historyDays = DEFAULT_HISTORY_DAYS
} = {}) {
  validateDiscoveryProfiles(profiles);
  const boundedDays = boundedInteger(historyDays, DEFAULT_HISTORY_DAYS, MAX_HISTORY_DAYS);
  const before = new Date(now + DAY_MS);
  const after = new Date(now - boundedDays * DAY_MS);

  return profiles.map(profile => {
    const senders = profile.senderDomains.map(domain => `from:${domain}`);
    const senderQuery = senders.length === 1 ? senders[0] : `{${senders.join(' ')}}`;
    const subjects = profile.subjectMarkers.map(marker => `subject:\"${marker.replaceAll('\"', '')}\"`);
    const subjectQuery = subjects.length === 1 ? subjects[0] : `{${subjects.join(' ')}}`;
    return Object.freeze({
      profileId: profile.id,
      query: `${senderQuery} ${subjectQuery} has:attachment filename:pdf after:${yyyyMmDd(after)} before:${yyyyMmDd(before)}`,
      includeSpamTrash: false,
      historyDays: boundedDays
    });
  });
}

function scoreProfile({ profile, from, subject, attachment }) {
  const senderMatch = profile.senderDomains.includes(domainOf(from));
  const subjectMatch = matchesAny(subject, profile.subjectMarkers);
  const filenameMatch = filenameMatches(attachment.filename, profile.filenamePatterns);
  const mimeMatch = normalize(attachment.mimeType ?? attachment.mime_type) === PDF_MIME;
  const score = (senderMatch ? 35 : 0) + (subjectMatch ? 30 : 0) + (filenameMatch ? 20 : 0) + (mimeMatch ? 15 : 0);
  return { profile, senderMatch, subjectMatch, filenameMatch, mimeMatch, score };
}

function matchingMessageProfiles(message, profiles) {
  const headers = message?.headers ?? {};
  const from = headers.From ?? headers.from ?? message?.from ?? '';
  const subject = headers.Subject ?? headers.subject ?? message?.subject ?? '';
  return profiles.filter(profile => profile.senderDomains.includes(domainOf(from)) && matchesAny(subject, profile.subjectMarkers));
}

export function classifyStatementCandidate({
  message,
  attachment,
  profiles = STATEMENT_DISCOVERY_PROFILES_V1,
  maximumAttachmentBytes = 20_971_520,
  authorityActive = true,
  now = Date.now()
} = {}) {
  validateDiscoveryProfiles(profiles);
  if (!message?.id || !attachment?.attachmentId) throw new Error('STATEMENT_CANDIDATE_SOURCE_IDENTITY_REQUIRED');

  const size = Number(attachment.size ?? 0);
  const maximumBytes = Number(maximumAttachmentBytes);
  if (!Number.isFinite(maximumBytes) || !Number.isInteger(maximumBytes) || maximumBytes <= 0) {
    throw new Error('STATEMENT_CANDIDATE_SIZE_LIMIT_INVALID');
  }
  const headers = message.headers ?? {};
  const from = headers.From ?? headers.from ?? message.from ?? '';
  const subject = headers.Subject ?? headers.subject ?? message.subject ?? '';
  const date = headers.Date ?? headers.date ?? message.date ?? '';
  const scored = profiles.map(profile => scoreProfile({ profile, from, subject, attachment }));
  const matchingProfiles = scored.filter(item => item.senderMatch && item.subjectMatch && item.filenameMatch && item.mimeMatch);
  const best = [...scored].sort((a, b) => b.score - a.score)[0];
  const reasons = [];

  if (!authorityActive) reasons.push('AUTHORITY_REVOKED');
  if (attachment.inline) reasons.push('INLINE_ATTACHMENT');
  if (!Number.isFinite(size) || !Number.isInteger(size) || size < 0) reasons.push('ATTACHMENT_SIZE_INVALID');
  else if (size === 0) reasons.push('EMPTY_ATTACHMENT');
  else if (size > maximumBytes) reasons.push('ATTACHMENT_TOO_LARGE');
  if (!best?.senderMatch) reasons.push('UNKNOWN_SENDER');
  if (!best?.subjectMatch) reasons.push('STATEMENT_MARKER_MISSING');
  if (!best?.filenameMatch) reasons.push('FILENAME_MARKER_MISSING');
  if (!best?.mimeMatch) reasons.push('NON_PDF_DESCRIPTOR');
  if (matchingProfiles.length > 1) reasons.push('PROFILE_MATCH_CONFLICT');

  const hardRejected = reasons.some(reason => [
    'AUTHORITY_REVOKED',
    'ATTACHMENT_SIZE_INVALID',
    'EMPTY_ATTACHMENT',
    'ATTACHMENT_TOO_LARGE',
    'UNKNOWN_SENDER',
    'NON_PDF_DESCRIPTOR',
    'INLINE_ATTACHMENT'
  ].includes(reason));

  let decision;
  if (matchingProfiles.length > 1) decision = StatementCandidateState.CONFLICT;
  else if (hardRejected) decision = StatementCandidateState.REJECTED;
  else if (matchingProfiles.length === 1 && best.score >= 85) decision = StatementCandidateState.STRONG;
  else if ((best?.score ?? 0) >= 65) decision = StatementCandidateState.PROBABLE;
  else decision = StatementCandidateState.WEAK;

  if (matchingProfiles.length === 1) reasons.push('PROFILE_MATCH_UNIQUE');
  if (decision === StatementCandidateState.STRONG) reasons.push('DOWNLOAD_ELIGIBLE');

  return Object.freeze({
    sourceKey: discoverySourceKey(message.id, attachment.attachmentId),
    messageId: String(message.id),
    attachmentId: String(attachment.attachmentId),
    profileId: matchingProfiles[0]?.profile.id ?? best?.profile.id ?? null,
    institution: matchingProfiles[0]?.profile.institution ?? best?.profile.institution ?? null,
    productType: matchingProfiles[0]?.profile.productType ?? best?.profile.productType ?? null,
    decision,
    score: best?.score ?? 0,
    reasonCodes: Object.freeze([...new Set(reasons)].sort()),
    sizeBucket: sizeBucket(size),
    messageAgeBucket: messageAgeBucket(date, now),
    downloadEligible: decision === StatementCandidateState.STRONG,
    requiresLocalPassword: decision === StatementCandidateState.STRONG
      ? Boolean(matchingProfiles[0].profile.requiresLocalPassword)
      : false
  });
}

export function buildStatementCandidateInventory(candidates = []) {
  const byProfile = new Map();
  const stateCounts = Object.fromEntries(Object.values(StatementCandidateState).map(state => [state, 0]));
  let downloadEligible = 0;

  for (const candidate of candidates) {
    if (!Object.values(StatementCandidateState).includes(candidate?.decision)) throw new Error('STATEMENT_CANDIDATE_STATE_INVALID');
    stateCounts[candidate.decision] += 1;
    if (candidate.downloadEligible) downloadEligible += 1;
    const key = candidate.profileId ?? 'UNKNOWN';
    const current = byProfile.get(key) ?? { profileId: key, candidates: 0, strong: 0, requiresUnlock: 0 };
    current.candidates += 1;
    if (candidate.decision === StatementCandidateState.STRONG) current.strong += 1;
    if (candidate.requiresLocalPassword) current.requiresUnlock += 1;
    byProfile.set(key, current);
  }

  return Object.freeze({
    candidates: candidates.length,
    downloadEligible,
    stateCounts: Object.freeze(stateCounts),
    profiles: Object.freeze([...byProfile.values()].sort((a, b) => a.profileId.localeCompare(b.profileId)))
  });
}

export async function discoverStatementCandidates({
  provider,
  profiles = STATEMENT_DISCOVERY_PROFILES_V1,
  now = Date.now(),
  historyDays = DEFAULT_HISTORY_DAYS,
  maxMessagesPerProfile = DEFAULT_MAX_MESSAGES_PER_PROFILE,
  maxPagesPerProfile = DEFAULT_MAX_PAGES_PER_PROFILE,
  terminalSourceKeys = []
} = {}) {
  if (!provider || typeof provider.listMessagePage !== 'function' || typeof provider.getMessage !== 'function') {
    throw new Error('STATEMENT_DISCOVERY_PROVIDER_REQUIRED');
  }

  const plans = planStatementDiscoveryQueries({ profiles, now, historyDays });
  const profileById = new Map(profiles.map(profile => [profile.id, profile]));
  const seenMessages = new Set();
  const seenCandidateSourceKeys = new Set();
  const terminalKeys = new Set(Array.from(terminalSourceKeys ?? [], String));
  const candidates = [];
  const queryReceipts = [];
  let skippedTerminal = 0;
  const messageLimit = boundedInteger(maxMessagesPerProfile, DEFAULT_MAX_MESSAGES_PER_PROFILE, MAX_MESSAGES_PER_PROFILE);
  const pageLimit = boundedInteger(maxPagesPerProfile, DEFAULT_MAX_PAGES_PER_PROFILE, MAX_PAGES_PER_PROFILE);

  for (const plan of plans) {
    let pageToken;
    let pages = 0;
    let enumerated = 0;
    do {
      const page = await provider.listMessagePage({
        query: plan.query,
        maxResults: Math.min(500, messageLimit - enumerated),
        pageToken,
        includeSpamTrash: false
      });
      pages += 1;
      for (const item of page.messages ?? []) {
        enumerated += 1;
        if (!item?.id || seenMessages.has(String(item.id))) continue;
        seenMessages.add(String(item.id));
        const message = await provider.getMessage({
          id: item.id,
          format: 'METADATA',
          metadataHeaders: ['From', 'Subject', 'Date']
        });
        if (String(message?.id ?? '') !== String(item.id)) throw new Error('STATEMENT_DISCOVERY_MESSAGE_ID_MISMATCH');
        if (matchingMessageProfiles(message, profiles).length === 0) continue;
        const descriptorMessage = await provider.getMessage({
          id: item.id,
          format: 'FULL',
          descriptorOnly: true
        });
        if (String(descriptorMessage?.id ?? '') !== String(item.id)) throw new Error('STATEMENT_DISCOVERY_MESSAGE_ID_MISMATCH');
        const classifiedMessage = { ...descriptorMessage, headers: message.headers };
        const messageCandidates = [];
        for (const attachment of descriptorMessage.attachments ?? []) {
          const sourceKey = discoverySourceKey(classifiedMessage.id, attachment.attachmentId);
          if (seenCandidateSourceKeys.has(sourceKey)) continue;
          seenCandidateSourceKeys.add(sourceKey);
          if (terminalKeys.has(sourceKey)) {
            skippedTerminal += 1;
            continue;
          }
          messageCandidates.push(classifyStatementCandidate({ message: classifiedMessage, attachment, profiles, now }));
        }
        const strongByProfile = new Map();
        for (const candidate of messageCandidates.filter(candidate => candidate.decision === StatementCandidateState.STRONG)) {
          const current = strongByProfile.get(candidate.profileId) ?? [];
          current.push(candidate.attachmentId);
          strongByProfile.set(candidate.profileId, current);
        }
        for (const candidate of messageCandidates) {
          if ((strongByProfile.get(candidate.profileId)?.length ?? 0) > 1) {
            candidates.push(Object.freeze({
              ...candidate,
              decision: StatementCandidateState.CONFLICT,
              reasonCodes: Object.freeze([...new Set([...candidate.reasonCodes, 'MULTIPLE_STRONG_ATTACHMENTS'])].sort()),
              downloadEligible: false,
              requiresLocalPassword: false
            }));
          } else {
            candidates.push(candidate);
          }
        }
        if (enumerated >= messageLimit) break;
      }
      pageToken = page.nextPageToken ?? null;
    } while (pageToken && pages < pageLimit && enumerated < messageLimit);

    queryReceipts.push(Object.freeze({
      profileId: profileById.get(plan.profileId)?.id ?? plan.profileId,
      pages,
      enumerated,
      exhausted: !pageToken
    }));
  }

  return Object.freeze({
    plans: Object.freeze(plans),
    queryReceipts: Object.freeze(queryReceipts),
    inventory: buildStatementCandidateInventory(candidates),
    skippedTerminal,
    candidates: Object.freeze(candidates)
  });
}
