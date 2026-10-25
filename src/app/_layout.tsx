import { SQLiteProvider } from 'expo-sqlite';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Suspense } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';

import { DATABASE_NAME, migrate } from '@/db/migrate';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { palettes, radius, spacing, typography } from '@/theme/tokens';

export default function RootLayout() {
  return (
    <ThemeProvider>
      {/* Suspense + useSuspense keeps every screen from mounting until the
          schema is migrated, so no query can hit a missing table. Errors thrown
          during migration surface in <ErrorBoundary>, not a blank screen. */}
      <Suspense fallback={<BootScreen />}>
        <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrate} useSuspense>
          <RootNavigator />
        </SQLiteProvider>
      </Suspense>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

function BootScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.centred, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

/**
 * Rendered by Expo Router outside the route tree, so it cannot use the
 * ThemeProvider context — read the palette directly instead.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = palettes[scheme];

  return (
    <View style={[styles.centred, styles.errorRoot, { backgroundColor: colors.background }]}>
      <Text style={[typography.title3, { color: colors.label }]}>Paisa could not start</Text>
      <Text
        style={[
          typography.subhead,
          styles.errorMessage,
          { color: colors.secondaryLabel },
        ]}
      >
        Your data on this device was not changed. Restarting usually fixes this.
      </Text>

      {__DEV__ ? (
        <Text style={[typography.caption, styles.errorDetail, { color: colors.tertiaryLabel }]}>
          {error.message}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Try again"
        onPress={retry}
        style={({ pressed }) => [
          styles.retry,
          { backgroundColor: colors.accent, borderRadius: radius.md, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Text style={[typography.headline, { color: colors.elevated }]}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorRoot: { paddingHorizontal: spacing.xxl, gap: spacing.md },
  errorMessage: { textAlign: 'center', maxWidth: 300 },
  errorDetail: { textAlign: 'center', maxWidth: 300 },
  retry: {
    marginTop: spacing.sm,
    minHeight: 44,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
});
