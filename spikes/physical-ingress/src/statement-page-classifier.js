import { StatementProviderProfile } from './statement-source-adapters.js';

const normalize = (value = '') => String(value ?? '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

export const StatementPageRole = Object.freeze({
  TRANSACTION_LEDGER: 'TRANSACTION_LEDGER',
  SUMMARY: 'SUMMARY',
  INFORMATIONAL: 'INFORMATIONAL',
  EDUCATIONAL_REFERENCE: 'EDUCATIONAL_REFERENCE',
  UNKNOWN: 'UNKNOWN'
});

function asPages({ pages, text } = {}) {
  if (Array.isArray(pages)) {
    return pages.map((page, index) => ({
      pageNumber: Number(page?.pageNumber ?? index + 1),
      text: typeof page === 'string' ? page : String(page?.text ?? '')
    }));
  }
  return String(text ?? '')
    .split('\f')
    .map((pageText, index) => ({ pageNumber: index + 1, text: pageText }));
}

function hasAll(text, markers) {
  return markers.every(marker => text.includes(marker));
}

function isEducational(text) {
  return [
    'te ayudamos a conocer tu estado de cuenta',
    'conoce el estado de cuenta de tu tarjeta de credito',
    'montos referenciales'
  ].some(marker => text.includes(marker));
}

const MONTH_TOKEN = '(?:ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic)';

function hasBcpCreditMovementPair(text) {
  // pdf.js may split a visual DDMMM token into separate text items (for example
  // "27" + "Jul"). pagePlainText then inserts whitespace even though the row
  // adapter can safely compact the token back to DDMMM inside its date column.
  // Keep page-role recognition at least as tolerant as the downstream parser.
  return new RegExp(`\\b\\d{1,2}\\s*${MONTH_TOKEN}\\s+\\d{1,2}\\s*${MONTH_TOKEN}\\b`, 'i')
    .test(text.replace(/\s+/g, ' '));
}

function hasRipleyCreditMovementDates(text) {
  const matches = text.match(new RegExp(`\\b\\d{1,2}/${MONTH_TOKEN}/\\d{4}\\b`, 'gi')) ?? [];
  return matches.length >= 2;
}

export function classifyStatementPage({ text, providerProfile } = {}) {
  const value = normalize(text);
  if (!value) return StatementPageRole.UNKNOWN;
  if (isEducational(value)) return StatementPageRole.EDUCATIONAL_REFERENCE;

  if (providerProfile === StatementProviderProfile.BCP_SAVINGS_REQUESTED) {
    if (hasAll(value, ['estado de cuenta de ahorros cuenta digital bcp', 'fecha proc', 'fecha valor', 'cargos / debe', 'abonos / haber'])) {
      return StatementPageRole.TRANSACTION_LEDGER;
    }
  }

  if (providerProfile === StatementProviderProfile.BCP_CREDIT) {
    // The Gmail/source classifier already established the BCP credit profile.
    // A transaction continuation page therefore does not need to repeat the exact
    // document title; column headers plus a real process/consumption date pair are
    // the bounded row-evidence requirement. Summary pages without that evidence
    // still fail closed below.
    const ledgerHeader = hasAll(value, ['proceso', 'consumo', 'descripcion', 'operacion', 'soles', 'dolares']);
    if (ledgerHeader && hasBcpCreditMovementPair(value)) return StatementPageRole.TRANSACTION_LEDGER;
    if (value.includes('monto total facturado') || value.includes('como esta compuesta su deuda')) {
      return StatementPageRole.SUMMARY;
    }
  }

  if (providerProfile === StatementProviderProfile.RIPLEY_CREDIT) {
    const ledgerHeader = value.includes('eecc tarjeta de credito ripley')
      && value.includes('tus movimientos del mes')
      && hasAll(value, ['operacion', 'proceso', 'descripcion', 'monto']);
    if (ledgerHeader && hasRipleyCreditMovementDates(value)) return StatementPageRole.TRANSACTION_LEDGER;
    if (value.includes('partes claves de tu estado de cuenta') || value.includes('operaciones por canal')) {
      return StatementPageRole.INFORMATIONAL;
    }
  }

  if (providerProfile === StatementProviderProfile.INTERBANK_SAVINGS_REQUESTED) {
    if (hasAll(value, ['estado de cuenta', 'cuenta simple soles', 'detalle de movimientos', 'ingresos', 'gastos', 'saldo contable'])) {
      return StatementPageRole.TRANSACTION_LEDGER;
    }
    if (value.includes('en interbank nos preocupamos por tu seguridad') || value.includes('realiza gratis tus consultas')) {
      return StatementPageRole.INFORMATIONAL;
    }
  }

  return StatementPageRole.UNKNOWN;
}

const PROFILE_ORDER = [
  StatementProviderProfile.BCP_SAVINGS_REQUESTED,
  StatementProviderProfile.BCP_CREDIT,
  StatementProviderProfile.RIPLEY_CREDIT,
  StatementProviderProfile.INTERBANK_SAVINGS_REQUESTED
];

export function classifyStatementDocument({ pages, text } = {}) {
  const normalizedPages = asPages({ pages, text });
  for (const providerProfile of PROFILE_ORDER) {
    const roles = normalizedPages.map(page => classifyStatementPage({ text: page.text, providerProfile }));
    if (roles.includes(StatementPageRole.TRANSACTION_LEDGER)) {
      return {
        providerProfile,
        status: 'PROFILE_CONFIRMED',
        pageRoles: normalizedPages.map((page, index) => ({
          pageNumber: page.pageNumber,
          role: roles[index]
        }))
      };
    }
  }
  return {
    providerProfile: StatementProviderProfile.UNKNOWN,
    status: 'PROFILE_UNKNOWN',
    pageRoles: normalizedPages.map(page => ({
      pageNumber: page.pageNumber,
      role: StatementPageRole.UNKNOWN
    }))
  };
}

export function selectTransactionLedgerPages({ pages, text, classification } = {}) {
  const normalizedPages = asPages({ pages, text });
  const providerProfile = classification?.providerProfile ?? StatementProviderProfile.UNKNOWN;
  const withRoles = normalizedPages.map(page => ({
    ...page,
    role: classifyStatementPage({ text: page.text, providerProfile })
  }));
  const ledgers = withRoles.filter(page => page.role === StatementPageRole.TRANSACTION_LEDGER);
  return { pages: withRoles, ledgers };
}
