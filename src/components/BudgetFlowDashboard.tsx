import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowDown, ArrowRight, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BudgetFlowData {
  totalIncome: number;
  totalBudgeted: number;
  totalSpent: number;
  unallocated: number;
  remaining: number;
  categories: Array<{
    name: string;
    budgeted: number;
    spent: number;
    icon: string;
    color: string;
  }>;
}

export const BudgetFlowDashboard = () => {
  const [data, setData] = useState<BudgetFlowData>({
    totalIncome: 0,
    totalBudgeted: 0,
    totalSpent: 0,
    unallocated: 0,
    remaining: 0,
    categories: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBudgetFlow();
  }, []);

  const loadBudgetFlow = async () => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    try {
      // Load income data
      const { data: incomeData } = await supabase
        .from('income')
        .select('amount, frequency');

      const totalIncome = (incomeData || []).reduce((sum, income) => {
        const monthlyAmount = calculateMonthlyAmount(Number(income.amount), income.frequency);
        return sum + monthlyAmount;
      }, 0);

      // Load budget data with categories
      const { data: budgetData } = await supabase
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

      const totalBudgeted = (budgetData || []).reduce((sum, budget) => 
        sum + Number(budget.budgeted_amount), 0
      );

      // Load expense data
      const budgetExpenses = await Promise.all(
        (budgetData || []).map(async (budget) => {
          const { data: expenses } = await supabase
            .from('expenses')
            .select('amount')
            .eq('budget_id', budget.id);

          const spent = expenses?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;

          return {
            name: budget.name,
            budgeted: Number(budget.budgeted_amount),
            spent,
            icon: budget.expense_categories?.icon || '📦',
            color: budget.expense_categories?.color || '#6B7280'
          };
        })
      );

      const totalSpent = budgetExpenses.reduce((sum, cat) => sum + cat.spent, 0);

      setData({
        totalIncome,
        totalBudgeted,
        totalSpent,
        unallocated: totalIncome - totalBudgeted,
        remaining: totalBudgeted - totalSpent,
        categories: budgetExpenses
      });
    } catch (error) {
      console.error('Error loading budget flow:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyAmount = (amount: number, frequency: string) => {
    switch (frequency) {
      case 'weekly': return amount * 4.33;
      case 'biweekly': return amount * 2.17;
      case 'annual': return amount / 12;
      default: return amount;
    }
  };

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Budget Flow</CardTitle>
          <CardDescription>Loading budget analysis...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded"></div>
            <div className="h-40 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const budgetUtilization = data.totalBudgeted > 0 ? (data.totalSpent / data.totalBudgeted) * 100 : 0;
  const incomeUtilization = data.totalIncome > 0 ? (data.totalBudgeted / data.totalIncome) * 100 : 0;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Budget Flow Analysis
        </CardTitle>
        <CardDescription>Income → Budget Allocations → Spending</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Flow Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-success mb-1">
              ${data.totalIncome.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">Monthly Income</p>
          </div>
          
          <div className="flex items-center justify-center">
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-primary mb-1">
              ${data.totalBudgeted.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">Budgeted</p>
            <Progress value={Math.min(incomeUtilization, 100)} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {incomeUtilization.toFixed(1)}% of income
            </p>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-destructive mb-1">
              ${data.totalSpent.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">Spent</p>
            <Progress value={Math.min(budgetUtilization, 100)} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {budgetUtilization.toFixed(1)}% of budget
            </p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Unallocated Income</p>
              {data.unallocated < 0 && <AlertCircle className="h-4 w-4 text-destructive" />}
            </div>
            <div className={`text-xl font-bold ${data.unallocated >= 0 ? 'text-success' : 'text-destructive'}`}>
              ${Math.abs(data.unallocated).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.unallocated >= 0 ? 'Available to budget' : 'Over-budgeted'}
            </p>
          </div>
          
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Budget Remaining</p>
              {data.remaining < 0 && <AlertCircle className="h-4 w-4 text-destructive" />}
            </div>
            <div className={`text-xl font-bold ${data.remaining >= 0 ? 'text-success' : 'text-destructive'}`}>
              ${Math.abs(data.remaining).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.remaining >= 0 ? 'Left to spend' : 'Over budget'}
            </p>
          </div>
        </div>

        {/* Category Breakdown */}
        {data.categories.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">Budget Categories</h4>
            <div className="space-y-3">
              {data.categories.map((category, index) => {
                const percentage = category.budgeted > 0 ? (category.spent / category.budgeted) * 100 : 0;
                const isOverBudget = percentage > 100;
                
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{category.icon}</span>
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          ${category.spent.toFixed(2)} / ${category.budgeted.toFixed(2)}
                        </span>
                        {isOverBudget && (
                          <Badge variant="destructive" className="text-xs">
                            Over
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Progress 
                      value={Math.min(percentage, 100)} 
                      className={`h-2 ${isOverBudget ? 'bg-destructive/20' : ''}`}
                    />
                    <p className="text-xs text-muted-foreground">
                      {percentage.toFixed(1)}% used
                      {isOverBudget && ` (${(percentage - 100).toFixed(1)}% over)`}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {data.totalIncome === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="font-medium">No income configured</p>
            <p className="text-sm">Add your income sources to see budget flow analysis</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};