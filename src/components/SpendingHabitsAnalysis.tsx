import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, AlertTriangle, Calendar, DollarSign, Target } from 'lucide-react';

interface SpendingPattern {
  category: string;
  icon: string;
  color: string;
  totalSpent: number;
  avgPerTransaction: number;
  frequency: number;
  trend: number;
  dayOfWeekPattern: { [key: string]: number };
  timeOfMonthPattern: 'early' | 'mid' | 'late' | 'consistent';
}

interface SpendingInsight {
  type: 'warning' | 'info' | 'success';
  title: string;
  description: string;
  amount?: number;
  category?: string;
}

export const SpendingHabitsAnalysis: React.FC = () => {
  const [patterns, setPatterns] = useState<SpendingPattern[]>([]);
  const [insights, setInsights] = useState<SpendingInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSpending, setTotalSpending] = useState(0);

  useEffect(() => {
    analyzeSpendingHabits();
  }, []);

  const analyzeSpendingHabits = async () => {
    setLoading(true);
    try {
      // Get expenses for the last 3 months
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const { data: expenses, error } = await supabase
        .from('expenses')
        .select(`
          amount,
          expense_date,
          created_at,
          expense_categories (
            name,
            icon,
            color
          )
        `)
        .gte('expense_date', threeMonthsAgo.toISOString().split('T')[0])
        .order('expense_date', { ascending: false });

      if (error) throw error;

      if (!expenses || expenses.length === 0) {
        setInsights([{
          type: 'info',
          title: 'Start Tracking Your Spending',
          description: 'Add your first expenses to see personalized spending insights and patterns.'
        }]);
        setLoading(false);
        return;
      }

      // Analyze patterns by category
      const categoryMap = new Map<string, {
        expenses: any[];
        category: any;
      }>();

      let total = 0;
      expenses.forEach((expense) => {
        total += Number(expense.amount);
        const categoryName = expense.expense_categories?.name || 'Uncategorized';
        
        if (!categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, {
            expenses: [],
            category: expense.expense_categories
          });
        }
        categoryMap.get(categoryName)!.expenses.push(expense);
      });

      setTotalSpending(total);

      // Generate patterns
      const analysisPatterns: SpendingPattern[] = [];
      const generatedInsights: SpendingInsight[] = [];

      categoryMap.forEach(({ expenses: categoryExpenses, category }, categoryName) => {
        const totalCategorySpent = categoryExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
        const avgPerTransaction = totalCategorySpent / categoryExpenses.length;
        const frequency = categoryExpenses.length;

        // Calculate day of week pattern
        const dayPattern: { [key: string]: number } = {};
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        days.forEach(day => dayPattern[day] = 0);

        categoryExpenses.forEach(exp => {
          const day = days[new Date(exp.expense_date).getDay()];
          dayPattern[day]++;
        });

        // Calculate time of month pattern
        const earlyMonth = categoryExpenses.filter(exp => new Date(exp.expense_date).getDate() <= 10).length;
        const midMonth = categoryExpenses.filter(exp => {
          const date = new Date(exp.expense_date).getDate();
          return date > 10 && date <= 20;
        }).length;
        const lateMonth = categoryExpenses.filter(exp => new Date(exp.expense_date).getDate() > 20).length;

        let timeOfMonthPattern: 'early' | 'mid' | 'late' | 'consistent' = 'consistent';
        if (earlyMonth > midMonth && earlyMonth > lateMonth) {
          timeOfMonthPattern = 'early';
        } else if (midMonth > earlyMonth && midMonth > lateMonth) {
          timeOfMonthPattern = 'mid';
        } else if (lateMonth > earlyMonth && lateMonth > midMonth) {
          timeOfMonthPattern = 'late';
        }

        // Calculate trend (simplified - comparing first half vs second half)
        const halfPoint = Math.floor(categoryExpenses.length / 2);
        const firstHalf = categoryExpenses.slice(-halfPoint);
        const secondHalf = categoryExpenses.slice(0, categoryExpenses.length - halfPoint);
        
        const firstHalfAvg = firstHalf.reduce((sum, exp) => sum + Number(exp.amount), 0) / firstHalf.length || 0;
        const secondHalfAvg = secondHalf.reduce((sum, exp) => sum + Number(exp.amount), 0) / secondHalf.length || 0;
        
        const trend = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;

        analysisPatterns.push({
          category: categoryName,
          icon: category?.icon || '📦',
          color: category?.color || '#6B7280',
          totalSpent: totalCategorySpent,
          avgPerTransaction,
          frequency,
          trend,
          dayOfWeekPattern: dayPattern,
          timeOfMonthPattern
        });

        // Generate insights
        if (totalCategorySpent > total * 0.3) {
          generatedInsights.push({
            type: 'warning',
            title: `High ${categoryName} Spending`,
            description: `${categoryName} accounts for ${((totalCategorySpent / total) * 100).toFixed(1)}% of your total spending.`,
            amount: totalCategorySpent,
            category: categoryName
          });
        }

        if (trend > 50) {
          generatedInsights.push({
            type: 'warning',
            title: `Increasing ${categoryName} Spending`,
            description: `Your ${categoryName} spending has increased by ${trend.toFixed(1)}% recently.`,
            category: categoryName
          });
        } else if (trend < -20) {
          generatedInsights.push({
            type: 'success',
            title: `Reduced ${categoryName} Spending`,
            description: `Great job! You've reduced ${categoryName} spending by ${Math.abs(trend).toFixed(1)}%.`,
            category: categoryName
          });
        }
      });

      // Sort patterns by total spent
      analysisPatterns.sort((a, b) => b.totalSpent - a.totalSpent);

      // Add general insights
      if (total > 0) {
        const avgDaily = total / 90; // 3 months ≈ 90 days
        generatedInsights.unshift({
          type: 'info',
          title: 'Daily Spending Average',
          description: `You spend an average of $${avgDaily.toFixed(2)} per day over the last 3 months.`,
          amount: avgDaily
        });
      }

      setPatterns(analysisPatterns);
      setInsights(generatedInsights);
    } catch (error) {
      console.error('Error analyzing spending habits:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Analyzing Your Spending Habits</CardTitle>
          <CardDescription>Processing your expense data...</CardDescription>
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
    <div className="space-y-6">
      {/* Insights Section */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Spending Insights
          </CardTitle>
          <CardDescription>
            AI-powered analysis of your spending patterns and habits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {insights.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No insights available yet. Keep tracking your expenses to see personalized analysis.
            </p>
          ) : (
            insights.map((insight, index) => (
              <Alert key={index} variant={insight.type === 'warning' ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <div>
                  <h4 className="font-medium">{insight.title}</h4>
                  <AlertDescription>{insight.description}</AlertDescription>
                </div>
              </Alert>
            ))
          )}
        </CardContent>
      </Card>

      {/* Spending Patterns */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Category Spending Patterns
          </CardTitle>
          <CardDescription>
            Detailed breakdown of your spending habits by category
          </CardDescription>
        </CardHeader>
        <CardContent>
          {patterns.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Start tracking expenses to see your spending patterns
            </p>
          ) : (
            <div className="space-y-6">
              {patterns.map((pattern, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{pattern.icon}</span>
                      <div>
                        <h3 className="font-medium">{pattern.category}</h3>
                        <p className="text-sm text-muted-foreground">
                          {pattern.frequency} transactions • ${pattern.avgPerTransaction.toFixed(2)} avg
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-lg">${pattern.totalSpent.toFixed(2)}</p>
                      <div className="flex items-center gap-1">
                        {pattern.trend > 0 ? (
                          <TrendingUp className="h-3 w-3 text-destructive" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-success" />
                        )}
                        <span className={`text-xs ${pattern.trend > 0 ? 'text-destructive' : 'text-success'}`}>
                          {Math.abs(pattern.trend).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Share of total spending</span>
                      <span>{((pattern.totalSpent / totalSpending) * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={(pattern.totalSpent / totalSpending) * 100} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium mb-1">Spending Timing</p>
                      <Badge variant="secondary">
                        {pattern.timeOfMonthPattern === 'early' && '📅 Early Month'}
                        {pattern.timeOfMonthPattern === 'mid' && '📅 Mid Month'}
                        {pattern.timeOfMonthPattern === 'late' && '📅 Late Month'}
                        {pattern.timeOfMonthPattern === 'consistent' && '📅 Consistent'}
                      </Badge>
                    </div>
                    <div>
                      <p className="font-medium mb-1">Most Active Day</p>
                      <Badge variant="outline">
                        {Object.entries(pattern.dayOfWeekPattern)
                          .sort(([,a], [,b]) => b - a)[0][0]}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};