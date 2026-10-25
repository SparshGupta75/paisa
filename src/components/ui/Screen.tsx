import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export interface ScreenProps {
  children: ReactNode;
  /** Set false for screens that manage their own scrolling (e.g. FlatList). */
  scroll?: boolean;
  contentContainerStyle?: ViewStyle;
}

/**
 * Standard page container.
 *
 * Uses `contentInsetAdjustmentBehavior="automatic"` so content sits correctly
 * under the native large-title header and the blurred status bar.
 */
export function Screen({ children, scroll = true, contentContainerStyle }: ScreenProps) {
  const { colors, layout, spacing } = useTheme();

  const contentStyle: ViewStyle = {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl * 2,
    gap: spacing.lg,
    ...contentContainerStyle,
  };

  if (!scroll) {
    return (
      <View style={[styles.fill, { backgroundColor: colors.background }, contentStyle]}>
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.fill, { backgroundColor: colors.background }]}
      contentContainerStyle={contentStyle}
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
