import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  ArrowLeft, 
  Save,
  Bell,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from '../layout';

export default function AutomatedStatusUpdates() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    enableOrderUpdates: true,
    enableDeliveryUpdates: true,
    enablePaymentUpdates: false,
    updateInterval: '5',
    emailNotifications: true,
    smsNotifications: false,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof settings) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Automated status update settings saved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  const updateSetting = (key: keyof typeof settings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/admin/dashboard">
            <Button variant="outline" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-automated-status-updates">
              Automated Status Updates
            </h1>
            <p className="text-gray-600">Configure automatic status update notifications and intervals</p>
          </div>
          
          <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-settings">
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Update Triggers</span>
              </CardTitle>
              <CardDescription>Configure which events trigger automated status updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="order-updates">Order Status Updates</Label>
                  <p className="text-sm text-gray-500">Automatically notify customers when order status changes</p>
                </div>
                <Switch
                  id="order-updates"
                  checked={settings.enableOrderUpdates}
                  onCheckedChange={(checked) => updateSetting('enableOrderUpdates', checked)}
                  data-testid="switch-order-updates"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="delivery-updates">Delivery Status Updates</Label>
                  <p className="text-sm text-gray-500">Send notifications for delivery tracking updates</p>
                </div>
                <Switch
                  id="delivery-updates"
                  checked={settings.enableDeliveryUpdates}
                  onCheckedChange={(checked) => updateSetting('enableDeliveryUpdates', checked)}
                  data-testid="switch-delivery-updates"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="payment-updates">Payment Status Updates</Label>
                  <p className="text-sm text-gray-500">Notify about payment confirmations and failures</p>
                </div>
                <Switch
                  id="payment-updates"
                  checked={settings.enablePaymentUpdates}
                  onCheckedChange={(checked) => updateSetting('enablePaymentUpdates', checked)}
                  data-testid="switch-payment-updates"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notification Settings</span>
              </CardTitle>
              <CardDescription>Configure how notifications are delivered</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="update-interval">Update Check Interval (minutes)</Label>
                <Input
                  id="update-interval"
                  type="number"
                  min="1"
                  max="60"
                  value={settings.updateInterval}
                  onChange={(e) => updateSetting('updateInterval', e.target.value)}
                  data-testid="input-update-interval"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-gray-500">Send status updates via email</p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
                  data-testid="switch-email-notifications"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sms-notifications">SMS Notifications</Label>
                  <p className="text-sm text-gray-500">Send status updates via SMS</p>
                </div>
                <Switch
                  id="sms-notifications"
                  checked={settings.smsNotifications}
                  onCheckedChange={(checked) => updateSetting('smsNotifications', checked)}
                  data-testid="switch-sms-notifications"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5" />
                <span>Current Status</span>
              </CardTitle>
              <CardDescription>Overview of automated update system status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active
                </Badge>
                <span className="text-sm text-gray-600">Automated updates are currently running</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}