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
    if (value.includes('monto total facturado') || value.includes('como esta compuesta su deuda')) {
      return StatementPageRole.SUMMARY;
    }
    if (hasAll(value, ['estado de cuenta tarjeta visa', 'fecha de proceso', 'fecha de consumo', 'tipo de operacion', 'soles', 'dolares'])) {
      return StatementPageRole.TRANSACTION_LEDGER;
    }
  }

  if (providerProfile === StatementProviderProfile.RIPLEY_CREDIT) {
    if (hasAll(value, ['eecc tarjeta de credito ripley', 'tus movimientos del mes', 'fecha de operacion', 'fecha de proceso', 'descripcion', 'monto'])) {
      return StatementPageRole.TRANSACTION_LEDGER;
    }
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
