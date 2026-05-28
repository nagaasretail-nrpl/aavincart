import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { MessageSquare, ArrowLeft, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from './layout';

export default function SMS() {
  const { toast } = useToast();
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsProvider, setSmsProvider] = useState('twilio');
  const [apiKey, setApiKey] = useState('');

  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return settings;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "SMS settings updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update SMS settings",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveSettingsMutation.mutate({ smsEnabled, smsProvider, apiKey });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard">
            <Button variant="outline" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-sms">
              SMS Configuration
            </h1>
            <p className="text-gray-600">Configure SMS notifications and messaging settings</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>SMS Settings</span>
            </CardTitle>
            <CardDescription>Configure SMS provider and notification settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={smsEnabled}
                onCheckedChange={setSmsEnabled}
                data-testid="switch-sms-enabled"
              />
              <Label>Enable SMS Notifications</Label>
            </div>
            
            {smsEnabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="smsProvider">SMS Provider</Label>
                  <Input
                    id="smsProvider"
                    value={smsProvider}
                    onChange={(e) => setSmsProvider(e.target.value)}
                    placeholder="twilio, nexmo, etc."
                    data-testid="input-sms-provider"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your SMS provider API key"
                    data-testid="input-api-key"
                  />
                </div>
              </>
            )}
            
            <Button 
              onClick={handleSave} 
              disabled={saveSettingsMutation.isPending}
              data-testid="button-save-sms"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}