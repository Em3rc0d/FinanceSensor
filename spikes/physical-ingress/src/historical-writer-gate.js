export const HistoricalWriterGateAction = Object.freeze({
  ALLOW: 'ALLOW',
  BLOCK_ACTIVE: 'BLOCK_ACTIVE',
  BLOCK_UNKNOWN: 'BLOCK_UNKNOWN',
  RECOVER_STALE_RUNNING: 'RECOVER_STALE_RUNNING'
});

export function decideHistoricalWriterGate({ bootstrapStatus, historyViewerProcessActive }) {
  const status = String(bootstrapStatus ?? 'NOT_STARTED');
  if (status !== 'RUNNING') {
    return { action: HistoricalWriterGateAction.ALLOW, status };
  }

  if (historyViewerProcessActive === true) {
    return { action: HistoricalWriterGateAction.BLOCK_ACTIVE, status };
  }

  if (historyViewerProcessActive === false) {
    return { action: HistoricalWriterGateAction.RECOVER_STALE_RUNNING, status };
  }

  return { action: HistoricalWriterGateAction.BLOCK_UNKNOWN, status };
}
