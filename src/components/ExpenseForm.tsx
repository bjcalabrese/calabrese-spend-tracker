import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface Budget {
  id: string;
  name: string;
  budgeted_amount: number;
}

interface Expense {
  id: string;
  name: string;
  amount: number;
  expense_date: string;
  notes: string | null;
  category: Category;
  budget: Budget | null;
}

interface ExpenseFormProps {
  onExpenseAdded: () => void;
}

export const ExpenseForm = ({ onExpenseAdded }: ExpenseFormProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBudget, setSelectedBudget] = useState('');
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseNotes, setExpenseNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCategories();
    loadBudgets();
    loadExpenses();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadBudgetsForCategory(selectedCategory);
    }
  }, [selectedCategory]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const loadBudgets = async () => {
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const { data, error } = await supabase
        .from('monthly_budgets')
        .select('id, name, budgeted_amount')
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .order('name');

      if (error) throw error;
      setBudgets(data);
    } catch (error) {
      console.error('Error loading budgets:', error);
    }
  };

  const loadBudgetsForCategory = async (categoryId: string) => {
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const { data, error } = await supabase
        .from('monthly_budgets')
        .select('id, name, budgeted_amount')
        .eq('category_id', categoryId)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .order('name');

      if (error) throw error;
      setBudgets(data);
      setSelectedBudget(''); // Reset budget selection when category changes
    } catch (error) {
      console.error('Error loading budgets for category:', error);
    }
  };

  const loadExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          id,
          name,
          amount,
          expense_date,
          notes,
          expense_categories (
            id,
            name,
            color,
            icon
          ),
          monthly_budgets (
            id,
            name,
            budgeted_amount
          )
        `)
        .order('expense_date', { ascending: false })
        .limit(20);

      if (error) throw error;

      const formattedExpenses = data.map(expense => ({
        id: expense.id,
        name: expense.name,
        amount: Number(expense.amount),
        expense_date: expense.expense_date,
        notes: expense.notes,
        category: expense.expense_categories as Category,
        budget: expense.monthly_budgets as Budget | null
      }));

      setExpenses(formattedExpenses);
    } catch (error) {
      console.error('Error loading expenses:', error);
      toast.error('Failed to load expenses');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !expenseName || !expenseAmount) {
      toast.error('Please fill in required fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('expenses')
        .insert({
          category_id: selectedCategory,
          budget_id: selectedBudget || null,
          name: expenseName,
          amount: parseFloat(expenseAmount),
          expense_date: expenseDate,
          notes: expenseNotes || null
        });

      if (error) throw error;

      toast.success('Expense added successfully');
      setExpenseName('');
      setExpenseAmount('');
      setExpenseNotes('');
      setSelectedCategory('');
      setSelectedBudget('');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      loadExpenses();
      onExpenseAdded();
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Failed to add expense');
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
      onExpenseAdded();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  return (
    <div className="space-y-6">
      {/* Expense Form */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Add Expense</CardTitle>
          <CardDescription>Record your actual spending and payments</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <span>{category.icon}</span>
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Budget (Optional)</Label>
                <Select value={selectedBudget} onValueChange={setSelectedBudget}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select budget" />
                  </SelectTrigger>
                  <SelectContent>
                    {budgets.map((budget) => (
                      <SelectItem key={budget.id} value={budget.id}>
                        {budget.name} (${budget.budgeted_amount})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expenseName">Expense Name *</Label>
                <Input
                  id="expenseName"
                  value={expenseName}
                  onChange={(e) => setExpenseName(e.target.value)}
                  placeholder="e.g., Grocery shopping, Gas station"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expenseAmount">Amount *</Label>
                <Input
                  id="expenseAmount"
                  type="number"
                  step="0.01"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expenseDate">Date</Label>
                <Input
                  id="expenseDate"
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expenseNotes">Notes (Optional)</Label>
                <Textarea
                  id="expenseNotes"
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  placeholder="Additional details..."
                  rows={1}
                />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              {loading ? 'Adding...' : 'Add Expense'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Recent Expenses */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
          <CardDescription>Your latest recorded expenses</CardDescription>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No expenses recorded yet
            </p>
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
                        {new Date(expense.expense_date).toLocaleDateString()}
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
    </div>
  );
};