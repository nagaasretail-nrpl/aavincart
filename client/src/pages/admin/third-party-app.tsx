import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Save, Puzzle, Smartphone, Globe, Mail, MessageSquare, Map, BarChart, ArrowLeft, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from './layout';

interface ThirdPartyApp {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
  apiKey: string;
  secretKey: string;
  webhookUrl: string;
  icon: React.ReactNode;
  description: string;
  features: string[];
}

export default function ThirdPartyAppManagement() {
  const { toast } = useToast();
  
  const [apps, setApps] = useState<ThirdPartyApp[]>([
    {
      id: 'google-analytics',
      name: 'Google Analytics',
      category: 'Analytics',
      enabled: false,
      apiKey: '',
      secretKey: '',
      webhookUrl: '',
      icon: <BarChart className="h-5 w-5" />,
      description: 'Track website traffic and user behavior',
      features: ['Traffic Analysis', 'User Behavior', 'Conversion Tracking']
    },
    {
      id: 'google-maps',
      name: 'Google Maps',
      category: 'Maps',
      enabled: true,
      apiKey: '',
      secretKey: '',
      webhookUrl: '',
      icon: <Map className="h-5 w-5" />,
      description: 'Location services and mapping',
      features: ['Address Validation', 'Distance Calculation', 'Delivery Tracking']
    },
    {
      id: 'twilio',
      name: 'Twilio SMS',
      category: 'Communication',
      enabled: false,
      apiKey: '',
      secretKey: '',
      webhookUrl: '',
      icon: <MessageSquare className="h-5 w-5" />,
      description: 'SMS notifications and alerts',
      features: ['Order Notifications', 'Delivery Updates', 'Marketing SMS']
    },
    {
      id: 'sendgrid',
      name: 'SendGrid',
      category: 'Email',
      enabled: false,
      apiKey: '',
      secretKey: '',
      webhookUrl: '',
      icon: <Mail className="h-5 w-5" />,
      description: 'Email delivery and marketing',
      features: ['Transactional Emails', 'Marketing Campaigns', 'Email Analytics']
    },
    {
      id: 'firebase',
      name: 'Firebase',
      category: 'Mobile',
      enabled: false,
      apiKey: '',
      secretKey: '',
      webhookUrl: '',
      icon: <Smartphone className="h-5 w-5" />,
      description: 'Mobile app backend services',
      features: ['Push Notifications', 'Real-time Database', 'Authentication']
    },
    {
      id: 'social-login',
      name: 'Social Login',
      category: 'Authentication',
      enabled: false,
      apiKey: '',
      secretKey: '',
      webhookUrl: '',
      icon: <Globe className="h-5 w-5" />,
      description: 'Facebook, Google, and social media login',
      features: ['OAuth Integration', 'Social Registration', 'Profile Sync']
    }
  ]);

  const updateApp = (id: string, updates: Partial<ThirdPartyApp>) => {
    setApps(prev => prev.map(app => 
      app.id === id ? { ...app, ...updates } : app
    ));
  };

  const handleSave = () => {
    // In a real app, this would save to the backend
    toast({
      title: "Success",
      description: "Third-party app settings updated successfully",
    });
  };

  const enabledApps = apps.filter(app => app.enabled);
  const categories = Array.from(new Set(apps.map(app => app.category)));

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
          <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-third-party">
            Third Party Applications
          </h1>
          <p className="text-gray-600">Integrate external services and APIs</p>
        </div>
        
        <Button onClick={handleSave} data-testid="button-save-integrations">
          <Save className="h-4 w-4 mr-2" />
          Save Configuration
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Apps</CardTitle>
            <Puzzle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stats-active-apps">
              {enabledApps.length}
            </div>
            <p className="text-xs text-muted-foreground">Integrated services</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stats-categories">
              {categories.length}
            </div>
            <p className="text-xs text-muted-foreground">Service types</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stats-available">
              {apps.length}
            </div>
            <p className="text-xs text-muted-foreground">Total integrations</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Configured</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stats-configured">
              {apps.filter(app => app.apiKey && app.enabled).length}
            </div>
            <p className="text-xs text-muted-foreground">Ready to use</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {categories.map(category => (
            <TabsTrigger key={category} value={category.toLowerCase()}>
              {category}
            </TabsTrigger>
          ))}
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Third Party Applications</CardTitle>
              <CardDescription>Status and configuration of all integrated services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {apps.map((app) => (
                  <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`app-${app.id}`}>
                    <div className="flex items-center space-x-4">
                      {app.icon}
                      <div>
                        <div className="font-medium">{app.name}</div>
                        <div className="text-sm text-gray-500">{app.description}</div>
                        <div className="flex space-x-1 mt-1">
                          {app.features.slice(0, 2).map((feature, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                          {app.features.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{app.features.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge variant="secondary">{app.category}</Badge>
                      <Badge variant={app.enabled ? 'default' : 'secondary'}>
                        {app.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                      {app.id === 'google-maps' && (
                        <Link href="/admin/google-maps">
                          <Button variant="outline" size="sm" className="text-xs">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Configure
                          </Button>
                        </Link>
                      )}
                      <Switch
                        checked={app.enabled}
                        onCheckedChange={(checked) => updateApp(app.id, { enabled: checked })}
                        data-testid={`switch-${app.id}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {categories.map(category => (
          <TabsContent key={category} value={category.toLowerCase()} className="space-y-6">
            <div className="grid gap-6">
              {apps.filter(app => app.category === category).map((app) => (
                <Card key={app.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      {app.icon}
                      <span>{app.name}</span>
                    </CardTitle>
                    <CardDescription>{app.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={app.enabled}
                        onCheckedChange={(checked) => updateApp(app.id, { enabled: checked })}
                        data-testid={`switch-enable-${app.id}`}
                      />
                      <Label>Enable {app.name}</Label>
                    </div>
                    
                    {app.enabled && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`${app.id}-api-key`}>API Key</Label>
                            <Input
                              id={`${app.id}-api-key`}
                              type="password"
                              value={app.apiKey}
                              onChange={(e) => updateApp(app.id, { apiKey: e.target.value })}
                              placeholder="Enter API key"
                              data-testid={`input-api-key-${app.id}`}
                            />
                          </div>
                          {app.category !== 'Analytics' && (
                            <div className="space-y-2">
                              <Label htmlFor={`${app.id}-secret-key`}>Secret Key</Label>
                              <Input
                                id={`${app.id}-secret-key`}
                                type="password"
                                value={app.secretKey}
                                onChange={(e) => updateApp(app.id, { secretKey: e.target.value })}
                                placeholder="Enter secret key"
                                data-testid={`input-secret-key-${app.id}`}
                              />
                            </div>
                          )}
                        </div>
                        
                        {(app.category === 'Communication' || app.category === 'Email') && (
                          <div className="space-y-2">
                            <Label htmlFor={`${app.id}-webhook`}>Webhook URL</Label>
                            <Input
                              id={`${app.id}-webhook`}
                              value={app.webhookUrl}
                              onChange={(e) => updateApp(app.id, { webhookUrl: e.target.value })}
                              placeholder="Enter webhook URL"
                              data-testid={`input-webhook-${app.id}`}
                            />
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <Label>Features</Label>
                          <div className="flex flex-wrap gap-2">
                            {app.features.map((feature, index) => (
                              <Badge key={index} variant="outline">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
    </AdminLayout>
  );
}