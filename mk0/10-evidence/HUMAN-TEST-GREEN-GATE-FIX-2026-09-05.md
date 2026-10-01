# Human-test green gate fix — 2026-09-05

Status: `PENDING_CI`

This change narrows the Dart privacy guard so it distinguishes executable credential identifiers from explanatory UI copy.

The previous rule matched human-readable text such as `Refresh token: 0` because it accepted spaces and hyphens between the words. The corrected rule still fails closed on programmatic identifiers/keys such as `refreshToken`, `refresh_token`, `accessToken`, `access_token`, `clientSecret`, and `client_secret`, while allowing explanatory prose that explicitly states zero custody.

No trusted-edge custody rule is weakened. Network endpoint checks, `dart:io`, Android custody guards, scanner persistence/logging guards, exact Gmail readonly scope, bounded metadata-first scan, no GitHub secrets, public hosted CI, and `BUILD_READY=NO` / `RELEASE_READY=NO` remain unchanged.

Promotion condition for this receipt: the dedicated `FinanceSensor Android Human Test Alpha` workflow must complete green on the candidate branch and then again on canonical after merge.

```text
HUMAN_TEST_READY=PENDING_CI
BUILD_READY=NO
RELEASE_READY=NO
IOS_TOUCHED=0
```
