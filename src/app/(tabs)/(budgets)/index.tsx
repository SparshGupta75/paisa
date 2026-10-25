import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';

export default function BudgetsScreen() {
  return (
    <Screen>
      <EmptyState
        icon="pie"
        title="No budgets yet"
        message="Set a monthly limit for a category and Paisa will tell you what is safe to spend."
      />
    </Screen>
  );
}
