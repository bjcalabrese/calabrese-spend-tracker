import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthPage } from '@/components/AuthPage';
import { Dashboard } from '@/components/Dashboard';

const Index: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <Dashboard />;
};

export default Index;
