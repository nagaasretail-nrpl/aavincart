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
  Shield, 
  ArrowLeft, 
  Save,
  Eye,
  Cookie,
  Lock,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from '../layout';

export default function GdprCookieConsent() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    gdprCompliance: {
      enabled: true,
      showConsentBanner: true,
      requireExplicitConsent: true,
      allowOptOut: true,
      dataRetentionPeriod: 1095, // days (3 years)
      contactEmail: 'privacy@foodiehub.com',
      dpoEmail: 'dpo@foodiehub.com',
    },
    cookieConsent: {
      enabled: true,
      position: 'bottom', // top, bottom
      theme: 'light', // light, dark
      acceptAllButton: true,
      rejectAllButton: true,
      customizeButton: true,
      cookieSettings: true,
    },
    consentBanner: {
      title: 'We value your privacy',
      message: 'We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.',
      acceptText: 'Accept All',
      rejectText: 'Reject All',
      customizeText: 'Customize',
      backgroundColor: '#ffffff',
      textColor: '#333333',
      buttonColor: '#ff6b35',
    },
    cookieCategories: {
      necessary: {
        enabled: true,
        required: true,
        name: 'Necessary Cookies',
        description: 'These cookies are essential for the website to function properly.',
        cookies: ['session_id', 'csrf_token', 'user_preferences'],
      },
      analytics: {
        enabled: false,
        required: false,
        name: 'Analytics Cookies',
        description: 'These cookies help us understand how visitors interact with our website.',
        cookies: ['_ga', '_gid', '_gat'],
      },
      marketing: {
        enabled: false,
        required: false,
        name: 'Marketing Cookies',
        description: 'These cookies are used to personalize advertising content.',
        cookies: ['_fbp', '_fbc', 'ads_user_id'],
      },
      functional: {
        enabled: false,
        required: false,
        name: 'Functional Cookies',
        description: 'These cookies enable enhanced functionality and personalization.',
        cookies: ['language_preference', 'region_setting'],
      },
    },
    privacyPolicy: {
      url: '/privacy-policy',
      lastUpdated: '2024-01-15',
      autoGenerate: false,
      includeRightToErasure: true,
      includeDataPortability: true,
      includeRightToRectification: true,
    },
    dataRequests: {
      automatedProcessing: false,
      responseTimeLimit: 30, // days
      requestFormUrl: '/data-request',
      notificationEmail: 'privacy@foodiehub.com',
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
        description: "GDPR and cookie consent settings saved successfully",
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

  const updateCookieCategory = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      cookieCategories: {
        ...prev.cookieCategories,
        [category]: {
          ...prev.cookieCategories[category as keyof typeof prev.cookieCategories],
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
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-gdpr-cookie-consent">
              GDPR Cookie Consent
            </h1>
            <p className="text-gray-600">Configure GDPR compliance and cookie consent settings</p>
          </div>
          
          <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-settings">
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>

        <Tabs defaultValue="gdpr" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
            <TabsTrigger value="gdpr">GDPR</TabsTrigger>
            <TabsTrigger value="consent">Consent Banner</TabsTrigger>
            <TabsTrigger value="cookies">Cookie Categories</TabsTrigger>
            <TabsTrigger value="privacy">Privacy Policy</TabsTrigger>
            <TabsTrigger value="requests">Data Requests</TabsTrigger>
          </TabsList>
          
          <TabsContent value="gdpr" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>GDPR Compliance Settings</span>
                </CardTitle>
                <CardDescription>Configure General Data Protection Regulation compliance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="gdpr-enabled">Enable GDPR Compliance</Label>
                    <p className="text-sm text-gray-500">Activate GDPR compliance features</p>
                  </div>
                  <Switch
                    id="gdpr-enabled"
                    checked={settings.gdprCompliance.enabled}
                    onCheckedChange={(checked) => updateNestedSetting('gdprCompliance', 'enabled', checked)}
                    data-testid="switch-gdpr-enabled"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="show-consent-banner">Show Consent Banner</Label>
                    <p className="text-sm text-gray-500">Display cookie consent banner to users</p>
                  </div>
                  <Switch
                    id="show-consent-banner"
                    checked={settings.gdprCompliance.showConsentBanner}
                    onCheckedChange={(checked) => updateNestedSetting('gdprCompliance', 'showConsentBanner', checked)}
                    data-testid="switch-show-consent-banner"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="require-explicit-consent">Require Explicit Consent</Label>
                    <p className="text-sm text-gray-500">Users must actively accept cookies</p>
                  </div>
                  <Switch
                    id="require-explicit-consent"
                    checked={settings.gdprCompliance.requireExplicitConsent}
                    onCheckedChange={(checked) => updateNestedSetting('gdprCompliance', 'requireExplicitConsent', checked)}
                    data-testid="switch-require-explicit-consent"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="allow-opt-out">Allow Opt-out</Label>
                    <p className="text-sm text-gray-500">Users can withdraw consent at any time</p>
                  </div>
                  <Switch
                    id="allow-opt-out"
                    checked={settings.gdprCompliance.allowOptOut}
                    onCheckedChange={(checked) => updateNestedSetting('gdprCompliance', 'allowOptOut', checked)}
                    data-testid="switch-allow-opt-out"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="data-retention">Data Retention Period (days)</Label>
                    <Input
                      id="data-retention"
                      type="number"
                      min="30"
                      max="3650"
                      value={settings.gdprCompliance.dataRetentionPeriod}
                      onChange={(e) => updateNestedSetting('gdprCompliance', 'dataRetentionPeriod', parseInt(e.target.value))}
                      data-testid="input-data-retention"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact-email">Privacy Contact Email</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={settings.gdprCompliance.contactEmail}
                      onChange={(e) => updateNestedSetting('gdprCompliance', 'contactEmail', e.target.value)}
                      data-testid="input-contact-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dpo-email">Data Protection Officer Email</Label>
                    <Input
                      id="dpo-email"
                      type="email"
                      value={settings.gdprCompliance.dpoEmail}
                      onChange={(e) => updateNestedSetting('gdprCompliance', 'dpoEmail', e.target.value)}
                      data-testid="input-dpo-email"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="consent" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Cookie className="h-5 w-5" />
                  <span>Consent Banner Configuration</span>
                </CardTitle>
                <CardDescription>Customize the appearance and behavior of the consent banner</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="banner-position">Banner Position</Label>
                    <Select
                      value={settings.cookieConsent.position}
                      onValueChange={(value) => updateNestedSetting('cookieConsent', 'position', value)}
                    >
                      <SelectTrigger data-testid="select-banner-position">
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top">Top</SelectItem>
                        <SelectItem value="bottom">Bottom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="banner-theme">Theme</Label>
                    <Select
                      value={settings.cookieConsent.theme}
                      onValueChange={(value) => updateNestedSetting('cookieConsent', 'theme', value)}
                    >
                      <SelectTrigger data-testid="select-banner-theme">
                        <SelectValue placeholder="Select theme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="banner-title">Banner Title</Label>
                  <Input
                    id="banner-title"
                    value={settings.consentBanner.title}
                    onChange={(e) => updateNestedSetting('consentBanner', 'title', e.target.value)}
                    data-testid="input-banner-title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="banner-message">Banner Message</Label>
                  <Textarea
                    id="banner-message"
                    value={settings.consentBanner.message}
                    onChange={(e) => updateNestedSetting('consentBanner', 'message', e.target.value)}
                    data-testid="textarea-banner-message"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="accept-text">Accept Button Text</Label>
                    <Input
                      id="accept-text"
                      value={settings.consentBanner.acceptText}
                      onChange={(e) => updateNestedSetting('consentBanner', 'acceptText', e.target.value)}
                      data-testid="input-accept-text"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reject-text">Reject Button Text</Label>
                    <Input
                      id="reject-text"
                      value={settings.consentBanner.rejectText}
                      onChange={(e) => updateNestedSetting('consentBanner', 'rejectText', e.target.value)}
                      data-testid="input-reject-text"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customize-text">Customize Button Text</Label>
                    <Input
                      id="customize-text"
                      value={settings.consentBanner.customizeText}
                      onChange={(e) => updateNestedSetting('consentBanner', 'customizeText', e.target.value)}
                      data-testid="input-customize-text"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Button Options</h4>
                  {[
                    { key: 'acceptAllButton', label: 'Show "Accept All" Button' },
                    { key: 'rejectAllButton', label: 'Show "Reject All" Button' },
                    { key: 'customizeButton', label: 'Show "Customize" Button' },
                    { key: 'cookieSettings', label: 'Show Cookie Settings Link' },
                  ].map((option) => (
                    <div key={option.key} className="flex items-center justify-between">
                      <Label htmlFor={option.key}>{option.label}</Label>
                      <Switch
                        id={option.key}
                        checked={settings.cookieConsent[option.key as keyof typeof settings.cookieConsent] as boolean}
                        onCheckedChange={(checked) => updateNestedSetting('cookieConsent', option.key, checked)}
                        data-testid={`switch-${option.key}`}
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bg-color">Background Color</Label>
                    <Input
                      id="bg-color"
                      type="color"
                      value={settings.consentBanner.backgroundColor}
                      onChange={(e) => updateNestedSetting('consentBanner', 'backgroundColor', e.target.value)}
                      data-testid="input-bg-color"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="text-color">Text Color</Label>
                    <Input
                      id="text-color"
                      type="color"
                      value={settings.consentBanner.textColor}
                      onChange={(e) => updateNestedSetting('consentBanner', 'textColor', e.target.value)}
                      data-testid="input-text-color"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="button-color">Button Color</Label>
                    <Input
                      id="button-color"
                      type="color"
                      value={settings.consentBanner.buttonColor}
                      onChange={(e) => updateNestedSetting('consentBanner', 'buttonColor', e.target.value)}
                      data-testid="input-button-color"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cookies" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Cookie className="h-5 w-5" />
                  <span>Cookie Categories</span>
                </CardTitle>
                <CardDescription>Define and manage different types of cookies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(settings.cookieCategories).map(([key, category]) => (
                  <div key={key} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{category.name}</h4>
                      <Switch
                        checked={category.enabled}
                        onCheckedChange={(checked) => updateCookieCategory(key, 'enabled', checked)}
                        disabled={category.required}
                        data-testid={`switch-category-${key}`}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${key}-description`}>Description</Label>
                      <Textarea
                        id={`${key}-description`}
                        value={category.description}
                        onChange={(e) => updateCookieCategory(key, 'description', e.target.value)}
                        data-testid={`textarea-${key}-description`}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${key}-cookies`}>Cookies (comma-separated)</Label>
                      <Input
                        id={`${key}-cookies`}
                        value={category.cookies.join(', ')}
                        onChange={(e) => updateCookieCategory(key, 'cookies', e.target.value.split(',').map(s => s.trim()))}
                        data-testid={`input-${key}-cookies`}
                      />
                    </div>

                    {category.required && (
                      <p className="text-sm text-orange-600">This category is required and cannot be disabled</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Privacy Policy Settings</span>
                </CardTitle>
                <CardDescription>Configure privacy policy and user rights</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="privacy-url">Privacy Policy URL</Label>
                  <Input
                    id="privacy-url"
                    value={settings.privacyPolicy.url}
                    onChange={(e) => updateNestedSetting('privacyPolicy', 'url', e.target.value)}
                    data-testid="input-privacy-url"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last-updated">Last Updated</Label>
                  <Input
                    id="last-updated"
                    type="date"
                    value={settings.privacyPolicy.lastUpdated}
                    onChange={(e) => updateNestedSetting('privacyPolicy', 'lastUpdated', e.target.value)}
                    data-testid="input-last-updated"
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">User Rights</h4>
                  {[
                    { key: 'includeRightToErasure', label: 'Right to Erasure (Right to be Forgotten)' },
                    { key: 'includeDataPortability', label: 'Data Portability' },
                    { key: 'includeRightToRectification', label: 'Right to Rectification' },
                  ].map((right) => (
                    <div key={right.key} className="flex items-center justify-between">
                      <Label htmlFor={right.key}>{right.label}</Label>
                      <Switch
                        id={right.key}
                        checked={settings.privacyPolicy[right.key as keyof typeof settings.privacyPolicy] as boolean}
                        onCheckedChange={(checked) => updateNestedSetting('privacyPolicy', right.key, checked)}
                        data-testid={`switch-${right.key}`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lock className="h-5 w-5" />
                  <span>Data Request Settings</span>
                </CardTitle>
                <CardDescription>Configure handling of user data requests</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="automated-processing">Automated Processing</Label>
                    <p className="text-sm text-gray-500">Automatically process simple data requests</p>
                  </div>
                  <Switch
                    id="automated-processing"
                    checked={settings.dataRequests.automatedProcessing}
                    onCheckedChange={(checked) => updateNestedSetting('dataRequests', 'automatedProcessing', checked)}
                    data-testid="switch-automated-processing"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="response-time">Response Time Limit (days)</Label>
                  <Input
                    id="response-time"
                    type="number"
                    min="1"
                    max="90"
                    value={settings.dataRequests.responseTimeLimit}
                    onChange={(e) => updateNestedSetting('dataRequests', 'responseTimeLimit', parseInt(e.target.value))}
                    data-testid="input-response-time"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="request-form-url">Data Request Form URL</Label>
                  <Input
                    id="request-form-url"
                    value={settings.dataRequests.requestFormUrl}
                    onChange={(e) => updateNestedSetting('dataRequests', 'requestFormUrl', e.target.value)}
                    data-testid="input-request-form-url"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notification-email">Notification Email</Label>
                  <Input
                    id="notification-email"
                    type="email"
                    value={settings.dataRequests.notificationEmail}
                    onChange={(e) => updateNestedSetting('dataRequests', 'notificationEmail', e.target.value)}
                    data-testid="input-notification-email"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}