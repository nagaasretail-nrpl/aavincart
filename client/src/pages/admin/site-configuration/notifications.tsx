import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  ArrowLeft, 
  Save,
  Mail,
  MessageSquare,
  Smartphone,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from '../layout';

export default function Notifications() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    emailNotifications: {
      enabled: true,
      newOrderNotifications: true,
      orderStatusUpdates: true,
      merchantRegistrations: true,
      paymentNotifications: false,
      fromEmail: 'noreply@aavincart.com',
      fromName: 'Aavincart',
    },
    smsNotifications: {
      enabled: false,
      newOrderNotifications: false,
      deliveryUpdates: false,
      provider: 'twilio',
      apiKey: '',
    },
    pushNotifications: {
      enabled: true,
      orderUpdates: true,
      promotions: false,
      newMessages: true,
      firebase_key: '',
    },
    templates: {
      orderConfirmation: 'Your order #{{order_id}} has been confirmed.',
      orderReady: 'Your order #{{order_id}} is ready for pickup/delivery.',
      orderDelivered: 'Your order #{{order_id}} has been delivered.',
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof settings) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Notification settings saved successfully",
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

  const updateEmailSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      emailNotifications: { ...prev.emailNotifications, [key]: value }
    }));
  };

  const updateSmsSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      smsNotifications: { ...prev.smsNotifications, [key]: value }
    }));
  };

  const updatePushSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      pushNotifications: { ...prev.pushNotifications, [key]: value }
    }));
  };

  const updateTemplate = (key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      templates: { ...prev.templates, [key]: value }
    }));
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
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-notifications">
              Notifications
            </h1>
            <p className="text-gray-600">Configure notification settings and templates</p>
          </div>
          
          <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-settings">
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>

        <Tabs defaultValue="email" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="sms">SMS</TabsTrigger>
            <TabsTrigger value="push">Push</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>
          
          <TabsContent value="email" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="h-5 w-5" />
                  <span>Email Notifications</span>
                </CardTitle>
                <CardDescription>Configure email notification settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email-enabled">Enable Email Notifications</Label>
                    <p className="text-sm text-gray-500">Send notifications via email</p>
                  </div>
                  <Switch
                    id="email-enabled"
                    checked={settings.emailNotifications.enabled}
                    onCheckedChange={(checked) => updateEmailSetting('enabled', checked)}
                    data-testid="switch-email-enabled"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="from-email">From Email</Label>
                    <Input
                      id="from-email"
                      type="email"
                      value={settings.emailNotifications.fromEmail}
                      onChange={(e) => updateEmailSetting('fromEmail', e.target.value)}
                      data-testid="input-from-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="from-name">From Name</Label>
                    <Input
                      id="from-name"
                      value={settings.emailNotifications.fromName}
                      onChange={(e) => updateEmailSetting('fromName', e.target.value)}
                      data-testid="input-from-name"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Notification Types</h4>
                  {[
                    { key: 'newOrderNotifications', label: 'New Order Notifications' },
                    { key: 'orderStatusUpdates', label: 'Order Status Updates' },
                    { key: 'merchantRegistrations', label: 'Union Registrations' },
                    { key: 'paymentNotifications', label: 'Payment Notifications' },
                  ].map((type) => (
                    <div key={type.key} className="flex items-center justify-between">
                      <Label htmlFor={type.key}>{type.label}</Label>
                      <Switch
                        id={type.key}
                        checked={settings.emailNotifications[type.key as keyof typeof settings.emailNotifications] as boolean}
                        onCheckedChange={(checked) => updateEmailSetting(type.key, checked)}
                        data-testid={`switch-${type.key}`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sms" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>SMS Notifications</span>
                </CardTitle>
                <CardDescription>Configure SMS notification settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="sms-enabled">Enable SMS Notifications</Label>
                    <p className="text-sm text-gray-500">Send notifications via SMS</p>
                  </div>
                  <Switch
                    id="sms-enabled"
                    checked={settings.smsNotifications.enabled}
                    onCheckedChange={(checked) => updateSmsSetting('enabled', checked)}
                    data-testid="switch-sms-enabled"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sms-api-key">SMS Provider API Key</Label>
                  <Input
                    id="sms-api-key"
                    type="password"
                    value={settings.smsNotifications.apiKey}
                    onChange={(e) => updateSmsSetting('apiKey', e.target.value)}
                    placeholder="Enter your SMS provider API key"
                    data-testid="input-sms-api-key"
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">SMS Notification Types</h4>
                  {[
                    { key: 'newOrderNotifications', label: 'New Order Notifications' },
                    { key: 'deliveryUpdates', label: 'Delivery Updates' },
                  ].map((type) => (
                    <div key={type.key} className="flex items-center justify-between">
                      <Label htmlFor={type.key}>{type.label}</Label>
                      <Switch
                        id={type.key}
                        checked={settings.smsNotifications[type.key as keyof typeof settings.smsNotifications] as boolean}
                        onCheckedChange={(checked) => updateSmsSetting(type.key, checked)}
                        data-testid={`switch-sms-${type.key}`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="push" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Smartphone className="h-5 w-5" />
                  <span>Push Notifications</span>
                </CardTitle>
                <CardDescription>Configure push notification settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="push-enabled">Enable Push Notifications</Label>
                    <p className="text-sm text-gray-500">Send push notifications to mobile apps</p>
                  </div>
                  <Switch
                    id="push-enabled"
                    checked={settings.pushNotifications.enabled}
                    onCheckedChange={(checked) => updatePushSetting('enabled', checked)}
                    data-testid="switch-push-enabled"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="firebase-key">Firebase Server Key</Label>
                  <Input
                    id="firebase-key"
                    type="password"
                    value={settings.pushNotifications.firebase_key}
                    onChange={(e) => updatePushSetting('firebase_key', e.target.value)}
                    placeholder="Enter your Firebase server key"
                    data-testid="input-firebase-key"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Notification Templates</span>
                </CardTitle>
                <CardDescription>Customize notification message templates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(settings.templates).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={key}>
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </Label>
                    <Textarea
                      id={key}
                      value={value}
                      onChange={(e) => updateTemplate(key, e.target.value)}
                      placeholder="Enter notification template"
                      data-testid={`textarea-${key}`}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}