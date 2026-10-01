# WF-001 — No-Scroll Build-Entry Contract

**Status:** PASS WHEN EXECUTABLE VIEWPORT TESTS PASS  
**Date:** 2026-09-02

## Scope

No-scroll is an information-priority constraint, not a universal ban on scrolling.

### No vertical scroll required

```text
S-01 HOME
S-04 SENSOR OVERVIEW
S-05 OPPORTUNITY primary decision
S-06 NEEDS REVIEW primary decision context
```

### Scroll explicitly allowed

```text
MOVEMENT HISTORY
SEARCH RESULTS
LONG EVIDENCE LISTS
LONG CONNECTION / DEVICE LISTS
LEGAL / PRIVACY DETAIL
```

## Minimum build-entry viewport

```text
WIDTH   360 logical px
HEIGHT  800 logical px
DPR     1.0 in deterministic widget contract
```

Physical Android validation later adds real status/navigation insets, device pixel ratio, font scale and accessibility settings.

## Executable assertions

`spikes/mobile-shell/test/widget_test.dart` must prove at 360×800:

### Home

- no `Scrollable` descendant inside `HomePage`;
- primary financial answer visible;
- money-in and money-spent visible;
- category composition visible;
- plan/budget context visible;
- Sensor callout visible;
- navigation visible;
- no Flutter overflow/framework exception.

### Sensor

- no `Scrollable` descendant inside `SensorPage`;
- Sensor state visible;
- Opportunity visible;
- Needs Review visible;
- Changed visible;
- signal monetary context visible;
- no Flutter overflow/framework exception.

### Opportunity

- monetary impact visible;
- primary option visible;
- no framework overflow.

### Needs Review

- subject/amount visible;
- low-confidence/review context visible;
- required decision type visible;
- no framework overflow.

### Movements negative control

`MovementsPage` must contain a Scrollable because chronology is an intrinsic sequence. This prevents the rule from mutating into `NO_SCROLL_EVERYWHERE`.

## Accessibility boundary

Build-entry PASS is deliberately narrower than release accessibility proof.

It is forbidden to preserve no-scroll by making text/touch targets unreadably small. Real Android validation must later include:

```text
FONT SCALE
SYSTEM INSETS
TOUCH TARGETS
SCREEN READER LABELS
CONTRAST
PHYSICAL SCREENSHOT
OVERFLOW DETECTION
```

If accessibility requires a hierarchy redesign, redesign the hierarchy instead of adding arbitrary dashboard scrolling.

## Evidence

- `VIEWPORT-CONTRACT.md`
- `SIGNATURE-UX-FREEZE.md`
- `../../spikes/mobile-shell/test/widget_test.dart`
- `../../spikes/mobile-shell/lib/main.dart`

## Laws

```text
NO_SCROLL != NO_PROGRESSIVE_DISCLOSURE
NO_SCROLL != TINY_UI
HISTORY_SCROLL = ALLOWED
SYNTHETIC_VIEWPORT_PASS != PHYSICAL_ANDROID_PASS
```

## Build-entry decision

When the deterministic Flutter widget suite passes the assertions above:

```text
NO_SCROLL_CONTRACT = PASS_FOR_BUILD_ENTRY
PHYSICAL_VIEWPORT_VALIDATION = OPEN
```
