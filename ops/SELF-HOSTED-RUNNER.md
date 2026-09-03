# FinanceSensor — CI Runner Trust Contract

**Status:** PUBLIC-SAFE HOSTED ROUTING ACTIVE  
**Previous target:** dedicated WSL Linux runner for private-repository CI  
**Current target:** ephemeral GitHub-hosted Linux runners plus one isolated hosted macOS compile route

## Governing boundary

```text
SELF_HOSTED_CI != FINANCESENSOR_TRUSTED_EDGE
GITHUB_HOSTED_CI != FINANCESENSOR_TRUSTED_EDGE
PUBLIC_REPOSITORY != FINANCESENSOR_TRUSTED_EDGE
```

Real Gmail OAuth authority and real financial data remain on the controlled local edge. CI is permitted to process repository source, synthetic fixtures, deterministic tests and sanitized packaging inputs only.

## Why the routing changed

FinanceSensor was initially designed to use a dedicated self-hosted WSL runner while the repository was private. Before public exposure, active workflows were migrated away from persistent self-hosted infrastructure.

A public repository can receive code contributions from untrusted users. Running such code on a persistent workstation runner would expand the trust boundary to the host machine and any ambient state it can reach. FinanceSensor therefore uses ephemeral GitHub-hosted execution for active public CI.

Historical self-hosted routing evidence remains valid as historical evidence only. It is not the current execution target.

## Current workflow routing

Default active jobs use:

```yaml
runs-on: ubuntu-latest
```

The only additional approved route is the isolated P2 iOS compile job inside `FinanceSensor Mobile Shell`:

```yaml
runs-on: macos-15
```

That macOS job exists only because UIKit/iOS SDK compilation requires an Apple toolchain. It is still ephemeral GitHub-hosted CI, keeps `contents: read`, references no repository/environment secrets, performs no Google authorization and reads no Keychain credential contents.

```text
MACOS_HOSTED_COMPILE != TRUSTED_EDGE
IOS_SIMULATOR_COMPILE != IOS_PHYSICAL_PASS
XCODE_BUILD_SUCCESS != KEYCHAIN_CUSTODY_PROVEN
```

Current active workflow families include:

- `FinanceSensor Heartbeat`;
- `MK0 Foundation`;
- `Package Gmail Level C Helper`;
- `FinanceSensor Public Readiness`;
- `FinanceSensor Mobile Shell`;
- `FinanceSensor Android Gmail Connection`.

The historical Gmail bearer workflow remains hard-disabled.

## CI permissions

Active workflows keep:

```yaml
permissions:
  contents: read
```

They must not reference `${{ secrets.* }}` during MK0. Real Gmail execution is not authorized in GitHub Actions.

## Allowed CI material

CI may receive:

- repository source code;
- synthetic fixtures;
- deterministic test data;
- build/package intermediates;
- public package dependencies;
- sanitized evidence already safe for repository storage.

CI must never receive or persist:

- Google OAuth Desktop credentials JSON;
- OAuth client secrets;
- Gmail access tokens;
- Gmail refresh tokens;
- OAuth authorization codes;
- PKCE verifiers from real user authorization;
- real Gmail message content;
- real financial records;
- personal SSH/private signing keys;
- real iOS Keychain credential contents;
- credentials copied from the user's workstation or WSL environments.

## Platform compile rules

Android synthetic build work runs on `ubuntu-latest`.

The iOS P2 compile proof may run on `macos-15` only to:

- resolve the pinned public Google Sign-In package;
- compile the reference Swift credential broker against the iOS Simulator SDK;
- prove the selected SDK symbols and Swift source are build-compatible;
- emit non-secret build metadata.

It may not:

- sign a production iOS application;
- receive an OAuth client secret or real bearer;
- perform real Google sign-in;
- inspect real Keychain credential material;
- claim `IOS_PROTECTED_OAUTH_CUSTODY=PASS`.

## Level C rule

The Level-C helper can be statically validated and packaged by CI. Real Gmail consent, token exchange, refresh, bounded Gmail calls and provider revoke execute only on the controlled local edge.

```text
CI PACKAGE != REAL PROVIDER EXECUTION
SANITIZED ARTIFACT != PROVIDER AUTHORITY
```

## Executable routing guard

`tools/validate-ci-runner-policy.mjs` fails if:

- an active workflow uses an unapproved runner;
- any workflow other than the Mobile Shell iOS compile job uses `macos-15`;
- an active workflow references a self-hosted runner;
- an active workflow references `${{ secrets.* }}`;
- an active workflow introduces cron scheduling during MK0;
- an unknown workflow appears without being registered;
- the iOS compile path loses its `REAL_OAUTH=0`, `KEYCHAIN_CONTENTS_READ=0` or `IOS_PHYSICAL_CUSTODY_PASS=NO` markers;
- the retired Gmail workflow loses its hard-disable guard.

## Public exposure guard

The Heartbeat verifies the root public-safety files and rejects common committed token/private-key patterns in the checked tree.

`FinanceSensor Public Readiness` performs the stronger publication gate. It checks out complete reachable history (`fetch-depth: 0`) and runs `tools/audit-public-history.mjs`. The auditor examines historical text blobs for high-risk credential classes and reports only detector class, abbreviated blob ID and path. Matched secret values are never printed.

A skipped, queued, quota-blocked or otherwise unexecuted public-readiness job is **not** a PASS.

## Historical runner state

Before the public-safe migration, a scheduling pulse produced queued jobs with the required labels but no assigned runner:

```text
status       queued
runner_id    null
runner_name  null
steps        []
```

Evidence remains at:

- `mk0/10-evidence/EV-CI-SELF-HOSTED-ROUTING-2026-09-02.md`

That evidence documents the prior private-repository design. It must not be interpreted as current routing.

## Governing rules

```text
SELF_HOSTED_CI != FINANCESENSOR_TRUSTED_EDGE
GITHUB_HOSTED_CI != FINANCESENSOR_TRUSTED_EDGE
CI_FIXTURES != REAL_FINANCIAL_DATA
PUBLIC_REPO != AUTHORIZATION_TO_RUN_REAL_GMAIL
PUBLIC_CLIENT_ID != SECRET
AMBIENT PERSONAL CREDENTIALS != BOOTSTRAP MECHANISM
MACOS_HOSTED_COMPILE != IOS_PHYSICAL_PASS
SIMULATOR != OWNED_IPHONE
SKIPPED CI != GREEN CI
QUEUED CI != GREEN CI
QUOTA_BLOCKED CI != GREEN CI
PUBLIC_READY != CURRENT_TREE_ONLY
```
