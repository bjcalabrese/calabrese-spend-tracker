import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

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
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    frequency: 'monthly',
    income_date: new Date().toISOString().split('T')[0] // Default to current date
  });

  useEffect(() => {
    loadIncomes();
  }, []);

  const loadIncomes = async () => {
    try {
      const { data, error } = await supabase
        .from('income')
        .select('*')
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

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('income')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Income source deleted');
      loadIncomes();
    } catch (error) {
      console.error('Error deleting income:', error);
      toast.error('Failed to delete income source');
    }
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
            ${totalMonthlyIncome.toFixed(2)}
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
          <CardDescription>Your current income sources</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading income sources...</div>
          ) : incomes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No income sources added yet. Add your first income source above.
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
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomes.map((income) => (
                  <TableRow key={income.id}>
                    <TableCell className="font-medium">{income.name}</TableCell>
                    <TableCell>${Number(income.amount).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {income.frequency}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(income.income_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-semibold text-success">
                      ${calculateMonthlyAmount(Number(income.amount), income.frequency).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(income.id)}
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