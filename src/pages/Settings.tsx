import { AccountSettings } from '@/components/AccountSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BackupRestore } from '@/components/BackupRestore';

export const Settings = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account and application preferences
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <AccountSettings />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
          </CardHeader>
          <CardContent>
            <BackupRestore />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};