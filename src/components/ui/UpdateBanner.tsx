import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

/** Shown when a new version of the app has installed in the background. */
export function UpdateBanner({ onUpdate }: { onUpdate: () => void }) {
  const { colors, typography, spacing, radius, layout } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.banner,
        {
          top: insets.top + spacing.sm,
          left: layout.screenPadding,
          right: layout.screenPadding,
          padding: spacing.md,
          gap: spacing.md,
          borderRadius: radius.md,
          backgroundColor: colors.elevated,
          borderColor: colors.separator,
        },
      ]}
    >
      <Text style={[typography.subhead, styles.message, { color: colors.label }]}>
        A new version of Paisa is ready.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Update Paisa now"
        onPress={onUpdate}
        style={({ pressed }) => [
          styles.button,
          {
            minHeight: layout.minTouchTarget,
            paddingHorizontal: spacing.lg,
            borderRadius: radius.sm,
            backgroundColor: colors.accent,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Text style={[typography.headline, { color: colors.elevated }]}>Update</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  message: { flex: 1 },
  button: { alignItems: 'center', justifyContent: 'center' },
});
