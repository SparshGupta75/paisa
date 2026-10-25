# Design language — native iOS

Paisa must feel like it shipped with iOS, not like a web page in a shell. The
rule of thumb: **if Apple would not do it, we do not do it.**

## Platform stance

iPhone first, iPhone only. iPad, Android, and web are not supported targets; they
exist incidentally because Expo supports them. Never compromise an iOS
interaction to keep another platform working.

## Non-negotiables

| Area | Rule |
| --- | --- |
| Type | System font (SF Pro) via `typography` in `src/theme/tokens.ts`. Never add a custom font. |
| Navigation | Native stack (`expo-router` `Stack`) and native tab bar (`NativeTabs`). Never build a custom tab bar or fake header. |
| Titles | Large titles on top-level screens. Inline titles on pushed detail screens. |
| Icons | SF Symbols via `<Icon>`. Never emoji or hand-drawn SVG for chrome. |
| Tap targets | Minimum 44×44 pt (`layout.minTouchTarget`). |
| Dynamic Type | Never set `allowFontScaling={false}`. Layouts must survive XL text. |
| Dark mode | Every screen ships in both appearances. A light-only screen is a bug. |
| Numbers | `fontVariant: ['tabular-nums']` on all amounts and dates in lists. |
| Scroll | Respect safe areas and the status bar; `contentInsetAdjustmentBehavior="automatic"`. |
| Colour | Only from `useTheme().colors`. No hex literals in components. |

## Type ramp

Use the named style, never a raw `fontSize`:

`largeTitle 34/41` · `title1 28/34` · `title2 22/28` · `title3 20/25` ·
`headline 17/22 semibold` · `body 17/22` · `callout 16/21` · `subhead 15/20` ·
`footnote 13/18` · `caption 12/16`

## Colour roles

| Token | Use |
| --- | --- |
| `accent` | Tint, selected tab, primary buttons, links |
| `accentSoft` | Icon wells, selected row background |
| `background` | Page background (`systemGroupedBackground`) |
| `elevated` | Cards and grouped list rows |
| `label` / `secondaryLabel` / `tertiaryLabel` | Text hierarchy |
| `separator` | Hairlines between rows |
| `fill` | Neutral chips, inputs, pressed states |
| `negative` / `positive` / `warning` | Money direction and status only — never decoration |

Green means "money in", red means "money out". Do not use them for branding.

## Layout

- Screen inset: `layout.screenPadding` (20 pt).
- Vertical rhythm: 16 pt between groups, 8 pt between a header and its card.
- Card radius: `radius.lg` (20). Nested elements: `radius.sm` (10).
- Grouped lists: full-bleed card, rows 52 pt, hairline separators inset past the leading icon.
- No drop shadows. iOS conveys depth with materials and grouping, not shadows.

## Component inventory

| Component | File | Notes |
| --- | --- | --- |
| `Screen` | `components/ui/Screen.tsx` | Scroll container with correct insets |
| `Card` | `components/ui/Card.tsx` | Grouped list container |
| `SectionHeader` / `SectionFooter` | `components/ui/Card.tsx` | Uppercase header, muted footer |
| `Row` | `components/ui/Row.tsx` | Grouped list row, optional chevron/value |
| `EmptyState` | `components/ui/EmptyState.tsx` | Icon well + title + explanation |
| `Icon` | `components/ui/Icon.tsx` | SF Symbols wrapper with non-iOS fallback |
| `TabStack` | `components/nav/TabStack.tsx` | Shared native-stack header options |

Add primitives here rather than styling ad hoc in screens. If two screens need
the same look, it is a component.

## Interaction

- **Add expense** is a modal sheet (`.presentation: 'formSheet'`), not a push. It
  is a short task; a sheet communicates that.
- **Amount first.** Open with the keypad focused and the amount field empty. The
  category is a horizontal chip row or a picker, never a long dropdown.
- **Saving** dismisses immediately and fires a success haptic. Never block on a
  spinner for a local write.
- **Destructive actions** use a native `Alert` with a destructive-styled button,
  never a custom dialog.
- **Haptics** (via `expo-haptics`):
  - `selectionAsync` — changing category, toggling a filter
  - `impactAsync(Light)` — save succeeded
  - `notificationAsync(Success)` — budget created
  - `notificationAsync(Warning)` — delete confirmed
  Use at most one per interaction. Never on scroll.
- **Motion** is the system's. Do not add spring animations to screen transitions.

## Copy

- Short, calm, second person. "You spent ₹1,240 this week."
- Rupee amounts always formatted with `formatINR`.
- Indian English: "lakh", "crore", `DD MMM` dates ("25 Oct"), Monday week start.
- Empty states explain the next action, not the feature: "Add your first expense
  to see your month at a glance."

## Anti-patterns (reject in review)

- Custom fonts, gradients, glassmorphism cards, neon accents
- Hamburger menus, custom back buttons, custom tab bars
- Centred body text, justified text
- More than two accent colours
- Pie charts with more than six slices
- Modal dialogs built by hand
- Skeletons where a local query returns in under 30 ms
- Emoji as icons

## Accessibility checklist

- Every interactive element has an `accessibilityLabel` that makes sense read
  aloud, including amounts ("Expense, 450 rupees, Groceries").
- Colour is never the only signal — pair red/green with a sign or icon.
- Contrast ≥ 4.5:1 for body text in both appearances.
- Test at Dynamic Type XL without clipping or overlap.
- VoiceOver order matches visual order.

## Visual QA before merging

1. Light and dark, both from a cold start.
2. Empty state and populated state for the screen.
3. Dynamic Type XL.
4. Landscape is locked out (portrait only) — verify no rotation glitches.
5. Repeated taps do not double-insert data.
