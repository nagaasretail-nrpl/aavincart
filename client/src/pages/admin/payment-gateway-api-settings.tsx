import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Key, ArrowLeft, Copy, Eye, EyeOff, RotateCcw, AlertTriangle, Shield, Globe } from 'lucide-react';
import { Link } from 'wouter';
import { useState } from 'react';
import AdminLayout from './layout';

export default function PaymentGatewayApiSettings() {
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const toggleSecretVisibility = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // API settings data - credentials loaded from environment variables
  const apiConfigs = [
    {
      id: "paypal_api",
      gateway: "PayPal",
      environment: import.meta.env.VITE_PAYPAL_ENVIRONMENT || "sandbox", 
      clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || "[Not configured]",
      clientSecret: import.meta.env.VITE_PAYPAL_CLIENT_SECRET || "[Not configured]",
      webhookId: import.meta.env.VITE_PAYPAL_WEBHOOK_ID || "[Not configured]",
      apiVersion: "v2",
      status: import.meta.env.VITE_PAYPAL_CLIENT_ID ? "active" : "inactive",
      lastUpdated: "2024-01-14 16:45:22"
    },
    {
      id: "razorpay_api",
      gateway: "Razorpay",
      environment: import.meta.env.VITE_RAZORPAY_ENVIRONMENT || "sandbox",
      keyId: import.meta.env.VITE_RAZORPAY_KEY_ID || "[Not configured]",
      keySecret: import.meta.env.VITE_RAZORPAY_KEY_SECRET || "[Not configured]",
      webhookSecret: import.meta.env.VITE_RAZORPAY_WEBHOOK_SECRET || "[Not configured]",
      apiVersion: "v1",
      status: import.meta.env.VITE_RAZORPAY_KEY_ID ? "active" : "testing",
      lastUpdated: "2024-01-13 09:15:45"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'testing': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const maskSecret = (secret: string, show: boolean) => {
    if (show) return secret;
    return secret.substring(0, 8) + '•'.repeat(secret.length - 12) + secret.substring(secret.length - 4);
  };

  return (
    <AdminLayout>
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <Link href="/admin/payment-gateway">
          <Button variant="outline" size="sm" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Payment Gateway
          </Button>
        </Link>
        <span className="text-gray-400">→</span>
        <span className="text-gray-600">API Settings</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Settings</h1>
          <p className="text-gray-600">Manage API credentials and configurations for payment gateways</p>
        </div>
      </div>

      {/* Security Alert */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800">Security Notice</h4>
              <p className="text-sm text-yellow-700 mt-1">
                API credentials are highly sensitive. Only share them with authorized personnel and rotate them regularly. 
                Always use production keys for live transactions and test keys for development.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Configurations */}
      <div className="space-y-6">
        {apiConfigs.map((config) => (
          <Card key={config.id} data-testid={`api-config-${config.id}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Key className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{config.gateway} API Configuration</CardTitle>
                    <CardDescription>Environment: {config.environment} • Version: {config.apiVersion}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(config.status)}>
                    {config.status}
                  </Badge>
                  <Switch checked={config.status === 'active'} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* API Keys Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Public/Client Key */}
                <div>
                  <Label className="text-sm font-medium">
                    {config.gateway === 'PayPal' ? 'Client ID' : config.gateway === 'Razorpay' ? 'Key ID' : 'Publishable Key'}
                  </Label>
                  <div className="flex gap-2 mt-1">
                    <Input 
                      value={config.gateway === 'PayPal' ? config.clientId : config.gateway === 'Razorpay' ? config.keyId : config.publicKey}
                      readOnly
                      className="bg-gray-50"
                    />
                    <Button variant="outline" size="sm" data-testid={`button-copy-public-${config.id}`}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Secret Key */}
                <div>
                  <Label className="text-sm font-medium">
                    {config.gateway === 'PayPal' ? 'Client Secret' : config.gateway === 'Razorpay' ? 'Key Secret' : 'Secret Key'}
                  </Label>
                  <div className="flex gap-2 mt-1">
                    <Input 
                      type={showSecrets[`${config.id}_secret`] ? "text" : "password"}
                      value={maskSecret(
                        config.gateway === 'PayPal' ? (config.clientSecret || '') : 
                        config.gateway === 'Razorpay' ? (config.keySecret || '') : config.secretKey,
                        showSecrets[`${config.id}_secret`]
                      )}
                      readOnly
                      className="bg-gray-50"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => toggleSecretVisibility(`${config.id}_secret`)}
                      data-testid={`button-toggle-secret-${config.id}`}
                    >
                      {showSecrets[`${config.id}_secret`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="sm" data-testid={`button-copy-secret-${config.id}`}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Webhook Secret */}
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium">
                    {config.gateway === 'PayPal' ? 'Webhook ID' : 'Webhook Secret'}
                  </Label>
                  <div className="flex gap-2 mt-1">
                    <Input 
                      type={showSecrets[`${config.id}_webhook`] ? "text" : "password"}
                      value={maskSecret(
                        config.gateway === 'PayPal' ? (config.webhookId || '') : 
                        config.gateway === 'Razorpay' ? config.webhookSecret : config.webhookSecret,
                        showSecrets[`${config.id}_webhook`]
                      )}
                      readOnly
                      className="bg-gray-50"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => toggleSecretVisibility(`${config.id}_webhook`)}
                      data-testid={`button-toggle-webhook-${config.id}`}
                    >
                      {showSecrets[`${config.id}_webhook`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="sm" data-testid={`button-copy-webhook-${config.id}`}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="text-sm text-gray-600">
                  Last updated: {config.lastUpdated}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" data-testid={`button-rotate-${config.id}`}>
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Rotate Keys
                  </Button>
                  <Button variant="outline" size="sm" data-testid={`button-test-${config.id}`}>
                    Test Connection
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Global API Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Global Settings
            </CardTitle>
            <CardDescription>Application-wide API configurations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="api-timeout">API Timeout (seconds)</Label>
              <Input 
                id="api-timeout"
                defaultValue="30"
                type="number"
                data-testid="input-api-timeout"
              />
            </div>
            
            <div>
              <Label htmlFor="retry-attempts">Retry Attempts</Label>
              <Input 
                id="retry-attempts"
                defaultValue="3"
                type="number"
                data-testid="input-retry-attempts"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="enable-logging">Enable API Logging</Label>
              <Switch id="enable-logging" defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="sandbox-mode">Sandbox Mode</Label>
              <Switch id="sandbox-mode" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Settings
            </CardTitle>
            <CardDescription>Enhanced security configurations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="allowed-ips">Allowed IP Addresses</Label>
              <Textarea 
                id="allowed-ips"
                placeholder="192.168.1.1&#10;10.0.0.1"
                rows={3}
                data-testid="textarea-allowed-ips"
              />
              <p className="text-xs text-gray-500 mt-1">One IP per line. Leave empty to allow all IPs.</p>
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="require-https">Require HTTPS</Label>
              <Switch id="require-https" defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="verify-webhooks">Verify Webhook Signatures</Label>
              <Switch id="verify-webhooks" defaultChecked />
            </div>
            
            <Button className="w-full" data-testid="button-save-settings">
              Save Security Settings
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* API Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">API Documentation & Testing</CardTitle>
          <CardDescription>Resources for integrating with payment gateways</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <h4 className="font-medium mb-2">PayPal Documentation</h4>
              <p className="text-sm text-gray-600 mb-3">PayPal REST API documentation</p>
              <Button variant="outline" size="sm" data-testid="button-paypal-docs">
                View Docs
              </Button>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Razorpay Documentation</h4>
              <p className="text-sm text-gray-600 mb-3">Razorpay integration guides</p>
              <Button variant="outline" size="sm" data-testid="button-razorpay-docs">
                View Docs
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}