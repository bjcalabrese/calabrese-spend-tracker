import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Plus, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { MonthlyTrends } from './MonthlyTrends';
import { ExpenseChart } from './ExpenseChart';
import { BudgetForm } from './BudgetForm';
import { ExpenseForm } from './ExpenseForm';
import { ReportsSection } from './ReportsSection';
import { AccountSettings } from './AccountSettings';
import { BudgetSuggestions } from './BudgetSuggestions';
import { SpendingHabitsAnalysis } from './SpendingHabitsAnalysis';
import { HistoricalSpending } from './HistoricalSpending';

interface DashboardStats {
  totalBudget: number;
  totalExpenses: number;
  variance: number;
  monthlyTrend: number;
}

export const Dashboard = () => {
  const { signOut, user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalBudget: 0,
    totalExpenses: 0,
    variance: 0,
    monthlyTrend: 0
  });
  const [activeTab, setActiveTab] = useState('spending');

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

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

      // Calculate previous month for trend
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

      const { data: prevExpenses } = await supabase
        .from('expenses')
        .select('amount')
        .gte('expense_date', `${prevYear}-${prevMonth.toString().padStart(2, '0')}-01`)
        .lt('expense_date', `${prevYear}-${currentMonth.toString().padStart(2, '0')}-01`);

      const prevTotalExpenses = prevExpenses?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
      const monthlyTrend = prevTotalExpenses > 0 ? ((totalExpenses - prevTotalExpenses) / prevTotalExpenses) * 100 : 0;

      setStats({
        totalBudget,
        totalExpenses,
        variance: totalBudget - totalExpenses,
        monthlyTrend
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-card/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Calabrese Spending Tracker
            </h1>
            <p className="text-sm text-muted-foreground">Smart spending analysis and budget suggestions</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.user_metadata?.display_name || user?.email}
            </span>
            <AccountSettings />
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                ${stats.totalBudget.toFixed(2)}
              </div>
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
              <CardTitle className="text-sm font-medium">Monthly Trend</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.monthlyTrend >= 0 ? 'text-destructive' : 'text-success'}`}>
                {stats.monthlyTrend >= 0 ? '+' : ''}{stats.monthlyTrend.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">vs last month</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="spending">Spending</TabsTrigger>
            <TabsTrigger value="habits">Habits</TabsTrigger>
            <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
          </TabsList>

          <TabsContent value="spending" className="space-y-4">
            <ExpenseForm onExpenseAdded={loadDashboardStats} />
          </TabsContent>

          <TabsContent value="habits" className="space-y-4">
            <SpendingHabitsAnalysis />
          </TabsContent>

          <TabsContent value="suggestions" className="space-y-4">
            <BudgetSuggestions />
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <MonthlyTrends />
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <HistoricalSpending />
          </TabsContent>

          <TabsContent value="budget">
            <BudgetForm onBudgetAdded={loadDashboardStats} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};