---
name: Checkin Flow Architecture
description: Architecture, patterns, and known production issues for app/checkin/ (step1, step2, step3, zero-energy)
type: project
---

Checkin flow lives in `app/checkin/` with four screens: step1 (overdue tasks), step2 (energy declaration), step3 (task selection), zero-energy (0-spoon branch).

**Why:** Reviewed for production readiness on 2026-04-06. Re-verified against the code on 2026-05-28 — most functional bugs are now fixed; status updated below.

**Issue status (re-verified 2026-05-28):**

1. ✅ FIXED — step1.tsx no longer has per-card "Postpone" buttons; the only postpone action is "Tout reporter" → `bulkPostponeMutate()`, which is the intended behaviour.
2. ✅ FIXED — step2.tsx `handleContinue` now navigates with the spoon count: `router.replace('/checkin/step3?spoons=${spoons}')`.
3. ⚠️ PARTIAL — step2.tsx `createEnergy` is now awaited in a try/catch; navigation to step3 only happens on success (failure stays on screen). Still no explicit user-visible error message rendered (relies on `isPending`/`isError` which is not surfaced in the UI).
4. ✅ FIXED — step3.tsx `handleLetsGo` now wraps `mutateAsync` in try/catch; no more unhandled rejection.
5. ✅ FIXED (follows from #2) — step3 reads `spoons` from the URL and step2 now passes it, so `totalSpoons` is correct at runtime.
6. ⚠️ OPEN — zero-energy.tsx still uses `t(message.key)`; unknown server keys display raw. Acceptable degradation, still undocumented.
7. ✅ FIXED — step1.tsx now renders an error state (`isError ? <Text accessibilityRole="alert">`).
8. ✅ FIXED — step3.tsx now renders loading and error states.
9. ⚠️ OPEN — `SpoonSlider` in step2.tsx still uses `@ts-ignore` + non-standard props on a `View` as a testability shim. Must be replaced with a real Slider before GA if `@react-native-community/slider` is adopted.

**Also note (2026-05-28):** step3.tsx suggestions list and the tasks list were migrated from `ScrollView`+`.map()` to `FlatList` (virtualization), and `SpoonGauge` now animates `transform: scaleX` (native driver) instead of `width`.

**How to apply:** Before any store submission, focus remaining attention on the OPEN/PARTIAL items (#3 error UX, #6 i18n fallback, #9 slider shim).
