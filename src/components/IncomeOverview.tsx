import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Income {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  account_id: string;
  income_date: string;
  is_recurring: boolean;
  account?: {
    name: string;
    account_type: string;
  };
}

interface IncomeOverviewProps {
  onAddIncome: () => void;
}

export const IncomeOverview = ({ onAddIncome }: IncomeOverviewProps) => {
  const [income, setIncome] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIncome();
  }, []);

  const loadIncome = async () => {
    try {
      const { data, error } = await supabase
        .from('income')
        .select(`
          id,
          name,
          amount,
          frequency,
          account_id,
          income_date,
          is_recurring,
          accounts (
            name,
            account_type
          )
        `)
        .order('amount', { ascending: false });

      if (error) throw error;
      setIncome(data || []);
    } catch (error) {
      console.error('Error loading income:', error);
    } finally {
      setLoading(false);
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

  const totalMonthlyIncome = income.reduce((sum, item) => 
    sum + calculateMonthlyAmount(Number(item.amount), item.frequency), 0
  );

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Monthly Income</CardTitle>
          <CardDescription>Loading income sources...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-success">Monthly Income</CardTitle>
          <CardDescription>Total expected income this month</CardDescription>
        </div>
        <Button onClick={onAddIncome} size="sm" className="flex items-center gap-1">
          <Plus className="h-4 w-4" />
          Add Income
        </Button>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-success mb-4">
          ${totalMonthlyIncome.toFixed(2)}
        </div>
        
        {income.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No income sources configured. Add your salary and other income sources.
          </p>
        ) : (
          <div className="space-y-3">
            {income.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.account?.name} • {item.account?.account_type}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${calculateMonthlyAmount(Number(item.amount), item.frequency).toFixed(2)}/mo</p>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">
                      {item.frequency}
                    </Badge>
                    {item.is_recurring && (
                      <Badge variant="secondary" className="text-xs">
                        Recurring
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};