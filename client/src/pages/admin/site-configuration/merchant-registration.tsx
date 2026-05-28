import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Building2, 
  ArrowLeft, 
  Save,
  UserCheck,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from '../layout';

export default function MerchantRegistration() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    allowRegistration: true,
    requireApproval: true,
    requireDocuments: true,
    minimumCommission: '10',
    registrationFee: '0',
    approvalTimeout: '72',
    welcomeMessage: 'Welcome to our platform! Your registration is being reviewed.',
    requiredDocuments: ['business_license', 'tax_certificate', 'bank_details'],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof settings) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Union registration settings saved successfully",
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
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-merchant-registration">
              Union Registration
            </h1>
            <p className="text-gray-600">Configure union registration process and requirements</p>
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
                <Building2 className="h-5 w-5" />
                <span>Registration Settings</span>
              </CardTitle>
              <CardDescription>Configure basic registration policies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="allow-registration">Allow New Registrations</Label>
                  <p className="text-sm text-gray-500">Enable new unions to register on the platform</p>
                </div>
                <Switch
                  id="allow-registration"
                  checked={settings.allowRegistration}
                  onCheckedChange={(checked) => updateSetting('allowRegistration', checked)}
                  data-testid="switch-allow-registration"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="require-approval">Require Admin Approval</Label>
                  <p className="text-sm text-gray-500">New unions need admin approval before activation</p>
                </div>
                <Switch
                  id="require-approval"
                  checked={settings.requireApproval}
                  onCheckedChange={(checked) => updateSetting('requireApproval', checked)}
                  data-testid="switch-require-approval"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="require-documents">Require Documentation</Label>
                  <p className="text-sm text-gray-500">Unions must upload required documents</p>
                </div>
                <Switch
                  id="require-documents"
                  checked={settings.requireDocuments}
                  onCheckedChange={(checked) => updateSetting('requireDocuments', checked)}
                  data-testid="switch-require-documents"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserCheck className="h-5 w-5" />
                <span>Approval Process</span>
              </CardTitle>
              <CardDescription>Configure the union approval workflow</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minimum-commission">Minimum Commission (%)</Label>
                  <Input
                    id="minimum-commission"
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={settings.minimumCommission}
                    onChange={(e) => updateSetting('minimumCommission', e.target.value)}
                    data-testid="input-minimum-commission"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registration-fee">Registration Fee (₹)</Label>
                  <Input
                    id="registration-fee"
                    type="number"
                    step="0.01"
                    min="0"
                    value={settings.registrationFee}
                    onChange={(e) => updateSetting('registrationFee', e.target.value)}
                    data-testid="input-registration-fee"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="approval-timeout">Approval Timeout (hours)</Label>
                <Input
                  id="approval-timeout"
                  type="number"
                  min="1"
                  max="168"
                  value={settings.approvalTimeout}
                  onChange={(e) => updateSetting('approvalTimeout', e.target.value)}
                  data-testid="input-approval-timeout"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="welcome-message">Welcome Message</Label>
                <Textarea
                  id="welcome-message"
                  value={settings.welcomeMessage}
                  onChange={(e) => updateSetting('welcomeMessage', e.target.value)}
                  placeholder="Message shown to new unions after registration"
                  data-testid="textarea-welcome-message"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Required Documents</span>
              </CardTitle>
              <CardDescription>Manage document requirements for union registration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Document Requirements</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'business_license', label: 'Business License' },
                    { key: 'tax_certificate', label: 'Tax Certificate' },
                    { key: 'bank_details', label: 'Bank Details' },
                    { key: 'identity_proof', label: 'Identity Proof' },
                  ].map((doc) => (
                    <div key={doc.key} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={doc.key}
                        checked={settings.requiredDocuments.includes(doc.key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateSetting('requiredDocuments', [...settings.requiredDocuments, doc.key]);
                          } else {
                            updateSetting('requiredDocuments', settings.requiredDocuments.filter(d => d !== doc.key));
                          }
                        }}
                        data-testid={`checkbox-${doc.key}`}
                      />
                      <Label htmlFor={doc.key} className="text-sm">{doc.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}