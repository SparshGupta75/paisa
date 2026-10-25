import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, SectionHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { useTheme } from '@/theme/ThemeProvider';

export default function HomeScreen() {
  const { colors, typography, spacing } = useTheme();

  return (
    <Screen>
      <Card style={styles.welcomeCard}>
        <View style={[styles.mark, { backgroundColor: colors.accentSoft }]}>
          <Icon name="indianrupeesign.circle.fill" size={30} color={colors.accent} />
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
            icon="lock.shield.fill"
            title="Private by default"
            detail="Data is stored in SQLite on this device. No account, no cloud."
          />
          <View style={[styles.divider, { backgroundColor: colors.separator }]} />
          <Pillar
            icon="bolt.fill"
            title="Fast to record"
            detail="Two taps to log an expense. No forms to wade through."
          />
          <View style={[styles.divider, { backgroundColor: colors.separator }]} />
          <Pillar
            icon="indianrupeesign"
            title="Built for India"
            detail="Rupee-first formatting, Indian digit grouping, UPI-ready."
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

function Pillar({
  icon,
  title,
  detail,
}: {
  icon: ComponentProps<typeof Icon>['name'];
  title: string;
  detail: string;
}) {
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <View style={[styles.pillar, { padding: spacing.lg, gap: spacing.md }]}>
      <View style={[styles.pillarIcon, { backgroundColor: colors.fill, borderRadius: radius.sm }]}>
        <Icon name={icon} size={17} color={colors.label} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[typography.subhead, { color: colors.label, fontWeight: '600' }]}>{title}</Text>
        <Text style={[typography.footnote, { color: colors.secondaryLabel }]}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  welcomeCard: { padding: 20, gap: 10, alignItems: 'flex-start' },
  mark: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pillar: { flexDirection: 'row', alignItems: 'flex-start' },
  pillarIcon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 58 },
});
