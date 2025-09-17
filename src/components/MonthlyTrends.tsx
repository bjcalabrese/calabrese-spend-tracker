import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle, Calendar, DollarSign, Repeat } from 'lucide-react';

interface MonthlyData {
  month: string;
  year: number;
  monthNum: number;
  total: number;
  categories: { [key: string]: number };
}

interface BillTrend {
  name: string;
  category: string;
  icon: string;
  color: string;
  monthlyAmounts: { month: string; amount: number }[];
  trend: number;
  avgAmount: number;
  isRecurring: boolean;
  variance: number; // How much the bill varies month to month
}

interface CategoryTrend {
  category: string;
  icon: string;
  color: string;
  data: { month: string; amount: number }[];
  trend: number;
  avgMonthly: number;
  totalSpent: number;
}

export const MonthlyTrends: React.FC = () => {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [billTrends, setBillTrends] = useState<BillTrend[]>([]);
  const [categoryTrends, setCategoryTrends] = useState<CategoryTrend[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('12');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrendsData();
  }, [selectedPeriod]);

  const loadTrendsData = async () => {
    setLoading(true);
    try {
      // Get expenses for the selected period
      const monthsBack = parseInt(selectedPeriod);
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsBack);

      const { data: expenses, error } = await supabase
        .from('expenses')
        .select(`
          name,
          amount,
          expense_date,
          expense_categories (
            name,
            icon,
            color
          )
        `)
        .gte('expense_date', startDate.toISOString().split('T')[0])
        .order('expense_date', { ascending: true });

      if (error) throw error;

      if (!expenses || expenses.length === 0) {
        setLoading(false);
        return;
      }

      // Process monthly data
      const monthlyMap = new Map<string, MonthlyData>();
      const billMap = new Map<string, { amounts: { month: string; amount: number }[]; category: any }>();
      const categoryMap = new Map<string, { amounts: { month: string; amount: number }[]; category: any }>();

      expenses.forEach((expense) => {
        const date = new Date(expense.expense_date);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        
        // Monthly totals
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, {
            month: monthLabel,
            year: date.getFullYear(),
            monthNum: date.getMonth() + 1,
            total: 0,
            categories: {}
          });
        }
        
        const monthData = monthlyMap.get(monthKey)!;
        monthData.total += Number(expense.amount);
        
        const categoryName = expense.expense_categories?.name || 'Uncategorized';
        monthData.categories[categoryName] = (monthData.categories[categoryName] || 0) + Number(expense.amount);

        // Bill trends (group by expense name)
        const billKey = `${expense.name}-${categoryName}`;
        if (!billMap.has(billKey)) {
          billMap.set(billKey, {
            amounts: [],
            category: expense.expense_categories
          });
        }
        
        const existingMonth = billMap.get(billKey)!.amounts.find(a => a.month === monthLabel);
        if (existingMonth) {
          existingMonth.amount += Number(expense.amount);
        } else {
          billMap.get(billKey)!.amounts.push({
            month: monthLabel,
            amount: Number(expense.amount)
          });
        }

        // Category trends
        if (!categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, {
            amounts: [],
            category: expense.expense_categories
          });
        }
        
        const existingCategoryMonth = categoryMap.get(categoryName)!.amounts.find(a => a.month === monthLabel);
        if (existingCategoryMonth) {
          existingCategoryMonth.amount += Number(expense.amount);
        } else {
          categoryMap.get(categoryName)!.amounts.push({
            month: monthLabel,
            amount: Number(expense.amount)
          });
        }
      });

      // Convert to arrays and sort
      const monthlyDataArray = Array.from(monthlyMap.values())
        .sort((a, b) => (a.year * 12 + a.monthNum) - (b.year * 12 + b.monthNum));

      // Process bill trends
      const billTrendsArray: BillTrend[] = [];
      billMap.forEach(({ amounts, category }, billName) => {
        if (amounts.length >= 2) { // Only include bills with multiple months of data
          const [name, categoryName] = billName.split('-');
          const avgAmount = amounts.reduce((sum, a) => sum + a.amount, 0) / amounts.length;
          
          // Calculate trend (first half vs second half)
          const halfPoint = Math.floor(amounts.length / 2);
          const firstHalf = amounts.slice(0, halfPoint);
          const secondHalf = amounts.slice(halfPoint);
          
          const firstHalfAvg = firstHalf.reduce((sum, a) => sum + a.amount, 0) / firstHalf.length;
          const secondHalfAvg = secondHalf.reduce((sum, a) => sum + a.amount, 0) / secondHalf.length;
          
          const trend = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;
          
          // Calculate variance to determine if it's recurring
          const variance = amounts.reduce((sum, a) => sum + Math.pow(a.amount - avgAmount, 2), 0) / amounts.length;
          const stdDev = Math.sqrt(variance);
          const coefficientOfVariation = avgAmount > 0 ? (stdDev / avgAmount) : 1;
          
          // Consider it recurring if variance is low (coefficient of variation < 0.3)
          const isRecurring = coefficientOfVariation < 0.3 && amounts.length >= 3;

          billTrendsArray.push({
            name,
            category: categoryName,
            icon: category?.icon || '📦',
            color: category?.color || '#6B7280',
            monthlyAmounts: amounts.sort((a, b) => a.month.localeCompare(b.month)),
            trend,
            avgAmount,
            isRecurring,
            variance: coefficientOfVariation
          });
        }
      });

      // Process category trends
      const categoryTrendsArray: CategoryTrend[] = [];
      categoryMap.forEach(({ amounts, category }, categoryName) => {
        const totalSpent = amounts.reduce((sum, a) => sum + a.amount, 0);
        const avgMonthly = totalSpent / amounts.length;
        
        // Calculate trend
        const halfPoint = Math.floor(amounts.length / 2);
        const firstHalf = amounts.slice(0, halfPoint);
        const secondHalf = amounts.slice(halfPoint);
        
        const firstHalfAvg = firstHalf.reduce((sum, a) => sum + a.amount, 0) / (firstHalf.length || 1);
        const secondHalfAvg = secondHalf.reduce((sum, a) => sum + a.amount, 0) / (secondHalf.length || 1);
        
        const trend = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;

        categoryTrendsArray.push({
          category: categoryName,
          icon: category?.icon || '📦',
          color: category?.color || '#6B7280',
          data: amounts.sort((a, b) => a.month.localeCompare(b.month)),
          trend,
          avgMonthly,
          totalSpent
        });
      });

      // Sort by relevance
      billTrendsArray.sort((a, b) => {
        // Prioritize recurring bills with significant changes
        if (a.isRecurring && !b.isRecurring) return -1;
        if (!a.isRecurring && b.isRecurring) return 1;
        return Math.abs(b.trend) - Math.abs(a.trend);
      });

      categoryTrendsArray.sort((a, b) => b.totalSpent - a.totalSpent);

      setMonthlyData(monthlyDataArray);
      setBillTrends(billTrendsArray);
      setCategoryTrends(categoryTrendsArray);
    } catch (error) {
      console.error('Error loading trends data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Loading Monthly Trends</CardTitle>
          <CardDescription>Analyzing your spending patterns...</CardDescription>
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
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Monthly Spending Trends
          </CardTitle>
          <CardDescription>Track where your money goes and identify changing bills</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <label className="text-sm font-medium">Time Period:</label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">Last 6 months</SelectItem>
                <SelectItem value="12">Last 12 months</SelectItem>
                <SelectItem value="18">Last 18 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Overall Monthly Trend */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Total Monthly Spending</CardTitle>
          <CardDescription>Your overall spending pattern over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Total Spending']} />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  name="Monthly Total"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Bill Trends - Recurring vs Variable */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-primary" />
            Bill & Expense Trends
          </CardTitle>
          <CardDescription>Track how your individual bills and expenses are changing</CardDescription>
        </CardHeader>
        <CardContent>
          {billTrends.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Add more expenses with consistent names to see bill trends
            </p>
          ) : (
            <div className="space-y-4">
              {billTrends.slice(0, 10).map((bill, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{bill.icon}</span>
                      <div>
                        <h4 className="font-medium">{bill.name}</h4>
                        <p className="text-sm text-muted-foreground">{bill.category}</p>
                      </div>
                      {bill.isRecurring && (
                        <Badge variant="secondary" className="text-xs">
                          <Repeat className="h-3 w-3 mr-1" />
                          Recurring
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">${bill.avgAmount.toFixed(2)}</span>
                        {Math.abs(bill.trend) > 5 && (
                          <div className={`flex items-center gap-1 ${bill.trend > 0 ? 'text-destructive' : 'text-success'}`}>
                            {bill.trend > 0 ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            <span className="text-sm font-medium">
                              {Math.abs(bill.trend).toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">avg/month</p>
                    </div>
                  </div>
                  
                  {Math.abs(bill.trend) > 10 && (
                    <div className="mb-3">
                      <div className={`flex items-center gap-2 text-sm p-2 rounded ${
                        bill.trend > 0 ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'
                      }`}>
                        <AlertCircle className="h-4 w-4" />
                        <span>
                          {bill.trend > 0 ? 'Increasing' : 'Decreasing'} by {Math.abs(bill.trend).toFixed(1)}% 
                          {bill.isRecurring ? ' - Monitor this recurring bill' : ''}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={bill.monthlyAmounts}>
                        <XAxis dataKey="month" hide />
                        <YAxis hide />
                        <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, bill.name]} />
                        <Line 
                          type="monotone" 
                          dataKey="amount" 
                          stroke={bill.color} 
                          strokeWidth={2}
                          dot={{ fill: bill.color, strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Trends */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Category Spending Trends
          </CardTitle>
          <CardDescription>See how spending in each category is changing over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                {categoryTrends.slice(0, 5).map((category, index) => (
                  <Line
                    key={category.category}
                    type="monotone"
                    dataKey={`categories.${category.category}`}
                    stroke={category.color}
                    strokeWidth={2}
                    name={category.category}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};