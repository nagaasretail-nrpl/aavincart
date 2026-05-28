import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Key, 
  ArrowLeft, 
  Save,
  Copy,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
  Globe
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from '../layout';

export default function ApiAccess() {
  const { toast } = useToast();
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});
  const [settings, setSettings] = useState({
    apiEnabled: true,
    rateLimiting: {
      enabled: true,
      requestsPerMinute: 100,
      requestsPerHour: 1000,
    },
    apiKeys: [
      {
        id: '1',
        name: 'Production API Key',
        key: 'pk_live_abcd1234567890',
        permissions: ['read', 'write'],
        status: 'active',
        createdAt: '2024-01-15',
        lastUsed: '2024-01-20',
      },
      {
        id: '2',
        name: 'Development API Key',
        key: 'pk_test_xyz9876543210',
        permissions: ['read'],
        status: 'active',
        createdAt: '2024-01-10',
        lastUsed: '2024-01-18',
      },
    ],
    webhooks: {
      enabled: false,
      endpoints: [],
      retryAttempts: 3,
      timeout: 30,
    },
    cors: {
      enabled: true,
      allowedOrigins: ['https://yourdomain.com'],
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
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
        description: "API access settings saved successfully",
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

  const updateNestedSetting = (category: 'rateLimiting' | 'webhooks' | 'cors', key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: { ...(prev[category] as Record<string, any>), [key]: value }
    }));
  };

  const toggleKeyVisibility = (keyId: string) => {
    setShowKeys(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "API key copied to clipboard",
    });
  };

  const generateNewKey = () => {
    const newKey = {
      id: Date.now().toString(),
      name: 'New API Key',
      key: `pk_${Math.random().toString(36).substr(2, 20)}`,
      permissions: ['read'],
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
      lastUsed: 'Never',
    };
    
    setSettings(prev => ({
      ...prev,
      apiKeys: [...prev.apiKeys, newKey]
    }));
    
    toast({
      title: "Success",
      description: "New API key generated",
    });
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
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-api-access">
              API Access
            </h1>
            <p className="text-gray-600">Manage API keys, rate limiting, and access controls</p>
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
                <Key className="h-5 w-5" />
                <span>API Settings</span>
              </CardTitle>
              <CardDescription>Configure general API access and security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="api-enabled">Enable API Access</Label>
                  <p className="text-sm text-gray-500">Allow external applications to access your API</p>
                </div>
                <Switch
                  id="api-enabled"
                  checked={settings.apiEnabled}
                  onCheckedChange={(checked) => updateSetting('apiEnabled', checked)}
                  data-testid="switch-api-enabled"
                />
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Disabling API access will immediately revoke access for all applications using your API keys.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Key className="h-5 w-5" />
                  <span>API Keys</span>
                </div>
                <Button onClick={generateNewKey} size="sm" data-testid="button-generate-key">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate New Key
                </Button>
              </CardTitle>
              <CardDescription>Manage your API keys and their permissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.apiKeys.map((apiKey) => (
                <div key={apiKey.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{apiKey.name}</h4>
                      <p className="text-sm text-gray-500">Created: {apiKey.createdAt} | Last used: {apiKey.lastUsed}</p>
                    </div>
                    <Badge variant={apiKey.status === 'active' ? 'default' : 'secondary'}>
                      {apiKey.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 font-mono text-sm bg-gray-100 p-2 rounded">
                      {showKeys[apiKey.id] ? apiKey.key : '••••••••••••••••••••'}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleKeyVisibility(apiKey.id)}
                      data-testid={`button-toggle-visibility-${apiKey.id}`}
                    >
                      {showKeys[apiKey.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(apiKey.key)}
                      data-testid={`button-copy-${apiKey.id}`}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Permissions:</span>
                    {apiKey.permissions.map(permission => (
                      <Badge key={permission} variant="outline" className="text-xs">
                        {permission}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <RefreshCw className="h-5 w-5" />
                <span>Rate Limiting</span>
              </CardTitle>
              <CardDescription>Configure API rate limits to prevent abuse</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="rate-limiting">Enable Rate Limiting</Label>
                  <p className="text-sm text-gray-500">Limit the number of API requests per time period</p>
                </div>
                <Switch
                  id="rate-limiting"
                  checked={settings.rateLimiting.enabled}
                  onCheckedChange={(checked) => updateNestedSetting('rateLimiting', 'enabled', checked)}
                  data-testid="switch-rate-limiting"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="requests-per-minute">Requests per Minute</Label>
                  <Input
                    id="requests-per-minute"
                    type="number"
                    min="1"
                    value={settings.rateLimiting.requestsPerMinute}
                    onChange={(e) => updateNestedSetting('rateLimiting', 'requestsPerMinute', parseInt(e.target.value))}
                    data-testid="input-requests-per-minute"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requests-per-hour">Requests per Hour</Label>
                  <Input
                    id="requests-per-hour"
                    type="number"
                    min="1"
                    value={settings.rateLimiting.requestsPerHour}
                    onChange={(e) => updateNestedSetting('rateLimiting', 'requestsPerHour', parseInt(e.target.value))}
                    data-testid="input-requests-per-hour"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>CORS Settings</span>
              </CardTitle>
              <CardDescription>Configure Cross-Origin Resource Sharing settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="cors-enabled">Enable CORS</Label>
                  <p className="text-sm text-gray-500">Allow cross-origin requests from web browsers</p>
                </div>
                <Switch
                  id="cors-enabled"
                  checked={settings.cors.enabled}
                  onCheckedChange={(checked) => updateNestedSetting('cors', 'enabled', checked)}
                  data-testid="switch-cors-enabled"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="allowed-origins">Allowed Origins</Label>
                <Input
                  id="allowed-origins"
                  value={settings.cors.allowedOrigins.join(', ')}
                  onChange={(e) => updateNestedSetting('cors', 'allowedOrigins', e.target.value.split(',').map(s => s.trim()))}
                  placeholder="https://yourdomain.com, https://app.yourdomain.com"
                  data-testid="input-allowed-origins"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="allowed-methods">Allowed Methods</Label>
                <Input
                  id="allowed-methods"
                  value={settings.cors.allowedMethods.join(', ')}
                  onChange={(e) => updateNestedSetting('cors', 'allowedMethods', e.target.value.split(',').map(s => s.trim()))}
                  placeholder="GET, POST, PUT, DELETE"
                  data-testid="input-allowed-methods"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}