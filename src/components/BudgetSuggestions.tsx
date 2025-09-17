import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lightbulb, TrendingUp, DollarSign, Target, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface BudgetSuggestion {
  category: string;
  categoryId: string;
  icon: string;
  color: string;
  currentMonthlyAvg: number;
  suggestedBudget: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  trend: number;
  hasExistingBudget: boolean;
}

export const BudgetSuggestions: React.FC = () => {
  const [suggestions, setSuggestions] = useState<BudgetSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingBudgets, setCreatingBudgets] = useState<string[]>([]);

  useEffect(() => {
    generateBudgetSuggestions();
  }, []);

  const generateBudgetSuggestions = async () => {
    setLoading(true);
    try {
      // Get expenses for the last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: expenses } = await supabase
        .from('expenses')
        .select(`
          amount,
          expense_date,
          category_id,
          expense_categories (
            id,
            name,
            icon,
            color
          )
        `)
        .gte('expense_date', sixMonthsAgo.toISOString().split('T')[0]);

      if (!expenses || expenses.length === 0) {
        setLoading(false);
        return;
      }

      // Get existing budgets for current month
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const { data: existingBudgets } = await supabase
        .from('monthly_budgets')
        .select('category_id')
        .eq('month', currentMonth)
        .eq('year', currentYear);

      const existingBudgetCategoryIds = new Set(existingBudgets?.map(b => b.category_id) || []);

      // Group expenses by category and analyze
      const categoryMap = new Map<string, {
        expenses: any[];
        category: any;
      }>();

      expenses.forEach((expense) => {
        const categoryId = expense.category_id;
        if (!categoryId || !expense.expense_categories) return;

        if (!categoryMap.has(categoryId)) {
          categoryMap.set(categoryId, {
            expenses: [],
            category: expense.expense_categories
          });
        }
        categoryMap.get(categoryId)!.expenses.push(expense);
      });

      const budgetSuggestions: BudgetSuggestion[] = [];

      categoryMap.forEach(({ expenses: categoryExpenses, category }, categoryId) => {
        // Calculate monthly averages
        const monthlyTotals = new Map<string, number>();
        
        categoryExpenses.forEach(expense => {
          const monthKey = expense.expense_date.substring(0, 7); // YYYY-MM
          const current = monthlyTotals.get(monthKey) || 0;
          monthlyTotals.set(monthKey, current + Number(expense.amount));
        });

        const monthlyAmounts = Array.from(monthlyTotals.values());
        const avgMonthly = monthlyAmounts.reduce((sum, amt) => sum + amt, 0) / monthlyAmounts.length;

        // Calculate trend (last 3 months vs previous 3 months)
        const sortedMonths = Array.from(monthlyTotals.entries()).sort();
        const halfPoint = Math.floor(sortedMonths.length / 2);
        const earlierMonths = sortedMonths.slice(0, halfPoint);
        const recentMonths = sortedMonths.slice(halfPoint);

        const earlierAvg = earlierMonths.reduce((sum, [, amt]) => sum + amt, 0) / (earlierMonths.length || 1);
        const recentAvg = recentMonths.reduce((sum, [, amt]) => sum + amt, 0) / (recentMonths.length || 1);
        
        const trend = earlierAvg > 0 ? ((recentAvg - earlierAvg) / earlierAvg) * 100 : 0;

        // Calculate suggested budget with buffer
        let suggestedBudget = avgMonthly;
        let confidence: 'high' | 'medium' | 'low' = 'medium';
        let reasoning = '';

        // Adjust based on trend and add buffer
        if (trend > 20) {
          suggestedBudget = avgMonthly * 1.25; // 25% buffer for increasing trend
          confidence = 'medium';
          reasoning = `Increasing trend (+${trend.toFixed(1)}%) - added 25% buffer`;
        } else if (trend > 0) {
          suggestedBudget = avgMonthly * 1.15; // 15% buffer for slight increase
          confidence = 'high';
          reasoning = `Slight upward trend (+${trend.toFixed(1)}%) - added 15% buffer`;
        } else if (trend < -20) {
          suggestedBudget = avgMonthly * 1.05; // Minimal buffer for decreasing trend
          confidence = 'high';
          reasoning = `Decreasing trend (${trend.toFixed(1)}%) - minimal 5% buffer`;
        } else {
          suggestedBudget = avgMonthly * 1.1; // Standard 10% buffer
          confidence = 'high';
          reasoning = `Stable spending pattern - standard 10% buffer`;
        }

        // Higher confidence for categories with more data points
        if (monthlyAmounts.length >= 4) {
          // Keep current confidence
        } else if (monthlyAmounts.length >= 2) {
          confidence = confidence === 'high' ? 'medium' : 'low';
          reasoning += ' (limited data)';
        } else {
          confidence = 'low';
          reasoning = 'Very limited data - estimate based on available spending';
        }

        budgetSuggestions.push({
          category: category.name,
          categoryId,
          icon: category.icon,
          color: category.color,
          currentMonthlyAvg: avgMonthly,
          suggestedBudget: Math.round(suggestedBudget),
          confidence,
          reasoning,
          trend,
          hasExistingBudget: existingBudgetCategoryIds.has(categoryId)
        });
      });

      // Sort by spending amount (highest first)
      budgetSuggestions.sort((a, b) => b.currentMonthlyAvg - a.currentMonthlyAvg);

      setSuggestions(budgetSuggestions);
    } catch (error) {
      console.error('Error generating budget suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const createBudgetFromSuggestion = async (suggestion: BudgetSuggestion) => {
    setCreatingBudgets(prev => [...prev, suggestion.categoryId]);
    
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const { error } = await supabase
        .from('monthly_budgets')
        .insert({
          category_id: suggestion.categoryId,
          name: `${suggestion.category} Budget`,
          budgeted_amount: suggestion.suggestedBudget,
          month: currentMonth,
          year: currentYear
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Budget for this category already exists');
        } else {
          throw error;
        }
        return;
      }

      toast.success(`Budget created for ${suggestion.category}!`);
      
      // Update the suggestion to show it has an existing budget
      setSuggestions(prev => 
        prev.map(s => 
          s.categoryId === suggestion.categoryId 
            ? { ...s, hasExistingBudget: true }
            : s
        )
      );
    } catch (error) {
      console.error('Error creating budget:', error);
      toast.error('Failed to create budget');
    } finally {
      setCreatingBudgets(prev => prev.filter(id => id !== suggestion.categoryId));
    }
  };

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Generating Budget Suggestions</CardTitle>
          <CardDescription>Analyzing your spending patterns...</CardDescription>
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
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Smart Budget Suggestions
          </CardTitle>
          <CardDescription>
            AI-powered budget recommendations based on your spending history
          </CardDescription>
        </CardHeader>
        <CardContent>
          {suggestions.length === 0 ? (
            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertDescription>
                Start tracking your expenses to get personalized budget suggestions. 
                The more data you provide, the better our recommendations will be.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {suggestions.map((suggestion) => (
                <div key={suggestion.categoryId} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{suggestion.icon}</span>
                      <div>
                        <h3 className="font-medium">{suggestion.category}</h3>
                        <p className="text-sm text-muted-foreground">
                          Monthly average: ${suggestion.currentMonthlyAvg.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={
                          suggestion.confidence === 'high' ? 'default' : 
                          suggestion.confidence === 'medium' ? 'secondary' : 'outline'
                        }
                      >
                        {suggestion.confidence} confidence
                      </Badge>
                      {suggestion.trend > 0 ? (
                        <TrendingUp className="h-4 w-4 text-destructive" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-success rotate-180" />
                      )}
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Suggested Budget</span>
                      <span className="text-xl font-bold text-primary">
                        ${suggestion.suggestedBudget}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {suggestion.reasoning}
                    </p>
                  </div>

                  <div className="flex justify-between items-center">
                    {suggestion.hasExistingBudget ? (
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">Budget already exists</span>
                      </div>
                    ) : (
                      <Button
                        onClick={() => createBudgetFromSuggestion(suggestion)}
                        disabled={creatingBudgets.includes(suggestion.categoryId)}
                        size="sm"
                      >
                        <Target className="h-4 w-4 mr-2" />
                        {creatingBudgets.includes(suggestion.categoryId) ? 'Creating...' : 'Create Budget'}
                      </Button>
                    )}
                    
                    <div className="text-right text-sm">
                      <p className="text-muted-foreground">
                        {suggestion.suggestedBudget > suggestion.currentMonthlyAvg ? 
                          `+$${(suggestion.suggestedBudget - suggestion.currentMonthlyAvg).toFixed(0)} buffer` :
                          'Conservative estimate'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>How Budget Suggestions Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <DollarSign className="h-8 w-8 text-primary mx-auto mb-2" />
              <h4 className="font-medium mb-2">Analyze Spending</h4>
              <p className="text-sm text-muted-foreground">
                We analyze your last 6 months of spending by category
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
              <h4 className="font-medium mb-2">Identify Trends</h4>
              <p className="text-sm text-muted-foreground">
                We look for increasing, decreasing, or stable spending patterns
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Target className="h-8 w-8 text-primary mx-auto mb-2" />
              <h4 className="font-medium mb-2">Smart Budgets</h4>
              <p className="text-sm text-muted-foreground">
                We suggest realistic budgets with appropriate buffers
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
