---
name: Checkin Flow Architecture
description: Architecture, patterns, and known production issues for app/checkin/ (step1, step2, step3, zero-energy)
type: project
---

Checkin flow lives in `app/checkin/` with four screens: step1 (overdue tasks), step2 (energy declaration), step3 (task selection), zero-energy (0-spoon branch).

**Why:** Reviewed for production readiness on 2026-04-06.

**Known issues found during review:**

1. step1.tsx — individual "Postpone" buttons all call `bulkPostponeMutate()` instead of a single-task endpoint. This is a functional bug: pressing one card's button postpones ALL tasks.
2. step2.tsx — `handleContinue` navigates to step3 via `router.replace('/checkin/step3')` but does NOT pass the spoon count as a query param. step3 reads `useLocalSearchParams({ spoons })` and will always get `undefined`, defaulting to 0.
3. step2.tsx — `createEnergyMutate` is fire-and-forget (no `onSuccess`/`onError`). Navigation to step3 happens immediately regardless of API success or failure. No user-visible error if the declare call fails.
4. step3.tsx — `handleLetsGo` uses `mutateAsync` but has no try/catch. An API error will produce an unhandled promise rejection, crashing the JS thread silently.
5. step3.tsx — `useLocalSearchParams` is imported but `spoons` comes from the URL; since step2 never passes it, `totalSpoons` is always 0 at runtime.
6. zero-energy.tsx — message text uses `t(message.key)` which looks up the key inside the i18n bundle. If the key does not exist in the bundle (server returns a key not in the locale file) the raw key is displayed — acceptable degradation but undocumented.
7. step1.tsx — no error state rendered if the `getAll` query fails (only loading/empty handled).
8. step3.tsx — no error state if suggestions query or taskLog mutation fails.
9. SpoonSlider in step2.tsx uses `@ts-ignore` and non-standard props on a View to expose value/onValueChange for tests. This is a deliberate testability shim but must be replaced with a real Slider before GA if `@react-native-community/slider` is adopted.

**How to apply:** Flag these issues immediately before any store submission.
