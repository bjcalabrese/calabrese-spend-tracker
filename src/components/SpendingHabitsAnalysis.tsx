import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, Calendar, DollarSign, Target, Activity, BarChart3, TrendingUpIcon } from 'lucide-react';
import { DateRangeNavigation } from '@/components/DateRangeNavigation';

interface SpendingPattern {
  category: string;
  icon: string;
  color: string;
  
  // Core spending metrics
  totalSpent: number;
  avgPerTransaction: number;
  frequency: number;
  percentOfTotal: number;
  
  // Statistical analysis
  trend: number; // Linear regression slope as percentage
  volatility: number; // Coefficient of variation
  consistency: 'very_consistent' | 'consistent' | 'variable' | 'highly_variable';
  
  // Temporal patterns
  monthlyData: { month: string; amount: number; count: number }[];
  dayOfWeekPattern: { day: string; amount: number; count: number }[];
  timeOfMonthPattern: { period: string; amount: number; percentage: number }[];
  
  // Behavioral insights
  spendingVelocity: number; // Spending acceleration/deceleration
  seasonalPattern: 'increasing' | 'decreasing' | 'stable' | 'seasonal';
  riskLevel: 'low' | 'medium' | 'high';
  
  // Predictions
  nextMonthPrediction: number;
  confidenceLevel: number;
}

interface SpendingInsight {
  type: 'critical' | 'warning' | 'info' | 'success' | 'trend';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  amount?: number;
  category?: string;
  recommendation?: string;
}

export const SpendingHabitsAnalysis: React.FC = () => {
  const [patterns, setPatterns] = useState<SpendingPattern[]>([]);
  const [insights, setInsights] = useState<SpendingInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSpending, setTotalSpending] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState(90); // days
  
  // Default to last 3 months
  const currentDate = new Date();
  const defaultStartDate = new Date(currentDate);
  defaultStartDate.setMonth(currentDate.getMonth() - 3);
  
  const [dateFrom, setDateFrom] = useState<Date>(defaultStartDate);
  const [dateTo, setDateTo] = useState<Date>(currentDate);

  useEffect(() => {
    analyzeSpendingHabits();
  }, [dateFrom, dateTo]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const analyzeSpendingHabits = async () => {
    setLoading(true);
    try {
      const { data: expenses, error } = await supabase
        .from('expenses')
        .select(`
          amount,
          expense_date,
          created_at,
          name,
          expense_categories (
            name,
            icon,
            color
          )
        `)
        .gte('expense_date', dateFrom.toISOString().split('T')[0])
        .lte('expense_date', dateTo.toISOString().split('T')[0])
        .order('expense_date', { ascending: true });

      if (error) throw error;

      if (!expenses || expenses.length === 0) {
        setInsights([{
          type: 'info',
          title: 'Start Tracking Your Spending',
          description: 'Add expenses for this period to see detailed spending analysis and behavioral insights.',
          impact: 'low',
          actionable: true,
          recommendation: 'Add your first expenses to unlock powerful spending analytics'
        }]);
        setLoading(false);
        return;
      }

      // Advanced analysis by category
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

      // Generate comprehensive patterns
      const analysisPatterns: SpendingPattern[] = [];
      const generatedInsights: SpendingInsight[] = [];

      categoryMap.forEach(({ expenses: categoryExpenses, category }, categoryName) => {
        const amounts = categoryExpenses.map(exp => Number(exp.amount));
        const totalCategorySpent = amounts.reduce((sum, amt) => sum + amt, 0);
        const avgPerTransaction = totalCategorySpent / amounts.length;
        const frequency = amounts.length;
        const percentOfTotal = (totalCategorySpent / total) * 100;

        // Statistical calculations
        const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - avgPerTransaction, 2), 0) / amounts.length;
        const stdDev = Math.sqrt(variance);
        const volatility = avgPerTransaction > 0 ? stdDev / avgPerTransaction : 0;

        // Determine consistency
        let consistency: SpendingPattern['consistency'];
        if (volatility < 0.2) consistency = 'very_consistent';
        else if (volatility < 0.4) consistency = 'consistent';
        else if (volatility < 0.8) consistency = 'variable';
        else consistency = 'highly_variable';

        // Linear trend calculation (proper regression)
        const n = amounts.length;
        if (n < 2) return; // Skip categories with insufficient data
        
        const xValues = Array.from({ length: n }, (_, i) => i);
        const sumX = xValues.reduce((sum, x) => sum + x, 0);
        const sumY = amounts.reduce((sum, y) => sum + y, 0);
        const sumXY = xValues.reduce((sum, x, i) => sum + x * amounts[i], 0);
        const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const trend = avgPerTransaction > 0 ? (slope / avgPerTransaction) * 100 : 0;

        // Monthly aggregation
        const monthlyMap = new Map<string, { amount: number; count: number }>();
        categoryExpenses.forEach(exp => {
          const date = new Date(exp.expense_date);
          const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          
          if (!monthlyMap.has(monthLabel)) {
            monthlyMap.set(monthLabel, { amount: 0, count: 0 });
          }
          const monthData = monthlyMap.get(monthLabel)!;
          monthData.amount += Number(exp.amount);
          monthData.count++;
        });

        const monthlyData = Array.from(monthlyMap.entries()).map(([month, data]) => ({
          month,
          amount: data.amount,
          count: data.count
        }));

        // Day of week analysis
        const dayMap = new Map<string, { amount: number; count: number }>();
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        days.forEach(day => dayMap.set(day, { amount: 0, count: 0 }));

        categoryExpenses.forEach(exp => {
          const day = days[new Date(exp.expense_date).getDay()];
          const dayData = dayMap.get(day)!;
          dayData.amount += Number(exp.amount);
          dayData.count++;
        });

        const dayOfWeekPattern = Array.from(dayMap.entries()).map(([day, data]) => ({
          day,
          amount: data.amount,
          count: data.count
        }));

        // Time of month analysis
        const earlyMonth = categoryExpenses.filter(exp => new Date(exp.expense_date).getDate() <= 10);
        const midMonth = categoryExpenses.filter(exp => {
          const date = new Date(exp.expense_date).getDate();
          return date > 10 && date <= 20;
        });
        const lateMonth = categoryExpenses.filter(exp => new Date(exp.expense_date).getDate() > 20);

        const timeOfMonthPattern = [
          {
            period: 'Early Month (1-10)',
            amount: earlyMonth.reduce((sum, exp) => sum + Number(exp.amount), 0),
            percentage: (earlyMonth.length / categoryExpenses.length) * 100
          },
          {
            period: 'Mid Month (11-20)',
            amount: midMonth.reduce((sum, exp) => sum + Number(exp.amount), 0),
            percentage: (midMonth.length / categoryExpenses.length) * 100
          },
          {
            period: 'Late Month (21-31)',
            amount: lateMonth.reduce((sum, exp) => sum + Number(exp.amount), 0),
            percentage: (lateMonth.length / categoryExpenses.length) * 100
          }
        ];

        // Seasonal pattern determination
        let seasonalPattern: SpendingPattern['seasonalPattern'];
        if (Math.abs(trend) > 20) {
          seasonalPattern = trend > 0 ? 'increasing' : 'decreasing';
        } else if (volatility > 0.6) {
          seasonalPattern = 'seasonal';
        } else {
          seasonalPattern = 'stable';
        }

        // Risk assessment
        let riskLevel: SpendingPattern['riskLevel'] = 'low';
        if (trend > 30 || (percentOfTotal > 40 && trend > 10)) {
          riskLevel = 'high';
        } else if (trend > 15 || percentOfTotal > 30) {
          riskLevel = 'medium';
        }

        // Spending velocity (acceleration/deceleration)
        const spendingVelocity = trend > 0 ? Math.min(trend / 10, 5) : Math.max(trend / 10, -5);

        // Simple prediction
        const nextMonthPrediction = Math.max(0, avgPerTransaction * (frequency / monthlyData.length) + (slope || 0));
        const confidenceLevel = Math.max(0.1, Math.min(0.95, 1 - volatility));

        analysisPatterns.push({
          category: categoryName,
          icon: category?.icon || '📦',
          color: category?.color || '#6B7280',
          totalSpent: totalCategorySpent,
          avgPerTransaction,
          frequency,
          percentOfTotal,
          trend,
          volatility,
          consistency,
          monthlyData,
          dayOfWeekPattern,
          timeOfMonthPattern,
          spendingVelocity,
          seasonalPattern,
          riskLevel,
          nextMonthPrediction,
          confidenceLevel
        });

        // Generate intelligent insights
        if (percentOfTotal > 35) {
          generatedInsights.push({
            type: 'critical',
            title: `${categoryName} Dominates Your Budget`,
            description: `${categoryName} represents ${percentOfTotal.toFixed(1)}% of your spending. Consider diversifying or reducing this category.`,
            impact: 'high',
            actionable: true,
            amount: totalCategorySpent,
            category: categoryName,
            recommendation: 'Set a strict budget limit and find alternatives to reduce dependency'
          });
        }

        if (trend > 25 && riskLevel === 'high') {
          generatedInsights.push({
            type: 'warning',
            title: `Rapidly Escalating ${categoryName} Costs`,
            description: `${categoryName} spending is increasing by ${trend.toFixed(1)}% per period. This could impact your financial goals.`,
            impact: 'high',
            actionable: true,
            category: categoryName,
            recommendation: 'Investigate the cause and set spending alerts'
          });
        } else if (trend < -25) {
          generatedInsights.push({
            type: 'success',
            title: `Excellent ${categoryName} Cost Control`,
            description: `You've successfully reduced ${categoryName} spending by ${Math.abs(trend).toFixed(1)}%. Keep up the great work!`,
            impact: 'medium',
            actionable: false,
            category: categoryName
          });
        }

        if (volatility > 0.8) {
          generatedInsights.push({
            type: 'warning',
            title: `Unpredictable ${categoryName} Spending`,
            description: `${categoryName} spending is highly variable, making budgeting difficult.`,
            impact: 'medium',
            actionable: true,
            category: categoryName,
            recommendation: 'Create a buffer budget or track spending triggers'
          });
        }

        if (consistency === 'very_consistent' && percentOfTotal > 15) {
          generatedInsights.push({
            type: 'info',
            title: `${categoryName} is Highly Predictable`,
            description: `${categoryName} spending is very consistent. Consider negotiating better rates or bulk discounts.`,
            impact: 'low',
            actionable: true,
            category: categoryName,
            recommendation: 'Look for optimization opportunities like bulk buying or subscription discounts'
          });
        }
      });

      // Sort patterns by total spent
      analysisPatterns.sort((a, b) => b.totalSpent - a.totalSpent);

      // Add overall insights
      const daysDifference = Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24));
      const avgDaily = total / Math.max(1, daysDifference);
      const avgMonthly = total / Math.max(1, daysDifference / 30);

      generatedInsights.unshift({
        type: 'info',
        title: 'Spending Overview',
        description: `${formatCurrency(total)} total spending over ${daysDifference} days. Daily average: ${formatCurrency(avgDaily)}, Monthly average: ${formatCurrency(avgMonthly)}.`,
        impact: 'low',
        actionable: false,
        amount: total
      });

      // Budget efficiency insight
      const topThreeCategories = analysisPatterns.slice(0, 3);
      const topThreePercent = topThreeCategories.reduce((sum, cat) => sum + cat.percentOfTotal, 0);
      
      if (topThreePercent > 80) {
        generatedInsights.push({
          type: 'trend',
          title: 'Concentrated Spending Pattern',
          description: `Your top 3 categories account for ${topThreePercent.toFixed(1)}% of spending. This concentrated pattern can make budgeting more predictable.`,
          impact: 'medium',
          actionable: true,
          recommendation: 'Focus optimization efforts on these key categories for maximum impact'
        });
      }

      setPatterns(analysisPatterns);
      setInsights(generatedInsights);
    } catch (error) {
      console.error('Error analyzing spending habits:', error);
      setInsights([{
        type: 'warning',
        title: 'Analysis Error',
        description: 'Unable to analyze spending habits. Please try again.',
        impact: 'low',
        actionable: false
      }]);
    } finally {
      setLoading(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'warning': return <TrendingUp className="h-4 w-4 text-orange-500" />;
      case 'success': return <TrendingDown className="h-4 w-4 text-green-600" />;
      case 'trend': return <BarChart3 className="h-4 w-4 text-blue-500" />;
      default: return <Activity className="h-4 w-4 text-primary" />;
    }
  };

  const getConsistencyColor = (consistency: string) => {
    switch (consistency) {
      case 'very_consistent': return 'text-green-600';
      case 'consistent': return 'text-blue-500';
      case 'variable': return 'text-orange-500';
      default: return 'text-red-500';
    }
  };

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Analyzing Your Spending Habits</CardTitle>
          <CardDescription>Processing your expense data for behavioral insights...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-2 bg-muted rounded w-full"></div>
                <div className="h-2 bg-muted rounded w-1/2 mt-1"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Advanced Spending Habits Analysis
          </CardTitle>
          <CardDescription>
            Deep behavioral analysis of your spending patterns with actionable insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DateRangeNavigation
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
        </CardContent>
      </Card>

      {/* Key Insights Section */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUpIcon className="h-5 w-5 text-primary" />
            Behavioral Insights & Recommendations
          </CardTitle>
          <CardDescription>
            AI-powered analysis with actionable recommendations for better financial health
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {insights.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No insights available yet. Add more expenses to unlock powerful spending analytics.
            </p>
          ) : (
            insights.map((insight, index) => (
              <Alert key={index} 
                variant={insight.type === 'critical' || insight.type === 'warning' ? 'destructive' : 'default'}
                className={`${
                  insight.type === 'success' ? 'border-green-200 bg-green-50' :
                  insight.type === 'trend' ? 'border-blue-200 bg-blue-50' :
                  insight.type === 'critical' ? 'border-red-200 bg-red-50' : ''
                }`}
              >
                {getInsightIcon(insight.type)}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{insight.title}</h4>
                      <AlertDescription className="mt-1">{insight.description}</AlertDescription>
                      {insight.recommendation && (
                        <div className="mt-2 p-2 rounded bg-muted/50">
                          <p className="text-xs font-medium">💡 Recommendation:</p>
                          <p className="text-xs text-muted-foreground">{insight.recommendation}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-3">
                      <Badge variant={
                        insight.impact === 'high' ? 'destructive' :
                        insight.impact === 'medium' ? 'outline' : 'secondary'
                      }>
                        {insight.impact.toUpperCase()}
                      </Badge>
                      {insight.actionable && (
                        <Badge variant="default" className="text-xs">Actionable</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Alert>
            ))
          )}
        </CardContent>
      </Card>

      {/* Comprehensive Spending Patterns */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Detailed Category Analysis
          </CardTitle>
          <CardDescription>
            Statistical breakdown with predictive insights and behavioral patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          {patterns.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Add expenses for this period to see detailed spending patterns and behavioral analysis
            </p>
          ) : (
            <div className="space-y-8">
              {patterns.map((pattern, index) => (
                <div key={index} className="border rounded-lg p-6 space-y-6">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{pattern.icon}</span>
                      <div>
                        <h3 className="font-semibold text-lg">{pattern.category}</h3>
                        <p className="text-sm text-muted-foreground">
                          {pattern.frequency} transactions • {formatCurrency(pattern.avgPerTransaction)} avg per transaction
                        </p>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-bold text-xl">{formatCurrency(pattern.totalSpent)}</p>
                      <div className="flex items-center gap-2">
                        {pattern.trend > 0 ? (
                          <TrendingUp className="h-4 w-4 text-destructive" />
                        ) : pattern.trend < 0 ? (
                          <TrendingDown className="h-4 w-4 text-success" />
                        ) : (
                          <div className="h-4 w-4" />
                        )}
                        <span className={`text-sm font-medium ${
                          pattern.trend > 0 ? 'text-destructive' : 
                          pattern.trend < 0 ? 'text-success' : 'text-muted-foreground'
                        }`}>
                          {pattern.trend > 0 ? '+' : ''}{pattern.trend.toFixed(1)}% trend
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">BUDGET SHARE</p>
                      <p className="text-lg font-semibold">{pattern.percentOfTotal.toFixed(1)}%</p>
                      <Progress value={pattern.percentOfTotal} className="h-2" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">CONSISTENCY</p>
                      <p className={`text-sm font-medium ${getConsistencyColor(pattern.consistency)}`}>
                        {pattern.consistency.replace('_', ' ').toUpperCase()}
                      </p>
                      <p className="text-xs text-muted-foreground">Volatility: {(pattern.volatility * 100).toFixed(1)}%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">RISK LEVEL</p>
                      <Badge variant={
                        pattern.riskLevel === 'high' ? 'destructive' :
                        pattern.riskLevel === 'medium' ? 'outline' : 'secondary'
                      }>
                        {pattern.riskLevel.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">NEXT MONTH PREDICTION</p>
                      <p className="text-sm font-semibold">{formatCurrency(pattern.nextMonthPrediction)}</p>
                      <p className="text-xs text-muted-foreground">{Math.round(pattern.confidenceLevel * 100)}% confidence</p>
                    </div>
                  </div>

                  {/* Temporal Patterns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Monthly Spending Pattern</h4>
                      <div className="h-32">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={pattern.monthlyData}>
                            <XAxis dataKey="month" fontSize={10} />
                            <YAxis hide />
                            <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Amount']} />
                            <Bar dataKey="amount" fill={pattern.color} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-3">Day of Week Analysis</h4>
                      <div className="space-y-2">
                        {pattern.dayOfWeekPattern
                          .sort((a, b) => b.amount - a.amount)
                          .slice(0, 3)
                          .map((day, idx) => (
                          <div key={day.day} className="flex justify-between items-center">
                            <span className="text-sm">{day.day}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{formatCurrency(day.amount)}</span>
                              <span className="text-xs text-muted-foreground">({day.count} times)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Time of Month Breakdown */}
                  <div>
                    <h4 className="font-medium mb-3">Time of Month Distribution</h4>
                    <div className="grid grid-cols-3 gap-4">
                      {pattern.timeOfMonthPattern.map((period, idx) => (
                        <div key={idx} className="text-center p-3 bg-muted/30 rounded-lg">
                          <p className="text-xs font-medium text-muted-foreground">{period.period}</p>
                          <p className="font-semibold">{formatCurrency(period.amount)}</p>
                          <p className="text-xs text-muted-foreground">{period.percentage.toFixed(1)}% of transactions</p>
                        </div>
                      ))}
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