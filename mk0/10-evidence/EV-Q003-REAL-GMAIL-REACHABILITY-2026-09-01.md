# EV-Q003 — Real Gmail Provider Reachability Probe

**Date:** 2026-09-01  
**Owner:** Q-003 / Q-004 / S-003  
**Evidence class:** controlled external-provider shape probe  
**Product OAuth status:** NOT PROVEN

## Purpose

Determine whether an already-authorized Gmail connection can return real transactional message data with the structural fields required by FinanceSensor's metadata-first ingress design, while keeping all financial plaintext out of the repository and CI evidence.

This certificate deliberately separates two claims:

```text
REAL GMAIL PROVIDER REACHABILITY
        !=
FINANCESENSOR-OWNED OAUTH TRANSPORT PROOF
```

## Probe boundary

The probe used an already-authorized Gmail connector available to the engineering environment. It did **not** expose or export its OAuth token to FinanceSensor code.

A bounded recent-message query was issued using transactional subject terms. The first phase requested message identifiers only. The second phase read exactly one matching message to validate source shape.

Observed, but not persisted, source capabilities:

```text
message identifier                 PRESENT
thread identifier                  PRESENT
sender metadata                    PRESENT
subject metadata                   PRESENT
message timestamp                  PRESENT
body text                          PRESENT
label metadata                     PRESENT
MIME / inline-image descriptors    PRESENT IN SAMPLE
ordinary attachment                NOT PRESENT IN SAMPLE
```

Privacy result:

```text
raw email committed to repository      0
real sender committed                   0
real subject committed                  0
real recipient committed                0
real account identifiers committed      0
real operation identifier committed     0
real amount committed                   0
real body/snippet committed             0
OAuth token committed/logged            0
```

## Defects exposed by the real shape

The real transactional shape exposed weaknesses that the synthetic harness had not caught. A sanitized fixture was frozen in:

`spikes/physical-ingress/test/real-provider-shape.test.js`

No real literals are present in that fixture.

The first red run at commit `ab9a6ff25172af4abfa0b14528b8856584eed2af` produced:

```text
PHYSICAL INGRESS       23 / 27 PASS
FAIL                    4
```

The four failed properties were:

1. thousands-formatted monetary values were truncated;
2. a notification sender was incorrectly fabricated into a merchant;
3. an explicit provider operation code was not captured as strong provenance;
4. alternate thousands/decimal separator ordering was not normalized.

The transfer semantic itself remained `EXTERNAL_TRANSFER`, and the observed debit-account wording remained an outgoing movement rather than being promoted to an economic expense.

## Repair

Commit `942084c7cf068ccf917d9685bd1332d4057c79db` hardened extraction with:

- locale-tolerant thousands/decimal normalization for the bounded PEN/USD parser;
- explicit merchant-only extraction instead of sender-as-merchant fallback;
- provider transaction reference extraction from explicit operation/transaction labels;
- explicit debit-account / incoming-account transfer direction rules;
- unchanged rule that transfer movement semantics do not invent economic effect.

Validated result:

```text
PHYSICAL INGRESS       27 / 27 PASS
FAIL                    0
CANONICAL RESOLVER      98 / 98 PASS
DISTRIBUTED / WITNESS  116 / 116 PASS
MK0 FOUNDATION           3 / 3 functional jobs PASS on repair head
```

## What this proves

At the bounded evidence level:

```text
GMAIL_PROVIDER_REACHABLE          PASS
REAL_MESSAGE_IDS_RECEIVED         PASS
REAL_TRANSACTIONAL_BODY_RECEIVED PASS
EXPECTED_SOURCE_SHAPE_PRESENT     PASS
REAL_SHAPE -> SANITIZED_TEST      PASS
REAL_RAW_DATA_REPO_RETENTION      0
```

## What this does NOT prove

This evidence does **not** prove:

- FinanceSensor's own Google OAuth client authorization;
- the `gmail.readonly` production consent screen;
- execution of `live/run-gmail.mjs` with a FinanceSensor-owned access token;
- Android OAuth lifecycle / token refresh / secure token storage;
- production Google OAuth verification approval;
- production security-assessment applicability;
- all Gmail MIME variants or bank templates;
- attachment extraction correctness for arbitrary Gmail MIME trees.

The remaining Level-B transport gate is still an externally authorized FinanceSensor OAuth credential. The connected engineering provider cannot and must not leak its bearer token into the repository merely to make this test green.

## Decision

```text
PROVIDER REACHABILITY         OBSERVED / PASS
DATA RECEPTION                OBSERVED / PASS
SANITIZED REAL-SHAPE CONTRACT PASS
FINANCESENSOR OAUTH TRANSPORT READY / NOT AUTHORIZED
Q-003                         ACTIVE
Q-004                         ACTIVE
S-003                         ACTIVE
BUILD_READY                   false
```

`DOCUMENTED != VERIFIED` remains governing law, and this certificate intentionally stops at the boundary actually observed.
