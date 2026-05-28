import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MoreHorizontal, 
  ArrowLeft, 
  Save,
  Palette,
  Type,
  Languages,
  Zap,
  Code,
  Webhook
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from '../layout';

export default function Others() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    theme: {
      primaryColor: '#ff6b35',
      secondaryColor: '#4f46e5',
      fontFamily: 'Inter',
      borderRadius: '8',
      customCSS: '',
    },
    localization: {
      defaultLanguage: 'en',
      enableMultiLanguage: false,
      supportedLanguages: ['en', 'es', 'fr'],
      currencyFormat: 'USD',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
    },
    performance: {
      enableCaching: true,
      cacheTimeout: 3600, // seconds
      compressionEnabled: true,
      minifyAssets: true,
      lazyLoadImages: true,
    },
    maintenance: {
      maintenanceMode: false,
      maintenanceMessage: 'We are currently performing scheduled maintenance. Please check back soon.',
      allowedIPs: ['127.0.0.1'],
      estimatedDowntime: '2 hours',
    },
    customCode: {
      headerCode: '',
      footerCode: '',
      customJS: '',
      customCSS: '',
    },
    integrations: {
      googleMaps: {
        enabled: false,
        apiKey: '',
      },
      socialLogin: {
        google: { enabled: false, clientId: '' },
        facebook: { enabled: false, appId: '' },
        apple: { enabled: false, clientId: '' },
      },
      webhooks: {
        enabled: false,
        endpoints: [],
        secretKey: '',
      },
    },
    experimental: {
      betaFeatures: false,
      debugMode: false,
      featureFlags: {
        newCheckout: false,
        improvedSearch: false,
        advancedFilters: false,
      },
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
        description: "Other settings saved successfully",
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

  const updateNestedSetting = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: { ...prev[category as keyof typeof prev], [key]: value }
    }));
  };

  const updateDeepNestedSetting = (category: string, subcategory: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [subcategory]: {
          ...(prev[category as keyof typeof prev] as any)[subcategory],
          [key]: value
        }
      }
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
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-others">
              Others
            </h1>
            <p className="text-gray-600">Miscellaneous settings and configurations</p>
          </div>
          
          <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-settings">
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>

        <Tabs defaultValue="theme" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6">
            <TabsTrigger value="theme">Theme</TabsTrigger>
            <TabsTrigger value="localization">Localization</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            <TabsTrigger value="custom">Custom Code</TabsTrigger>
            <TabsTrigger value="experimental">Experimental</TabsTrigger>
          </TabsList>
          
          <TabsContent value="theme" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="h-5 w-5" />
                  <span>Theme Customization</span>
                </CardTitle>
                <CardDescription>Customize the visual appearance of your site</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primary-color">Primary Color</Label>
                    <Input
                      id="primary-color"
                      type="color"
                      value={settings.theme.primaryColor}
                      onChange={(e) => updateNestedSetting('theme', 'primaryColor', e.target.value)}
                      data-testid="input-primary-color"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondary-color">Secondary Color</Label>
                    <Input
                      id="secondary-color"
                      type="color"
                      value={settings.theme.secondaryColor}
                      onChange={(e) => updateNestedSetting('theme', 'secondaryColor', e.target.value)}
                      data-testid="input-secondary-color"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="font-family">Font Family</Label>
                    <Select
                      value={settings.theme.fontFamily}
                      onValueChange={(value) => updateNestedSetting('theme', 'fontFamily', value)}
                    >
                      <SelectTrigger data-testid="select-font-family">
                        <SelectValue placeholder="Select font" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inter">Inter</SelectItem>
                        <SelectItem value="Roboto">Roboto</SelectItem>
                        <SelectItem value="Open Sans">Open Sans</SelectItem>
                        <SelectItem value="Lato">Lato</SelectItem>
                        <SelectItem value="Montserrat">Montserrat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="border-radius">Border Radius (px)</Label>
                    <Input
                      id="border-radius"
                      type="number"
                      min="0"
                      max="20"
                      value={settings.theme.borderRadius}
                      onChange={(e) => updateNestedSetting('theme', 'borderRadius', e.target.value)}
                      data-testid="input-border-radius"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custom-css">Custom CSS</Label>
                  <Textarea
                    id="custom-css"
                    value={settings.theme.customCSS}
                    onChange={(e) => updateNestedSetting('theme', 'customCSS', e.target.value)}
                    placeholder="/* Add your custom CSS here */"
                    rows={6}
                    data-testid="textarea-custom-css"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="localization" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Languages className="h-5 w-5" />
                  <span>Localization Settings</span>
                </CardTitle>
                <CardDescription>Configure language and regional settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="default-language">Default Language</Label>
                  <Select
                    value={settings.localization.defaultLanguage}
                    onValueChange={(value) => updateNestedSetting('localization', 'defaultLanguage', value)}
                  >
                    <SelectTrigger data-testid="select-default-language">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="it">Italian</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="multi-language">Enable Multi-Language</Label>
                    <p className="text-sm text-gray-500">Allow users to switch between languages</p>
                  </div>
                  <Switch
                    id="multi-language"
                    checked={settings.localization.enableMultiLanguage}
                    onCheckedChange={(checked) => updateNestedSetting('localization', 'enableMultiLanguage', checked)}
                    data-testid="switch-multi-language"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currency-format">Currency Format</Label>
                    <Select
                      value={settings.localization.currencyFormat}
                      onValueChange={(value) => updateNestedSetting('localization', 'currencyFormat', value)}
                    >
                      <SelectTrigger data-testid="select-currency-format">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="JPY">JPY (¥)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date-format">Date Format</Label>
                    <Select
                      value={settings.localization.dateFormat}
                      onValueChange={(value) => updateNestedSetting('localization', 'dateFormat', value)}
                    >
                      <SelectTrigger data-testid="select-date-format">
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time-format">Time Format</Label>
                    <Select
                      value={settings.localization.timeFormat}
                      onValueChange={(value) => updateNestedSetting('localization', 'timeFormat', value)}
                    >
                      <SelectTrigger data-testid="select-time-format">
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12h">12 Hour</SelectItem>
                        <SelectItem value="24h">24 Hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span>Performance Optimization</span>
                </CardTitle>
                <CardDescription>Configure performance and optimization settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { key: 'enableCaching', label: 'Enable Caching', description: 'Cache pages and assets for faster loading' },
                  { key: 'compressionEnabled', label: 'Enable Compression', description: 'Compress assets to reduce file sizes' },
                  { key: 'minifyAssets', label: 'Minify Assets', description: 'Remove whitespace from CSS and JS files' },
                  { key: 'lazyLoadImages', label: 'Lazy Load Images', description: 'Load images only when needed' },
                ].map((option) => (
                  <div key={option.key} className="flex items-center justify-between">
                    <div>
                      <Label htmlFor={option.key}>{option.label}</Label>
                      <p className="text-sm text-gray-500">{option.description}</p>
                    </div>
                    <Switch
                      id={option.key}
                      checked={settings.performance[option.key as keyof typeof settings.performance] as boolean}
                      onCheckedChange={(checked) => updateNestedSetting('performance', option.key, checked)}
                      data-testid={`switch-${option.key}`}
                    />
                  </div>
                ))}

                <div className="space-y-2">
                  <Label htmlFor="cache-timeout">Cache Timeout (seconds)</Label>
                  <Input
                    id="cache-timeout"
                    type="number"
                    min="300"
                    max="86400"
                    value={settings.performance.cacheTimeout}
                    onChange={(e) => updateNestedSetting('performance', 'cacheTimeout', parseInt(e.target.value))}
                    data-testid="input-cache-timeout"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Maintenance Mode</span>
                </CardTitle>
                <CardDescription>Configure maintenance mode settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                    <p className="text-sm text-gray-500">Enable maintenance mode to restrict access</p>
                  </div>
                  <Switch
                    id="maintenance-mode"
                    checked={settings.maintenance.maintenanceMode}
                    onCheckedChange={(checked) => updateNestedSetting('maintenance', 'maintenanceMode', checked)}
                    data-testid="switch-maintenance-mode"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maintenance-message">Maintenance Message</Label>
                  <Textarea
                    id="maintenance-message"
                    value={settings.maintenance.maintenanceMessage}
                    onChange={(e) => updateNestedSetting('maintenance', 'maintenanceMessage', e.target.value)}
                    data-testid="textarea-maintenance-message"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="allowed-ips">Allowed IPs (comma-separated)</Label>
                    <Input
                      id="allowed-ips"
                      value={settings.maintenance.allowedIPs.join(', ')}
                      onChange={(e) => updateNestedSetting('maintenance', 'allowedIPs', e.target.value.split(',').map(ip => ip.trim()))}
                      data-testid="input-allowed-ips"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estimated-downtime">Estimated Downtime</Label>
                    <Input
                      id="estimated-downtime"
                      value={settings.maintenance.estimatedDowntime}
                      onChange={(e) => updateNestedSetting('maintenance', 'estimatedDowntime', e.target.value)}
                      data-testid="input-estimated-downtime"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="custom" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Code className="h-5 w-5" />
                  <span>Custom Code</span>
                </CardTitle>
                <CardDescription>Add custom HTML, CSS, and JavaScript code</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="header-code">Header Code</Label>
                  <Textarea
                    id="header-code"
                    value={settings.customCode.headerCode}
                    onChange={(e) => updateNestedSetting('customCode', 'headerCode', e.target.value)}
                    placeholder="<!-- Code to be inserted in the <head> section -->"
                    rows={4}
                    data-testid="textarea-header-code"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="footer-code">Footer Code</Label>
                  <Textarea
                    id="footer-code"
                    value={settings.customCode.footerCode}
                    onChange={(e) => updateNestedSetting('customCode', 'footerCode', e.target.value)}
                    placeholder="<!-- Code to be inserted before </body> -->"
                    rows={4}
                    data-testid="textarea-footer-code"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custom-js">Custom JavaScript</Label>
                  <Textarea
                    id="custom-js"
                    value={settings.customCode.customJS}
                    onChange={(e) => updateNestedSetting('customCode', 'customJS', e.target.value)}
                    placeholder="// Custom JavaScript code"
                    rows={6}
                    data-testid="textarea-custom-js"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="experimental" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span>Experimental Features</span>
                </CardTitle>
                <CardDescription>Enable experimental and beta features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="beta-features">Enable Beta Features</Label>
                    <p className="text-sm text-gray-500">Access to experimental functionality</p>
                  </div>
                  <Switch
                    id="beta-features"
                    checked={settings.experimental.betaFeatures}
                    onCheckedChange={(checked) => updateNestedSetting('experimental', 'betaFeatures', checked)}
                    data-testid="switch-beta-features"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="debug-mode">Debug Mode</Label>
                    <p className="text-sm text-gray-500">Enable detailed error logging</p>
                  </div>
                  <Switch
                    id="debug-mode"
                    checked={settings.experimental.debugMode}
                    onCheckedChange={(checked) => updateNestedSetting('experimental', 'debugMode', checked)}
                    data-testid="switch-debug-mode"
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Feature Flags</h4>
                  {Object.entries(settings.experimental.featureFlags).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label htmlFor={key} className="capitalize">
                        {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </Label>
                      <Switch
                        id={key}
                        checked={value}
                        onCheckedChange={(checked) => updateDeepNestedSetting('experimental', 'featureFlags', key, checked)}
                        data-testid={`switch-feature-${key}`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}