import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, Trash2, Eye, CalendarIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Expense {
  id: string;
  name: string;
  amount: number;
  expense_date: string;
  notes?: string;
  category: {
    name: string;
    icon: string;
    color: string;
  };
}

interface RecentExpensesProps {
  onExpenseDeleted?: () => void;
}

export const RecentExpenses = ({ onExpenseDeleted }: RecentExpensesProps) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Default to current month
  const currentDate = new Date();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  const [dateFrom, setDateFrom] = useState<Date>(firstDayOfMonth);
  const [dateTo, setDateTo] = useState<Date>(lastDayOfMonth);

  useEffect(() => {
    loadExpenses();
  }, [dateFrom, dateTo]);

  const loadExpenses = async () => {
    try {
      const fromDate = format(dateFrom, 'yyyy-MM-dd');
      const toDate = format(dateTo, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          id,
          name,
          amount,
          expense_date,
          notes,
          expense_categories (
            name,
            icon,
            color
          )
        `)
        .gte('expense_date', fromDate)
        .lte('expense_date', toDate)
        .order('expense_date', { ascending: false });

      if (error) throw error;

      const formattedExpenses = data?.map((expense: any) => ({
        ...expense,
        category: expense.expense_categories
      })) || [];

      setExpenses(formattedExpenses);
    } catch (error) {
      console.error('Error loading expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (expenseId: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      toast.success('Expense deleted successfully');
      loadExpenses();
      onExpenseDeleted?.();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          View Expenses
        </CardTitle>
        <CardDescription>
          Filter and view your expenses by date range
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Date Range Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
          <div className="space-y-2">
            <Label>From Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dateFrom}
                  onSelect={(date) => date && setDateFrom(date)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="space-y-2">
            <Label>To Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dateTo}
                  onSelect={(date) => date && setDateTo(date)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex items-end">
            <Button 
              onClick={() => {
                const currentDate = new Date();
                const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
                setDateFrom(firstDay);
                setDateTo(lastDay);
              }}
              variant="outline"
            >
              Current Month
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading expenses...</div>
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No expenses found for the selected date range</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting the date range or add expenses for this period
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {expense.expense_date}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{expense.name}</p>
                      {expense.notes && (
                        <p className="text-sm text-muted-foreground">{expense.notes}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{expense.category.icon}</span>
                      <Badge variant="secondary" style={{ backgroundColor: `${expense.category.color}20` }}>
                        {expense.category.name}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-destructive">
                    -${expense.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(expense.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};