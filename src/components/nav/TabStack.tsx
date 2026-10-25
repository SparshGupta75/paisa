import { Stack } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * Per-tab native stack.
 *
 * Each tab owns its own history, which is required for correct iOS behaviour:
 * swipe-back, scroll-to-top on tab re-tap, and per-tab large titles.
 */
export function TabStack({ title }: { title: string }) {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerTintColor: colors.accent,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.label },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title }} />
    </Stack>
  );
}
