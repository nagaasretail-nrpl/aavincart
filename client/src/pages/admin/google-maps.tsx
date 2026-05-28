import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Save, ArrowLeft, Map, MapPin, Navigation, Ruler, Search,
  CheckCircle, XCircle, Loader2, Eye, EyeOff, Smartphone, Globe,
  AlertTriangle, Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import AdminLayout from './layout';

interface GoogleService {
  serviceName: string;
  displayName: string;
  description: string;
  apiKey: string;
  enabled: boolean;
  icon: React.ReactNode;
  useCases: string[];
  docsUrl: string;
  testable: boolean;
  config?: any;
  dbId?: number;
}

const DEFAULT_SERVICES: GoogleService[] = [
  {
    serviceName: 'maps_javascript',
    displayName: 'Maps JavaScript API',
    description: 'Displays interactive maps on web and mobile apps. Powers map views, markers, and overlays.',
    apiKey: '',
    enabled: false,
    icon: <Map className="h-5 w-5 text-blue-600" />,
    useCases: ['Store locator', 'Delivery tracking map', 'Union coverage area', 'Customer address picker'],
    docsUrl: 'https://developers.google.com/maps/documentation/javascript',
    testable: false,
  },
  {
    serviceName: 'places',
    displayName: 'Places API',
    description: 'Address autocomplete, place search, and business details. Helps customers find addresses quickly.',
    apiKey: '',
    enabled: false,
    icon: <Search className="h-5 w-5 text-green-600" />,
    useCases: ['Address autocomplete', 'Nearby store search', 'Parlour finder', 'B2B address validation'],
    docsUrl: 'https://developers.google.com/maps/documentation/places',
    testable: true,
  },
  {
    serviceName: 'geocoding',
    displayName: 'Geocoding API',
    description: 'Converts addresses to coordinates and vice versa. Used for GPS-based District Union detection.',
    apiKey: '',
    enabled: false,
    icon: <MapPin className="h-5 w-5 text-red-600" />,
    useCases: ['District Union auto-detection', 'Delivery address geocoding', 'Coverage area matching', 'Warehouse location mapping'],
    docsUrl: 'https://developers.google.com/maps/documentation/geocoding',
    testable: true,
  },
  {
    serviceName: 'directions',
    displayName: 'Directions API',
    description: 'Calculates routes between locations. Powers delivery route optimization and driver navigation.',
    apiKey: '',
    enabled: false,
    icon: <Navigation className="h-5 w-5 text-purple-600" />,
    useCases: ['Delivery route planning', 'Driver turn-by-turn navigation', 'Multi-stop optimization', 'ETA calculation'],
    docsUrl: 'https://developers.google.com/maps/documentation/directions',
    testable: true,
  },
  {
    serviceName: 'distance_matrix',
    displayName: 'Distance Matrix API',
    description: 'Calculates travel times and distances between multiple points. Used for delivery fee calculation.',
    apiKey: '',
    enabled: false,
    icon: <Ruler className="h-5 w-5 text-orange-600" />,
    useCases: ['Delivery fee calculation', 'Nearest Union matching', 'Driver assignment', 'Service area validation'],
    docsUrl: 'https://developers.google.com/maps/documentation/distance-matrix',
    testable: true,
  },
];

export default function AdminGoogleMaps() {
  const { toast } = useToast();
  const [services, setServices] = useState<GoogleService[]>(DEFAULT_SERVICES);
  const [useSharedKey, setUseSharedKey] = useState(true);
  const [sharedApiKey, setSharedApiKey] = useState('');
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, { valid: boolean; message: string } | null>>({});

  const { data: savedSettings, isLoading } = useQuery<{ settings: any[] }>({
    queryKey: ['/api/admin/google-maps-settings'],
  });

  useEffect(() => {
    if (savedSettings?.settings && Array.isArray(savedSettings.settings)) {
      const saved = savedSettings.settings as any[];
      setServices(prev => prev.map(svc => {
        const match = saved.find((s: any) => s.serviceName === svc.serviceName);
        if (match) {
          return {
            ...svc,
            apiKey: match.apiKey || '',
            enabled: match.enabled || false,
            config: match.config,
            dbId: match.id,
          };
        }
        return svc;
      }));

      if (saved.length > 0) {
        const keys = saved.map((s: any) => s.apiKey).filter(Boolean);
        const allSame = keys.length > 0 && keys.every((k: string) => k === keys[0]);
        if (allSame && keys.length > 0) {
          setUseSharedKey(true);
          setSharedApiKey(keys[0]);
        } else if (keys.length > 1) {
          setUseSharedKey(false);
        }
      }
    }
  }, [savedSettings]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/admin/google-maps-settings', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/google-maps-settings'] });
      toast({ title: "Saved", description: "Google Maps API settings saved successfully" });
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

  const handleSave = () => {
    const payload = services.map(svc => ({
      serviceName: svc.serviceName,
      apiKey: useSharedKey ? sharedApiKey : svc.apiKey,
      enabled: svc.enabled,
      config: svc.config || null,
    }));
    saveMutation.mutate({ services: payload });
  };

  const handleTestKey = async (serviceName: string) => {
    const svc = services.find(s => s.serviceName === serviceName);
    const key = useSharedKey ? sharedApiKey : svc?.apiKey;
    if (!key) {
      toast({ title: "No API Key", description: "Please enter an API key first", variant: "destructive" });
      return;
    }

    setTestResults(prev => ({ ...prev, [serviceName]: null }));
    try {
      const result = await testMutation.mutateAsync({ apiKey: key, service: serviceName });
      setTestResults(prev => ({ ...prev, [serviceName]: result }));
    } catch {
      setTestResults(prev => ({ ...prev, [serviceName]: { valid: false, message: 'Test failed' } }));
    }
  };

  const updateService = (serviceName: string, updates: Partial<GoogleService>) => {
    setServices(prev => prev.map(svc =>
      svc.serviceName === serviceName ? { ...svc, ...updates } : svc
    ));
  };

  const toggleKeyVisibility = (serviceName: string) => {
    setShowKeys(prev => ({ ...prev, [serviceName]: !prev[serviceName] }));
  };

  const enabledCount = services.filter(s => s.enabled).length;
  const hasAnyKey = useSharedKey ? !!sharedApiKey : services.some(s => !!s.apiKey);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/admin/third-party-app">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Third Party Apps
            </Button>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Map className="h-7 w-7 text-blue-600" />
              Google Maps API Settings
            </h1>
            <p className="text-gray-600 mt-1">
              Configure Google Maps APIs for location services across web and mobile apps
            </p>
          </div>

          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save All Settings
          </Button>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">APIs Enabled</p>
                  <p className="text-2xl font-bold">{enabledCount}/{services.length}</p>
                </div>
                <CheckCircle className={`h-8 w-8 ${enabledCount > 0 ? 'text-green-500' : 'text-gray-300'}`} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Key Mode</p>
                  <p className="text-lg font-bold">{useSharedKey ? 'Shared' : 'Individual'}</p>
                </div>
                <Globe className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">API Key</p>
                  <p className="text-lg font-bold">{hasAnyKey ? 'Configured' : 'Not Set'}</p>
                </div>
                {hasAnyKey ? <CheckCircle className="h-8 w-8 text-green-500" /> : <AlertTriangle className="h-8 w-8 text-yellow-500" />}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Mobile Ready</p>
                  <p className="text-lg font-bold">{enabledCount >= 3 ? 'Yes' : 'Partial'}</p>
                </div>
                <Smartphone className={`h-8 w-8 ${enabledCount >= 3 ? 'text-green-500' : 'text-yellow-500'}`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Banner */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Mobile App Integration</p>
                <p>These API keys are shared with all mobile apps (Customer, Merchant, Driver) via the <code className="bg-blue-100 px-1 rounded">/api/config/maps</code> endpoint. 
                Enable at least Maps JavaScript, Places, and Geocoding APIs for full mobile app functionality including GPS-based District Union detection.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="config" className="w-full">
          <TabsList>
            <TabsTrigger value="config">API Configuration</TabsTrigger>
            <TabsTrigger value="services">Individual Services</TabsTrigger>
            <TabsTrigger value="usage">Usage Guide</TabsTrigger>
          </TabsList>

          {/* Main Configuration Tab */}
          <TabsContent value="config" className="space-y-6">
            {/* Shared vs Individual Key */}
            <Card>
              <CardHeader>
                <CardTitle>API Key Configuration</CardTitle>
                <CardDescription>Choose whether to use one shared key for all services or separate keys per service</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Switch checked={useSharedKey} onCheckedChange={setUseSharedKey} />
                  <Label className="font-medium">
                    {useSharedKey ? 'Use single shared API key for all services' : 'Use individual API keys per service'}
                  </Label>
                </div>

                {useSharedKey && (
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="shared-key">Google API Key (shared across all services)</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="shared-key"
                          type={showKeys['shared'] ? 'text' : 'password'}
                          value={sharedApiKey}
                          onChange={(e) => setSharedApiKey(e.target.value)}
                          placeholder="AIzaSy..."
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => toggleKeyVisibility('shared')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showKeys['shared'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      This key will be used for Maps JavaScript, Places, Geocoding, Directions, and Distance Matrix APIs.
                      Make sure all required APIs are enabled in your Google Cloud Console.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Services Enable/Disable */}
            <Card>
              <CardHeader>
                <CardTitle>Enable/Disable Services</CardTitle>
                <CardDescription>Toggle which Google Maps services are active for your platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {services.map((svc) => (
                    <div key={svc.serviceName} className="flex items-center justify-between p-3 md:p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        {svc.icon}
                        <div>
                          <p className="font-medium text-sm md:text-base">{svc.displayName}</p>
                          <p className="text-xs text-gray-500 hidden sm:block">{svc.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 md:gap-4">
                        <Badge variant={svc.enabled ? 'default' : 'secondary'} className="text-xs">
                          {svc.enabled ? 'ON' : 'OFF'}
                        </Badge>
                        <Switch
                          checked={svc.enabled}
                          onCheckedChange={(checked) => updateService(svc.serviceName, { enabled: checked })}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Individual Services Tab */}
          <TabsContent value="services" className="space-y-6">
            {services.map((svc) => (
              <Card key={svc.serviceName} className={svc.enabled ? 'border-green-200' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                      {svc.icon}
                      {svc.displayName}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={svc.enabled}
                        onCheckedChange={(checked) => updateService(svc.serviceName, { enabled: checked })}
                      />
                    </div>
                  </div>
                  <CardDescription>{svc.description}</CardDescription>
                </CardHeader>
                {svc.enabled && (
                  <CardContent className="space-y-4">
                    {!useSharedKey && (
                      <div className="space-y-2">
                        <Label>API Key for {svc.displayName}</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              type={showKeys[svc.serviceName] ? 'text' : 'password'}
                              value={svc.apiKey}
                              onChange={(e) => updateService(svc.serviceName, { apiKey: e.target.value })}
                              placeholder="AIzaSy..."
                              className="pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => toggleKeyVisibility(svc.serviceName)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showKeys[svc.serviceName] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {svc.testable && (
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestKey(svc.serviceName)}
                          disabled={testMutation.isPending}
                        >
                          {testMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                          Test Connection
                        </Button>
                        {testResults[svc.serviceName] && (
                          <div className={`flex items-center gap-1 text-sm ${testResults[svc.serviceName]?.valid ? 'text-green-600' : 'text-red-600'}`}>
                            {testResults[svc.serviceName]?.valid ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                            {testResults[svc.serviceName]?.message}
                          </div>
                        )}
                      </div>
                    )}

                    <Separator />

                    <div>
                      <Label className="text-xs text-gray-500 mb-2 block">Use Cases in Aavincart</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {svc.useCases.map((uc, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{uc}</Badge>
                        ))}
                      </div>
                    </div>

                    <a
                      href={svc.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      <Globe className="h-3 w-3" />
                      View Google Documentation
                    </a>
                  </CardContent>
                )}
              </Card>
            ))}
          </TabsContent>

          {/* Usage Guide Tab */}
          <TabsContent value="usage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Setup Guide</CardTitle>
                <CardDescription>How to get and configure Google Maps API keys</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">1</div>
                    <div>
                      <p className="font-medium text-sm">Go to Google Cloud Console</p>
                      <p className="text-xs text-gray-500">Visit <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">console.cloud.google.com</a> and create a project or select an existing one.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">2</div>
                    <div>
                      <p className="font-medium text-sm">Enable Required APIs</p>
                      <p className="text-xs text-gray-500">In the API Library, enable: Maps JavaScript API, Places API, Geocoding API, Directions API, and Distance Matrix API.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">3</div>
                    <div>
                      <p className="font-medium text-sm">Create API Key</p>
                      <p className="text-xs text-gray-500">Go to Credentials, click "Create Credentials" and select "API key". You can use one key for all services.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">4</div>
                    <div>
                      <p className="font-medium text-sm">Restrict the API Key (Recommended)</p>
                      <p className="text-xs text-gray-500">Add HTTP referrer restrictions for web and Android/iOS app restrictions for mobile apps.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">5</div>
                    <div>
                      <p className="font-medium text-sm">Enter Key Here & Save</p>
                      <p className="text-xs text-gray-500">Paste your API key in the configuration above, enable the services you need, and click "Save All Settings".</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mobile App API Endpoint</CardTitle>
                <CardDescription>How mobile apps access the Google Maps configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                  <p className="text-gray-400">// Mobile apps fetch maps config from:</p>
                  <p>GET /api/config/maps</p>
                  <p className="mt-2 text-gray-400">// Response:</p>
                  <p>{"{"}</p>
                  <p className="ml-4">"mapsApiKey": "AIzaSy...",</p>
                  <p className="ml-4">"placesApiKey": "AIzaSy...",</p>
                  <p className="ml-4">"geocodingApiKey": "AIzaSy...",</p>
                  <p className="ml-4">"directionsApiKey": "AIzaSy...",</p>
                  <p className="ml-4">"distanceMatrixApiKey": "AIzaSy...",</p>
                  <p className="ml-4">"hasKeys": true</p>
                  <p>{"}"}</p>
                </div>
                <p className="text-xs text-gray-500">
                  All three mobile apps (Customer, Merchant, Driver) call this endpoint on startup to get the active API keys.
                  Keys set in environment variables (GOOGLE_MAPS_API_KEY, GOOGLE_PLACES_API_KEY) are used as fallbacks if no keys are configured here.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommended Configuration</CardTitle>
                <CardDescription>Minimum APIs needed for each app feature</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Smartphone className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-sm">Customer App</span>
                    </div>
                    <p className="text-xs text-gray-500">Maps JavaScript + Places + Geocoding (for address picker and Union detection)</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Smartphone className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-sm">Merchant (Union) App</span>
                    </div>
                    <p className="text-xs text-gray-500">Maps JavaScript + Geocoding + Distance Matrix (for delivery zone and fee management)</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Smartphone className="h-4 w-4 text-purple-600" />
                      <span className="font-medium text-sm">Driver App</span>
                    </div>
                    <p className="text-xs text-gray-500">Maps JavaScript + Directions + Geocoding (for navigation and route planning)</p>
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
