import { Tabs } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/Icon';
import { useTheme } from '@/theme/ThemeProvider';

const TAB_BAR_HEIGHT = 51;

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: '(home)', title: 'Home', icon: 'home' },
  { name: 'activity', title: 'Activity', icon: 'activity' },
  { name: 'budgets', title: 'Budgets', icon: 'budgets' },
  { name: 'settings', title: 'Settings', icon: 'settings' },
];

/**
 * Bottom tab bar styled like iOS. The JS tab navigator, not `NativeTabs`:
 * on the web `NativeTabs` renders a floating pill at the top of the screen.
 * Each tab is a directory route so it owns its own stack — see TabStack.
 * Only Home is a `(group)`: groups add no URL segment, so the other tabs need
 * real directories or every tab's index would resolve to `/`.
 */
export default function TabsLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.secondaryLabel,
        tabBarStyle: {
          backgroundColor: colors.elevated,
          borderTopColor: colors.separator,
          // React Navigation's 49 pt bar leaves a 10 px label box on the web,
          // which clips a 10 pt label. Border 1 + padding 10 + icon 28 + label 12.
          height: TAB_BAR_HEIGHT + insets.bottom,
        },
        // iOS tab labels are 10 pt.
        tabBarLabelStyle: { fontSize: 10, lineHeight: 12, fontWeight: '500' },
      }}
    >
      {TABS.map(({ name, title, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarAccessibilityLabel: title,
            tabBarIcon: ({ color, size }) => <Icon name={icon} size={size} color={String(color)} />,
          }}
        />
      ))}
    </Tabs>
  );
}
