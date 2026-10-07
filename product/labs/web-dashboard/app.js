import { money, summarizeProjection, truthLabel, validateProjection } from './projection-model.mjs';

const byId = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

async function loadProjection() {
  if (window.__FINANCESENSOR_PROJECTION__) {
    return validateProjection(window.__FINANCESENSOR_PROJECTION__);
  }
  // Synthetic lab fallback only. Production companion receives this object only
  // after client-side E2EE decryption; the relay never serves plaintext finance data.
  const response = await fetch('./projection.sample.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('PROJECTION_FETCH_FAILED');
  return validateProjection(await response.json());
}

function renderCashflow(projection) {
  const summary = summarizeProjection(projection);
  const target = byId('cashflow-grid');
  target.innerHTML = summary.byCurrency.map(bucket => `
    <article class="cashflow-card">
      <div class="currency">
        <span>${escapeHtml(bucket.currency)}</span>
        <span class="truth" data-state="${escapeHtml(bucket.truthState)}">${escapeHtml(truthLabel(bucket.truthState))}</span>
      </div>
      <div class="net">${escapeHtml(money(bucket.net, bucket.currency))}</div>
      <div class="money-row">
        <div><span class="money-label">Entró</span><strong class="money-value">${escapeHtml(money(bucket.income, bucket.currency))}</strong></div>
        <div><span class="money-label">Salió</span><strong class="money-value">${escapeHtml(money(bucket.expense, bucket.currency))}</strong></div>
      </div>
    </article>
  `).join('') || '<p class="empty">Todavía no hay flujo financiero materializado.</p>';
}

function renderTransactions(projection) {
  byId('transaction-count').textContent = String(projection.transactions.length);
  byId('transactions').innerHTML = projection.transactions.map(row => {
    const title = row.merchant || row.category || row.semanticType;
    const date = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
      .format(new Date(row.occurredAt));
    const signed = row.flowDirection === 'OUTFLOW' ? '-' : row.flowDirection === 'INFLOW' ? '+' : '';
    return `
      <div class="transaction">
        <div class="transaction-main">
          <p class="transaction-title">${escapeHtml(title)}</p>
          <div class="transaction-meta">
            <span>${escapeHtml(date)}</span>
            ${row.category ? `<span>${escapeHtml(row.category)}</span>` : ''}
            ${row.account ? `<span>${escapeHtml(row.account)}</span>` : ''}
            <span class="truth" data-state="${escapeHtml(row.truthState)}">${escapeHtml(truthLabel(row.truthState))}</span>
          </div>
        </div>
        <div class="transaction-amount">${escapeHtml(signed + money(row.amount, row.currency))}</div>
      </div>
    `;
  }).join('') || '<p class="empty">Aún no hay movimientos canónicos para mostrar.</p>';
}

function renderCoverage(projection) {
  const state = projection.monthlyState;
  byId('month-status').textContent = state ? state.status.replaceAll('_', ' ') : 'Cobertura por confirmar';
  if (!state) {
    byId('coverage').innerHTML = '<p class="empty">El motor aún no tiene un cierre mensual atribuible a una cuenta confirmada. No inventamos un porcentaje de completitud.</p>';
    return;
  }
  const rows = [
    ['Fuentes incluidas', state.includedSources],
    ['Fuentes reconciliadas', state.reconciledIncludedSources],
    ['EECC pendientes', state.pendingStatements],
    ['Pendientes de revisión', state.unresolvedItems],
    ['Conflictos bloqueantes', state.blockingConflicts],
    ['Excluidas por el usuario', state.userExcludedSources],
    ['No disponibles', state.notAvailableSources]
  ];
  byId('coverage').innerHTML = rows.map(([label, value]) => `
    <div class="coverage-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>
  `).join('');
}

function renderRecurring(projection) {
  byId('recurring').innerHTML = projection.recurringCandidates.map(item => `
    <div class="compact-item">
      <span>${escapeHtml(item.merchant || 'Patrón')}</span>
      <strong>${escapeHtml(item.cadence)} · ${escapeHtml(item.occurrenceCount)} obs.</strong>
    </div>
  `).join('') || '<p class="empty">Sin patrones recurrentes suficientes todavía.</p>';
}

function renderGaps(projection) {
  byId('gaps').innerHTML = projection.knowledgeGaps.map(item => `
    <div class="compact-item">
      <span>${escapeHtml(item.kind.replaceAll('_', ' '))}</span>
      <strong>${escapeHtml(item.reason.replaceAll('_', ' '))}</strong>
    </div>
  `).join('') || '<p class="empty">No hay vacíos de conocimiento visibles en esta proyección.</p>';
}

try {
  const projection = await loadProjection();
  renderCashflow(projection);
  renderTransactions(projection);
  renderCoverage(projection);
  renderRecurring(projection);
  renderGaps(projection);
} catch (error) {
  console.error('FinanceSensor dashboard stopped safely', error);
  byId('cashflow-grid').innerHTML = '<p class="empty">La proyección financiera no pudo validarse. No se mostraron datos parciales no verificados.</p>';
  byId('month-status').textContent = 'Proyección inválida';
}
