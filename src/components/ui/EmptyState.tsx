import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { SymbolView } from 'expo-symbols';

import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from './Icon';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

export interface EmptyStateProps {
  icon: SymbolName;
  title: string;
  message: string;
  children?: ReactNode;
}

export function EmptyState({ icon, title, message, children }: EmptyStateProps) {
  const { colors, spacing, typography, radius } = useTheme();

  return (
    <View style={[styles.container, { paddingVertical: spacing.xxxl }]}>
      <View
        style={[
          styles.iconWell,
          { backgroundColor: colors.accentSoft, borderRadius: radius.pill },
        ]}
      >
        <Icon name={icon} size={28} color={colors.accent} />
      </View>
      <Text
        style={[typography.headline, { color: colors.label, textAlign: 'center', marginTop: 14 }]}
      >
        {title}
      </Text>
      <Text
        style={[
          typography.subhead,
          { color: colors.secondaryLabel, textAlign: 'center', marginTop: 6, maxWidth: 280 },
        ]}
      >
        {message}
      </Text>
      {children ? <View style={{ marginTop: spacing.xl }}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  iconWell: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
});
