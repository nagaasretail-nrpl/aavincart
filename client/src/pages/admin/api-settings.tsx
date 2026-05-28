import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Save, ArrowLeft, Map, MapPin, Navigation, Ruler, Search, Key,
  CheckCircle, XCircle, Loader2, Eye, EyeOff, Smartphone, Globe,
  AlertTriangle, Info, Flame, Shield, LogIn, RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import AdminLayout from './layout';

interface ApiKeyConfig {
  id?: number;
  provider: string;
  serviceName: string;
  displayName: string;
  description: string;
  apiKey: string;
  enabled: boolean;
  category: string;
  icon: React.ReactNode;
}

const DEFAULT_API_CONFIGS: ApiKeyConfig[] = [
  {
    provider: 'google',
    serviceName: 'maps_javascript',
    displayName: 'Google Maps JavaScript API',
    description: 'Displays interactive maps on web and mobile apps. Powers map views, markers, and overlays.',
    apiKey: '',
    enabled: false,
    category: 'google_maps',
    icon: <Map className="h-5 w-5 text-blue-600" />,
  },
  {
    provider: 'google',
    serviceName: 'places',
    displayName: 'Google Places API',
    description: 'Address autocomplete and place search. Helps customers find addresses quickly.',
    apiKey: '',
    enabled: false,
    category: 'google_maps',
    icon: <Search className="h-5 w-5 text-green-600" />,
  },
  {
    provider: 'google',
    serviceName: 'geocoding',
    displayName: 'Google Geocoding API',
    description: 'Converts addresses to coordinates. Used for GPS-based District Union detection.',
    apiKey: '',
    enabled: false,
    category: 'google_maps',
    icon: <MapPin className="h-5 w-5 text-red-600" />,
  },
  {
    provider: 'google',
    serviceName: 'directions',
    displayName: 'Google Directions API',
    description: 'Calculates routes between locations. Powers delivery route optimization.',
    apiKey: '',
    enabled: false,
    category: 'google_maps',
    icon: <Navigation className="h-5 w-5 text-purple-600" />,
  },
  {
    provider: 'google',
    serviceName: 'distance_matrix',
    displayName: 'Google Distance Matrix API',
    description: 'Calculates travel times and distances. Used for delivery fee calculation.',
    apiKey: '',
    enabled: false,
    category: 'google_maps',
    icon: <Ruler className="h-5 w-5 text-orange-600" />,
  },
  {
    provider: 'firebase',
    serviceName: 'firebase_api',
    displayName: 'Firebase API Key',
    description: 'Firebase Web API key for authentication, FCM push notifications, and other Firebase services.',
    apiKey: '',
    enabled: false,
    category: 'firebase',
    icon: <Flame className="h-5 w-5 text-amber-500" />,
  },
  {
    provider: 'firebase',
    serviceName: 'firebase_project_id',
    displayName: 'Firebase Project ID',
    description: 'Firebase project identifier (e.g., aavincart-33edd).',
    apiKey: '',
    enabled: false,
    category: 'firebase',
    icon: <Flame className="h-5 w-5 text-amber-500" />,
  },
  {
    provider: 'firebase',
    serviceName: 'firebase_messaging_sender_id',
    displayName: 'Firebase Messaging Sender ID',
    description: 'FCM sender ID for push notifications (project number).',
    apiKey: '',
    enabled: false,
    category: 'firebase',
    icon: <Flame className="h-5 w-5 text-amber-500" />,
  },
  {
    provider: 'firebase',
    serviceName: 'firebase_app_id',
    displayName: 'Firebase App ID',
    description: 'Firebase web app ID for the web client.',
    apiKey: '',
    enabled: false,
    category: 'firebase',
    icon: <Flame className="h-5 w-5 text-amber-500" />,
  },
  {
    provider: 'social',
    serviceName: 'google_oauth_client_id',
    displayName: 'Google OAuth Client ID',
    description: 'Google Sign-In client ID for social login across web and mobile apps.',
    apiKey: '',
    enabled: false,
    category: 'social_login',
    icon: <LogIn className="h-5 w-5 text-blue-500" />,
  },
  {
    provider: 'social',
    serviceName: 'google_oauth_client_secret',
    displayName: 'Google OAuth Client Secret',
    description: 'Google Sign-In client secret (keep this private).',
    apiKey: '',
    enabled: false,
    category: 'social_login',
    icon: <Shield className="h-5 w-5 text-red-500" />,
  },
  {
    provider: 'social',
    serviceName: 'facebook_app_id',
    displayName: 'Facebook App ID',
    description: 'Facebook Login app ID for social login.',
    apiKey: '',
    enabled: false,
    category: 'social_login',
    icon: <LogIn className="h-5 w-5 text-indigo-500" />,
  },
  {
    provider: 'social',
    serviceName: 'facebook_app_secret',
    displayName: 'Facebook App Secret',
    description: 'Facebook Login app secret (keep this private).',
    apiKey: '',
    enabled: false,
    category: 'social_login',
    icon: <Shield className="h-5 w-5 text-indigo-500" />,
  },
];

export default function AdminApiSettings() {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<ApiKeyConfig[]>(DEFAULT_API_CONFIGS);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState('google_maps');

  const { data: savedSettings, isLoading } = useQuery<{ settings: any[] }>({
    queryKey: ['/api/admin/all-api-settings'],
  });

  useEffect(() => {
    if (savedSettings?.settings && Array.isArray(savedSettings.settings)) {
      const saved = savedSettings.settings;
      setConfigs(prev => prev.map(cfg => {
        const match = saved.find((s: any) => s.provider === cfg.provider && s.serviceName === cfg.serviceName);
        if (match) {
          return {
            ...cfg,
            id: match.id,
            apiKey: match.apiKey || '',
            enabled: match.enabled || false,
          };
        }
        return cfg;
      }));
    }
  }, [savedSettings]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/admin/all-api-settings', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/all-api-settings'] });
      toast({ title: "Saved", description: "API settings saved successfully. Mobile apps will use the new keys on next launch." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async ({ apiKey, service }: { apiKey: string; service: string }) => {
      const res = await apiRequest('POST', '/api/admin/google-maps-test', { apiKey, service });
      return res.json();
    },
  });

  const [testResults, setTestResults] = useState<Record<string, { valid: boolean; message: string } | null>>({});

  const handleSave = () => {
    const payload = configs.map(cfg => ({
      provider: cfg.provider,
      serviceName: cfg.serviceName,
      apiKey: cfg.apiKey,
      enabled: cfg.enabled,
    }));
    saveMutation.mutate({ services: payload });
  };

  const handleTestKey = async (serviceName: string) => {
    const cfg = configs.find(c => c.serviceName === serviceName);
    if (!cfg?.apiKey) {
      toast({ title: "No API Key", description: "Please enter an API key first", variant: "destructive" });
      return;
    }
    setTestResults(prev => ({ ...prev, [serviceName]: null }));
    try {
      const result = await testMutation.mutateAsync({ apiKey: cfg.apiKey, service: serviceName });
      setTestResults(prev => ({ ...prev, [serviceName]: result }));
    } catch {
      setTestResults(prev => ({ ...prev, [serviceName]: { valid: false, message: 'Test failed' } }));
    }
  };

  const updateConfig = (serviceName: string, updates: Partial<ApiKeyConfig>) => {
    setConfigs(prev => prev.map(cfg =>
      cfg.serviceName === serviceName ? { ...cfg, ...updates } : cfg
    ));
  };

  const toggleKeyVisibility = (serviceName: string) => {
    setShowKeys(prev => ({ ...prev, [serviceName]: !prev[serviceName] }));
  };

  const getConfigsByCategory = (category: string) => configs.filter(c => c.category === category);

  const getCategoryStats = (category: string) => {
    const items = getConfigsByCategory(category);
    const configured = items.filter(i => i.apiKey && i.enabled).length;
    return { total: items.length, configured };
  };

  const googleStats = getCategoryStats('google_maps');
  const firebaseStats = getCategoryStats('firebase');
  const socialStats = getCategoryStats('social_login');

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  const renderApiKeyField = (cfg: ApiKeyConfig, testable = false) => (
    <div key={cfg.serviceName} className="p-4 border rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {cfg.icon}
          <div>
            <p className="font-medium text-sm">{cfg.displayName}</p>
            <p className="text-xs text-gray-500">{cfg.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={cfg.enabled ? 'default' : 'secondary'} className="text-xs">
            {cfg.enabled ? 'Active' : 'Off'}
          </Badge>
          <Switch
            checked={cfg.enabled}
            onCheckedChange={(checked) => updateConfig(cfg.serviceName, { enabled: checked })}
          />
        </div>
      </div>

      {cfg.enabled && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showKeys[cfg.serviceName] ? 'text' : 'password'}
                value={cfg.apiKey}
                onChange={(e) => updateConfig(cfg.serviceName, { apiKey: e.target.value })}
                placeholder={cfg.serviceName.includes('project_id') ? 'e.g., aavincart-33edd' : 'Enter key or value...'}
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => toggleKeyVisibility(cfg.serviceName)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKeys[cfg.serviceName] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {testable && (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestKey(cfg.serviceName)}
                disabled={testMutation.isPending}
              >
                {testMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Test
              </Button>
              {testResults[cfg.serviceName] && (
                <div className={`flex items-center gap-1 text-sm ${testResults[cfg.serviceName]?.valid ? 'text-green-600' : 'text-red-600'}`}>
                  {testResults[cfg.serviceName]?.valid ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  {testResults[cfg.serviceName]?.message}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/admin/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Key className="h-7 w-7 text-primary" />
              API Settings
            </h1>
            <p className="text-gray-600 mt-1">
              Manage all API keys for Google Maps, Firebase, and Social Login. Changes apply to all mobile apps automatically.
            </p>
          </div>

          <Button onClick={handleSave} disabled={saveMutation.isPending} size="lg">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save All Settings
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Google Maps</p>
                  <p className="text-2xl font-bold">{googleStats.configured}/{googleStats.total}</p>
                </div>
                <Map className={`h-8 w-8 ${googleStats.configured > 0 ? 'text-blue-500' : 'text-gray-300'}`} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Firebase</p>
                  <p className="text-2xl font-bold">{firebaseStats.configured}/{firebaseStats.total}</p>
                </div>
                <Flame className={`h-8 w-8 ${firebaseStats.configured > 0 ? 'text-amber-500' : 'text-gray-300'}`} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Social Login</p>
                  <p className="text-2xl font-bold">{socialStats.configured}/{socialStats.total}</p>
                </div>
                <LogIn className={`h-8 w-8 ${socialStats.configured > 0 ? 'text-blue-500' : 'text-gray-300'}`} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Mobile Ready</p>
                  <p className="text-lg font-bold">{googleStats.configured >= 3 && firebaseStats.configured >= 1 ? 'Yes' : 'Partial'}</p>
                </div>
                <Smartphone className={`h-8 w-8 ${googleStats.configured >= 3 && firebaseStats.configured >= 1 ? 'text-green-500' : 'text-yellow-500'}`} />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">How This Works</p>
                <p>All API keys configured here are served to the mobile apps (Customer, Merchant, Driver) via <code className="bg-blue-100 px-1 rounded">/api/config/app-settings</code>. 
                When you update a key and save, the mobile apps will automatically use the new value on their next launch or refresh.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
            <TabsTrigger value="google_maps" className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              Google Maps
            </TabsTrigger>
            <TabsTrigger value="firebase" className="flex items-center gap-2">
              <Flame className="h-4 w-4" />
              Firebase
            </TabsTrigger>
            <TabsTrigger value="social_login" className="flex items-center gap-2">
              <LogIn className="h-4 w-4" />
              Social Login
            </TabsTrigger>
          </TabsList>

          <TabsContent value="google_maps" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5 text-blue-600" />
                  Google Maps API Keys
                </CardTitle>
                <CardDescription>
                  Configure Google Maps APIs for location services. Enable at least Maps JavaScript, Places, and Geocoding for full mobile app functionality.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {getConfigsByCategory('google_maps').map(cfg => renderApiKeyField(cfg, 
                  ['places', 'geocoding', 'directions', 'distance_matrix'].includes(cfg.serviceName)
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="firebase" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-amber-500" />
                  Firebase Configuration
                </CardTitle>
                <CardDescription>
                  Firebase API keys for push notifications (FCM), authentication, and other Firebase services. These values come from your Firebase Console.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {getConfigsByCategory('firebase').map(cfg => renderApiKeyField(cfg))}
              </CardContent>
            </Card>

            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Where to Find These Values</p>
                    <p>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-amber-700 underline">Firebase Console</a> → 
                    Your Project → Project Settings → General → Your Apps → Web App. Copy the values from the Firebase SDK config snippet.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="social_login" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LogIn className="h-5 w-5 text-blue-500" />
                  Social Login APIs
                </CardTitle>
                <CardDescription>
                  Configure OAuth credentials for Google Sign-In and Facebook Login. These enable social authentication in mobile apps.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {getConfigsByCategory('social_login').map(cfg => renderApiKeyField(cfg))}
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-green-800">
                    <p className="font-medium mb-1">Setup Instructions</p>
                    <ul className="list-disc ml-4 space-y-1 mt-1">
                      <li><strong>Google:</strong> Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console → Credentials</a> and create an OAuth 2.0 Client ID.</li>
                      <li><strong>Facebook:</strong> Go to <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="underline">Facebook Developers → Apps</a> and create a Facebook Login app.</li>
                    </ul>
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
