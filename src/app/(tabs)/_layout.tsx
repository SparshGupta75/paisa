import { Tabs } from 'expo-router/js-tabs';

import { Icon, type IconName } from '@/components/ui/Icon';
import { useTheme } from '@/theme/ThemeProvider';

// Tab directories sort alphabetically; without this the app opens on Activity.
export const unstable_settings = { initialRouteName: '(home)' };

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: '(home)', title: 'Home', icon: 'home' },
  { name: '(activity)', title: 'Activity', icon: 'activity' },
  { name: '(budgets)', title: 'Budgets', icon: 'budgets' },
  { name: '(settings)', title: 'Settings', icon: 'settings' },
];

/**
 * Bottom tab bar styled like iOS. The JS tab navigator, not `NativeTabs`:
 * on the web `NativeTabs` renders a floating pill at the top of the screen.
 * Each tab is a directory route so it owns its own stack — see TabStack.
 */
export default function TabsLayout() {
  const { colors, typography } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.secondaryLabel,
        tabBarStyle: {
          backgroundColor: colors.elevated,
          borderTopColor: colors.separator,
        },
        tabBarLabelStyle: { ...typography.caption, fontWeight: '500' },
      }}
    >
      {TABS.map(({ name, title, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarAccessibilityLabel: title,
            tabBarIcon: ({ color }) => <Icon name={icon} size={24} color={String(color)} />,
          }}
        />
      ))}
    </Tabs>
  );
}
