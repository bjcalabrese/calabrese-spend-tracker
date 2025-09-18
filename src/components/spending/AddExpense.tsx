import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface Budget {
  id: string;
  name: string;
  budgeted_amount: number;
  month: number;
  year: number;
}

interface AddExpenseProps {
  onExpenseAdded?: () => void;
}

export const AddExpense = ({ onExpenseAdded }: AddExpenseProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
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
  }, [expenseDate]);

  useEffect(() => {
    if (selectedCategory) {
      loadBudgetsForCategory(selectedCategory);
    }
  }, [selectedCategory, expenseDate]);

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
      const expDate = new Date(expenseDate);
      const month = expDate.getMonth() + 1;
      const year = expDate.getFullYear();

      const { data, error } = await supabase
        .from('monthly_budgets')
        .select('*')
        .eq('month', month)
        .eq('year', year)
        .order('name');

      if (error) throw error;
      setBudgets(data || []);
    } catch (error) {
      console.error('Error loading budgets:', error);
      toast.error('Failed to load budgets');
    }
  };

  const loadBudgetsForCategory = async (categoryId: string) => {
    try {
      const expDate = new Date(expenseDate);
      const month = expDate.getMonth() + 1;
      const year = expDate.getFullYear();

      const { data, error } = await supabase
        .from('monthly_budgets')
        .select('*')
        .eq('category_id', categoryId)
        .eq('month', month)
        .eq('year', year)
        .order('name');

      if (error) throw error;
      setBudgets(data || []);
    } catch (error) {
      console.error('Error loading budgets for category:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !expenseName || !expenseAmount) {
      toast.error('Please fill in required fields');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('You must be logged in to add expenses');
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
          notes: expenseNotes || null,
          user_id: user.id
        });

      if (error) throw error;

      toast.success('Expense added successfully');
      setExpenseName('');
      setExpenseAmount('');
      setExpenseNotes('');
      setSelectedCategory('');
      setSelectedBudget('');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      onExpenseAdded?.();
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-primary" />
          Add New Expense
        </CardTitle>
        <CardDescription>
          Record a new expense and categorize it for better tracking
        </CardDescription>
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
  );
};