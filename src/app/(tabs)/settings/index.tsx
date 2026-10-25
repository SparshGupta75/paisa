import Constants from 'expo-constants';

import { Card, Section, SectionFooter, SectionHeader } from '@/components/ui/Card';
import { Row } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';

const version = Constants.expoConfig?.version ?? '0.0.0';

export default function SettingsScreen() {
  return (
    <Screen>
      <Section>
        <SectionHeader>General</SectionHeader>
        <Card>
          <Row title="Currency" value="INR ₹" />
          <Row title="Appearance" value="System" />
          <Row title="Week starts on" value="Monday" last />
        </Card>
      </Section>

      <Section>
        <SectionHeader>Data</SectionHeader>
        <Card>
          <Row
            title="Stored on this device"
            subtitle="Nothing leaves your iPhone"
            value="Local"
            last
          />
        </Card>
        <SectionFooter>
          Removing Paisa from your Home Screen deletes its data. Backup and export
          arrive soon; an optional Face ID lock comes later.
        </SectionFooter>
      </Section>

      <Section>
        <SectionHeader>About</SectionHeader>
        <Card>
          <Row title="Version" value={version} />
          <Row title="Runs as" value="Home Screen web app" last />
        </Card>
      </Section>
    </Screen>
  );
}
