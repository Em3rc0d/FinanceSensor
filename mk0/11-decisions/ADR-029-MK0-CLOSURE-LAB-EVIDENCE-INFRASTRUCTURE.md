# ADR-029 — MK0 Closure Lab Evidence Infrastructure

**Status:** ACCEPTED FOR MK0 EVIDENCE EXECUTION / NOT PRODUCT BUILD AUTHORITY  
**Date:** 2026-09-03  
**Refines:** ADR-010 and the G-MK0 build gate

## Context

FinanceSensor intentionally blocks unrestricted product implementation until the MK0 closure graph is satisfied. That rule prevents unresolved architecture from becoming accidental production code.

A literal interpretation created a circular dependency for physical cloud evidence:

```text
Q-004/Q-005 need physical cloud evidence
        ↓
physical cloud evidence needs an isolated provider environment
        ↓
ADR-010 said provider provisioning waits for the build gate
        ↓
build gate waits for Q-004/Q-005
        ↓
DEADLOCK
```

The project already permits bounded spikes and owned-device harnesses before `BUILD_READY`. Cloud evidence needs the same explicit category.

## Decision drivers

- preserve the rule that major product implementation does not begin while closure nodes remain open;
- permit the minimum infrastructure required to falsify or prove physical cloud assumptions;
- prevent a test environment from silently becoming production;
- prevent real Gmail/OAuth authority or real financial plaintext from entering cloud evidence infrastructure;
- keep public GitHub/CI outside the trusted edge;
- make cost-bearing provider actions explicit rather than accidental.

## Decision

FinanceSensor defines an **MK0 Closure Lab**.

The Closure Lab is evidence infrastructure, not product infrastructure.

```text
CLOSURE LAB
  purpose          physical gate verification only
  data             synthetic only
  users             test identities only
  Gmail authority   forbidden
  financial truth   synthetic only
  production keys   forbidden
  customer traffic  forbidden
  release authority none
```

Provisioning a Closure Lab before `BUILD_READY` is permitted only when the environment is necessary to close a physical gate that otherwise creates a circular dependency.

This exception does **not** authorize unrestricted application implementation.

## Allowed pre-BUILD_READY actions

The Closure Lab may be used for bounded evidence such as:

- Supabase RLS tenant-isolation negative tests;
- opaque-envelope storage inspection;
- control-metadata allowlist inspection;
- deletion workflow/tombstone tests;
- pre-delete backup restore tests;
- backup/PITR retention evidence;
- Edge Function authorization tests;
- service-role absence checks;
- deletion-resurrection barrier tests;
- witness topology preparation where no real tenant data is involved.

## Forbidden pre-BUILD_READY actions

The Closure Lab must not contain or perform:

- real Gmail OAuth authority;
- real Gmail content;
- real user financial plaintext;
- production Tenant Root Keys;
- production Recovery Private Keys;
- production device private keys;
- production service-role credentials in a client;
- customer-facing traffic;
- migrations promoted as production-ready merely because the lab passes;
- provider-side features whose cost has not been explicitly approved when they create a new paid charge.

## Environment identity

Every closure-lab environment must be unmistakably non-production.

Minimum metadata:

```text
environmentClass      MK0_CLOSURE_LAB
realUserDataAllowed   false
realGmailAllowed      false
productionKeysAllowed false
buildReadyAuthority   false
```

A generic pre-existing Supabase project may not be silently repurposed as the FinanceSensor Closure Lab. The environment must be dedicated and attributable to the evidence campaign.

## Cost gate

Some provider properties, especially production-shaped backup/PITR restore behavior, may require paid resources.

```text
STATIC PREPARATION                     autonomous
FREE / already-authorized lab action   bounded evidence only
NEW PAID RESOURCE / ADD-ON              explicit cost approval required
```

Lack of cost approval leaves the corresponding physical claim OPEN; it does not permit synthetic evidence to be promoted.

## Evidence classification

```text
CLOSURE_LAB_STATIC_TEST      != PHYSICAL_PROVIDER_PASS
CLOSURE_LAB_PROVIDER_RUN     = physical evidence candidate
CLOSURE_LAB_PASS             != PRODUCTION_PASS
CLOSURE_LAB_PASS             != BUILD_READY
```

A physical provider result may support a closure claim only when:

- the exercised provider feature is production-equivalent for the tested property;
- the exact environment/configuration is recorded;
- raw evidence is reduced locally or inside the trusted evidence boundary;
- only a sanitized receipt enters GitHub;
- residual differences between Closure Lab and production are recorded.

## Consequences

Positive:

- removes the circular dependency between physical closure and `BUILD_READY`;
- allows Q-004/Q-005 cloud assumptions to be tested rather than merely documented;
- keeps the distinction between evidence scaffolding and product implementation explicit;
- prevents an old generic cloud project from becoming production by inertia.

Costs/risks:

- one additional environment class to govern;
- possible provider cost for backup/PITR tests;
- lab/production drift must be explicitly tracked;
- passing a lab test can create false confidence unless receipts remain configuration-bound.

## Security / privacy impact

The Closure Lab is synthetic-only. Real restricted Gmail data and real financial plaintext remain forbidden.

Public CI may validate lab contracts and synthetic fixtures but may not receive Closure Lab secrets or provider credentials.

## Test / evidence required

- machine-readable Closure Lab policy validator;
- provider environment inventory before first physical cloud run;
- no production/real-data secrets in GitHub or public CI;
- receipt records exact provider configuration used by each physical claim;
- cost-bearing features recorded before use.

## Governing laws

```text
G-MK0 BLOCKS PRODUCT BUILD != G-MK0 BLOCKS ITS OWN EVIDENCE
CLOSURE_LAB != PRODUCTION
CLOSURE_LAB != TRUSTED EDGE FOR REAL GMAIL
SYNTHETIC CLOUD EVIDENCE != REAL USER DATA
LAB PASS != BUILD_READY
PAID PROVIDER ACTION REQUIRES COST APPROVAL
```

## Supersedes / superseded by

This ADR refines the provisioning sentence in ADR-010. It does not change the selected control-plane provider, the public-CI trust boundary, or the Q-003/Q-004/Q-005 physical closure requirements.
