import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Monitor, ArrowLeft, Save, QrCode, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from './layout';

export default function TablesideOrdering() {
  const { toast } = useToast();
  const [tablesideEnabled, setTablesideEnabled] = useState(false);
  const [qrCodeEnabled, setQrCodeEnabled] = useState(true);
  const [autoAssignTables, setAutoAssignTables] = useState(true);
  const [maxTableCapacity, setMaxTableCapacity] = useState('8');

  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return settings;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Tableside ordering settings updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update tableside ordering settings",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveSettingsMutation.mutate({ 
      tablesideEnabled, 
      qrCodeEnabled, 
      autoAssignTables, 
      maxTableCapacity 
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard">
            <Button variant="outline" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-tableside-ordering">
              Tableside Ordering
            </h1>
            <p className="text-gray-600">Configure tableside ordering and QR code menu features</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Monitor className="h-5 w-5" />
                <span>Tableside Settings</span>
              </CardTitle>
              <CardDescription>Configure tableside ordering features and table management</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={tablesideEnabled}
                  onCheckedChange={setTablesideEnabled}
                  data-testid="switch-tableside-enabled"
                />
                <Label>Enable Tableside Ordering</Label>
              </div>
              
              {tablesideEnabled && (
                <>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={qrCodeEnabled}
                      onCheckedChange={setQrCodeEnabled}
                      data-testid="switch-qr-enabled"
                    />
                    <Label>QR Code Menus</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={autoAssignTables}
                      onCheckedChange={setAutoAssignTables}
                      data-testid="switch-auto-assign"
                    />
                    <Label>Auto Assign Tables</Label>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="maxTableCapacity">Maximum Table Capacity</Label>
                    <Input
                      id="maxTableCapacity"
                      type="number"
                      value={maxTableCapacity}
                      onChange={(e) => setMaxTableCapacity(e.target.value)}
                      data-testid="input-max-capacity"
                    />
                  </div>
                </>
              )}
              
              <Button 
                onClick={handleSave} 
                disabled={saveSettingsMutation.isPending}
                data-testid="button-save-tableside"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <QrCode className="h-5 w-5" />
                <span>QR Code Management</span>
              </CardTitle>
              <CardDescription>Generate and manage QR codes for tables</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8">
                <QrCode className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No QR codes generated yet</p>
                <Button variant="outline" data-testid="button-generate-qr">
                  Generate QR Codes
                </Button>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Table Statistics</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Active Tables</p>
                    <p className="text-2xl font-bold text-blue-600" data-testid="text-active-tables">0</p>
                  </div>
                  <div>
                    <p className="text-gray-500">QR Scans Today</p>
                    <p className="text-2xl font-bold text-green-600" data-testid="text-qr-scans">0</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}