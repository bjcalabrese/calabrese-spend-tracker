import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, Cell } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';

interface SpendingTrend {
  month: string;
  budget: number;
  actual: number;
  variance: number;
}

interface CategoryTrend {
  category: string;
  thisMonth: number;
  lastMonth: number;
  trend: number;
  icon: string;
  color: string;
}

export const ReportsSection = () => {
  const [spendingTrends, setSpendingTrends] = useState<SpendingTrend[]>([]);
  const [categoryTrends, setCategoryTrends] = useState<CategoryTrend[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('6');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReportData();
  }, [selectedPeriod]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadSpendingTrends(),
        loadCategoryTrends()
      ]);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSpendingTrends = async () => {
    const months = parseInt(selectedPeriod);
    const trendsData: SpendingTrend[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      // Get budgets
      const { data: budgets } = await supabase
        .from('monthly_budgets')
        .select('budgeted_amount')
        .eq('month', month)
        .eq('year', year);

      const totalBudget = budgets?.reduce((sum, b) => sum + Number(b.budgeted_amount), 0) || 0;

      // Get expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount')
        .gte('expense_date', `${year}-${month.toString().padStart(2, '0')}-01`)
        .lt('expense_date', `${year}-${(month + 1).toString().padStart(2, '0')}-01`);

      const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      trendsData.push({
        month: monthName,
        budget: totalBudget,
        actual: totalExpenses,
        variance: totalBudget - totalExpenses
      });
    }

    setSpendingTrends(trendsData);
  };

  const loadCategoryTrends = async () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    // Get categories
    const { data: categories } = await supabase
      .from('expense_categories')
      .select('id, name, icon, color');

    if (!categories) return;

    const categoryTrendsData: CategoryTrend[] = [];

    for (const category of categories) {
      // Current month expenses
      const { data: currentExpenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('category_id', category.id)
        .gte('expense_date', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
        .lt('expense_date', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`);

      const thisMonth = currentExpenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      // Last month expenses
      const { data: lastExpenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('category_id', category.id)
        .gte('expense_date', `${lastMonthYear}-${lastMonth.toString().padStart(2, '0')}-01`)
        .lt('expense_date', `${lastMonthYear}-${(lastMonth + 1).toString().padStart(2, '0')}-01`);

      const lastMonthAmount = lastExpenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      const trend = lastMonthAmount > 0 ? ((thisMonth - lastMonthAmount) / lastMonthAmount) * 100 : 0;

      if (thisMonth > 0 || lastMonthAmount > 0) {
        categoryTrendsData.push({
          category: category.name,
          thisMonth,
          lastMonth: lastMonthAmount,
          trend,
          icon: category.icon,
          color: category.color
        });
      }
    }

    setCategoryTrends(categoryTrendsData.sort((a, b) => b.thisMonth - a.thisMonth));
  };

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Reports & Analytics</CardTitle>
          <CardDescription>Loading analytics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Reports & Analytics</CardTitle>
          <CardDescription>Comprehensive spending analysis and trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Time Period:</label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Last 3 months</SelectItem>
                <SelectItem value="6">Last 6 months</SelectItem>
                <SelectItem value="12">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Spending Trends Chart */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Budget vs Actual Spending Trends</CardTitle>
          <CardDescription>Track your spending patterns over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spendingTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="budget" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Budget"
                />
                <Line 
                  type="monotone" 
                  dataKey="actual" 
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                  name="Actual"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Category Trends */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Category Spending Trends</CardTitle>
          <CardDescription>Month-over-month category comparison</CardDescription>
        </CardHeader>
        <CardContent>
          {categoryTrends.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No spending data available for comparison
            </p>
          ) : (
            <div className="space-y-4">
              {categoryTrends.map((item) => (
                <div key={item.category} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <h4 className="font-medium">{item.category}</h4>
                      <p className="text-sm text-muted-foreground">
                        This month: ${item.thisMonth.toFixed(2)} | Last month: ${item.lastMonth.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.trend > 0 ? (
                      <div className="flex items-center gap-1 text-destructive">
                        <TrendingUp className="h-4 w-4" />
                        <span className="font-medium">+{item.trend.toFixed(1)}%</span>
                      </div>
                    ) : item.trend < 0 ? (
                      <div className="flex items-center gap-1 text-success">
                        <TrendingDown className="h-4 w-4" />
                        <span className="font-medium">{item.trend.toFixed(1)}%</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium">0%</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Variance Analysis */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Budget Variance Analysis</CardTitle>
          <CardDescription>Over/under budget by month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendingTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => {
                    const val = Number(value);
                    return [`$${Math.abs(val).toFixed(2)} ${val >= 0 ? 'under' : 'over'} budget`, 'Variance'];
                  }}
                />
                <Bar 
                  dataKey="variance" 
                  fill="hsl(var(--primary))"
                  name="Budget Variance"
                >
                  {spendingTrends.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.variance >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};