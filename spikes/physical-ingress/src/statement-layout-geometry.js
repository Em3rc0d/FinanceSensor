const normalize = (value = '') => String(value ?? '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toUpperCase();

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

export function findHeaderAnchors(page, headers = []) {
  const items = (page?.items ?? []).filter(item => String(item?.text ?? '').trim());
  const anchors = {};
  for (const header of headers) {
    const target = normalize(header.header);
    const matches = items.filter(item => normalize(item.text).includes(target));
    if (matches.length === 0) return null;
    matches.sort((a, b) => b.y - a.y || a.x - b.x);
    anchors[header.id] = {
      id: header.id,
      x: matches[0].x,
      y: matches[0].y,
      text: matches[0].text
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

export function lineToColumns(line, boundaries = []) {
  const result = {};
  for (const boundary of boundaries) result[boundary.id] = [];
  for (const item of line?.items ?? []) {
    const target = boundaries.find(boundary => item.x >= boundary.minX && item.x < boundary.maxX);
    if (target) result[target.id].push(item);
  }
  const text = {};
  for (const [key, items] of Object.entries(result)) {
    text[key] = items.map(item => String(item.text ?? '').trim()).filter(Boolean).join(' ').trim();
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
