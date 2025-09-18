import { AccountSettings } from '@/components/AccountSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Settings = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account and application preferences
        </p>
      </div>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <AccountSettings />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};