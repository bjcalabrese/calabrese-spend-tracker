import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Download, Upload, Database, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { toast } from 'sonner';

interface BackupData {
  profiles: any[]
  income: any[]
  expenses: any[]
  expense_categories: any[]
  monthly_budgets: any[]
  accounts: any[]
  backup_date: string
  app_version: string
}

interface RestoreResults {
  profiles: number
  income: number
  expenses: number
  expense_categories: number
  monthly_budgets: number
  accounts: number
  errors: string[]
}

export const BackupRestore: React.FC = () => {
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreResults, setRestoreResults] = useState<RestoreResults | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('backup-data');
      
      if (error) throw error;

      // Create and download the backup file
      const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `financial-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Backup created and downloaded successfully!');
    } catch (error: any) {
      console.error('Backup error:', error);
      toast.error(`Backup failed: ${error.message}`);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        toast.error('Please select a valid JSON backup file');
        return;
      }
      setRestoreFile(file);
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) {
      toast.error('Please select a backup file first');
      return;
    }

    setRestoreLoading(true);
    setRestoreResults(null);

    try {
      // Read and parse the backup file
      const fileContent = await restoreFile.text();
      const backupData: BackupData = JSON.parse(fileContent);

      // Validate backup structure
      if (!backupData.backup_date || !backupData.app_version) {
        throw new Error('Invalid backup file format');
      }

      const { data, error } = await supabase.functions.invoke('restore-data', {
        body: backupData
      });

      if (error) throw error;

      if (data.success) {
        setRestoreResults(data.results);
        toast.success('Data restored successfully!');
      } else {
        throw new Error(data.error || 'Restore failed');
      }

    } catch (error: any) {
      console.error('Restore error:', error);
      toast.error(`Restore failed: ${error.message}`);
    } finally {
      setRestoreLoading(false);
    }
  };

  const formatResults = (results: RestoreResults) => {
    const items = [
      { label: 'Profiles', count: results.profiles },
      { label: 'Income entries', count: results.income },
      { label: 'Expenses', count: results.expenses },
      { label: 'Categories', count: results.expense_categories },
      { label: 'Budgets', count: results.monthly_budgets },
      { label: 'Accounts', count: results.accounts },
    ].filter(item => item.count > 0);

    return items.map(item => `${item.count} ${item.label}`).join(', ');
  };

  return (
    <div className="space-y-6">
      {/* Backup Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Backup Your Data</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Create a complete backup of all your financial data including income, expenses, budgets, and categories.
        </p>
        <Button 
          onClick={handleBackup} 
          disabled={backupLoading}
          className="w-full"
        >
          {backupLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Creating Backup...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Download Backup
            </>
          )}
        </Button>
      </div>

      {/* Restore Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Restore Your Data</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Upload a backup file to restore your financial data. This will add the data to your current account.
        </p>
        
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> Restoring data will add new entries to your existing data. 
            It won't delete your current data, but may create duplicates if you restore the same backup multiple times.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="backup-file">Select Backup File</Label>
          <Input
            id="backup-file"
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            disabled={restoreLoading}
          />
        </div>

        <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              disabled={!restoreFile || restoreLoading}
              className="w-full"
              onClick={() => setShowRestoreDialog(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Restore Data
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Data Restore</DialogTitle>
              <DialogDescription>
                Are you sure you want to restore data from this backup file? 
                This will add new entries to your existing data.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {restoreFile && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm">
                    <strong>File:</strong> {restoreFile.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <strong>Size:</strong> {(restoreFile.size / 1024).toFixed(2)} KB
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowRestoreDialog(false)}
                  variant="outline"
                  disabled={restoreLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    await handleRestore();
                    setShowRestoreDialog(false);
                  }}
                  disabled={restoreLoading}
                  className="flex-1"
                >
                  {restoreLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Restoring...
                    </>
                  ) : (
                    'Confirm Restore'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Restore Results */}
      {restoreResults && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <strong>Restore completed successfully!</strong>
              <div className="text-sm">
                Restored: {formatResults(restoreResults)}
              </div>
              {restoreResults.errors.length > 0 && (
                <div className="text-sm text-destructive">
                  <strong>Warnings:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {restoreResults.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};