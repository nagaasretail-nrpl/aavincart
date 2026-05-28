import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Globe, ArrowLeft, Save, Eye, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from './layout';

interface WebsiteConfig {
  siteName: string;
  tagline: string;
  description: string;
  logo: string;
  favicon: string;
  theme: string;
  enableMaintenance: boolean;
  maintenanceMessage: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  googleAnalytics: string;
  facebookPixel: string;
}

export default function Website() {
  const { toast } = useToast();
  const [config, setConfig] = useState<WebsiteConfig>({
    siteName: 'Aavincart - Tamil Nadu Cooperative Milk Producers\' Federation',
    tagline: 'Quality dairy products from farm to home',
    description: 'Order fresh milk and dairy products from Aavin - Tamil Nadu\'s trusted dairy brand since 1981',
    logo: '',
    favicon: '',
    theme: 'default',
    enableMaintenance: false,
    maintenanceMessage: 'We are currently under maintenance. Please check back later.',
    seoTitle: 'Aavincart - Tamil Nadu Cooperative Milk Producers\' Federation',
    seoDescription: 'Order fresh milk and dairy products from Aavin - Tamil Nadu\'s trusted dairy brand. Quality products from 27 district cooperatives.',
    seoKeywords: 'aavin, milk delivery, dairy products, tamil nadu, cooperative, TCMPF',
    googleAnalytics: '',
    facebookPixel: '',
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (configData: WebsiteConfig) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return configData;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Website settings updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update website settings",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveConfigMutation.mutate(config);
  };

  const updateConfig = (key: keyof WebsiteConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard">
              <Button variant="outline" size="sm" data-testid="button-back">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-website">
                Website Configuration
              </h1>
              <p className="text-gray-600">Configure website appearance and settings</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" data-testid="button-preview">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saveConfigMutation.isPending}
              data-testid="button-save-website"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveConfigMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="h-5 w-5" />
                  <span>General Settings</span>
                </CardTitle>
                <CardDescription>Basic website information and settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    value={config.tagline}
                    onChange={(e) => updateConfig('tagline', e.target.value)}
                    data-testid="input-tagline"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={config.description}
                    onChange={(e) => updateConfig('description', e.target.value)}
                    data-testid="textarea-description"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="branding" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Brand Assets</CardTitle>
                <CardDescription>Upload and manage your brand assets</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <div className="flex items-center space-x-4">
                    <Button variant="outline" data-testid="button-upload-logo">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Logo
                    </Button>
                    <span className="text-sm text-gray-500">Recommended: 200x60px, PNG format</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Favicon</Label>
                  <div className="flex items-center space-x-4">
                    <Button variant="outline" data-testid="button-upload-favicon">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Favicon
                    </Button>
                    <span className="text-sm text-gray-500">Recommended: 32x32px, ICO or PNG format</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Input
                    id="theme"
                    value={config.theme}
                    onChange={(e) => updateConfig('theme', e.target.value)}
                    placeholder="default"
                    data-testid="input-theme"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="seo" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>SEO Configuration</CardTitle>
                <CardDescription>Search engine optimization settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="seoTitle">Meta Title</Label>
                  <Input
                    id="seoTitle"
                    value={config.seoTitle}
                    onChange={(e) => updateConfig('seoTitle', e.target.value)}
                    data-testid="input-seo-title"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="seoDescription">Meta Description</Label>
                  <Textarea
                    id="seoDescription"
                    value={config.seoDescription}
                    onChange={(e) => updateConfig('seoDescription', e.target.value)}
                    data-testid="textarea-seo-description"
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="seoKeywords">Meta Keywords</Label>
                  <Input
                    id="seoKeywords"
                    value={config.seoKeywords}
                    onChange={(e) => updateConfig('seoKeywords', e.target.value)}
                    placeholder="keyword1, keyword2, keyword3"
                    data-testid="input-seo-keywords"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Analytics & Tracking</CardTitle>
                <CardDescription>Configure tracking codes for analytics platforms</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="googleAnalytics">Google Analytics Tracking ID</Label>
                  <Input
                    id="googleAnalytics"
                    value={config.googleAnalytics}
                    onChange={(e) => updateConfig('googleAnalytics', e.target.value)}
                    placeholder="GA-XXXXXXXXX-X"
                    data-testid="input-google-analytics"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="facebookPixel">Facebook Pixel ID</Label>
                  <Input
                    id="facebookPixel"
                    value={config.facebookPixel}
                    onChange={(e) => updateConfig('facebookPixel', e.target.value)}
                    placeholder="XXXXXXXXXXXXXXX"
                    data-testid="input-facebook-pixel"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="maintenance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Maintenance Mode</CardTitle>
                <CardDescription>Configure maintenance mode settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.enableMaintenance}
                    onCheckedChange={(checked) => updateConfig('enableMaintenance', checked)}
                    data-testid="switch-maintenance-mode"
                  />
                  <Label>Enable Maintenance Mode</Label>
                </div>
                
                {config.enableMaintenance && (
                  <div className="space-y-2">
                    <Label htmlFor="maintenanceMessage">Maintenance Message</Label>
                    <Textarea
                      id="maintenanceMessage"
                      value={config.maintenanceMessage}
                      onChange={(e) => updateConfig('maintenanceMessage', e.target.value)}
                      data-testid="textarea-maintenance-message"
                      rows={3}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}