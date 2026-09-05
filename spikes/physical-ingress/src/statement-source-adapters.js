const normalize = (value = '') => String(value ?? '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

const domainOf = (from = '') => {
  const match = String(from).toLowerCase().match(/@([a-z0-9.-]+)(?:>|\s|$)/i);
  return match?.[1] ?? '';
};

const attachmentsOf = (message = {}) => Array.isArray(message.attachments) ? message.attachments : [];

const isPdfLike = (attachment = {}) => {
  const mime = normalize(attachment.mimeType ?? attachment.mime_type);
  const filename = normalize(attachment.filename);
  return mime === 'application/pdf' ||
    mime === 'application/octet-stream' ||
    filename.endsWith('.pdf');
};

const pdfAttachments = (message) => attachmentsOf(message).filter(isPdfLike);

export const StatementSourceClass = Object.freeze({
  CREDIT_STATEMENT_AUTO: 'CREDIT_STATEMENT_AUTO',
  DEBIT_STATEMENT_MANUAL_REQUEST: 'DEBIT_STATEMENT_MANUAL_REQUEST',
  LOCAL_FILE_SELECTED: 'LOCAL_FILE_SELECTED',
  NOT_STATEMENT: 'NOT_STATEMENT'
});

export const StatementProviderProfile = Object.freeze({
  BCP_CREDIT: 'BCP_CREDIT',
  RIPLEY_CREDIT: 'RIPLEY_CREDIT',
  BCP_SAVINGS_REQUESTED: 'BCP_SAVINGS_REQUESTED',
  INTERBANK_SAVINGS_REQUESTED: 'INTERBANK_SAVINGS_REQUESTED',
  UNKNOWN: 'UNKNOWN'
});

function bcpCredit(message) {
  const senderDomain = domainOf(message.from ?? message.from_);
  const subject = normalize(message.subject);
  const pdfs = pdfAttachments(message);
  const senderOk = senderDomain === 'notificacionesbcp.com.pe';
  const subjectOk = /^estado de cuenta de tu tarjeta visa\b/.test(subject);
  const attachmentOk = pdfs.some(item => normalize(item.filename) === 'eecc_visa.pdf');
  return senderOk && subjectOk && attachmentOk;
}

function ripleyCredit(message) {
  const senderDomain = domainOf(message.from ?? message.from_);
  const subject = normalize(message.subject);
  const pdfs = pdfAttachments(message);
  const senderOk = senderDomain === 'bancoripley.com.pe';
  const subjectOk = subject === 'estado de cuenta banco ripley';
  return senderOk && subjectOk && pdfs.length > 0;
}

function bcpSavingsRequested(message) {
  const senderDomain = domainOf(message.from ?? message.from_);
  const subject = normalize(message.subject);
  const hint = normalize(`${message.snippet ?? ''} ${message.bodySnippet ?? ''}`);
  const pdfs = pdfAttachments(message);
  const senderOk = new Set([
    'notificacionesbcp.com.pe',
    'bcp.com.pe'
  ]).has(senderDomain);
  const subjectOk =
    subject.includes('constancia de envio de estado de cuenta') ||
    subject.includes('constancia de solicitud de copia de estado de cuenta');
  const accountHint = /cuenta ahorro|ahorro soles|estado de cuenta/.test(hint);
  const attachmentOk = pdfs.some(item => /^eecc.*\.pdf$/i.test(String(item.filename ?? '')));
  return senderOk && subjectOk && accountHint && attachmentOk;
}

export function classifyStatementMessage(message = {}) {
  const pdfs = pdfAttachments(message);

  if (bcpCredit(message)) {
    return {
      sourceClass: StatementSourceClass.CREDIT_STATEMENT_AUTO,
      providerProfile: StatementProviderProfile.BCP_CREDIT,
      attachmentCount: pdfs.length,
      requiresLocalPassword: true,
      canProvideInflows: false,
      reconciliationRole: 'CREDIT_CARD_PERIOD'
    };
  }

  if (ripleyCredit(message)) {
    return {
      sourceClass: StatementSourceClass.CREDIT_STATEMENT_AUTO,
      providerProfile: StatementProviderProfile.RIPLEY_CREDIT,
      attachmentCount: pdfs.length,
      requiresLocalPassword: true,
      canProvideInflows: false,
      reconciliationRole: 'CREDIT_CARD_PERIOD'
    };
  }

  if (bcpSavingsRequested(message)) {
    return {
      sourceClass: StatementSourceClass.DEBIT_STATEMENT_MANUAL_REQUEST,
      providerProfile: StatementProviderProfile.BCP_SAVINGS_REQUESTED,
      attachmentCount: pdfs.length,
      requiresLocalPassword: true,
      canProvideInflows: true,
      reconciliationRole: 'ACCOUNT_PERIOD'
    };
  }

  return {
    sourceClass: StatementSourceClass.NOT_STATEMENT,
    providerProfile: StatementProviderProfile.UNKNOWN,
    attachmentCount: pdfs.length,
    requiresLocalPassword: false,
    canProvideInflows: false,
    reconciliationRole: null
  };
}

export function selectStatementPdfAttachment(message = {}) {
  const classification = classifyStatementMessage(message);
  if (classification.sourceClass === StatementSourceClass.NOT_STATEMENT) return null;
  const pdfs = pdfAttachments(message);
  if (classification.providerProfile === StatementProviderProfile.BCP_CREDIT) {
    return pdfs.find(item => normalize(item.filename) === 'eecc_visa.pdf') ?? pdfs[0] ?? null;
  }
  return pdfs[0] ?? null;
}
