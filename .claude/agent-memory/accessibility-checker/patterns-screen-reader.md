---
name: Screen reader patterns for Spoony React Native
description: Confirmed correct patterns for VoiceOver/TalkBack in the Spoony check-in flow; covers headers, live regions, radio groups, checkboxes, and decorative element hiding
type: project
---

## Screen title / header landmark
Every screen must have exactly one `<Text accessibilityRole="header">` as the first focusable element so VoiceOver/TalkBack can jump between screens.

## Live regions
- Put `accessibilityLiveRegion="polite"` on the `<Text>` node, not on a parent `<View>`.
- Always add `accessibilityLabel` alongside the live region when the visible text alone lacks context (e.g. bare number → "8 spoons").
- Loading spinners (`<ActivityIndicator>`) need `accessibilityRole="progressbar"` + `accessibilityLabel` + `accessibilityLiveRegion` since they have no visible text.

## Mutually exclusive option groups (presets)
Use `accessibilityRole="radio"` + `accessibilityState={{ checked: isSelected }}` on each option.
Wrap the group in a `<View accessibilityRole="radiogroup" accessibilityLabel={groupLabel}>`.
Do NOT use `accessibilityRole="button"` + `selected` state — VoiceOver ignores `selected` on buttons.

## Adjustable slider
`accessibilityRole="adjustable"` requires `accessibilityValue={{ min, max, now }}` so VoiceOver announces the current position and enables swipe-up/swipe-down gestures.

## Checkbox labels in list rows
Encode ALL info (name + spoon cost + budget warning) into the single `accessibilityLabel` of the interactive `Pressable`.
Hide the sibling decorative `<View>` and `<Text>` nodes with both:
  - `importantForAccessibility="no-hide-descendants"` (Android TalkBack)
  - `accessibilityElementsHidden` (iOS VoiceOver)

## Button with ambiguous visible label
When the same label appears N times (e.g. "Postpone"), pass a contextualised `accessibilityLabel` prop to `<Button>` (e.g. "Postpone Faire les courses"). The `Button` component accepts an optional `accessibilityLabel` override that falls back to `label`.

## Roles to avoid on Views
- `accessibilityRole="text"` on a `<View>` is invalid in React Native — use it only on `<Text>` nodes.
- Remove `accessible` + wrong role from container Views that hold interactive children; doing so collapses all children into a single focus stop and hides nested buttons.
