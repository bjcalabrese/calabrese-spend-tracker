import { useState } from 'react';
import { IncomeOverview } from '@/components/IncomeOverview';
import { AccountOverview } from '@/components/AccountOverview';
import { BudgetFlowDashboard } from '@/components/BudgetFlowDashboard';
import { BudgetOverview } from '@/components/BudgetOverview';

export const Dashboard = () => {
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Financial Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Complete overview of your income, budget allocations, and spending - Updated
        </p>
      </div>

      {/* Top Row - Income and Accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <IncomeOverview onAddIncome={() => setShowIncomeModal(true)} />
        <AccountOverview onAddAccount={() => setShowAccountModal(true)} />
      </div>

      {/* Middle Row - Budget Flow Analysis */}
      <div className="mb-6">
        <BudgetFlowDashboard />
      </div>

      {/* Bottom Row - Budget Details */}
      <div className="mb-6">
        <BudgetOverview onStatsUpdate={() => {}} />
      </div>
    </div>
  );
};