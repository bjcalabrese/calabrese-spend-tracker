import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface MonthlySpending {
  month: number;
  monthName: string;
  year: number;
  totalSpent: number;
  categoryBreakdown: { [category: string]: number };
}

interface YearlyComparison {
  year: number;
  totalSpent: number;
  monthlyData: MonthlySpending[];
}

export const HistoricalSpending: React.FC = () => {
  const [yearlyData, setYearlyData] = useState<YearlyComparison[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistoricalData();
  }, []);

  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears]);

  const loadHistoricalData = async () => {
    setLoading(true);
    try {
      // Get all expenses with categories
      const { data: expenses, error } = await supabase
        .from('expenses')
        .select(`
          amount,
          expense_date,
          expense_categories (
            name,
            color,
            icon
          )
        `)
        .order('expense_date', { ascending: false });

      if (error) throw error;

      if (!expenses || expenses.length === 0) {
        setLoading(false);
        return;
      }

      // Group expenses by year and month
      const yearlyMap = new Map<number, Map<number, MonthlySpending>>();
      const yearsSet = new Set<number>();

      expenses.forEach((expense) => {
        // Parse date string directly to avoid timezone issues
        const dateParts = expense.expense_date.split('-');
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]);
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        const monthName = monthNames[month - 1];
        const categoryName = expense.expense_categories?.name || 'Uncategorized';
        const amount = Number(expense.amount);

        yearsSet.add(year);

        if (!yearlyMap.has(year)) {
          yearlyMap.set(year, new Map());
        }

        const yearData = yearlyMap.get(year)!;
        
        if (!yearData.has(month)) {
          yearData.set(month, {
            month,
            monthName,
            year,
            totalSpent: 0,
            categoryBreakdown: {}
          });
        }

        const monthData = yearData.get(month)!;
        monthData.totalSpent += amount;
        monthData.categoryBreakdown[categoryName] = (monthData.categoryBreakdown[categoryName] || 0) + amount;
      });

      // Convert to array and sort
      const yearlyArray: YearlyComparison[] = [];
      const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);

      sortedYears.forEach((year) => {
        const yearMap = yearlyMap.get(year)!;
        const monthlyData = Array.from(yearMap.values()).sort((a, b) => a.month - b.month);
        const totalSpent = monthlyData.reduce((sum, month) => sum + month.totalSpent, 0);

        yearlyArray.push({
          year,
          totalSpent,
          monthlyData
        });
      });

      setYearlyData(yearlyArray);
      setAvailableYears(sortedYears);
      
      if (sortedYears.length > 0 && !sortedYears.includes(selectedYear)) {
        setSelectedYear(sortedYears[0]);
      }
    } catch (error) {
      console.error('Error loading historical data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentYearData = () => {
    return yearlyData.find(y => y.year === selectedYear);
  };

  const getPreviousYearData = () => {
    return yearlyData.find(y => y.year === selectedYear - 1);
  };

  const getMonthComparison = (monthNum: number) => {
    const currentYear = getCurrentYearData();
    const previousYear = getPreviousYearData();
    
    const currentMonth = currentYear?.monthlyData.find(m => m.month === monthNum);
    const previousMonth = previousYear?.monthlyData.find(m => m.month === monthNum);
    
    const currentAmount = currentMonth?.totalSpent || 0;
    const previousAmount = previousMonth?.totalSpent || 0;
    
    const change = previousAmount > 0 ? ((currentAmount - previousAmount) / previousAmount) * 100 : 0;
    
    return {
      current: currentAmount,
      previous: previousAmount,
      change,
      hasComparison: previousAmount > 0
    };
  };

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Historical Spending Analysis</CardTitle>
          <CardDescription>Loading your spending history...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  if (yearlyData.length === 0) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Historical Spending Analysis</CardTitle>
          <CardDescription>Track your spending patterns over time</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Start tracking expenses to see your historical spending data
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentYearData = getCurrentYearData();
  const previousYearData = getPreviousYearData();
  const yearOverYearChange = previousYearData && previousYearData.totalSpent > 0 
    ? ((currentYearData?.totalSpent || 0) - previousYearData.totalSpent) / previousYearData.totalSpent * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Year Selector and Summary */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Historical Spending Analysis
          </CardTitle>
          <CardDescription>
            Track your spending patterns and compare year-over-year trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Year:</label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total for {selectedYear}</p>
              <p className="text-2xl font-bold">${currentYearData?.totalSpent.toFixed(2) || '0.00'}</p>
              {previousYearData && (
                <div className="flex items-center justify-end gap-1 mt-1">
                  {yearOverYearChange > 0 ? (
                    <TrendingUp className="h-4 w-4 text-destructive" />
                  ) : yearOverYearChange < 0 ? (
                    <TrendingDown className="h-4 w-4 text-success" />
                  ) : null}
                  <span className={`text-sm ${yearOverYearChange > 0 ? 'text-destructive' : yearOverYearChange < 0 ? 'text-success' : 'text-muted-foreground'}`}>
                    {yearOverYearChange > 0 ? '+' : ''}{yearOverYearChange.toFixed(1)}% vs {selectedYear - 1}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Breakdown Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Monthly Breakdown - {selectedYear}</CardTitle>
          <CardDescription>
            Detailed month-by-month spending with year-over-year comparisons
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">{selectedYear} Spending</TableHead>
                {previousYearData && (
                  <>
                    <TableHead className="text-right">{selectedYear - 1} Spending</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                  </>
                )}
                <TableHead className="text-right">Categories</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 12 }, (_, i) => {
                const monthNum = i + 1;
                const monthName = new Date(selectedYear, i, 1).toLocaleDateString('en-US', { month: 'long' });
                const monthData = currentYearData?.monthlyData.find(m => m.month === monthNum);
                const comparison = getMonthComparison(monthNum);
                
                return (
                  <TableRow key={monthNum}>
                    <TableCell className="font-medium">{monthName}</TableCell>
                    <TableCell className="text-right font-mono">
                      ${comparison.current.toFixed(2)}
                    </TableCell>
                    {previousYearData && (
                      <>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          ${comparison.previous.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {comparison.hasComparison ? (
                            <div className="flex items-center justify-end gap-1">
                              {comparison.change > 0 ? (
                                <TrendingUp className="h-3 w-3 text-destructive" />
                              ) : comparison.change < 0 ? (
                                <TrendingDown className="h-3 w-3 text-success" />
                              ) : null}
                              <span className={`text-xs ${comparison.change > 0 ? 'text-destructive' : comparison.change < 0 ? 'text-success' : 'text-muted-foreground'}`}>
                                {comparison.change > 0 ? '+' : ''}{comparison.change.toFixed(1)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </>
                    )}
                    <TableCell className="text-right">
                      {monthData ? (
                        <div className="flex flex-wrap gap-1 justify-end">
                          {Object.entries(monthData.categoryBreakdown)
                            .sort(([,a], [,b]) => b - a)
                            .slice(0, 3)
                            .map(([category, amount]) => (
                              <Badge key={category} variant="secondary" className="text-xs">
                                {category}: ${amount.toFixed(0)}
                              </Badge>
                            ))}
                          {Object.keys(monthData.categoryBreakdown).length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{Object.keys(monthData.categoryBreakdown).length - 3} more
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">No expenses</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Year Comparison Summary */}
      {availableYears.length > 1 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Year-over-Year Summary
            </CardTitle>
            <CardDescription>Compare total spending across different years</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Total Spending</TableHead>
                  <TableHead className="text-right">Average Monthly</TableHead>
                  <TableHead className="text-right">Change from Previous</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {yearlyData.map((year, index) => {
                  const previousYear = yearlyData[index + 1];
                  const change = previousYear && previousYear.totalSpent > 0 
                    ? ((year.totalSpent - previousYear.totalSpent) / previousYear.totalSpent) * 100 
                    : 0;
                  const avgMonthly = year.totalSpent / 12;

                  return (
                    <TableRow key={year.year}>
                      <TableCell className="font-medium">{year.year}</TableCell>
                      <TableCell className="text-right font-mono">${year.totalSpent.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono">${avgMonthly.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {previousYear ? (
                          <div className="flex items-center justify-end gap-1">
                            {change > 0 ? (
                              <TrendingUp className="h-4 w-4 text-destructive" />
                            ) : change < 0 ? (
                              <TrendingDown className="h-4 w-4 text-success" />
                            ) : null}
                            <span className={`${change > 0 ? 'text-destructive' : change < 0 ? 'text-success' : 'text-muted-foreground'}`}>
                              {change > 0 ? '+' : ''}{change.toFixed(1)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};