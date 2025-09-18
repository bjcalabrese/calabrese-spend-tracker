import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Wallet, PiggyBank, CreditCard, TrendingUp } from 'lucide-react';

interface Account {
  id: string;
  name: string;
  account_type: string;
  balance: number;
  is_active: boolean;
}

interface AccountOverviewProps {
  onAddAccount: () => void;
}

export const AccountOverview = ({ onAddAccount }: AccountOverviewProps) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_active', true)
        .order('balance', { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAccountIcon = (accountType: string) => {
    switch (accountType) {
      case 'savings': return PiggyBank;
      case 'credit': return CreditCard;
      case 'investment': return TrendingUp;
      default: return Wallet; // checking
    }
  };

  const getAccountColor = (accountType: string) => {
    switch (accountType) {
      case 'savings': return 'text-success';
      case 'credit': return 'text-destructive';
      case 'investment': return 'text-primary';
      default: return 'text-muted-foreground'; // checking
    }
  };

  const totalBalance = accounts.reduce((sum, account) => sum + Number(account.balance), 0);

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Account Balances</CardTitle>
          <CardDescription>Loading account information...</CardDescription>
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
          <CardTitle>Account Balances</CardTitle>
          <CardDescription>Your current account balances</CardDescription>
        </div>
        <Button onClick={onAddAccount} size="sm" className="flex items-center gap-1">
          <Plus className="h-4 w-4" />
          Add Account
        </Button>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold mb-4">
          Total: ${totalBalance.toFixed(2)}
        </div>
        
        {accounts.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No accounts configured. Add your checking, savings, and other accounts.
          </p>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => {
              const IconComponent = getAccountIcon(account.account_type);
              const iconColor = getAccountColor(account.account_type);
              
              return (
                <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <IconComponent className={`h-5 w-5 ${iconColor}`} />
                    <div>
                      <p className="font-medium">{account.name}</p>
                      <Badge variant="outline" className="text-xs capitalize">
                        {account.account_type}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${Number(account.balance) < 0 ? 'text-destructive' : ''}`}>
                      ${Number(account.balance).toFixed(2)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};