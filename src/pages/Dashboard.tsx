import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, DollarSign, Calendar, ChevronLeft, ChevronRight, PiggyBank } from 'lucide-react';
import { BudgetOverview } from '@/components/BudgetOverview';

interface DashboardStats {
  totalBudget: number;
  totalExpenses: number;
  totalIncome: number;
  variance: number;
  monthlyTrend: number;
  incomeTrend: number;
}

export const Dashboard = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [stats, setStats] = useState<DashboardStats>({
    totalBudget: 0,
    totalExpenses: 0,
    totalIncome: 0,
    variance: 0,
    monthlyTrend: 0,
    incomeTrend: 0
  });

  useEffect(() => {
    loadDashboardStats();
  }, [currentDate]);

  const loadDashboardStats = async () => {
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    try {
      // Get total budgets for current month
      const { data: budgets } = await supabase
        .from('monthly_budgets')
        .select('budgeted_amount')
        .eq('month', currentMonth)
        .eq('year', currentYear);

      const totalBudget = budgets?.reduce((sum, budget) => sum + Number(budget.budgeted_amount), 0) || 0;

      // Get total expenses for current month
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount')
        .gte('expense_date', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
        .lt('expense_date', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`);

      const totalExpenses = expenses?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;

      // Get total income for current month
      const { data: income } = await supabase
        .from('income')
        .select('amount')
        .gte('income_date', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
        .lt('income_date', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`);

      const totalIncome = income?.reduce((sum, inc) => sum + Number(inc.amount), 0) || 0;

      // Calculate previous month for trend
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

      const { data: prevExpenses } = await supabase
        .from('expenses')
        .select('amount')
        .gte('expense_date', `${prevYear}-${prevMonth.toString().padStart(2, '0')}-01`)
        .lt('expense_date', `${prevYear}-${currentMonth.toString().padStart(2, '0')}-01`);

      const { data: prevIncome } = await supabase
        .from('income')
        .select('amount')
        .gte('income_date', `${prevYear}-${prevMonth.toString().padStart(2, '0')}-01`)
        .lt('income_date', `${prevYear}-${currentMonth.toString().padStart(2, '0')}-01`);

      const prevTotalExpenses = prevExpenses?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
      const prevTotalIncome = prevIncome?.reduce((sum, inc) => sum + Number(inc.amount), 0) || 0;
      const monthlyTrend = prevTotalExpenses > 0 ? ((totalExpenses - prevTotalExpenses) / prevTotalExpenses) * 100 : 0;
      const incomeTrend = prevTotalIncome > 0 ? ((totalIncome - prevTotalIncome) / prevTotalIncome) * 100 : 0;

      setStats({
        totalBudget,
        totalExpenses,
        totalIncome,
        variance: totalBudget - totalExpenses,
        monthlyTrend,
        incomeTrend
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const isCurrentMonth = currentDate.getMonth() === new Date().getMonth() && 
                        currentDate.getFullYear() === new Date().getFullYear();

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Overview of your financial status
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium min-w-[120px] text-center">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ${stats.totalBudget.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {isCurrentMonth ? 'This month' : currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              ${stats.totalIncome.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.incomeTrend >= 0 ? '+' : ''}{stats.incomeTrend.toFixed(1)}% vs last month
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              ${stats.totalExpenses.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.monthlyTrend >= 0 ? '+' : ''}{stats.monthlyTrend.toFixed(1)}% vs last month
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Variance</CardTitle>
            {stats.variance >= 0 ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.variance >= 0 ? 'text-success' : 'text-destructive'}`}>
              ${Math.abs(stats.variance).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.variance >= 0 ? 'Under budget' : 'Over budget'}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Income</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(stats.totalIncome - stats.totalExpenses) >= 0 ? 'text-success' : 'text-destructive'}`}>
              ${(stats.totalIncome - stats.totalExpenses).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Income - Expenses</p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Overview */}
      <BudgetOverview onStatsUpdate={loadDashboardStats} />
    </div>
  );
};