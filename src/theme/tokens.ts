/**
 * Design tokens for Paisa.
 *
 * These mirror the iOS system palette and the Human Interface Guidelines type
 * ramp so the app reads as a native iOS app rather than a web page in a shell.
 * Rules that keep it native:
 *   - Never hardcode a hex value in a component; read it from `useTheme()`.
 *   - Use the type ramp below instead of ad-hoc font sizes.
 *   - Screens use the system grouped background; content sits on `elevated`.
 *
 * This module is intentionally free of React so it can be unit tested and
 * imported from non-UI code.
 */
import type { TextStyle } from 'react-native';

export type ColorScheme = 'light' | 'dark';

export interface Palette {
  /** Brand + interactive tint. */
  accent: string;
  /** Low-opacity accent for icon wells and selected states. */
  accentSoft: string;
  /** Page background (iOS `systemGroupedBackground`). */
  background: string;
  /** Cards and grouped list rows (`secondarySystemGroupedBackground`). */
  elevated: string;
  /** Primary text (`label`). */
  label: string;
  /** Secondary text (`secondaryLabel`). */
  secondaryLabel: string;
  /** Disabled / placeholder text (`tertiaryLabel`). */
  tertiaryLabel: string;
  /** Hairlines between rows. */
  separator: string;
  /** Neutral fill for chips, inputs, and icon wells. */
  fill: string;
  negative: string;
  positive: string;
  warning: string;
}

export const palettes: Record<ColorScheme, Palette> = {
  light: {
    accent: '#0B7A53',
    accentSoft: 'rgba(11, 122, 83, 0.10)',
    background: '#F2F2F7',
    elevated: '#FFFFFF',
    label: '#000000',
    secondaryLabel: 'rgba(60, 60, 67, 0.60)',
    tertiaryLabel: 'rgba(60, 60, 67, 0.30)',
    separator: 'rgba(60, 60, 67, 0.20)',
    fill: 'rgba(118, 118, 128, 0.12)',
    negative: '#D70015',
    positive: '#0B7A53',
    warning: '#B25000',
  },
  dark: {
    accent: '#32D583',
    accentSoft: 'rgba(50, 213, 131, 0.16)',
    background: '#000000',
    elevated: '#1C1C1E',
    label: '#FFFFFF',
    secondaryLabel: 'rgba(235, 235, 245, 0.60)',
    tertiaryLabel: 'rgba(235, 235, 245, 0.30)',
    separator: 'rgba(84, 84, 88, 0.60)',
    fill: 'rgba(118, 118, 128, 0.24)',
    negative: '#FF453A',
    positive: '#32D583',
    warning: '#FFB340',
  },
};

/** HIG text styles. Values are iOS defaults; do not tune per screen. */
export const typography = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: 0.37 },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: 0.36 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.26 },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600', letterSpacing: -0.45 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.41 },
  body: { fontSize: 17, lineHeight: 22, letterSpacing: -0.41 },
  callout: { fontSize: 16, lineHeight: 21, letterSpacing: -0.32 },
  subhead: { fontSize: 15, lineHeight: 20, letterSpacing: -0.24 },
  footnote: { fontSize: 13, lineHeight: 18, letterSpacing: -0.08 },
  caption: { fontSize: 12, lineHeight: 16 },
} satisfies Record<string, TextStyle>;

/** Adds the iOS "monospaced digits" behaviour to an amount style. */
export const tabularNums: TextStyle = { fontVariant: ['tabular-nums'] };

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const layout = {
  /** Horizontal inset for grouped lists and page content. */
  screenPadding: 20,
  /** Minimum tappable size per HIG. */
  minTouchTarget: 44,
  /** Height of a standard grouped list row. */
  rowHeight: 52,
} as const;

export type Typography = typeof typography;
export type Spacing = typeof spacing;
export type Radius = typeof radius;
