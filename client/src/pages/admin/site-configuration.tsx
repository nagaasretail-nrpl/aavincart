import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import AdminLayout from "./layout";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Save, Settings, Globe, Mail, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SiteConfig {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  adminEmail: string;
  currency: string;
  timezone: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  commissionRate: string;
  deliveryFee: string;
  minimumOrderAmount: string;
  maxDeliveryRadius: string;
  smtpHost: string;
  smtpPort: string;
  smtpUsername: string;
  smtpPassword: string;
  enableSms: boolean;
  smsProvider: string;
  smsApiKey: string;
}

export default function SiteConfiguration() {
  const { toast } = useToast();
  const [config, setConfig] = useState<SiteConfig>({
    siteName: 'Aavincart',
    siteDescription: 'Tamil Nadu Cooperative Milk Producers Federation - Fresh dairy products from 17 District Unions',
    siteUrl: 'https://aavincart.com',
    adminEmail: 'admin@aavincart.com',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    maintenanceMode: false,
    allowRegistration: true,
    requireEmailVerification: true,
    commissionRate: '10.0',
    deliveryFee: '0.00',
    minimumOrderAmount: '15.00',
    maxDeliveryRadius: '10',
    smtpHost: '',
    smtpPort: '587',
    smtpUsername: '',
    smtpPassword: '',
    enableSms: false,
    smsProvider: 'twilio',
    smsApiKey: '',
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (configData: SiteConfig) => {
      // In a real app, this would save to the backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      return configData;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Site configuration updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update configuration",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveConfigMutation.mutate(config);
  };

  const updateConfig = (key: keyof SiteConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <AdminLayout>
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-site-config">
            Site Configuration
          </h1>
          <p className="text-gray-600">Manage global site settings and preferences</p>
        </div>
        
        <Button onClick={handleSave} disabled={saveConfigMutation.isPending} data-testid="button-save-config">
          <Save className="h-4 w-4 mr-2" />
          {saveConfigMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="sms">SMS</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>General Settings</span>
              </CardTitle>
              <CardDescription>Basic site information and display settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input
                    id="siteName"
                    value={config.siteName}
                    onChange={(e) => updateConfig('siteName', e.target.value)}
                    data-testid="input-site-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Admin Email</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={config.adminEmail}
                    onChange={(e) => updateConfig('adminEmail', e.target.value)}
                    data-testid="input-admin-email"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="siteDescription">Site Description</Label>
                <Textarea
                  id="siteDescription"
                  value={config.siteDescription}
                  onChange={(e) => updateConfig('siteDescription', e.target.value)}
                  data-testid="input-site-description"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="siteUrl">Site URL</Label>
                <Input
                  id="siteUrl"
                  value={config.siteUrl}
                  onChange={(e) => updateConfig('siteUrl', e.target.value)}
                  data-testid="input-site-url"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={config.currency}
                    onChange={(e) => updateConfig('currency', e.target.value)}
                    data-testid="input-currency"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={config.timezone}
                    onChange={(e) => updateConfig('timezone', e.target.value)}
                    data-testid="input-timezone"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>Business Settings</span>
              </CardTitle>
              <CardDescription>Commission rates, fees, and business rules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="commissionRate">Commission Rate (%)</Label>
                  <Input
                    id="commissionRate"
                    type="number"
                    step="0.1"
                    value={config.commissionRate}
                    onChange={(e) => updateConfig('commissionRate', e.target.value)}
                    data-testid="input-commission-rate"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deliveryFee">Default Delivery Fee</Label>
                  <Input
                    id="deliveryFee"
                    type="number"
                    step="0.01"
                    value={config.deliveryFee}
                    onChange={(e) => updateConfig('deliveryFee', e.target.value)}
                    data-testid="input-delivery-fee"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minimumOrderAmount">Minimum Order Amount</Label>
                  <Input
                    id="minimumOrderAmount"
                    type="number"
                    step="0.01"
                    value={config.minimumOrderAmount}
                    onChange={(e) => updateConfig('minimumOrderAmount', e.target.value)}
                    data-testid="input-min-order"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxDeliveryRadius">Max Delivery Radius (km)</Label>
                  <Input
                    id="maxDeliveryRadius"
                    type="number"
                    value={config.maxDeliveryRadius}
                    onChange={(e) => updateConfig('maxDeliveryRadius', e.target.value)}
                    data-testid="input-max-radius"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="h-5 w-5" />
                <span>Email Settings</span>
              </CardTitle>
              <CardDescription>SMTP configuration for email notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">SMTP Host</Label>
                  <Input
                    id="smtpHost"
                    value={config.smtpHost}
                    onChange={(e) => updateConfig('smtpHost', e.target.value)}
                    placeholder="smtp.gmail.com"
                    data-testid="input-smtp-host"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">SMTP Port</Label>
                  <Input
                    id="smtpPort"
                    value={config.smtpPort}
                    onChange={(e) => updateConfig('smtpPort', e.target.value)}
                    data-testid="input-smtp-port"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpUsername">SMTP Username</Label>
                  <Input
                    id="smtpUsername"
                    value={config.smtpUsername}
                    onChange={(e) => updateConfig('smtpUsername', e.target.value)}
                    data-testid="input-smtp-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPassword">SMTP Password</Label>
                  <Input
                    id="smtpPassword"
                    type="password"
                    value={config.smtpPassword}
                    onChange={(e) => updateConfig('smtpPassword', e.target.value)}
                    data-testid="input-smtp-password"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="sms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>SMS Settings</CardTitle>
              <CardDescription>Configure SMS notifications and alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={config.enableSms}
                  onCheckedChange={(checked) => updateConfig('enableSms', checked)}
                  data-testid="switch-enable-sms"
                />
                <Label>Enable SMS Notifications</Label>
              </div>
              
              {config.enableSms && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="smsProvider">SMS Provider</Label>
                    <Input
                      id="smsProvider"
                      value={config.smsProvider}
                      onChange={(e) => updateConfig('smsProvider', e.target.value)}
                      data-testid="input-sms-provider"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="smsApiKey">API Key</Label>
                    <Input
                      id="smsApiKey"
                      type="password"
                      value={config.smsApiKey}
                      onChange={(e) => updateConfig('smsApiKey', e.target.value)}
                      data-testid="input-sms-api-key"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Security Settings</span>
              </CardTitle>
              <CardDescription>User registration and security preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.maintenanceMode}
                    onCheckedChange={(checked) => updateConfig('maintenanceMode', checked)}
                    data-testid="switch-maintenance"
                  />
                  <Label>Maintenance Mode</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.allowRegistration}
                    onCheckedChange={(checked) => updateConfig('allowRegistration', checked)}
                    data-testid="switch-allow-registration"
                  />
                  <Label>Allow New User Registration</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.requireEmailVerification}
                    onCheckedChange={(checked) => updateConfig('requireEmailVerification', checked)}
                    data-testid="switch-email-verification"
                  />
                  <Label>Require Email Verification</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </AdminLayout>
  );
}