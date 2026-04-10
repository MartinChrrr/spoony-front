---
name: RNTL v13 accessibility hiding behaviour
description: How accessibilityElementsHidden and importantForAccessibility affect RNTL query results — critical for not breaking tests when hiding decorative elements
type: project
---

## RNTL v13 (13.3.3) — what triggers isHiddenFromAccessibility

RNTL's `getByTestId`, `getByText`, `getAllByTestId` etc. exclude elements where
`isHiddenFromAccessibility` returns true. This is triggered by ANY ancestor having:

- `accessibilityElementsHidden={true}` (iOS prop)
- `importantForAccessibility="no-hide-descendants"` (Android prop)
- `aria-hidden={true}`
- `style={{ display: 'none' }}`

**`accessible={false}` does NOT trigger `isHiddenFromAccessibility`** — elements with
`accessible={false}` are still found by RNTL testID/text queries.

## Safe patterns for decorative elements (tests must still query children by testID)

Use `accessible={false}` + `importantForAccessibility="no"` on individual leaf elements
(not the container). This hides only that specific element from screen readers without
collapsing children.

```tsx
// Safe — children still queryable by testID
<View style={styles.spoonsRow}>
  {items.map((item, i) => (
    <View
      key={i}
      testID="spoon-icon-used"
      accessible={false}
      importantForAccessibility="no"
    />
  ))}
</View>
```

Do NOT use `importantForAccessibility="no-hide-descendants"` or
`accessibilityElementsHidden` on a container when tests query its children,
as this makes RNTL unable to find those children.

## Safe pattern when NO testID queries target children

Only then it's safe to use:
```tsx
<View
  importantForAccessibility="no-hide-descendants"
  accessibilityElementsHidden
>
  {/* children not queried by testID */}
</View>
```

## VoiceOver behaviour without explicit hiding

Non-interactive `View` elements (no text, no accessibilityRole, not accessible={true})
are naturally skipped by VoiceOver/TalkBack without any explicit hiding prop.
This is the safest approach when testID queryability must be preserved.

## Why

Discovered when hiding decorative spoon icons in SpoonGauge.tsx — using
`importantForAccessibility="no-hide-descendants"` broke 3 SpoonGauge tests in RNTL.
The fix was to rely on natural VoiceOver skip behaviour for plain View elements.
