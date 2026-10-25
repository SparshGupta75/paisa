# Design language — iOS look, web runtime

Paisa runs as a home-screen web app on iPhone (see
[ARCHITECTURE.md#platform-decision](ARCHITECTURE.md#platform-decision)) but must
feel like it shipped with iOS, not like a website. The rule of thumb: **if Apple
would not do it, we do not do it.**

## Platform stance

iPhone Safari, installed to the home screen, is the only supported target.
Desktop browsers, iPad, and Android exist incidentally. Never compromise the
iPhone experience to keep another platform working.

Web-specific musts:

- Standalone display (no Safari chrome), `viewport-fit=cover`, safe-area insets
  respected at the top (status bar) and bottom (home indicator).
- No rubber-band scrolling of the whole page; only content areas scroll.
- No double-tap zoom on controls; inputs use ≥ 16 px text so Safari does not
  zoom on focus.
- `inputmode="decimal"` on amount fields so the numeric keypad opens.

## Non-negotiables

| Area | Rule |
| --- | --- |
| Type | System font stack (`-apple-system`, which renders SF Pro in Safari) via `typography` in `src/theme/tokens.ts`. Never add a custom font. |
| Navigation | `expo-router` `Stack` per tab and one bottom tab bar, styled like iOS. One shared tab bar component — never a second, ad-hoc one. |
| Titles | Large titles on top-level screens. Inline titles on pushed detail screens. (On the web the stack header renders a standard-size title; a large-title header component is future work.) |
| Icons | Ionicons via `<Icon name>` with semantic names (`home`, `lock`, …); add a name to `GLYPHS` in `Icon.tsx` rather than using a glyph directly. SF Symbols cannot be used on the web (Apple licence). Never emoji for chrome. |
| Tap targets | Minimum 44×44 pt (`layout.minTouchTarget`). |
| Text size | Never set `allowFontScaling={false}`. Layouts must survive 200% text zoom (Safari tab, **aA → 200%**; the home-screen app has no zoom control). |
| Dark mode | Every screen ships in both appearances. A light-only screen is a bug. |
| Numbers | `fontVariant: ['tabular-nums']` on all amounts and dates in lists. |
| Scroll | Respect safe areas with `env(safe-area-inset-*)` / `react-native-safe-area-context`; content must not slide under the status bar or home indicator. |
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
| `Icon` | `components/ui/Icon.tsx` | Semantic icon names mapped to Ionicons; decorative (hidden from assistive tech) |
| `TabStack` | `components/nav/TabStack.tsx` | Shared stack header options |
| `ConfirmSheet` | *(PR 3)* | The one iOS-style action sheet for confirmations and destructive actions |

Add primitives here rather than styling ad hoc in screens. If two screens need
the same look, it is a component.

## Interaction

- **Add expense** is a bottom sheet (modal route), not a push. It is a short
  task; a sheet communicates that.
- **Amount first.** Open with the keypad focused and the amount field empty. The
  category is a horizontal chip row or a picker, never a long dropdown.
- **Saving** dismisses immediately and shows a brief confirmation (toast with
  Undo where the action is reversible). Never block on a spinner for a local write.
- **Destructive actions** use the shared iOS-style action sheet component with a
  red destructive button. React Native's `Alert` does nothing on the web — never
  call it.
- **No haptics.** iOS Safari exposes no vibration API. Feedback is visual.
- **Motion** is short and standard (iOS-like slide for pushes, sheet rise for
  modals). No custom spring choreography.

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
- More than one dialog/sheet implementation
- Skeletons where a local query returns in under 30 ms
- Emoji as icons

## Accessibility checklist

- Every interactive element has an `accessibilityLabel` that makes sense read
  aloud, including amounts ("Expense, 450 rupees, Groceries").
- Colour is never the only signal — pair red/green with a sign or icon.
- Contrast ≥ 4.5:1 for body text in both appearances.
- Test at 200% text zoom (Safari tab, **aA → 200%**; the home-screen app has no zoom control) without clipping or overlap.
- VoiceOver (Safari) order matches visual order; roles come through
  `react-native-web` as real ARIA roles — check them.

## Visual QA before merging

1. In the **installed** home-screen app, not a Safari tab.
2. Light and dark, both from a cold start, one of them in Airplane Mode.
3. Empty state and populated state for the screen.
4. 200% text zoom (Safari tab, **aA → 200%**; the home-screen app has no zoom control).
5. Rotate to landscape: assume a manifest orientation lock is not honoured on
   iOS (still unverified on a device), so the layout must stay usable.
6. Repeated taps do not double-insert data.
7. Keyboard open: the focused field and the save button stay visible.
