const normalize = (value = '') => String(value ?? '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const lower = value => normalize(value).toLowerCase();

export const EvidenceClass = Object.freeze({
  BANK_NOTIFICATION: 'BANK_NOTIFICATION',
  PAYMENT_NOTIFICATION: 'PAYMENT_NOTIFICATION',
  MERCHANT_RECEIPT: 'MERCHANT_RECEIPT',
  GENERIC_FINANCIAL_RECEIPT: 'GENERIC_FINANCIAL_RECEIPT'
});

const AUTHORITY_RANK = Object.freeze({
  [EvidenceClass.BANK_NOTIFICATION]: 400,
  [EvidenceClass.PAYMENT_NOTIFICATION]: 300,
  [EvidenceClass.MERCHANT_RECEIPT]: 200,
  [EvidenceClass.GENERIC_FINANCIAL_RECEIPT]: 100
});

export function evidenceAuthorityRank(value) {
  return AUTHORITY_RANK[value?.evidenceClass] ?? 0;
}

function headerValue(headers = {}, name = '') {
  const wanted = String(name).toLowerCase();
  for (const [key, value] of Object.entries(headers ?? {})) {
    if (String(key).toLowerCase() === wanted) return String(value ?? '');
  }
  return '';
}

function senderAddress(headers = {}) {
  const from = headerValue(headers, 'from');
  const match = from.match(/<([^>]+)>/) ?? from.match(/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
  return lower(match?.[1] ?? from);
}

function senderDomain(headers = {}) {
  return senderAddress(headers).split('@')[1] ?? '';
}

const MARKETING_OR_ACCOUNT = /\b(promo|promocion|oferta|descuento|dcto|sorteo|premio|preaprob|prestamo|beneficio|campana|ampliacion de linea|seguro|activacion|cambio de clave|cancelacion de tarjeta|solicitud de tarjeta|bienvenido|gana|participa)\b/i;
const SECURITY_ONLY = /\b(inicio de sesion|alerta de seguridad|cambio de clave|dispositivo nuevo|verificacion de seguridad)\b/i;

const BCP_DOMAIN = 'notificacionesbcp.com.pe';
const INTERBANK_DOMAIN = 'netinterbank.com.pe';
const RIPLEY_NOTIFICATION_DOMAIN = 'notificaciones.bancoripley.com.pe';
const RIPLEY_PROMO_DOMAIN = 'banco-ripley.com.pe';

function subjectOf(headers) {
  return normalize(headerValue(headers, 'subject'));
}

function decision(adapterId, evidenceClass, metadata) {
  return { candidate: true, adapterId, evidenceClass, metadata };
}

export function classifyTransactionMetadata(headers = {}) {
  const subject = subjectOf(headers);
  const s = lower(subject);
  const domain = senderDomain(headers);

  if (domain === BCP_DOMAIN) {
    if (/realizaste un consumo con tu tarjeta/.test(s)) return decision('BCP_CARD_PURCHASE', EvidenceClass.BANK_NOTIFICATION, { subject });
    if (/realizaste un retiro en un cajero automatico/.test(s)) return decision('BCP_ATM_WITHDRAWAL', EvidenceClass.BANK_NOTIFICATION, { subject });
    if (/constancia de transferencia entre mis cuentas/.test(s)) return decision('BCP_INTERNAL_TRANSFER', EvidenceClass.BANK_NOTIFICATION, { subject });
    if (/constancia de transferencia a otros bancos/.test(s)) return decision('BCP_EXTERNAL_TRANSFER', EvidenceClass.BANK_NOTIFICATION, { subject });
    if (/constancia de pago de tarjeta de credito propia/.test(s)) return decision('BCP_CARD_PAYMENT', EvidenceClass.BANK_NOTIFICATION, { subject });
    if (/constancia de pago de servicio/.test(s)) return decision('BCP_SERVICE_PAYMENT', EvidenceClass.BANK_NOTIFICATION, { subject });
    return { candidate: false, adapterId: 'BCP_NON_TRANSACTION', reason: 'KNOWN_BANK_NON_TRANSACTION' };
  }

  if (domain === INTERBANK_DOMAIN) {
    if (/realizaste un consumo con tu tarjeta interbank/.test(s)) return decision('INTERBANK_CARD_PURCHASE', EvidenceClass.BANK_NOTIFICATION, { subject });
    if (/constancia de pago plin/.test(s)) return decision('INTERBANK_PLIN_PAYMENT', EvidenceClass.PAYMENT_NOTIFICATION, { subject });
    if (/^constancia de transferencia$/.test(s)) return decision('INTERBANK_TRANSFER', EvidenceClass.BANK_NOTIFICATION, { subject });
    if (/^constancia de pago$/.test(s)) return decision('INTERBANK_SERVICE_PAYMENT', EvidenceClass.BANK_NOTIFICATION, { subject });
    return { candidate: false, adapterId: 'INTERBANK_NON_TRANSACTION', reason: 'KNOWN_BANK_NON_TRANSACTION' };
  }

  if (domain === RIPLEY_NOTIFICATION_DOMAIN) {
    if (/pago tarjeta ripley exitoso/.test(s)) return decision('RIPLEY_CARD_PAYMENT', EvidenceClass.BANK_NOTIFICATION, { subject });
    return { candidate: false, adapterId: 'RIPLEY_NON_TRANSACTION', reason: 'KNOWN_BANK_NON_TRANSACTION' };
  }

  if (domain === RIPLEY_PROMO_DOMAIN || domain.endsWith(`.${RIPLEY_PROMO_DOMAIN}`)) {
    return { candidate: false, adapterId: 'RIPLEY_PROMOTIONAL_DOMAIN', reason: 'KNOWN_BANK_NON_TRANSACTION' };
  }

  if (SECURITY_ONLY.test(s) || MARKETING_OR_ACCOUNT.test(s)) {
    return { candidate: false, adapterId: 'NEGATIVE_SUBJECT', reason: 'MARKETING_ACCOUNT_OR_SECURITY' };
  }

  if (/\b(confirmacion|constancia|comprobante|recibo|receipt)\b.*\b(pago|payment|compra|purchase|transferencia)\b/i.test(subject) ||
      /\b(pago|payment|compra|purchase)\b.*\b(confirmado|confirmacion|completed|receipt)\b/i.test(subject)) {
    return decision('GENERIC_RECEIPT', EvidenceClass.MERCHANT_RECEIPT, { subject });
  }

  return { candidate: false, adapterId: 'NO_TRANSACTION_SIGNATURE', reason: 'NO_STRONG_METADATA_SIGNATURE' };
}

function parseLocalizedNumber(raw = '') {
  const token = String(raw).replace(/[\u00A0 ]/g, '').replace(/[^0-9.,]/g, '').replace(/[.,]+$/, '');
  if (!token || !/\d/.test(token)) return null;
  const lastDot = token.lastIndexOf('.');
  const lastComma = token.lastIndexOf(',');
  let decimalSeparator = null;
  if (lastDot >= 0 && lastComma >= 0) decimalSeparator = lastDot > lastComma ? '.' : ',';
  else {
    const separator = lastDot >= 0 ? '.' : lastComma >= 0 ? ',' : null;
    if (separator) {
      const trailing = token.length - token.lastIndexOf(separator) - 1;
      if (trailing === 1 || trailing === 2) decimalSeparator = separator;
    }
  }
  const normalized = decimalSeparator
    ? `${token.slice(0, token.lastIndexOf(decimalSeparator)).replace(/[.,]/g, '')}.${token.slice(token.lastIndexOf(decimalSeparator) + 1).replace(/[.,]/g, '')}`
    : token.replace(/[.,]/g, '');
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function moneyFromMatch(match) {
  if (!match) return null;
  const marker = lower(match[1] ?? '');
  const amount = parseLocalizedNumber(match[2]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const currency = /usd|us\$|\$/.test(marker) && !/s\//.test(marker) ? 'USD' : 'PEN';
  return { amount, currency };
}

function firstMoney(text = '') {
  return moneyFromMatch(String(text).match(/\b(PEN|USD|US\$|S\/.?|\$)\s*([0-9][0-9.,\u00A0 ]*)/i));
}

function moneyAfter(text = '', labels = []) {
  for (const label of labels) {
    const re = new RegExp(`${label}\\s*[:#-]?\\s*(PEN|USD|US\\$|S\\/.?|\\$)\\s*([0-9][0-9.,\\u00A0 ]*)`, 'i');
    const found = moneyFromMatch(String(text).match(re));
    if (found) return found;
  }
  return null;
}

function field(text = '', labels = []) {
  for (const label of labels) {
    const match = String(text).match(new RegExp(`${label}\\s*[:#-]?\\s*([^\\n\\r;]{1,120})`, 'i'));
    if (match?.[1]) return normalize(match[1]);
  }
  return null;
}

function operationReference(text = '') {
  const match = String(text).match(/(?:numero|n[uú]mero|nro|n[°ºo.]?)\s*(?:de\s*)?operaci[oó]n\s*[:#-]?\s*([A-Za-z0-9-]{4,64})/i)
    ?? String(text).match(/(?:codigo|c[oó]digo)\s+de\s+operaci[oó]n\s*[:#-]?\s*([A-Za-z0-9-]{4,64})/i)
    ?? String(text).match(/(?:operation code|transaction id)\s*[:#-]?\s*([A-Za-z0-9-]{4,64})/i);
  return match?.[1] ?? null;
}

function bcpPurchase(text) {
  const match = String(text).match(/realizaste un consumo de\s*(PEN|USD|US\$|S\/.?|\$)\s*([0-9][0-9.,\u00A0 ]*)\s+con\s+tu\s+tarjeta[\s\S]{0,100}?\s+en\s+([^\n.]{1,100})/i);
  const money = moneyFromMatch(match);
  if (!money) return null;
  return { ...money, rawMerchant: normalize(match[3]), direction: 'OUT', semanticType: 'EXPENSE' };
}

function bcpWithdrawal(text) {
  const money = moneyAfter(text, ['total retirado', 'retiro de']) ?? firstMoney(text);
  if (!money) return null;
  return { ...money, rawMerchant: 'Cajero automatico', direction: 'OUT', semanticType: 'UNKNOWN', movementKind: 'CASH_WITHDRAWAL' };
}

function transfer(text, { internal = false } = {}) {
  const money = moneyAfter(text, ['monto transferido', 'monto enviado', 'monto']) ?? firstMoney(text);
  if (!money) return null;
  return { ...money, rawMerchant: null, direction: 'OUT', semanticType: internal ? 'INTERNAL_TRANSFER' : 'EXTERNAL_TRANSFER' };
}

function cardPayment(text) {
  const money = moneyAfter(text, ['monto total', 'monto pagado', 'monto']) ?? firstMoney(text);
  if (!money) return null;
  return { ...money, rawMerchant: 'Pago de tarjeta', direction: 'OUT', semanticType: 'CARD_PAYMENT' };
}

function servicePayment(text) {
  const money = moneyAfter(text, ['total pagado', 'monto pagado', 'monto', 'importe', 'recibo']) ?? firstMoney(text);
  if (!money) return null;
  return { ...money, rawMerchant: field(text, ['empresa', 'comercio', 'establecimiento']) ?? 'Pago de servicio', direction: 'OUT', semanticType: 'EXPENSE' };
}

function interbankCardPurchase(text) {
  const money = moneyAfter(text, ['monto']) ?? firstMoney(text);
  if (!money) return null;
  const merchant = normalize(String(text).match(/comercio\s*:\s*(.+?)(?=\s+monto\s*:|[;\n\r]|$)/i)?.[1] ?? '') || null;
  return { ...money, rawMerchant: merchant, direction: 'OUT', semanticType: 'EXPENSE' };
}

function plinPayment(text) {
  const money = moneyAfter(text, ['monto enviado', 'monto', 'importe']) ?? firstMoney(text);
  if (!money) return null;
  return { ...money, rawMerchant: null, direction: 'OUT', semanticType: 'EXTERNAL_TRANSFER', movementKind: 'P2P_PAYMENT' };
}

function genericReceipt(text) {
  const money = moneyAfter(text, ['total', 'monto', 'importe', 'amount']) ?? firstMoney(text);
  if (!money) return null;
  return {
    ...money,
    rawMerchant: field(text, ['comercio', 'merchant', 'establecimiento', 'empresa']) ?? null,
    direction: 'OUT',
    semanticType: 'EXPENSE'
  };
}

export function extractAdaptedFinancialEvidence(fullMessage, metadataDecision = classifyTransactionMetadata(fullMessage?.headers ?? {})) {
  if (!metadataDecision?.candidate) return null;
  const body = String(fullMessage?.body ?? '');
  let parsed = null;

  switch (metadataDecision.adapterId) {
    case 'BCP_CARD_PURCHASE': parsed = bcpPurchase(body); break;
    case 'BCP_ATM_WITHDRAWAL': parsed = bcpWithdrawal(body); break;
    case 'BCP_INTERNAL_TRANSFER': parsed = transfer(body, { internal: true }); break;
    case 'BCP_EXTERNAL_TRANSFER': parsed = transfer(body); break;
    case 'BCP_CARD_PAYMENT': parsed = cardPayment(body); break;
    case 'BCP_SERVICE_PAYMENT': parsed = servicePayment(body); break;
    case 'INTERBANK_CARD_PURCHASE': parsed = interbankCardPurchase(body); break;
    case 'INTERBANK_PLIN_PAYMENT': parsed = plinPayment(body); break;
    case 'INTERBANK_TRANSFER': parsed = transfer(body); break;
    case 'INTERBANK_SERVICE_PAYMENT': parsed = servicePayment(body); break;
    case 'RIPLEY_CARD_PAYMENT': parsed = cardPayment(body); break;
    case 'GENERIC_RECEIPT': parsed = genericReceipt(body); break;
    default: return null;
  }

  if (!parsed) return null;
  const providerTransactionId = operationReference(body);
  return {
    ...parsed,
    evidenceClass: metadataDecision.evidenceClass,
    adapterId: metadataDecision.adapterId,
    occurredAt: headerValue(fullMessage.headers, 'date'),
    confidence: metadataDecision.adapterId === 'GENERIC_RECEIPT' ? 0.72 : 0.96,
    references: {
      ...(providerTransactionId ? { providerTransactionId } : {}),
      ...(parsed.movementKind ? { movementKind: parsed.movementKind } : {})
    }
  };
}
