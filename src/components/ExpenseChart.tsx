import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface CategoryData {
  name: string;
  value: number;
  color: string;
  icon: string;
}

interface MonthlyData {
  month: string;
  expenses: number;
  budget: number;
}

export const ExpenseChart = () => {
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChartData();
  }, []);

  const loadChartData = async () => {
    try {
      // Load category expenses for current month
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const { data: expenses } = await supabase
        .from('expenses')
        .select(`
          amount,
          expense_categories (
            name,
            color,
            icon
          )
        `)
        .gte('expense_date', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
        .lt('expense_date', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`);

      // Group by category
      const categoryMap = new Map<string, CategoryData>();
      expenses?.forEach((expense) => {
        const category = expense.expense_categories;
        if (category) {
          const existing = categoryMap.get(category.name);
          if (existing) {
            existing.value += Number(expense.amount);
          } else {
            categoryMap.set(category.name, {
              name: category.name,
              value: Number(expense.amount),
              color: category.color,
              icon: category.icon
            });
          }
        }
      });

      setCategoryData(Array.from(categoryMap.values()));

      // Load monthly comparison data (last 6 months)
      const monthlyDataArray: MonthlyData[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });

        // Get expenses for this month
        const { data: monthExpenses } = await supabase
          .from('expenses')
          .select('amount')
          .gte('expense_date', `${year}-${month.toString().padStart(2, '0')}-01`)
          .lt('expense_date', `${year}-${(month + 1).toString().padStart(2, '0')}-01`);

        const totalExpenses = monthExpenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

        // Get budgets for this month
        const { data: monthBudgets } = await supabase
          .from('monthly_budgets')
          .select('budgeted_amount')
          .eq('month', month)
          .eq('year', year);

        const totalBudget = monthBudgets?.reduce((sum, budget) => sum + Number(budget.budgeted_amount), 0) || 0;

        monthlyDataArray.push({
          month: monthName,
          expenses: totalExpenses,
          budget: totalBudget
        });
      }

      setMonthlyData(monthlyDataArray);
    } catch (error) {
      console.error('Error loading chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Expense Analysis</CardTitle>
          <CardDescription>Loading charts...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category Breakdown */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
          <CardDescription>Current month breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          {categoryData.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No expenses recorded for this month
            </p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Amount']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Comparison */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Budget vs Actual</CardTitle>
          <CardDescription>Last 6 months comparison</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                <Legend />
                <Bar dataKey="budget" fill="hsl(var(--primary))" name="Budget" />
                <Bar dataKey="expenses" fill="hsl(var(--destructive))" name="Actual" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};