import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle, Calendar, DollarSign, Repeat, Target, Activity, Zap } from 'lucide-react';

interface MonthlyData {
  month: string;
  year: number;
  monthNum: number;
  total: number;
  categories: { [key: string]: number };
  seasonalIndex: number;
  volatility: number;
}

interface TrendAnalysis {
  category: string;
  icon: string;
  color: string;
  monthlyData: { month: string; amount: number; year: number; monthNum: number }[];
  
  // Core metrics
  avgMonthly: number;
  totalSpent: number;
  
  // Trend analysis
  linearTrend: number; // % change per month
  movingAvgTrend: number; // 3-month vs previous 3-month
  seasonalPattern: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  
  // Statistical insights
  volatility: number; // coefficient of variation
  consistency: 'very_consistent' | 'consistent' | 'variable' | 'highly_variable';
  outlierMonths: string[];
  
  // Predictive insights
  nextMonthPrediction: number;
  confidenceLevel: number;
  
  // Behavioral insights
  spendingPattern: 'steady' | 'increasing' | 'decreasing' | 'seasonal' | 'erratic';
  riskLevel: 'low' | 'medium' | 'high';
  insight: string;
}

interface SeasonalInsight {
  type: 'seasonal_spike' | 'consistent_growth' | 'budget_creep' | 'volatile_spending' | 'cost_optimization';
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  categories: string[];
  recommendation: string;
}

export const MonthlyTrends: React.FC = () => {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categoryAnalysis, setCategoryAnalysis] = useState<TrendAnalysis[]>([]);
  const [seasonalInsights, setSeasonalInsights] = useState<SeasonalInsight[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('12');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [totalSpending, setTotalSpending] = useState(0);

  useEffect(() => {
    loadTrendsData();
  }, [selectedPeriod]);

  const loadTrendsData = async () => {
    setLoading(true);
    try {
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

      // Process data for advanced trend analysis
      const monthlyMap = new Map<string, MonthlyData>();
      const categoryDataMap = new Map<string, { 
        monthlyData: { month: string; amount: number; year: number; monthNum: number }[];
        category: any;
      }>();

      let totalSpend = 0;

      expenses.forEach((expense) => {
        const date = new Date(expense.expense_date);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        
        totalSpend += Number(expense.amount);
        
        // Monthly aggregation
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, {
            month: monthLabel,
            year: date.getFullYear(),
            monthNum: date.getMonth() + 1,
            total: 0,
            categories: {},
            seasonalIndex: 0,
            volatility: 0
          });
        }
        
        const monthData = monthlyMap.get(monthKey)!;
        monthData.total += Number(expense.amount);
        
        const categoryName = expense.expense_categories?.name || 'Uncategorized';
        monthData.categories[categoryName] = (monthData.categories[categoryName] || 0) + Number(expense.amount);

        // Category data collection
        if (!categoryDataMap.has(categoryName)) {
          categoryDataMap.set(categoryName, {
            monthlyData: [],
            category: expense.expense_categories
          });
        }
        
        const categoryData = categoryDataMap.get(categoryName)!;
        const existingMonth = categoryData.monthlyData.find(m => m.month === monthLabel);
        if (existingMonth) {
          existingMonth.amount += Number(expense.amount);
        } else {
          categoryData.monthlyData.push({
            month: monthLabel,
            amount: Number(expense.amount),
            year: date.getFullYear(),
            monthNum: date.getMonth() + 1
          });
        }
      });

      setTotalSpending(totalSpend);

      // Process monthly data and calculate volatility
      const monthlyDataArray = Array.from(monthlyMap.values())
        .sort((a, b) => (a.year * 12 + a.monthNum) - (b.year * 12 + b.monthNum));

      // Calculate overall volatility and seasonal patterns
      if (monthlyDataArray.length > 3) {
        const amounts = monthlyDataArray.map(m => m.total);
        const mean = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
        const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - mean, 2), 0) / amounts.length;
        const overallVolatility = mean > 0 ? Math.sqrt(variance) / mean : 0;

        monthlyDataArray.forEach((month, index) => {
          // Calculate seasonal index (compare to overall average)
          month.seasonalIndex = mean > 0 ? (month.total / mean) : 1;
          month.volatility = overallVolatility;
        });
      }

      // Advanced category trend analysis
      const categoryAnalysisArray: TrendAnalysis[] = [];
      
      categoryDataMap.forEach(({ monthlyData, category }, categoryName) => {
        if (monthlyData.length < 2) return;

        // Sort data chronologically
        const sortedData = monthlyData.sort((a, b) => (a.year * 12 + a.monthNum) - (b.year * 12 + b.monthNum));
        
        const amounts = sortedData.map(d => d.amount);
        const totalSpent = amounts.reduce((sum, amt) => sum + amt, 0);
        const avgMonthly = totalSpent / amounts.length;
        
        // Statistical calculations
        const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - avgMonthly, 2), 0) / amounts.length;
        const stdDev = Math.sqrt(variance);
        const volatility = avgMonthly > 0 ? stdDev / avgMonthly : 0;
        
        // Linear trend calculation (using least squares regression)
        const n = amounts.length;
        const sumX = n * (n - 1) / 2; // 0 + 1 + 2 + ... + (n-1)
        const sumY = amounts.reduce((sum, amt) => sum + amt, 0);
        const sumXY = amounts.reduce((sum, amt, i) => sum + i * amt, 0);
        const sumXX = n * (n - 1) * (2 * n - 1) / 6; // 0² + 1² + 2² + ... + (n-1)²
        
        const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) : 0;
        const linearTrend = avgMonthly > 0 ? (slope / avgMonthly) * 100 : 0;
        
        // Moving average trend (last 3 months vs previous 3 months)
        let movingAvgTrend = 0;
        if (amounts.length >= 6) {
          const recentThree = amounts.slice(-3).reduce((sum, amt) => sum + amt, 0) / 3;
          const previousThree = amounts.slice(-6, -3).reduce((sum, amt) => sum + amt, 0) / 3;
          movingAvgTrend = previousThree > 0 ? ((recentThree - previousThree) / previousThree) * 100 : 0;
        }
        
        // Identify outliers (values > 2 standard deviations from mean)
        const outlierThreshold = 2 * stdDev;
        const outlierMonths = sortedData
          .filter(d => Math.abs(d.amount - avgMonthly) > outlierThreshold)
          .map(d => d.month);
        
        // Determine spending pattern
        let spendingPattern: TrendAnalysis['spendingPattern'] = 'steady';
        if (Math.abs(linearTrend) > 15) {
          spendingPattern = linearTrend > 0 ? 'increasing' : 'decreasing';
        } else if (volatility > 0.5) {
          spendingPattern = 'erratic';
        } else if (outlierMonths.length > amounts.length * 0.3) {
          spendingPattern = 'seasonal';
        }
        
        // Determine consistency level
        let consistency: TrendAnalysis['consistency'];
        if (volatility < 0.15) consistency = 'very_consistent';
        else if (volatility < 0.3) consistency = 'consistent';
        else if (volatility < 0.6) consistency = 'variable';
        else consistency = 'highly_variable';
        
        // Seasonal pattern determination
        let seasonalPattern: TrendAnalysis['seasonalPattern'];
        if (volatility > 0.8) seasonalPattern = 'volatile';
        else if (Math.abs(linearTrend) > 20) seasonalPattern = linearTrend > 0 ? 'increasing' : 'decreasing';
        else seasonalPattern = 'stable';
        
        // Risk assessment
        let riskLevel: TrendAnalysis['riskLevel'] = 'low';
        if (linearTrend > 25 || volatility > 0.7) riskLevel = 'high';
        else if (linearTrend > 10 || volatility > 0.4) riskLevel = 'medium';
        
        // Simple prediction (trend-based)
        const nextMonthPrediction = Math.max(0, avgMonthly + (slope || 0));
        const confidenceLevel = Math.max(0.1, Math.min(0.95, 1 - volatility));
        
        // Generate insight
        let insight = '';
        if (linearTrend > 20) {
          insight = `Rapidly increasing spending (+${linearTrend.toFixed(1)}% per month). Consider setting alerts.`;
        } else if (linearTrend < -20) {
          insight = `Great progress reducing spending (${linearTrend.toFixed(1)}% per month). Keep it up!`;
        } else if (volatility > 0.6) {
          insight = `Highly variable spending. Look for patterns or set a consistent budget.`;
        } else if (consistency === 'very_consistent') {
          insight = `Very predictable spending pattern. Easy to budget for.`;
        } else {
          insight = `Moderate spending variation. Monitor for unexpected changes.`;
        }
        
        categoryAnalysisArray.push({
          category: categoryName,
          icon: category?.icon || '📦',
          color: category?.color || '#6B7280',
          monthlyData: sortedData,
          avgMonthly,
          totalSpent,
          linearTrend,
          movingAvgTrend,
          seasonalPattern,
          volatility,
          consistency,
          outlierMonths,
          nextMonthPrediction,
          confidenceLevel,
          spendingPattern,
          riskLevel,
          insight
        });
      });

      // Generate seasonal insights
      const insights = generateSeasonalInsights(categoryAnalysisArray, monthlyDataArray);

      setMonthlyData(monthlyDataArray);
      setCategoryAnalysis(categoryAnalysisArray.sort((a, b) => b.totalSpent - a.totalSpent));
      setSeasonalInsights(insights);
    } catch (error) {
      console.error('Error loading trends data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSeasonalInsights = (
    categories: TrendAnalysis[], 
    monthlyData: MonthlyData[]
  ): SeasonalInsight[] => {
    const insights: SeasonalInsight[] = [];
    
    // Budget creep detection
    const rapidGrowthCategories = categories.filter(c => c.linearTrend > 15);
    if (rapidGrowthCategories.length > 0) {
      insights.push({
        type: 'budget_creep',
        title: 'Budget Creep Detected',
        description: `${rapidGrowthCategories.length} categories show rapid spending growth`,
        impact: 'negative',
        categories: rapidGrowthCategories.map(c => c.category),
        recommendation: 'Review and set stricter limits for these categories'
      });
    }
    
    // Cost optimization opportunities
    const consistentCategories = categories.filter(c => 
      c.consistency === 'very_consistent' && c.totalSpent > 500 && c.linearTrend > -5
    );
    if (consistentCategories.length > 0) {
      insights.push({
        type: 'cost_optimization',
        title: 'Optimization Opportunities',
        description: `${consistentCategories.length} consistent spending categories could be optimized`,
        impact: 'positive',
        categories: consistentCategories.map(c => c.category),
        recommendation: 'Consider negotiating better rates or finding alternatives'
      });
    }
    
    // Volatile spending warning
    const volatileCategories = categories.filter(c => c.volatility > 0.6);
    if (volatileCategories.length > 0) {
      insights.push({
        type: 'volatile_spending',
        title: 'Unpredictable Spending',
        description: `${volatileCategories.length} categories have highly variable spending`,
        impact: 'negative',
        categories: volatileCategories.map(c => c.category),
        recommendation: 'Create buffer budgets or investigate spending triggers'
      });
    }
    
    // Seasonal patterns
    if (monthlyData.length >= 6) {
      const seasonalCategories = categories.filter(c => c.outlierMonths.length >= 2);
      if (seasonalCategories.length > 0) {
        insights.push({
          type: 'seasonal_spike',
          title: 'Seasonal Spending Patterns',
          description: `${seasonalCategories.length} categories show seasonal variation`,
          impact: 'neutral',
          categories: seasonalCategories.map(c => c.category),
          recommendation: 'Plan for seasonal variations in your budget'
        });
      }
    }
    
    return insights;
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-orange-500';
      default: return 'text-success';
    }
  };

  const getConsistencyBadge = (consistency: string) => {
    switch (consistency) {
      case 'very_consistent': return { text: 'Very Stable', variant: 'default' as const };
      case 'consistent': return { text: 'Stable', variant: 'secondary' as const };
      case 'variable': return { text: 'Variable', variant: 'outline' as const };
      default: return { text: 'Highly Variable', variant: 'destructive' as const };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Advanced Spending Trends Analysis
          </CardTitle>
          <CardDescription>
            Statistical analysis of your spending patterns with predictive insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Time Period:</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">Last 6 months</SelectItem>
                  <SelectItem value="12">Last 12 months</SelectItem>
                  <SelectItem value="18">Last 18 months</SelectItem>
                  <SelectItem value="24">Last 24 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Focus Category:</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categoryAnalysis.map((cat) => (
                    <SelectItem key={cat.category} value={cat.category}>
                      {cat.icon} {cat.category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Insights */}
      {seasonalInsights.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Key Insights & Recommendations
            </CardTitle>
            <CardDescription>AI-powered analysis of your spending trends</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {seasonalInsights.map((insight, index) => (
              <Alert key={index} className={
                insight.impact === 'negative' ? 'border-destructive/50 bg-destructive/5' :
                insight.impact === 'positive' ? 'border-success/50 bg-success/5' :
                'border-primary/50 bg-primary/5'
              }>
                <AlertCircle className={`h-4 w-4 ${
                  insight.impact === 'negative' ? 'text-destructive' :
                  insight.impact === 'positive' ? 'text-success' :
                  'text-primary'
                }`} />
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-medium">{insight.title}</div>
                    <div className="text-sm text-muted-foreground">{insight.description}</div>
                    <div className="text-sm font-medium">💡 {insight.recommendation}</div>
                    {insight.categories.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Categories: {insight.categories.join(', ')}
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Overall Trend Visualization */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Monthly Spending Patterns</CardTitle>
          <CardDescription>
            Total: {formatCurrency(totalSpending)} over {monthlyData.length} months 
            ({formatCurrency(totalSpending / Math.max(1, monthlyData.length))} avg/month)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Total Spending']} />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  name="Monthly Total"
                  dot={{ r: 6, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Category Analysis Grid */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Category Trend Analysis
          </CardTitle>
          <CardDescription>Statistical breakdown of spending patterns by category</CardDescription>
        </CardHeader>
        <CardContent>
          {categoryAnalysis.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Add more expenses to see detailed trend analysis
            </p>
          ) : (
            <div className="space-y-6">
              {categoryAnalysis
                .filter(cat => selectedCategory === 'all' || cat.category === selectedCategory)
                .map((analysis) => (
                <div key={analysis.category} className="border rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{analysis.icon}</span>
                      <div>
                        <h3 className="font-semibold text-lg">{analysis.category}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(analysis.totalSpent)} total • {formatCurrency(analysis.avgMonthly)} avg/month
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={getConsistencyBadge(analysis.consistency).variant}>
                        {getConsistencyBadge(analysis.consistency).text}
                      </Badge>
                      <span className={`text-sm font-medium ${getRiskColor(analysis.riskLevel)}`}>
                        {analysis.riskLevel.toUpperCase()} RISK
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Linear Trend</p>
                      <div className="flex items-center gap-2">
                        {analysis.linearTrend > 0 ? (
                          <TrendingUp className="h-4 w-4 text-destructive" />
                        ) : analysis.linearTrend < 0 ? (
                          <TrendingDown className="h-4 w-4 text-success" />
                        ) : (
                          <div className="h-4 w-4 rounded-full bg-muted" />
                        )}
                        <span className={`font-medium ${
                          analysis.linearTrend > 0 ? 'text-destructive' : 
                          analysis.linearTrend < 0 ? 'text-success' : 
                          'text-muted-foreground'
                        }`}>
                          {analysis.linearTrend > 0 ? '+' : ''}{analysis.linearTrend.toFixed(1)}% per month
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Recent Trend</p>
                      <div className="flex items-center gap-2">
                        {analysis.movingAvgTrend > 0 ? (
                          <TrendingUp className="h-4 w-4 text-destructive" />
                        ) : analysis.movingAvgTrend < 0 ? (
                          <TrendingDown className="h-4 w-4 text-success" />
                        ) : (
                          <div className="h-4 w-4 rounded-full bg-muted" />
                        )}
                        <span className={`font-medium ${
                          analysis.movingAvgTrend > 0 ? 'text-destructive' : 
                          analysis.movingAvgTrend < 0 ? 'text-success' : 
                          'text-muted-foreground'
                        }`}>
                          {analysis.movingAvgTrend > 0 ? '+' : ''}{analysis.movingAvgTrend.toFixed(1)}% (3mo)
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-medium">Next Month Prediction</p>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatCurrency(analysis.nextMonthPrediction)}</span>
                        <span className="text-xs text-muted-foreground">
                          ({Math.round(analysis.confidenceLevel * 100)}% confidence)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <Alert>
                      <AlertDescription className="text-sm">
                        {analysis.insight}
                      </AlertDescription>
                    </Alert>
                  </div>

                  {analysis.outlierMonths.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2">Unusual Months:</p>
                      <div className="flex flex-wrap gap-1">
                        {analysis.outlierMonths.map((month) => (
                          <Badge key={month} variant="outline" className="text-xs">
                            {month}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analysis.monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(value) => `$${value}`} />
                        <Tooltip formatter={(value) => [formatCurrency(Number(value)), analysis.category]} />
                        <Line 
                          type="monotone" 
                          dataKey="amount" 
                          stroke={analysis.color} 
                          strokeWidth={3}
                          dot={{ fill: analysis.color, strokeWidth: 2, r: 4 }}
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
    </div>
  );
};