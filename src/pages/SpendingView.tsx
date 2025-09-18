import { RecentExpenses } from '@/components/spending/RecentExpenses';

export const SpendingView = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">View Expenses</h1>
        <p className="text-muted-foreground mt-2">
          Review and manage your recent expenses
        </p>
      </div>

      <RecentExpenses />
    </div>
  );
};