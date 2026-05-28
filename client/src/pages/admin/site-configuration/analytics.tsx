import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  ArrowLeft, 
  Save,
  Eye,
  TrendingUp,
  Target
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from '../layout';

export default function Analytics() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    googleAnalytics: {
      enabled: false,
      trackingId: '',
      enhancedEcommerce: true,
      anonymizeIp: true,
      cookieTimeout: '26280000', // 13 months in seconds
    },
    facebookPixel: {
      enabled: false,
      pixelId: '',
      trackPageView: true,
      trackPurchases: true,
      trackLeads: false,
    },
    customTracking: {
      enabled: false,
      trackingCode: '',
      placement: 'head', // head or body
    },
    heatmaps: {
      enabled: false,
      provider: 'hotjar',
      siteId: '',
    },
    privacy: {
      cookieConsent: true,
      gdprCompliant: true,
      dataRetentionDays: '1095', // 3 years
      allowOptOut: true,
    },
    reporting: {
      enabled: true,
      frequency: 'weekly',
      recipients: ['admin@foodiehub.com'],
      includeRevenue: true,
      includeUserMetrics: true,
      includePerformance: false,
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
        description: "Analytics settings saved successfully",
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
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-analytics">
              Analytics
            </h1>
            <p className="text-gray-600">Configure analytics tracking and reporting settings</p>
          </div>
          
          <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-settings">
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>

        <Tabs defaultValue="google" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
            <TabsTrigger value="google">Google Analytics</TabsTrigger>
            <TabsTrigger value="facebook">Facebook Pixel</TabsTrigger>
            <TabsTrigger value="custom">Custom Tracking</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="reporting">Reporting</TabsTrigger>
          </TabsList>
          
          <TabsContent value="google" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Google Analytics Settings</span>
                </CardTitle>
                <CardDescription>Configure Google Analytics tracking</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="ga-enabled">Enable Google Analytics</Label>
                    <p className="text-sm text-gray-500">Track website visitors and behavior</p>
                  </div>
                  <Switch
                    id="ga-enabled"
                    checked={settings.googleAnalytics.enabled}
                    onCheckedChange={(checked) => updateNestedSetting('googleAnalytics', 'enabled', checked)}
                    data-testid="switch-ga-enabled"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tracking-id">Tracking ID</Label>
                  <Input
                    id="tracking-id"
                    value={settings.googleAnalytics.trackingId}
                    onChange={(e) => updateNestedSetting('googleAnalytics', 'trackingId', e.target.value)}
                    placeholder="GA-XXXXXXXXX-X"
                    data-testid="input-tracking-id"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enhanced-ecommerce">Enhanced Ecommerce</Label>
                    <p className="text-sm text-gray-500">Track purchase events and revenue</p>
                  </div>
                  <Switch
                    id="enhanced-ecommerce"
                    checked={settings.googleAnalytics.enhancedEcommerce}
                    onCheckedChange={(checked) => updateNestedSetting('googleAnalytics', 'enhancedEcommerce', checked)}
                    data-testid="switch-enhanced-ecommerce"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="anonymize-ip">Anonymize IP</Label>
                    <p className="text-sm text-gray-500">Anonymize visitor IP addresses for privacy</p>
                  </div>
                  <Switch
                    id="anonymize-ip"
                    checked={settings.googleAnalytics.anonymizeIp}
                    onCheckedChange={(checked) => updateNestedSetting('googleAnalytics', 'anonymizeIp', checked)}
                    data-testid="switch-anonymize-ip"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cookie-timeout">Cookie Timeout (seconds)</Label>
                  <Input
                    id="cookie-timeout"
                    type="number"
                    value={settings.googleAnalytics.cookieTimeout}
                    onChange={(e) => updateNestedSetting('googleAnalytics', 'cookieTimeout', e.target.value)}
                    data-testid="input-cookie-timeout"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="facebook" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Facebook Pixel Settings</span>
                </CardTitle>
                <CardDescription>Configure Facebook Pixel for advertising</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="fb-enabled">Enable Facebook Pixel</Label>
                    <p className="text-sm text-gray-500">Track conversions for Facebook ads</p>
                  </div>
                  <Switch
                    id="fb-enabled"
                    checked={settings.facebookPixel.enabled}
                    onCheckedChange={(checked) => updateNestedSetting('facebookPixel', 'enabled', checked)}
                    data-testid="switch-fb-enabled"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pixel-id">Pixel ID</Label>
                  <Input
                    id="pixel-id"
                    value={settings.facebookPixel.pixelId}
                    onChange={(e) => updateNestedSetting('facebookPixel', 'pixelId', e.target.value)}
                    placeholder="123456789012345"
                    data-testid="input-pixel-id"
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Tracking Events</h4>
                  {[
                    { key: 'trackPageView', label: 'Track Page Views' },
                    { key: 'trackPurchases', label: 'Track Purchases' },
                    { key: 'trackLeads', label: 'Track Leads' },
                  ].map((event) => (
                    <div key={event.key} className="flex items-center justify-between">
                      <Label htmlFor={event.key}>{event.label}</Label>
                      <Switch
                        id={event.key}
                        checked={settings.facebookPixel[event.key as keyof typeof settings.facebookPixel] as boolean}
                        onCheckedChange={(checked) => updateNestedSetting('facebookPixel', event.key, checked)}
                        data-testid={`switch-${event.key}`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="custom" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5" />
                  <span>Custom Tracking</span>
                </CardTitle>
                <CardDescription>Add custom analytics or tracking codes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="custom-enabled">Enable Custom Tracking</Label>
                    <p className="text-sm text-gray-500">Add custom analytics code to your site</p>
                  </div>
                  <Switch
                    id="custom-enabled"
                    checked={settings.customTracking.enabled}
                    onCheckedChange={(checked) => updateNestedSetting('customTracking', 'enabled', checked)}
                    data-testid="switch-custom-enabled"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tracking-code">Custom Tracking Code</Label>
                  <textarea
                    id="tracking-code"
                    className="w-full h-32 p-3 border rounded-md"
                    value={settings.customTracking.trackingCode}
                    onChange={(e) => updateNestedSetting('customTracking', 'trackingCode', e.target.value)}
                    placeholder="<!-- Insert your custom tracking code here -->"
                    data-testid="textarea-tracking-code"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="placement">Code Placement</Label>
                  <Select
                    value={settings.customTracking.placement}
                    onValueChange={(value) => updateNestedSetting('customTracking', 'placement', value)}
                  >
                    <SelectTrigger data-testid="select-placement">
                      <SelectValue placeholder="Select placement" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="head">Head Section</SelectItem>
                      <SelectItem value="body">Body Section</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Heatmap Analytics</span>
                </CardTitle>
                <CardDescription>Configure heatmap and user behavior tracking</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="heatmap-enabled">Enable Heatmaps</Label>
                    <p className="text-sm text-gray-500">Track user clicks and scrolling behavior</p>
                  </div>
                  <Switch
                    id="heatmap-enabled"
                    checked={settings.heatmaps.enabled}
                    onCheckedChange={(checked) => updateNestedSetting('heatmaps', 'enabled', checked)}
                    data-testid="switch-heatmap-enabled"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="heatmap-provider">Provider</Label>
                  <Select
                    value={settings.heatmaps.provider}
                    onValueChange={(value) => updateNestedSetting('heatmaps', 'provider', value)}
                  >
                    <SelectTrigger data-testid="select-heatmap-provider">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hotjar">Hotjar</SelectItem>
                      <SelectItem value="mouseflow">Mouseflow</SelectItem>
                      <SelectItem value="crazyegg">Crazy Egg</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="site-id">Site ID</Label>
                  <Input
                    id="site-id"
                    value={settings.heatmaps.siteId}
                    onChange={(e) => updateNestedSetting('heatmaps', 'siteId', e.target.value)}
                    placeholder="Enter your site ID"
                    data-testid="input-site-id"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5" />
                  <span>Privacy Settings</span>
                </CardTitle>
                <CardDescription>Configure privacy compliance and data protection</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="cookie-consent">Cookie Consent</Label>
                    <p className="text-sm text-gray-500">Show cookie consent banner</p>
                  </div>
                  <Switch
                    id="cookie-consent"
                    checked={settings.privacy.cookieConsent}
                    onCheckedChange={(checked) => updateNestedSetting('privacy', 'cookieConsent', checked)}
                    data-testid="switch-cookie-consent"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="gdpr-compliant">GDPR Compliant</Label>
                    <p className="text-sm text-gray-500">Follow GDPR data protection rules</p>
                  </div>
                  <Switch
                    id="gdpr-compliant"
                    checked={settings.privacy.gdprCompliant}
                    onCheckedChange={(checked) => updateNestedSetting('privacy', 'gdprCompliant', checked)}
                    data-testid="switch-gdpr-compliant"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="allow-opt-out">Allow Opt-out</Label>
                    <p className="text-sm text-gray-500">Let users opt out of tracking</p>
                  </div>
                  <Switch
                    id="allow-opt-out"
                    checked={settings.privacy.allowOptOut}
                    onCheckedChange={(checked) => updateNestedSetting('privacy', 'allowOptOut', checked)}
                    data-testid="switch-allow-opt-out"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data-retention">Data Retention (days)</Label>
                  <Input
                    id="data-retention"
                    type="number"
                    value={settings.privacy.dataRetentionDays}
                    onChange={(e) => updateNestedSetting('privacy', 'dataRetentionDays', e.target.value)}
                    data-testid="input-data-retention"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reporting" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Analytics Reporting</span>
                </CardTitle>
                <CardDescription>Configure automated analytics reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="reporting-enabled">Enable Reports</Label>
                    <p className="text-sm text-gray-500">Send automated analytics reports</p>
                  </div>
                  <Switch
                    id="reporting-enabled"
                    checked={settings.reporting.enabled}
                    onCheckedChange={(checked) => updateNestedSetting('reporting', 'enabled', checked)}
                    data-testid="switch-reporting-enabled"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frequency">Report Frequency</Label>
                  <Select
                    value={settings.reporting.frequency}
                    onValueChange={(value) => updateNestedSetting('reporting', 'frequency', value)}
                  >
                    <SelectTrigger data-testid="select-frequency">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Report Content</h4>
                  {[
                    { key: 'includeRevenue', label: 'Include Revenue Data' },
                    { key: 'includeUserMetrics', label: 'Include User Metrics' },
                    { key: 'includePerformance', label: 'Include Performance Data' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between">
                      <Label htmlFor={item.key}>{item.label}</Label>
                      <Switch
                        id={item.key}
                        checked={settings.reporting[item.key as keyof typeof settings.reporting] as boolean}
                        onCheckedChange={(checked) => updateNestedSetting('reporting', item.key, checked)}
                        data-testid={`switch-${item.key}`}
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