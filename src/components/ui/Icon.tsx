import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Platform, Text } from 'react-native';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

export interface IconProps {
  name: SymbolName;
  size?: number;
  color: string;
}

/**
 * SF Symbols wrapper.
 *
 * iOS renders the real system symbol, which is what makes the app feel native.
 * Android/web get a neutral glyph fallback — Paisa is iOS-first (see
 * docs/DESIGN.md#platform), so we do not ship a full icon set for them yet.
 */
export function Icon({ name, size = 22, color }: IconProps) {
  if (Platform.OS !== 'ios') {
    return <Text style={{ fontSize: size * 0.8, color, lineHeight: size }}>•</Text>;
  }

  return <SymbolView name={name} size={size} tintColor={color} resizeMode="scaleAspectFit" />;
}
