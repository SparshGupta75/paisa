import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';

export default function ActivityScreen() {
  return (
    <Screen>
      <EmptyState
        icon="list.bullet"
        title="No transactions"
        message="Every expense you record shows up here, grouped by day."
      />
    </Screen>
  );
}
