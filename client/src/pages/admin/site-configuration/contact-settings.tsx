import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Phone, 
  ArrowLeft, 
  Save,
  Mail,
  MapPin,
  Clock,
  Globe
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from '../layout';

export default function ContactSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    companyName: 'Aavincart - Tamil Nadu Cooperative Milk Producers Federation',
    email: 'support@aavincart.com',
    phone: '+91 435-2424566',
    address: 'Aavincart, Kumbakonam, Thanjavur District, Tamil Nadu, India',
    website: 'https://aavincart.com',
    supportHours: 'Monday - Friday: 9:00 AM - 6:00 PM',
    emergencyContact: '+1 (555) 999-0000',
    socialMedia: {
      facebook: 'https://facebook.com/aavincart',
      twitter: 'https://twitter.com/aavincart',
      instagram: 'https://instagram.com/aavincart',
    },
    contactForm: {
      enabled: true,
      requireAuth: false,
      autoReply: true,
      departments: ['General Support', 'Technical Issues', 'Billing', 'Partnerships'],
    },
    footerDisplay: {
      showPhone: true,
      showEmail: true,
      showAddress: true,
      showSocialMedia: true,
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
        description: "Contact settings saved successfully",
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
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-contact-settings">
              Contact Settings
            </h1>
            <p className="text-gray-600">Manage company contact information and display settings</p>
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
                <Phone className="h-5 w-5" />
                <span>Basic Contact Information</span>
              </CardTitle>
              <CardDescription>Primary contact details for your business</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input
                    id="company-name"
                    value={settings.companyName}
                    onChange={(e) => updateSetting('companyName', e.target.value)}
                    data-testid="input-company-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.email}
                    onChange={(e) => updateSetting('email', e.target.value)}
                    data-testid="input-email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={settings.phone}
                    onChange={(e) => updateSetting('phone', e.target.value)}
                    data-testid="input-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency-contact">Emergency Contact</Label>
                  <Input
                    id="emergency-contact"
                    value={settings.emergencyContact}
                    onChange={(e) => updateSetting('emergencyContact', e.target.value)}
                    data-testid="input-emergency-contact"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={settings.address}
                  onChange={(e) => updateSetting('address', e.target.value)}
                  data-testid="textarea-address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Website URL</Label>
                  <Input
                    id="website"
                    type="url"
                    value={settings.website}
                    onChange={(e) => updateSetting('website', e.target.value)}
                    data-testid="input-website"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support-hours">Support Hours</Label>
                  <Input
                    id="support-hours"
                    value={settings.supportHours}
                    onChange={(e) => updateSetting('supportHours', e.target.value)}
                    data-testid="input-support-hours"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>Social Media Links</span>
              </CardTitle>
              <CardDescription>Social media profiles and links</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook URL</Label>
                <Input
                  id="facebook"
                  type="url"
                  value={settings.socialMedia.facebook}
                  onChange={(e) => updateNestedSetting('socialMedia', 'facebook', e.target.value)}
                  data-testid="input-facebook"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitter">Twitter URL</Label>
                <Input
                  id="twitter"
                  type="url"
                  value={settings.socialMedia.twitter}
                  onChange={(e) => updateNestedSetting('socialMedia', 'twitter', e.target.value)}
                  data-testid="input-twitter"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram URL</Label>
                <Input
                  id="instagram"
                  type="url"
                  value={settings.socialMedia.instagram}
                  onChange={(e) => updateNestedSetting('socialMedia', 'instagram', e.target.value)}
                  data-testid="input-instagram"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="h-5 w-5" />
                <span>Contact Form Settings</span>
              </CardTitle>
              <CardDescription>Configure the contact form behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="contact-form-enabled">Enable Contact Form</Label>
                  <p className="text-sm text-gray-500">Allow visitors to submit contact inquiries</p>
                </div>
                <Switch
                  id="contact-form-enabled"
                  checked={settings.contactForm.enabled}
                  onCheckedChange={(checked) => updateNestedSetting('contactForm', 'enabled', checked)}
                  data-testid="switch-contact-form-enabled"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="require-auth">Require Authentication</Label>
                  <p className="text-sm text-gray-500">Users must be logged in to use contact form</p>
                </div>
                <Switch
                  id="require-auth"
                  checked={settings.contactForm.requireAuth}
                  onCheckedChange={(checked) => updateNestedSetting('contactForm', 'requireAuth', checked)}
                  data-testid="switch-require-auth"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-reply">Auto Reply</Label>
                  <p className="text-sm text-gray-500">Send automatic confirmation emails</p>
                </div>
                <Switch
                  id="auto-reply"
                  checked={settings.contactForm.autoReply}
                  onCheckedChange={(checked) => updateNestedSetting('contactForm', 'autoReply', checked)}
                  data-testid="switch-auto-reply"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Display Settings</span>
              </CardTitle>
              <CardDescription>Control which contact information appears in the footer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'showPhone', label: 'Show Phone Number' },
                { key: 'showEmail', label: 'Show Email Address' },
                { key: 'showAddress', label: 'Show Address' },
                { key: 'showSocialMedia', label: 'Show Social Media Links' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <Label htmlFor={item.key}>{item.label}</Label>
                  <Switch
                    id={item.key}
                    checked={settings.footerDisplay[item.key as keyof typeof settings.footerDisplay]}
                    onCheckedChange={(checked) => updateNestedSetting('footerDisplay', item.key, checked)}
                    data-testid={`switch-${item.key}`}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}