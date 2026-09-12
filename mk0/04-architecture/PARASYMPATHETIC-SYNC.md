# FinanceSensor — Parasympathetic Sync Contract

**Scope:** Q-005 autonomic/background behavior  
**Status authority:** `graph/closure-ledger.json`

## 1. Purpose

FinanceSensor must know how to **rest**.

A privacy-first financial sensor that constantly polls, wakes radios, retries aggressively or performs heavy inference whenever connectivity flickers would be technically alive but operationally unhealthy.

The parasympathetic contract governs:

```text
rest
backoff
offline tolerance
battery preservation
OS-cooperative background execution
safe interruption
checkpointing
cool-down
recovery
```

## 2. Primary rule

```text
EVENTUAL FRESHNESS > FAKE REAL-TIME
```

Financial truth does not require permanent sub-second synchronization.

## 3. Autonomic states

```text
RESTING
  no meaningful pending work

WAKING
  a legitimate trigger arrived

SYNCING_LIGHT
  exchange small encrypted envelopes/checkpoints

PROCESSING_HEAVY
  source ingestion, OCR, local ML or maintenance

COOLING_DOWN
  persist checkpoint, release lease, schedule next admissible work

WAITING_FOR_OS
  work exists but background execution is not currently granted

WAITING_FOR_CONNECTIVITY
  network unavailable; no busy polling

BACKOFF
  transient failure/rate limit; bounded exponential full-jitter retry

LOW_RESOURCE
  battery/storage/resource constraints defer noncritical heavy work

PAUSED
  user/system policy disables background work

UPGRADE_REQUIRED
  newer schema/event cannot safely be interpreted
```

## 4. Legitimate wake reasons

```text
USER_INITIATED
SECURITY_CRITICAL        enrollment / revocation / key epoch change
LOCAL_ACTION_PENDING
OPAQUE_PUSH_HINT         optional future optimization
CONNECTIVITY_RESTORED
OS_BACKGROUND_WINDOW
PERIODIC_MAINTENANCE
APP_FOREGROUND
```

There is no `POLL_FOREVER` wake reason.

## 5. Work classes

### LIGHT_SYNC

Examples:

- upload/download small encrypted domain envelopes;
- checkpoint exchange;
- device authorization metadata;
- key-epoch metadata/wrapped-key package retrieval.

### SOURCE_INGEST

Examples:

- Gmail `history.list` / bounded source synchronization;
- message metadata retrieval;
- selected message extraction.

### HEAVY_LOCAL

Examples:

- OCR;
- local ML fallback;
- large import parsing;
- database rebuild;
- expensive reconciliation benchmark/maintenance.

### MAINTENANCE

Examples:

- compaction;
- stale cache cleanup;
- integrity scan;
- derived-state rebuild when not urgent.

## 6. Scheduling policy

Candidate priority:

```text
SECURITY_CRITICAL
      ↓
USER_INITIATED
      ↓
LIGHT_SYNC with pending user state
      ↓
SOURCE_INGEST
      ↓
HEAVY_LOCAL
      ↓
MAINTENANCE
```

Priority does not bypass OS execution rules.

## 7. Offline contract

When connectivity is unavailable:

```text
persist pending local work
persist safe checkpoint
enter WAITING_FOR_CONNECTIVITY
request OS/network callback where platform supports it
DO NOT create a rapid retry timer
DO NOT classify offline as financial failure
```

The UI may show stale/freshness state without treating the user's money as erroneous.

## 8. Backoff contract

Transient network/provider failures use bounded exponential **full jitter**.

Conceptual formula:

```text
ceiling = min(cap, base * 2^attempt)
delay   = random(0, ceiling)
```

Properties:

- cap prevents runaway delays;
- jitter prevents synchronized retry storms;
- successful progress resets the relevant failure counter;
- explicit provider `Retry-After` / OS scheduling guidance overrides our preferred retry time where applicable;
- authentication failures are not retried indefinitely: they transition to `NEEDS_AUTH`.

## 9. Battery contract

Low battery is not permission to silently lower financial correctness.

Instead:

```text
LIGHT_SYNC         may proceed when necessary and OS allows
SOURCE_INGEST      usually defer if background + battery low
HEAVY_LOCAL        defer by default
MAINTENANCE        require favorable conditions
SECURITY_CRITICAL  attempt minimum safe operation when OS allows
USER_INITIATED     may proceed visibly with user intent
```

Android WorkManager exposes constraints such as network type, battery-not-low, charging, device-idle and storage-not-low, specifically so work can wait for appropriate conditions.

Source: https://developer.android.com/develop/background-work/background-tasks/persistent/getting-started/define-work

## 10. iOS contract

FinanceSensor does not assume continuous arbitrary execution on iOS.

Apple's BackgroundTasks framework schedules app refresh/processing work under system control. `BGProcessingTask` may be interrupted and requires an expiration handler for cleanup. Processing tasks can also be conditioned on network connectivity/external power.

Sources:

- https://developer.apple.com/documentation/BackgroundTasks
- https://developer.apple.com/documentation/backgroundtasks/bgprocessingtask
- https://developer.apple.com/documentation/backgroundtasks/bgprocessingtaskrequest

Candidate rule:

```text
OS grants time
      ↓
load crash-safe checkpoint
      ↓
process bounded batch
      ↓
commit checkpoint after durable progress
      ↓
expiration requested?
      ├─ yes → stop accepting new work, finalize safe unit, persist, exit
      └─ no  → continue within bounded budget
```

## 11. Android contract

Use OS-scheduled persistent background work rather than a permanent app-owned polling loop.

Candidate mapping:

```text
LIGHT_SYNC       WorkManager network constraint
SOURCE_INGEST    WorkManager network + battery policy
HEAVY_LOCAL      battery-not-low / charging when appropriate
MAINTENANCE      charging + idle where appropriate
```

The exact native framework binding remains implementation-stage work.

## 12. Checkpoint discipline

Every background slice must be restartable.

Bad:

```text
process 500 operations
write cursor only at operation 500
```

Candidate:

```text
bounded unit
  ↓
durable domain event(s)
  ↓
durable checkpoint
  ↓
next bounded unit
```

A crash may repeat a completed unit, but idempotency must make replay safe.

## 13. Cool-down

After successful work:

```text
flush durable checkpoint
release processing lease
clear resolved retry counters
record content-free health telemetry
compute whether meaningful pending work remains
return to RESTING / WAITING_FOR_OS
```

No self-perpetuating wake loop.

## 14. Sympathetic vs parasympathetic balance

FinanceSensor does have a "sympathetic" fast path, but it is narrow:

```text
user explicitly requested refresh
new device enrollment
revocation / key rotation
local user correction waiting to sync
critical security state
```

Even these paths remain bounded and OS-compliant.

Everything else defaults toward calm, eventual convergence.

## 15. Failure classes

```text
OFFLINE
  wait for connectivity

RATE_LIMIT
  provider guidance + bounded jitter

TRANSIENT_REMOTE
  bounded jitter

AUTH_REQUIRED
  stop retry loop; surface reconnect

SCHEMA_TOO_NEW
  preserve opaque data; upgrade required

LOCAL_STORAGE_LOW
  stop noncritical persistence/maintenance safely

CRYPTO_VERIFY_FAIL
  quarantine envelope; do not retry as if network failure

KEY_EPOCH_MISSING
  fetch authorized wrapped key or surface authorization state
```

Failure classes must not collapse into `retry=true`.

## 16. Parasympathetic invariants for Q-005 spike

The bounded scheduler model must test:

```text
PNS-REST-001 no pending work → RESTING
PNS-REST-002 offline → WAITING_FOR_CONNECTIVITY with no busy retry
PNS-REST-003 low battery defers heavy background work
PNS-REST-004 user-initiated light sync may proceed when network available
PNS-REST-005 security-critical light work outranks ordinary cooldown
PNS-REST-006 exponential backoff remains inside configured cap
PNS-REST-007 successful work resets failure pressure
PNS-REST-008 OS expiration results in safe checkpoint/stop semantics
```

These are Q-005 architecture properties. They do not become release-level `PROVEN` until physical Android/iOS evidence exists.

## 17. Product implication

The user should experience this as:

```text
quiet when nothing matters
responsive when they ask
safe when offline
fresh enough without battery anxiety
explicit when reconnect/auth/upgrade is required
```

That is the parasympathetic system: **calm is a feature**.
