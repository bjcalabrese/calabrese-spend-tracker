import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit3, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { DateRangeNavigation } from '@/components/DateRangeNavigation';
import { format } from 'date-fns';

interface Income {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  income_date: string;
  is_recurring: boolean;
}

export const Income = () => {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Income>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState<{ id: string; name: string } | null>(null);
  
  // Default to current month for date filtering
  const currentDate = new Date();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  const [dateFrom, setDateFrom] = useState<Date>(firstDayOfMonth);
  const [dateTo, setDateTo] = useState<Date>(lastDayOfMonth);
  
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    frequency: 'monthly',
    income_date: new Date().toISOString().split('T')[0] // Default to current date
  });

  useEffect(() => {
    loadIncomes();
  }, [dateFrom, dateTo]);

  const loadIncomes = async () => {
    try {
      const fromDate = format(dateFrom, 'yyyy-MM-dd');
      const toDate = format(dateTo, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('income')
        .select('*')
        .gte('income_date', fromDate)
        .lte('income_date', toDate)
        .order('income_date', { ascending: false });

      if (error) throw error;
      setIncomes(data || []);
    } catch (error) {
      console.error('Error loading incomes:', error);
      toast.error('Failed to load income sources');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.amount) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('income')
        .insert([{
          user_id: user.id,
          name: formData.name.trim(),
          amount: parseFloat(formData.amount),
          frequency: formData.frequency,
          income_date: formData.income_date,
          is_recurring: true
        }]);

      if (error) throw error;
      
      toast.success('Income source added successfully');
      setFormData({ name: '', amount: '', frequency: 'monthly', income_date: new Date().toISOString().split('T')[0] });
      loadIncomes();
    } catch (error) {
      console.error('Error adding income:', error);
      toast.error('Failed to add income source');
    }
  };

  const handleDeleteClick = (income: Income) => {
    setIncomeToDelete({ id: income.id, name: income.name });
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!incomeToDelete) return;
    
    try {
      const { error } = await supabase
        .from('income')
        .delete()
        .eq('id', incomeToDelete.id);

      if (error) throw error;
      
      toast.success('Income source deleted');
      loadIncomes();
    } catch (error) {
      console.error('Error deleting income:', error);
      toast.error('Failed to delete income source');
    }
  };

  const handleEdit = (income: Income) => {
    setEditingId(income.id);
    setEditData({
      name: income.name,
      amount: income.amount,
      frequency: income.frequency,
      income_date: income.income_date
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editData.name || !editData.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('income')
        .update({
          name: editData.name,
          amount: parseFloat(editData.amount.toString()),
          frequency: editData.frequency,
          income_date: editData.income_date
        })
        .eq('id', editingId);

      if (error) throw error;
      
      toast.success('Income updated successfully');
      setEditingId(null);
      setEditData({});
      loadIncomes();
    } catch (error) {
      console.error('Error updating income:', error);
      toast.error('Failed to update income');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const formatDateForDisplay = (dateString: string) => {
    // Parse the date string as local date to avoid timezone issues
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const calculateMonthlyAmount = (amount: number, frequency: string) => {
    switch (frequency) {
      case 'weekly': return amount * 4.33;
      case 'biweekly': return amount * 2.17;
      case 'annual': return amount / 12;
      default: return amount; // monthly
    }
  };

  const totalMonthlyIncome = incomes.reduce((sum, income) => 
    sum + calculateMonthlyAmount(Number(income.amount), income.frequency), 0
  );

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Income Management</h1>
        <p className="text-muted-foreground mt-2">
          Track your salary and other income sources
        </p>
      </div>

      {/* Summary Card */}
      <Card className="shadow-card mb-6">
        <CardHeader>
          <CardTitle className="text-success">Total Monthly Income</CardTitle>
          <CardDescription>Combined income from all sources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-success">
            {formatCurrency(totalMonthlyIncome)}
          </div>
        </CardContent>
      </Card>

      {/* Add Income Form */}
      <Card className="shadow-card mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Income Source
          </CardTitle>
          <CardDescription>
            Add salary, freelance work, or other regular income
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="name">Income Source</Label>
                <Input
                  id="name"
                  placeholder="e.g., Salary, Freelance"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="frequency">Frequency</Label>
                <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="income_date">Date</Label>
                <Input
                  id="income_date"
                  type="date"
                  value={formData.income_date}
                  onChange={(e) => setFormData({ ...formData, income_date: e.target.value })}
                />
              </div>
            </div>
            <Button type="submit" className="w-full md:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Income
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Income List */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Income Sources</CardTitle>
          <CardDescription>Filter and view your income sources by date range</CardDescription>
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
            <div className="text-center py-4">Loading income sources...</div>
          ) : incomes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No income sources found for the selected date range. Try adjusting the date range or add income sources for this period.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Monthly Equivalent</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomes.map((income) => (
                  <TableRow key={income.id}>
                    <TableCell className="font-medium">
                      {editingId === income.id ? (
                        <Input
                          value={editData.name || ''}
                          onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                          className="h-8"
                        />
                      ) : (
                        income.name
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === income.id ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={editData.amount || ''}
                          onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) || 0 })}
                          className="h-8 w-24"
                        />
                      ) : (
                        formatCurrency(Number(income.amount))
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === income.id ? (
                        <Select 
                          value={editData.frequency || income.frequency} 
                          onValueChange={(value) => setEditData({ ...editData, frequency: value })}
                        >
                          <SelectTrigger className="h-8 w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="biweekly">Bi-weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="annual">Annual</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="capitalize">
                          {income.frequency}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === income.id ? (
                        <Input
                          type="date"
                          value={editData.income_date || ''}
                          onChange={(e) => setEditData({ ...editData, income_date: e.target.value })}
                          className="h-8"
                        />
                      ) : (
                        formatDateForDisplay(income.income_date)
                      )}
                    </TableCell>
                    <TableCell className="font-semibold text-success">
                      {formatCurrency(calculateMonthlyAmount(
                        Number(editingId === income.id ? editData.amount || income.amount : income.amount), 
                        editingId === income.id ? editData.frequency || income.frequency : income.frequency
                      ))}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {editingId === income.id ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleSaveEdit}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCancelEdit}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(income)}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteClick(income)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
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
        title="Delete Income Source"
        description={`Are you sure you want to delete the income source "${incomeToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
};