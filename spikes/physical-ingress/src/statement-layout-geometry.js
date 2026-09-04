const normalize = (value = '') => String(value ?? '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toUpperCase();

const MONEY_COLUMN_IDS = new Set(['debit', 'credit', 'income', 'expense', 'runningBalance']);
const MONEY_FRAGMENT_TOUCH_TOLERANCE = 4;

export function pagePlainText(page = {}) {
  return (page.items ?? [])
    .slice()
    .sort((a, b) => (b.y - a.y) || (a.x - b.x) || (a.sequence - b.sequence))
    .map(item => String(item.text ?? '').trim())
    .filter(Boolean)
    .join(' ');
}

export function groupPageItemsIntoLines(page = {}, { yTolerance = 2.5 } = {}) {
  const items = (page.items ?? [])
    .filter(item => String(item?.text ?? '').trim())
    .slice()
    .sort((a, b) => (b.y - a.y) || (a.x - b.x) || (a.sequence - b.sequence));

  const lines = [];
  for (const item of items) {
    let line = lines.find(candidate => Math.abs(candidate.y - item.y) <= yTolerance);
    if (!line) {
      line = { y: item.y, items: [] };
      lines.push(line);
    }
    line.items.push(item);
  }

  for (const line of lines) {
    line.items.sort((a, b) => (a.x - b.x) || (a.sequence - b.sequence));
    line.text = line.items.map(item => String(item.text ?? '').trim()).filter(Boolean).join(' ');
    line.normalizedText = normalize(line.text);
  }
  lines.sort((a, b) => b.y - a.y);
  return lines;
}

function fragmentedHeaderMatch(lines, target) {
  for (const line of lines) {
    const items = line.items ?? [];
    for (let start = 0; start < items.length; start += 1) {
      let combined = '';
      for (let end = start; end < Math.min(items.length, start + 6); end += 1) {
        combined = [combined, String(items[end]?.text ?? '').trim()].filter(Boolean).join(' ');
        const normalized = normalize(combined);
        if (normalized === target) {
          return {
            x: items[start].x,
            y: line.y,
            text: combined
          };
        }
        if (normalized.length > target.length + 24) break;
      }
    }
  }
  return null;
}

export function findHeaderAnchors(page, headers = []) {
  const items = (page?.items ?? []).filter(item => String(item?.text ?? '').trim());
  const lines = groupPageItemsIntoLines(page);
  const anchors = {};
  for (const header of headers) {
    const target = normalize(header.header);
    const matches = items.filter(item => normalize(item.text).includes(target));
    if (matches.length > 0) {
      matches.sort((a, b) => b.y - a.y || a.x - b.x);
      anchors[header.id] = {
        id: header.id,
        x: matches[0].x,
        y: matches[0].y,
        text: matches[0].text
      };
      continue;
    }

    const fragmented = fragmentedHeaderMatch(lines, target);
    if (!fragmented) return null;
    anchors[header.id] = {
      id: header.id,
      ...fragmented
    };
  }
  return anchors;
}

export function columnBoundaries(headers = [], anchors = {}) {
  const ordered = headers
    .map(header => ({ ...header, x: anchors?.[header.id]?.x }))
    .filter(value => Number.isFinite(value.x))
    .sort((a, b) => a.x - b.x);

  if (ordered.length !== headers.length) return null;

  return ordered.map((column, index) => ({
    ...column,
    minX: index === 0 ? -Infinity : (ordered[index - 1].x + column.x) / 2,
    maxX: index === ordered.length - 1 ? Infinity : (column.x + ordered[index + 1].x) / 2
  }));
}

function normalColumnText(items = []) {
  return items.map(item => String(item.text ?? '').trim()).filter(Boolean).join(' ').trim();
}

function numericMoneyFragment(item) {
  const raw = String(item?.text ?? '').trim();
  if (!raw) return false;
  const token = raw.replace(/^S\/\.?\s*/i, '');
  return /\d/.test(token) && /^[0-9\s.,()+-]+$/.test(token);
}

function itemRight(item) {
  const x = Number(item?.x);
  const width = Number(item?.width);
  return Number.isFinite(x) ? x + (Number.isFinite(width) && width > 0 ? width : 0) : Number.NEGATIVE_INFINITY;
}

function looksLikeCompleteMoney(value) {
  const token = String(value ?? '')
    .trim()
    .replace(/^S\/\.?\s*/i, '')
    .replace(/\s+/g, '');
  return /^-?(?:\d{1,3}(?:[.,]\d{3})+|\d+)[.,]\d{2}$/.test(token);
}

function monetaryColumnText(items = []) {
  const numericItems = items
    .filter(numericMoneyFragment)
    .slice()
    .sort((a, b) => (a.x - b.x) || (a.sequence - b.sequence));

  if (numericItems.length === 0) return normalColumnText(items);

  let start = numericItems.length - 1;
  while (start > 0) {
    const previous = numericItems[start - 1];
    const current = numericItems[start];
    const gap = Number(current?.x) - itemRight(previous);
    if (!Number.isFinite(gap) || gap > MONEY_FRAGMENT_TOUCH_TOLERANCE) break;
    start -= 1;
  }

  const cluster = numericItems.slice(start);
  const joined = normalColumnText(cluster);
  if (looksLikeCompleteMoney(joined)) return joined;

  const rightmost = String(numericItems.at(-1)?.text ?? '').trim();
  if (parseFlexibleMoney(rightmost) !== null) return rightmost;
  return joined;
}

export function lineToColumns(line, boundaries = []) {
  const result = {};
  for (const boundary of boundaries) result[boundary.id] = [];
  for (const item of line?.items ?? []) {
    const target = boundaries.find(boundary => item.x >= boundary.minX && item.x < boundary.maxX);
    if (target) result[target.id].push(item);
  }
  const text = {};
  for (const [key, items] of Object.entries(result)) {
    text[key] = MONEY_COLUMN_IDS.has(key) ? monetaryColumnText(items) : normalColumnText(items);
  }
  return text;
}

export function parseFlexibleMoney(value) {
  const token = String(value ?? '').trim().replace(/[^0-9,.-]/g, '');
  if (!token) return null;
  const comma = token.lastIndexOf(',');
  const dot = token.lastIndexOf('.');
  let normalized = token;
  if (comma > dot) normalized = token.replace(/\./g, '').replace(',', '.');
  else normalized = token.replace(/,/g, '');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.abs(amount) : null;
}

export function normalizeLayoutText(value) {
  return normalize(value);
}
