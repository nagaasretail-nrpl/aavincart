import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  ArrowLeft, 
  Save,
  Send,
  Users,
  Clock,
  Target
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from '../layout';

export default function PushNotifications() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    pushEnabled: true,
    firebaseConfig: {
      apiKey: '',
      authDomain: '',
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: '',
    },
    templates: {
      orderConfirmed: {
        title: 'Order Confirmed!',
        body: 'Your order #{{orderNumber}} has been confirmed and is being prepared.',
        icon: '/icons/order-confirmed.png',
        enabled: true,
      },
      orderReady: {
        title: 'Order Ready',
        body: 'Your order #{{orderNumber}} is ready for pickup!',
        icon: '/icons/order-ready.png',
        enabled: true,
      },
      deliveryStarted: {
        title: 'Delivery Started',
        body: 'Your order is on the way! Track your delivery in the app.',
        icon: '/icons/delivery.png',
        enabled: true,
      },
      delivered: {
        title: 'Order Delivered',
        body: 'Your order has been delivered. Enjoy your meal!',
        icon: '/icons/delivered.png',
        enabled: true,
      },
      promotion: {
        title: 'Special Offer',
        body: 'Get {{discount}}% off your next order. Use code: {{code}}',
        icon: '/icons/promotion.png',
        enabled: false,
      },
    },
    targeting: {
      byLocation: false,
      byUserType: false,
      byOrderHistory: false,
      locationRadius: 10, // km
    },
    scheduling: {
      timezone: 'America/New_York',
      quietHours: {
        enabled: true,
        start: '22:00',
        end: '08:00',
      },
    },
    analytics: {
      trackOpens: true,
      trackClicks: true,
      trackConversions: false,
    },
    campaigns: [
      {
        id: '1',
        name: 'Weekend Special',
        status: 'active',
        sent: 1250,
        opened: 780,
        clicked: 156,
        scheduled: '2024-01-20 10:00',
      },
      {
        id: '2',
        name: 'New Union Alert',
        status: 'completed',
        sent: 2100,
        opened: 1470,
        clicked: 294,
        scheduled: '2024-01-15 14:30',
      },
    ],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof settings) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Push notification settings saved successfully",
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

  const sendTestNotification = useMutation({
    mutationFn: async (template: string) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return template;
    },
    onSuccess: (template) => {
      toast({
        title: "Test Sent",
        description: `Test notification for "${template}" sent successfully`,
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

  const updateTemplate = (templateKey: string, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      templates: {
        ...prev.templates,
        [templateKey]: {
          ...prev.templates[templateKey as keyof typeof prev.templates],
          [field]: value
        }
      }
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
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-push-notifications">
              Push Notifications
            </h1>
            <p className="text-gray-600">Configure push notification settings and templates</p>
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
                <MessageSquare className="h-5 w-5" />
                <span>Push Notification Settings</span>
              </CardTitle>
              <CardDescription>Configure general push notification behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="push-enabled">Enable Push Notifications</Label>
                  <p className="text-sm text-gray-500">Allow sending push notifications to users</p>
                </div>
                <Switch
                  id="push-enabled"
                  checked={settings.pushEnabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, pushEnabled: checked }))}
                  data-testid="switch-push-enabled"
                />
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Firebase Configuration</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="api-key">API Key</Label>
                    <Input
                      id="api-key"
                      type="password"
                      value={settings.firebaseConfig.apiKey}
                      onChange={(e) => updateNestedSetting('firebaseConfig', 'apiKey', e.target.value)}
                      data-testid="input-api-key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-id">Project ID</Label>
                    <Input
                      id="project-id"
                      value={settings.firebaseConfig.projectId}
                      onChange={(e) => updateNestedSetting('firebaseConfig', 'projectId', e.target.value)}
                      data-testid="input-project-id"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sender-id">Messaging Sender ID</Label>
                    <Input
                      id="sender-id"
                      value={settings.firebaseConfig.messagingSenderId}
                      onChange={(e) => updateNestedSetting('firebaseConfig', 'messagingSenderId', e.target.value)}
                      data-testid="input-sender-id"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="app-id">App ID</Label>
                    <Input
                      id="app-id"
                      value={settings.firebaseConfig.appId}
                      onChange={(e) => updateNestedSetting('firebaseConfig', 'appId', e.target.value)}
                      data-testid="input-app-id"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Send className="h-5 w-5" />
                <span>Notification Templates</span>
              </CardTitle>
              <CardDescription>Customize notification messages for different events</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(settings.templates).map(([key, template]) => (
                <div key={key} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium capitalize">
                      {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={template.enabled}
                        onCheckedChange={(checked) => updateTemplate(key, 'enabled', checked)}
                        data-testid={`switch-${key}-enabled`}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendTestNotification.mutate(key)}
                        disabled={sendTestNotification.isPending}
                        data-testid={`button-test-${key}`}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Test
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`${key}-title`}>Title</Label>
                      <Input
                        id={`${key}-title`}
                        value={template.title}
                        onChange={(e) => updateTemplate(key, 'title', e.target.value)}
                        data-testid={`input-${key}-title`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${key}-icon`}>Icon URL</Label>
                      <Input
                        id={`${key}-icon`}
                        value={template.icon}
                        onChange={(e) => updateTemplate(key, 'icon', e.target.value)}
                        data-testid={`input-${key}-icon`}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`${key}-body`}>Message Body</Label>
                    <Textarea
                      id={`${key}-body`}
                      value={template.body}
                      onChange={(e) => updateTemplate(key, 'body', e.target.value)}
                      data-testid={`textarea-${key}-body`}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Targeting Options</span>
              </CardTitle>
              <CardDescription>Configure user targeting and segmentation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="by-location">Target by Location</Label>
                  <p className="text-sm text-gray-500">Send notifications based on user location</p>
                </div>
                <Switch
                  id="by-location"
                  checked={settings.targeting.byLocation}
                  onCheckedChange={(checked) => updateNestedSetting('targeting', 'byLocation', checked)}
                  data-testid="switch-by-location"
                />
              </div>

              {settings.targeting.byLocation && (
                <div className="space-y-2 ml-6">
                  <Label htmlFor="location-radius">Location Radius (km)</Label>
                  <Input
                    id="location-radius"
                    type="number"
                    min="1"
                    max="100"
                    value={settings.targeting.locationRadius}
                    onChange={(e) => updateNestedSetting('targeting', 'locationRadius', parseInt(e.target.value))}
                    data-testid="input-location-radius"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="by-user-type">Target by User Type</Label>
                  <p className="text-sm text-gray-500">Send different notifications to customers vs unions</p>
                </div>
                <Switch
                  id="by-user-type"
                  checked={settings.targeting.byUserType}
                  onCheckedChange={(checked) => updateNestedSetting('targeting', 'byUserType', checked)}
                  data-testid="switch-by-user-type"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="by-order-history">Target by Order History</Label>
                  <p className="text-sm text-gray-500">Target users based on their order patterns</p>
                </div>
                <Switch
                  id="by-order-history"
                  checked={settings.targeting.byOrderHistory}
                  onCheckedChange={(checked) => updateNestedSetting('targeting', 'byOrderHistory', checked)}
                  data-testid="switch-by-order-history"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Scheduling Settings</span>
              </CardTitle>
              <CardDescription>Configure notification timing and quiet hours</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={settings.scheduling.timezone}
                  onValueChange={(value) => updateNestedSetting('scheduling', 'timezone', value)}
                >
                  <SelectTrigger data-testid="select-timezone">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                    <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="quiet-hours-enabled">Quiet Hours</Label>
                    <p className="text-sm text-gray-500">Disable notifications during specified hours</p>
                  </div>
                  <Switch
                    id="quiet-hours-enabled"
                    checked={settings.scheduling.quietHours.enabled}
                    onCheckedChange={(checked) => updateDeepNestedSetting('scheduling', 'quietHours', 'enabled', checked)}
                    data-testid="switch-quiet-hours-enabled"
                  />
                </div>

                {settings.scheduling.quietHours.enabled && (
                  <div className="grid grid-cols-2 gap-4 ml-6">
                    <div className="space-y-2">
                      <Label htmlFor="quiet-start">Start Time</Label>
                      <Input
                        id="quiet-start"
                        type="time"
                        value={settings.scheduling.quietHours.start}
                        onChange={(e) => updateDeepNestedSetting('scheduling', 'quietHours', 'start', e.target.value)}
                        data-testid="input-quiet-start"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quiet-end">End Time</Label>
                      <Input
                        id="quiet-end"
                        type="time"
                        value={settings.scheduling.quietHours.end}
                        onChange={(e) => updateDeepNestedSetting('scheduling', 'quietHours', 'end', e.target.value)}
                        data-testid="input-quiet-end"
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Recent Campaigns</span>
              </CardTitle>
              <CardDescription>Overview of recent push notification campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {settings.campaigns.map((campaign) => (
                  <div key={campaign.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{campaign.name}</h4>
                      <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                        {campaign.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Sent</p>
                        <p className="font-medium">{campaign.sent.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Opened</p>
                        <p className="font-medium">{campaign.opened.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Clicked</p>
                        <p className="font-medium">{campaign.clicked.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Scheduled</p>
                        <p className="font-medium">{campaign.scheduled}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}