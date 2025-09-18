import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

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
  category: Category;
  month: number;
  year: number;
}

interface BudgetFormProps {
  onBudgetAdded: () => void;
}

export const BudgetForm = ({ onBudgetAdded }: BudgetFormProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [budgetName, setBudgetName] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    loadCategories();
    loadBudgets();
  }, [selectedMonth, selectedYear]);

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
      const { data, error } = await supabase
        .from('monthly_budgets')
        .select(`
          id,
          name,
          budgeted_amount,
          month,
          year,
          expense_categories (
            id,
            name,
            color,
            icon
          )
        `)
        .eq('month', parseInt(selectedMonth))
        .eq('year', parseInt(selectedYear))
        .order('name');

      if (error) throw error;

      const formattedBudgets = data.map(budget => ({
        id: budget.id,
        name: budget.name,
        budgeted_amount: Number(budget.budgeted_amount),
        category: budget.expense_categories as Category,
        month: budget.month,
        year: budget.year
      }));

      setBudgets(formattedBudgets);
    } catch (error) {
      console.error('Error loading budgets:', error);
      toast.error('Failed to load budgets');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !budgetName || !budgetAmount) {
      toast.error('Please fill in all fields');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('You must be logged in to add budgets');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('monthly_budgets')
        .insert({
          category_id: selectedCategory,
          name: budgetName,
          budgeted_amount: parseFloat(budgetAmount),
          month: parseInt(selectedMonth),
          year: parseInt(selectedYear),
          user_id: user.id
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('A budget with this name already exists for this month');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Budget added successfully');
      setBudgetName('');
      setBudgetAmount('');
      setSelectedCategory('');
      loadBudgets();
      onBudgetAdded();
    } catch (error) {
      console.error('Error adding budget:', error);
      toast.error('Failed to add budget');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (budget: Budget) => {
    setBudgetToDelete({ id: budget.id, name: budget.name });
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!budgetToDelete) return;
    
    try {
      const { error } = await supabase
        .from('monthly_budgets')
        .delete()
        .eq('id', budgetToDelete.id);

      if (error) throw error;

      toast.success('Budget deleted successfully');
      loadBudgets();
      onBudgetAdded();
    } catch (error) {
      console.error('Error deleting budget:', error);
      toast.error('Failed to delete budget');
    }
  };

  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  const years = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - 2 + i;
    return { value: year.toString(), label: year.toString() };
  });

  return (
    <div className="space-y-6">
      {/* Budget Form */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Add Monthly Budget</CardTitle>
          <CardDescription>Set budget amounts for your monthly expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Month & Year</Label>
                <div className="flex gap-2">
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year.value} value={year.value}>
                          {year.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
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
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budgetName">Budget Name</Label>
                <Input
                  id="budgetName"
                  value={budgetName}
                  onChange={(e) => setBudgetName(e.target.value)}
                  placeholder="e.g., Rent, Groceries, Gas"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budgetAmount">Budget Amount</Label>
                <Input
                  id="budgetAmount"
                  type="number"
                  step="0.01"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              {loading ? 'Adding...' : 'Add Budget'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Budgets List */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>
            Current Budgets - {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
          </CardTitle>
          <CardDescription>Manage your monthly budget allocations</CardDescription>
        </CardHeader>
        <CardContent>
          {budgets.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No budgets set for this month
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgets.map((budget) => (
                  <TableRow key={budget.id}>
                    <TableCell className="font-medium">{budget.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{budget.category.icon}</span>
                        <Badge variant="secondary" style={{ backgroundColor: `${budget.category.color}20` }}>
                          {budget.category.name}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">${budget.budgeted_amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(budget)}
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
      
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Budget"
        description={`Are you sure you want to delete the budget "${budgetToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
};