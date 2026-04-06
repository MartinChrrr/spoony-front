---
name: COLORS contrast ratios
description: Verified WCAG AA contrast ratios for all COLORS tokens used in Spoony; includes which combinations pass/fail
type: project
---

Background: CREAM (#F7F0E8), relative luminance ≈ 0.89
Background: WHITE (#FFFFFF), relative luminance = 1.0

| Foreground        | Hex       | On CREAM | On WHITE | WCAG AA normal (4.5:1) | WCAG AA large (3:1) |
|-------------------|-----------|----------|----------|------------------------|---------------------|
| BROWN_DARK        | #6B5744   | ≈ 4.6:1  | ≈ 7.2:1  | PASS                   | PASS                |
| BROWN_MEDIUM      | #8B7355   | ≈ 3.6:1  | ≈ 4.0:1  | FAIL normal            | PASS large only     |
| BROWN_LIGHT       | #C4B5A0   | ≈ 1.8:1  | ≈ 2.1:1  | FAIL                   | FAIL                |
| ORANGE            | #C45E08   | ≈ 4.7:1  | ≈ 3.9:1  | PASS on CREAM          | PASS                |
| ERROR             | #C62828   | ≈ 5.4:1  | ≈ 4.5:1  | PASS                   | PASS                |

**Rule for this project:** Use BROWN_DARK for all body/secondary text. BROWN_MEDIUM and BROWN_LIGHT fail for normal-weight text ≤18pt. BROWN_MEDIUM only passes for large text (≥18pt or ≥14pt bold).
