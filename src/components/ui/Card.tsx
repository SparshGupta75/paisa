import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

/** iOS-style inset grouped list container. */
export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.elevated,
          borderRadius: radius.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Uppercase section label above a Card, matching iOS grouped headers. */
export function SectionHeader({ children }: { children: ReactNode }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <Text
      accessibilityRole="header"
      style={[
        typography.footnote,
        styles.header,
        { color: colors.secondaryLabel, marginBottom: spacing.sm },
      ]}
    >
      {typeof children === 'string' ? children.toUpperCase() : children}
    </Text>
  );
}

/** Small explanatory text below a Card. */
export function SectionFooter({ children }: { children: ReactNode }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <Text
      style={[
        typography.footnote,
        { color: colors.secondaryLabel, marginTop: spacing.sm, paddingHorizontal: spacing.xs },
      ]}
    >
      {children}
    </Text>
  );
}

export function Section({ children }: { children: ReactNode }) {
  return <View>{children}</View>;
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  header: { paddingHorizontal: 4, letterSpacing: 0.4 },
});
