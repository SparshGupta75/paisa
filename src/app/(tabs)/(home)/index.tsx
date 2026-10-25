import { StyleSheet, Text, View } from 'react-native';

import { Card, SectionHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { useTheme } from '@/theme/ThemeProvider';

export default function HomeScreen() {
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <Screen>
      <Card style={{ padding: spacing.xl, gap: spacing.sm, alignItems: 'flex-start' }}>
        <View style={[styles.mark, { backgroundColor: colors.accentSoft, borderRadius: radius.md }]}>
          <Icon name="wallet" size={28} color={colors.accent} />
        </View>
        <Text style={[typography.title2, { color: colors.label }]}>Welcome to Paisa</Text>
        <Text style={[typography.subhead, { color: colors.secondaryLabel, marginTop: spacing.xs }]}>
          A quiet place for what you spend. Rupees in, rupees out, all on your iPhone.
        </Text>
      </Card>

      <View>
        <SectionHeader>How it works</SectionHeader>
        <Card>
          <Pillar
            icon="lock"
            title="Private by default"
            detail="Your data stays on this iPhone. No account, no cloud."
          />
          <Divider />
          <Pillar
            icon="bolt"
            title="Works offline"
            detail="Add Paisa to your Home Screen and it opens without a connection."
          />
          <Divider />
          <Pillar
            icon="cash"
            title="Built for India"
            detail="Rupee-first formatting and Indian digit grouping. UPI statement import is on the way."
          />
        </Card>
      </View>

      <EmptyState
        icon="tray"
        title="Nothing tracked yet"
        message="Your month at a glance appears here once you add your first expense."
      />
    </Screen>
  );
}

function Divider() {
  const { colors, spacing } = useTheme();
  // Inset past the icon well, like an iOS grouped list.
  return <View style={[styles.divider, { backgroundColor: colors.separator, marginLeft: spacing.lg + 30 + spacing.md }]} />;
}

function Pillar({ icon, title, detail }: { icon: IconName; title: string; detail: string }) {
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <View style={[styles.pillar, { padding: spacing.lg, gap: spacing.md }]}>
      <View style={[styles.pillarIcon, { backgroundColor: colors.fill, borderRadius: radius.sm }]}>
        <Icon name={icon} size={17} color={colors.label} />
      </View>
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <Text style={[typography.subhead, { color: colors.label, fontWeight: '600' }]}>{title}</Text>
        <Text style={[typography.footnote, { color: colors.secondaryLabel }]}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  pillar: { flexDirection: 'row', alignItems: 'flex-start' },
  pillarIcon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  divider: { height: StyleSheet.hairlineWidth },
});
