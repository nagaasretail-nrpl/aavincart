import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "./layout";
import { Save, ExternalLink, AlertCircle, CheckCircle2 } from "lucide-react";

export default function EwayBillSettingsPage() {
  const { toast } = useToast();
  
  const [config, setConfig] = useState({
    username: "",
    password: "",
    gstin: "33AABCT1332L1ZZ",
    apiUrl: "https://api.ewaybillgst.gov.in",
    isProduction: false,
    autoGenerate: false,
    thresholdAmount: "50000"
  });

  const { data: existingConfig, isLoading } = useQuery({
    queryKey: ['/api/admin/eway-bill/config'],
    queryFn: async () => {
      const res = await fetch('/api/admin/eway-bill/config');
      if (!res.ok) return null;
      return res.json();
    }
  });

  useEffect(() => {
    if (existingConfig) {
      setConfig({
        username: existingConfig.apiUsername || "",
        password: "", // Never populate - password is hashed on server
        gstin: existingConfig.gstin || "33AABCT1332L1ZZ",
        apiUrl: existingConfig.isProduction 
          ? "https://api.ewaybillgst.gov.in" 
          : "https://gstewbsandbox.nic.in",
        isProduction: existingConfig.isProduction || false,
        autoGenerate: true, // Auto-generate for orders above threshold
        thresholdAmount: "50000"
      });
    }
  }, [existingConfig]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof config) => {
      // Map frontend field names to backend expected field names
      const backendData = {
        apiUsername: data.username,
        apiPassword: data.password, // Server will hash this
        gstin: data.gstin,
        isProduction: data.isProduction,
        isActive: true,
        tradeName: 'TCMPF Aavincart',
        stateCode: '33', // Tamil Nadu
      };
      const res = await apiRequest('POST', '/api/admin/eway-bill/config', backendData);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Settings saved successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/eway-bill/config'] });
      // Clear the password field after successful save
      setConfig(prev => ({ ...prev, password: '' }));
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save settings", description: error.message, variant: "destructive" });
    }
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/eway-bill/test-connection', config);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Connection successful", description: "E-way Bill API is accessible" });
    },
    onError: (error: Error) => {
      toast({ title: "Connection failed", description: error.message, variant: "destructive" });
    }
  });

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">E-way Bill Settings</h2>
          <p className="text-gray-500">Configure your E-way Bill API credentials and preferences</p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            To use E-way Bill generation, you need to register on the GST E-way Bill portal and obtain API credentials.{" "}
            <a 
              href="https://ewaybillgst.gov.in" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              Register here <ExternalLink className="h-3 w-3" />
            </a>
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>API Credentials</CardTitle>
            <CardDescription>Your E-way Bill portal login credentials for API access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Username</Label>
                <Input 
                  value={config.username}
                  onChange={(e) => setConfig({...config, username: e.target.value})}
                  placeholder="Your E-way Bill portal username"
                />
              </div>
              <div>
                <Label>Password</Label>
                <Input 
                  type="password"
                  value={config.password}
                  onChange={(e) => setConfig({...config, password: e.target.value})}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div>
              <Label>GSTIN</Label>
              <Input 
                value={config.gstin}
                onChange={(e) => setConfig({...config, gstin: e.target.value.toUpperCase()})}
                placeholder="33AABCT1332L1ZZ"
              />
              <p className="text-xs text-gray-500 mt-1">Your registered GST Identification Number</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment</CardTitle>
            <CardDescription>Choose between sandbox and production mode</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Production Mode</Label>
                <p className="text-sm text-gray-500">Enable this when you're ready to generate real E-way Bills</p>
              </div>
              <Switch 
                checked={config.isProduction}
                onCheckedChange={(checked) => setConfig({...config, isProduction: checked})}
              />
            </div>
            <Separator />
            <div>
              <Label>API URL</Label>
              <Input 
                value={config.apiUrl}
                onChange={(e) => setConfig({...config, apiUrl: e.target.value})}
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">
                {config.isProduction 
                  ? "Production: https://api.ewaybillgst.gov.in" 
                  : "Sandbox: https://gsp.adaequare.com (for testing)"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Automation Settings</CardTitle>
            <CardDescription>Configure automatic E-way Bill generation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-generate E-way Bills</Label>
                <p className="text-sm text-gray-500">Automatically generate E-way Bills for orders above threshold</p>
              </div>
              <Switch 
                checked={config.autoGenerate}
                onCheckedChange={(checked) => setConfig({...config, autoGenerate: checked})}
              />
            </div>
            <div>
              <Label>Threshold Amount (₹)</Label>
              <Input 
                type="number"
                value={config.thresholdAmount}
                onChange={(e) => setConfig({...config, thresholdAmount: e.target.value})}
              />
              <p className="text-xs text-gray-500 mt-1">E-way Bill is mandatory for consignments above ₹50,000</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {existingConfig?.lastConnectionTest ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-gray-600">
                      Last tested: {new Date(existingConfig.lastConnectionTest).toLocaleString()}
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                    <span className="text-sm text-gray-600">Connection not tested</span>
                  </>
                )}
              </div>
              <Button 
                variant="outline" 
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending || !config.username}
              >
                {testMutation.isPending ? "Testing..." : "Test Connection"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button 
            onClick={() => saveMutation.mutate(config)}
            disabled={saveMutation.isPending}
            className="bg-[#4AB3E8] hover:bg-[#3a9fd4]"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
