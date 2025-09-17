import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface BudgetItem {
  id: string;
  name: string;
  budgeted_amount: number;
  category: {
    name: string;
    color: string;
    icon: string;
  };
  actualSpent: number;
}

interface BudgetOverviewProps {
  onStatsUpdate: () => void;
}

export const BudgetOverview = ({ onStatsUpdate }: BudgetOverviewProps) => {
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBudgetOverview();
  }, []);

  const loadBudgetOverview = async () => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    try {
      // Get budgets with categories
      const { data: budgets, error: budgetError } = await supabase
        .from('monthly_budgets')
        .select(`
          id,
          name,
          budgeted_amount,
          expense_categories (
            name,
            color,
            icon
          )
        `)
        .eq('month', currentMonth)
        .eq('year', currentYear);

      if (budgetError) throw budgetError;

      // Get actual expenses for each budget
      const budgetItemsWithExpenses = await Promise.all(
        (budgets || []).map(async (budget) => {
          const { data: expenses } = await supabase
            .from('expenses')
            .select('amount')
            .eq('budget_id', budget.id);

          const actualSpent = expenses?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;

          return {
            id: budget.id,
            name: budget.name,
            budgeted_amount: Number(budget.budgeted_amount),
            category: budget.expense_categories || { name: 'Unknown', color: '#6B7280', icon: '📦' },
            actualSpent
          };
        })
      );

      setBudgetItems(budgetItemsWithExpenses);
    } catch (error) {
      console.error('Error loading budget overview:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Budget Overview</CardTitle>
          <CardDescription>Loading current month's budget...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-2 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Budget Overview</CardTitle>
        <CardDescription>Current month's budget vs actual spending</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {budgetItems.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No budgets set for this month. Create your first budget in the Budget tab.
          </p>
        ) : (
          budgetItems.map((item) => {
            const percentage = item.budgeted_amount > 0 ? (item.actualSpent / item.budgeted_amount) * 100 : 0;
            const isOverBudget = percentage > 100;

            return (
              <div key={item.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{item.category.icon}</span>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.category.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        ${item.actualSpent.toFixed(2)} / ${item.budgeted_amount.toFixed(2)}
                      </span>
                      {isOverBudget && (
                        <Badge variant="destructive" className="text-xs">
                          Over
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Progress 
                  value={Math.min(percentage, 100)} 
                  className={`h-2 ${isOverBudget ? 'bg-destructive/20' : ''}`}
                />
                <p className="text-xs text-muted-foreground">
                  {percentage.toFixed(1)}% used
                  {isOverBudget && ` (${(percentage - 100).toFixed(1)}% over budget)`}
                </p>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};