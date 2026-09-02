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

Root public-safety controls include:

- `.gitignore` blocking common credential, result, private-key and local-runner files;
- `SECURITY.md` documenting the public trust boundary;
- CI-side public exposure pattern guards;
- no active workflow references `${{ secrets.* }}`;
- no current branch-head self-hosted route;
- a fail-closed whole-history auditor.

OAuth client IDs are public identifiers, not secrets. OAuth client secrets and provider authority remain confidential.

## GitHub Actions — public-safe operating mode

FinanceSensor now operates as a public repository using ephemeral standard GitHub-hosted runners:

```text
ACTIVE RUNNER                  ubuntu-latest
ACTIVE SELF-HOSTED PATHS       0
WORKFLOW SECRET REFERENCES     0 / forbidden
REAL Gmail/OAuth IN CI         forbidden
CI PERMISSIONS                 contents: read
```

The prior dedicated WSL self-hosted design is retired for active FinanceSensor workflows. Its historical evidence remains documentation only.

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

FinanceSensor completed the private→public transition on 2026-09-02. The default-branch `public` event triggered `FinanceSensor Public Readiness` as designed.

The first post-public run correctly failed closed on one `OAUTH_SECRET_ENV` detector hit in `spikes/physical-ingress/test/oauth-native-contract.test.js`. Inspection proved the matched value was the explicit synthetic fixture `desktop-local-client-secret` paired with the synthetic client ID `1234567890-example.apps.googleusercontent.com`; it was not provider authority or a real credential. The auditor was then narrowed with an exact reviewed-fixture allowlist rather than weakening the detector class.

The final certified reachable-ref audit, after main/jett reconciliation and public README alignment, observed:

```text
REPOSITORY VISIBILITY                       PUBLIC
CURRENT TREE PUBLIC EXPOSURE GUARD           PASS
CURRENT BRANCH-HEAD CI POLICY                PASS
SELF-HOSTED ROUTES                           0
secrets.* REFERENCES                         0
pull_request_target                          0
PUBLIC HISTORY TEXT BLOBS SCANNED            415
PUBLIC HISTORY COMMITS SCANNED               431
PUBLIC HISTORY TAGS SCANNED                  0
BINARY BLOBS SKIPPED                         0
OVERSIZED OBJECTS SKIPPED                    0
PUBLIC HISTORY AUDIT                         PASS
MATCHED SECRET VALUES PRINTED                0
PUBLIC READINESS                             PASS
PUBLIC_CERTIFIED                             YES
```

The certification is fail-closed: any future matching credential class, binary historical blob, oversized historical object, self-hosted branch-head workflow route, `${{ secrets.* }}` reference or `pull_request_target` use prevents a clean public-readiness result.

Law:

```text
PUBLIC_CERTIFIED != BUILD_READY
GREEN PUBLIC AUDIT != PRODUCT CLOSURE
PUBLIC REPOSITORY != TRUSTED FINANCIAL RUNTIME
```

## Repository governance

```text
main default-branch hardening        PASS
public history certification         PASS
main protected                       NO — pending GitHub branch-protection configuration
required status checks               NONE — pending protection configuration
branch protection enforcement        OFF — pending protection configuration
PR #1                                DRAFT / DO NOT MERGE
jett behind main                     0 after reconciliation
active CI routing                    ubuntu-latest
real Gmail execution                 LOCAL EDGE ONLY
```

The connected GitHub integration can read branch protection but does not expose a branch-protection/ruleset write action. Therefore protection is kept explicitly OPEN rather than falsely recorded as configured.

`OPS-001` remains a dependency of `G-MK0`; public certification does not close product governance or release gates.

## Take-the-Hummer rule

**Do not begin unrestricted product implementation yet.** Q-003/Q-004/Q-005 and G-MK0 remain open. Public certification changes repository exposure safety; it does not change product closure state.