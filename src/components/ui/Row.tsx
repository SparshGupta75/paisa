import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from './Icon';

export interface RowProps {
  title: string;
  subtitle?: string;
  /** Right-aligned value, e.g. an amount. */
  value?: string;
  valueColor?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  /** Hides the separator; use on the last row of a Card. */
  last?: boolean;
  accessibilityLabel?: string;
}

/** iOS grouped list row: 52pt tall, hairline separator inset past the icon. */
export function Row({
  title,
  subtitle,
  value,
  valueColor,
  leading,
  trailing,
  onPress,
  chevron = false,
  destructive = false,
  last = false,
  accessibilityLabel,
}: RowProps) {
  const { colors, layout, spacing, typography } = useTheme();

  const content = (
    <>
      {leading ? <View style={styles.leading}>{leading}</View> : null}

      <View style={styles.textColumn}>
        <Text
          numberOfLines={1}
          style={[
            typography.body,
            { color: destructive ? colors.negative : colors.label, flexShrink: 1 },
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={[typography.footnote, { color: colors.secondaryLabel }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {value ? (
        <Text
          numberOfLines={1}
          style={[
            typography.body,
            { color: valueColor ?? colors.secondaryLabel, fontVariant: ['tabular-nums'] },
          ]}
        >
          {value}
        </Text>
      ) : null}

      {trailing}

      {chevron ? <Icon name="chevron.right" size={13} color={colors.tertiaryLabel} /> : null}
    </>
  );

  const separator = !last ? (
    <View
      style={[
        styles.separator,
        {
          backgroundColor: colors.separator,
          marginLeft: leading ? 56 : spacing.lg,
        },
      ]}
    />
  ) : null;

  if (!onPress) {
    return (
      <View>
        <View style={[styles.row, { minHeight: layout.rowHeight, paddingHorizontal: spacing.lg }]}>
          {content}
        </View>
        {separator}
      </View>
    );
  }

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          {
            minHeight: layout.rowHeight,
            paddingHorizontal: spacing.lg,
            backgroundColor: pressed ? colors.fill : 'transparent',
          },
        ]}
      >
        {content}
      </Pressable>
      {separator}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  leading: { width: 32, alignItems: 'center', justifyContent: 'center' },
  textColumn: { flex: 1, gap: 1 },
  separator: { height: StyleSheet.hairlineWidth },
});
