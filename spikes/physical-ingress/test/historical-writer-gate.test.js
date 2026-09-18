import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decideHistoricalWriterGate,
  HistoricalWriterGateAction
} from '../src/historical-writer-gate.js';

test('non-RUNNING historical state allows statement writer preflight', () => {
  for (const status of ['NOT_STARTED', 'PAUSED', 'COMPLETE', 'COMPLETE_NO_INCREMENTAL_ANCHOR']) {
    const decision = decideHistoricalWriterGate({ bootstrapStatus: status, historyViewerProcessActive: null });
    assert.equal(decision.action, HistoricalWriterGateAction.ALLOW);
    assert.equal(decision.status, status);
  }
});

test('RUNNING plus a live Gmail History process remains blocked', () => {
  const decision = decideHistoricalWriterGate({ bootstrapStatus: 'RUNNING', historyViewerProcessActive: true });
  assert.equal(decision.action, HistoricalWriterGateAction.BLOCK_ACTIVE);
});

test('RUNNING without a live Gmail History process is classified as stale and recoverable', () => {
  const decision = decideHistoricalWriterGate({ bootstrapStatus: 'RUNNING', historyViewerProcessActive: false });
  assert.equal(decision.action, HistoricalWriterGateAction.RECOVER_STALE_RUNNING);
});

test('RUNNING with unknown process state fails closed', () => {
  const decision = decideHistoricalWriterGate({ bootstrapStatus: 'RUNNING', historyViewerProcessActive: null });
  assert.equal(decision.action, HistoricalWriterGateAction.BLOCK_UNKNOWN);
});
