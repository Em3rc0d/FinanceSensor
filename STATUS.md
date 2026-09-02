# FinanceSensor — Current Status

Last reconciled baseline: **2026-09-02**.

## Project state

```text
PRODUCT THESIS             PASS
PRODUCT INVARIANTS         PASS
DOMAIN GLOSSARY            DRAFTED
ROADMAP                    DRAFTED
COMPETITIVE MINING         INITIAL PASS
SOURCE CONCEPT MINING      PASS

MK0 BRAINSTORMING          PASS
MK0 MINING SITE            ACTIVE
MK0 QUARRIES               ACTIVE
MK0 DESIGN                 DRAFTED
MK0 ARCHITECTURE           DRAFTED
MK0 DATA MODEL             DRAFTED
MK0 SIGNATURE WIREFRAMES   DRAFTED
MK0 PLAN                   DRAFTED
MK0 BUILD                  BLOCKED
MK0 TEST STRATEGY          DRAFTED
MK0 EVIDENCE               ACTIVE
MK0 ADR SET                OPEN
MK0 RELEASE GATES          DRAFTED
REPOSITORY GOVERNANCE      OPEN

BUILD_READY                NO
```

`graph/closure-ledger.json` remains the authoritative source for closure state.

## Financial heart

```text
CANONICAL RESOLVER           98 / 98 PASS
SEMANTIC CORPUS              54 bounded cases PASS
Q-002 ADVERSARIAL DECISIONS  28 / 28 PASS
UNSAFE FALSE MERGES          0
AUTO-MERGE PRECISION         100%
HARD-LINK FALSE SPLITS       0
REPLAY DUPLICATE COUNT       0
BENCHMARK DECISION ACCURACY  100%
```

Closed financial-heart nodes:

```text
C-001 External-transfer semantics     CLOSED
C-002 Refund/reversal projection      CLOSED
Q-001 Canonical semantics             CLOSED
Q-002 Fingerprinting/dedup            CLOSED
```

## Distributed nervous system

```text
E2EE / KEY / RECOVERY / REVOCATION /
KNEE / CHECKPOINT / WITNESS / PNS      116 / 116 PASS
```

Q-005 remains `ACTIVE`: bounded spike evidence is not release-grade production/mobile/crypto/witness proof.

## Gmail / financial ingress

Contract-level ingress remains green:

```text
PHYSICAL INGRESS / OAUTH CONTRACTS     53 / 53 PASS
CANONICAL RESOLVER                      98 / 98 PASS
```

Current architectural law:

```text
METADATA-FIRST                         PASS
FULL ONLY FOR CANDIDATES               PASS
INCREMENTAL HISTORY MODEL              PASS
MESSAGE-DERIVED historyId ANCHOR       PASS
BOUNDED RECENT-INBOX BOOTSTRAP         PASS
RAW ATTACHMENT AUTO-FETCH              0
RAW BODY DURABLE RETENTION             0
PLAINTEXT FINANCIAL CLOUD              0 in harness
AUTH SECRET IN TESTED LOGS             0
```

### Level C physical proof

FinanceSensor-owned OAuth Level C v7 physically passed on the controlled local edge. Sanitized evidence is stored at:

`mk0/10-evidence/EV-Q003-OWNED-OAUTH-LEVEL-C-V7-PASS-2026-09-02.md`

Key proof:

```text
REAL CONSENT                         PASS
EXACT SCOPE                          gmail.readonly
STATE BINDING                        PASS
PKCE S256                            PASS
TOKEN EXCHANGE                       HTTP 200
PROFILE IDENTITY                     PASS
SYNC ANCHOR SOURCE                   MESSAGE_HISTORY_ID
RECENT INBOX ANCHOR WINDOW           PASS
ANCHOR ESTABLISHED                   PASS
INCREMENTAL HISTORY                  PASS
PURCHASE METADATA                    PASS
PRODUCTION METADATA GATE             PASS
SELECTED FULL                        PASS
EXTRACTION                           PASS
REPLAY                               PASS
PROVIDER REVOKE                      PASS
OLD REFRESH AUTHORITY                DENIED
LEVEL C                              PASS
```

Sanitized evidence counters remain zero for raw Gmail content, financial plaintext, auth secrets, credential paths, mailbox identity, message IDs and unrelated Subjects.

### Q-003 closure state

Q-003 remains `ACTIVE`. Level C proves DEV feasibility; it does not close the production/provider contract.

```text
LEVEL C PHYSICAL EXECUTION                    PASS
SUCCESSFUL PHYSICAL REFRESH BEFORE REVOKE     OPEN
REQUEST PAYLOAD BYTE ACCOUNTING               OPEN
PER-ENDPOINT LATENCY EVIDENCE                 OPEN
ANDROID/IOS PROTECTED CREDENTIAL HANDLING     OPEN
PUBLIC RESTRICTED-SCOPE VERIFICATION          OPEN
SECURITY-ASSESSMENT ARCHITECTURE BOUNDARY     FROZEN
SECURITY-ASSESSMENT PROVIDER DETERMINATION    OPEN
PRODUCTION VERIFICATION PACKAGE               DRAFTED
Q-003                                         ACTIVE
```

Production-policy law:

```text
GMAIL OAUTH AUTHORITY ON SERVER              FORBIDDEN
SERVER-SIDE Gmail API CALLS                  FORBIDDEN
RAW Gmail SERVER PROCESSING                  FORBIDDEN
GENERALIZED Gmail-DERIVED MODEL TRAINING     FORBIDDEN
E2EE OPAQUE RELAY                            ALLOWED BY ARCHITECTURE
E2EE RELAY => ASSESSMENT EXEMPT              NOT PROVEN
GOOGLE ASSESSMENT APPLICABILITY              PROVIDER DETERMINATION REQUIRED
```

Relevant artifacts:

- `mk0/11-decisions/ADR-020-GMAIL-RESTRICTED-DATA-SERVER-BOUNDARY.md`
- `mk0/07-plan/GMAIL-PRODUCTION-VERIFICATION-PACKAGE.md`
- `tools/validate-gmail-production-policy.mjs`

## Privacy boundary

```text
PUBLIC_REPOSITORY != FINANCESENSOR_TRUSTED_EDGE
GITHUB_HOSTED_CI != FINANCESENSOR_TRUSTED_EDGE
CI_FIXTURES != REAL_FINANCIAL_DATA
```

Gmail OAuth credentials, refresh/access tokens, authorization codes, real Gmail content and real financial plaintext are forbidden from repository and CI custody. Real Gmail Level-C execution remains LOCAL EDGE ONLY.

Root public-safety controls now include:

- `.gitignore` blocking common credential, result, private-key and local-runner files;
- `SECURITY.md` documenting the public trust boundary;
- CI-side public exposure pattern guard;
- no active workflow references `${{ secrets.* }}`.

OAuth client IDs are public identifiers, not secrets. OAuth client secrets and provider authority remain confidential.

## GitHub Actions — public-safe operating mode

FinanceSensor is prepared for public CI using ephemeral standard GitHub-hosted runners:

```text
ACTIVE RUNNER                  ubuntu-latest
ACTIVE SELF-HOSTED PATHS       0
WORKFLOW SECRET REFERENCES     0 / forbidden
REAL Gmail/OAuth IN CI         forbidden
CI PERMISSIONS                 contents: read
```

The prior dedicated WSL self-hosted design is retired for active FinanceSensor workflows before public exposure. Its historical evidence remains documentation only.

```text
PUBLIC REPO + PERSISTENT WORKSTATION RUNNER  FORBIDDEN
PUBLIC REPO + EPHEMERAL HOSTED CI             ACCEPTED
```

See `ops/SELF-HOSTED-RUNNER.md` for the migrated runner trust contract.

## Closure graph

```text
P-001 Product thesis                 PASS
P-002 Product invariants             PASS
Q-001 Canonical semantics            CLOSED
Q-002 Fingerprinting/dedup           CLOSED
Q-003 Gmail feasibility              ACTIVE
Q-004 Email privacy                  ACTIVE
Q-005 E2EE multi-device sync         ACTIVE
C-001 External-transfer semantics    CLOSED
C-002 Refund/reversal projection     CLOSED
A-001 Core architecture              DRAFTED
SEC-001 Security/privacy arch        DRAFTED
DM-001 Core data model               DRAFTED
WF-001 Signature wireframes          DRAFTED
S-001 Canonical resolver spike       ACTIVE
T-001 Canonical resolver test        PASS
S-002 E2EE/PNS/recovery/witness      ACTIVE
T-002 Distributed suite              PASS
S-003 Physical ingress/OAuth spike   ACTIVE
T-003 Ingress/privacy suite          PASS
OPS-001 Repository governance        OPEN
G-MK0 BUILD_READY                    BLOCKED
```

```text
GRAPH        PASS
NODES        21
BUILD_READY  false
```

## Public-readiness state

The pre-publication surface is now closed without promoting product gates or merging MK0 into `main`.

`main` contains the minimum default-branch publication controls required before exposure:

- root `.gitignore`;
- root `SECURITY.md`;
- a public trust-boundary section in `README.md`;
- `tools/audit-public-history.mjs`;
- `.github/workflows/public-readiness.yml`.

The public-readiness workflow listens to GitHub's `public` repository event from the default branch. On the private→public transition it explicitly fetches every branch and tag, checks all current branch-head workflow definitions, and scans every reachable text blob plus commit/tag object for credential classes. Binary or oversized objects make the audit `INCOMPLETE`; they cannot silently pass.

Manual pre-publication review also established:

```text
KNOWN REAL SECRET LEAK                     NOT FOUND
KNOWN REAL GMAIL LEAK                      NOT FOUND
KNOWN REAL FINANCIAL PLAINTEXT LEAK        NOT FOUND
WORKFLOW_DISPATCH RUNS                     0
REAL GMAIL LIVE WORKFLOW EXECUTIONS        0
OAUTH NEGATIVE PROBES                      SYNTHETIC ONLY
OLDEST ACTIONS RUNNER INSPECTED            GITHUB-HOSTED
SENSITIVE ACTION LOGS INSPECTED            PASS
CURRENT BRANCH-HEAD SELF-HOSTED ROUTES     0
CURRENT BRANCH-HEAD secrets.* REFERENCES   0
```

The automated whole-history certification still cannot execute while the repository is private because the private GitHub-hosted Actions quota is exhausted. This is a runtime/billing condition, not a code failure. The gate is therefore armed to execute automatically when the repository becomes public.

```text
DEFAULT-BRANCH PUBLIC HARDENING             PASS
CURRENT TREE PUBLIC-SAFETY CONTROLS         PASS
ACTIVE PUBLIC CI ROUTING                    PASS BY CONFIGURATION
SENSITIVE HISTORICAL SURFACE REVIEW         PASS
PUBLIC TRANSITION AUTO-AUDIT                ARMED
WHOLE-HISTORY AUTOMATED CERTIFICATION       PENDING PUBLIC EVENT
PRE_PUBLICATION_READY                       YES
PUBLIC_CERTIFIED                            NO UNTIL AUTO-AUDIT PASS
REPOSITORY VISIBILITY                       PRIVATE
```

Law:

```text
PRE_PUBLICATION_READY != PUBLIC_CERTIFIED
QUOTA_BLOCKED AUDIT != AUDIT FAILURE
PUBLIC EVENT PASS => PUBLIC_CERTIFIED
```

## Repository governance

```text
main default-branch hardening        PASS
main protected                       NO — private-plan limitation
required status checks               NONE — arm after public audit
branch protection enforcement        OFF — arm after public audit
PR #1                                DRAFT / DO NOT MERGE
jett behind main                     0 after reconciliation
active CI routing                    ubuntu-latest
real Gmail execution                 LOCAL EDGE ONLY
```

GitHub branch protection/rulesets are deliberately not represented as closed while the repository remains private and the current plan rejects that configuration. They are a post-visibility governance action, not a reason to merge MK0 early.

`OPS-001` remains a dependency of `G-MK0`.

## Take-the-Hummer rule

**Do not begin unrestricted product implementation yet.** Q-003/Q-004/Q-005 and G-MK0 remain open. Public-readiness hardening changes repository exposure safety; it does not change product closure state.