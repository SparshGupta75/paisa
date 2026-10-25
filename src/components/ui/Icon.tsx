import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

type Glyph = ComponentProps<typeof Ionicons>['name'];

/**
 * Semantic icon names. Screens ask for what an icon means, not which glyph
 * draws it, so the icon set can change in one place. Ionicons (MIT) replaces
 * SF Symbols, which Apple licenses for its own platforms only — see
 * docs/DESIGN.md#non-negotiables.
 */
const GLYPHS = {
  home: 'home',
  activity: 'list',
  budgets: 'pie-chart',
  settings: 'settings',
  wallet: 'wallet',
  lock: 'lock-closed',
  bolt: 'flash',
  cash: 'cash-outline',
  tray: 'file-tray-outline',
  list: 'list',
  pie: 'pie-chart-outline',
  'chevron-right': 'chevron-forward',
} as const satisfies Record<string, Glyph>;

export type IconName = keyof typeof GLYPHS;

export interface IconProps {
  name: IconName;
  size?: number;
  color: string;
}

export function Icon({ name, size = 22, color }: IconProps) {
  // Decorative: the surrounding control carries the accessible label.
  return (
    <Ionicons
      name={GLYPHS[name]}
      size={size}
      color={color}
      // Glyph box exactly `size` tall; the font's default line height adds ~2px.
      style={{ lineHeight: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
    />
  );
}
