import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { DateRangeNavigation } from '@/components/DateRangeNavigation';

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<{ id: string; name: string } | null>(null);
  
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

  const handleDeleteClick = (expense: Expense) => {
    setExpenseToDelete({ id: expense.id, name: expense.name });
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!expenseToDelete) return;
    
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseToDelete.id);

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
        <DateRangeNavigation
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
        />

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
                      onClick={() => handleDeleteClick(expense)}
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
      
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Expense"
        description={`Are you sure you want to delete the expense "${expenseToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </Card>
  );
};