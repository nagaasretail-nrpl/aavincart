import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Wallet, ArrowLeft, Save, CreditCard, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from './layout';

export default function DigitalWallet() {
  const { toast } = useToast();
  const [walletEnabled, setWalletEnabled] = useState(true);
  const [minimumTopUp, setMinimumTopUp] = useState('10.00');
  const [maximumBalance, setMaximumBalance] = useState('1000.00');
  const [autoRefill, setAutoRefill] = useState(false);
  const [refillThreshold, setRefillThreshold] = useState('20.00');

  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return settings;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Digital wallet settings updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update digital wallet settings",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveSettingsMutation.mutate({ 
      walletEnabled, 
      minimumTopUp, 
      maximumBalance, 
      autoRefill, 
      refillThreshold 
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
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-digital-wallet">
              Digital Wallet
            </h1>
            <p className="text-gray-600">Configure digital wallet and prepaid balance features</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Wallet className="h-5 w-5" />
                <span>Wallet Settings</span>
              </CardTitle>
              <CardDescription>Configure digital wallet features and limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={walletEnabled}
                  onCheckedChange={setWalletEnabled}
                  data-testid="switch-wallet-enabled"
                />
                <Label>Enable Digital Wallet</Label>
              </div>
              
              {walletEnabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="minimumTopUp">Minimum Top-up Amount ($)</Label>
                    <Input
                      id="minimumTopUp"
                      type="number"
                      step="0.01"
                      value={minimumTopUp}
                      onChange={(e) => setMinimumTopUp(e.target.value)}
                      data-testid="input-minimum-topup"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="maximumBalance">Maximum Wallet Balance ($)</Label>
                    <Input
                      id="maximumBalance"
                      type="number"
                      step="0.01"
                      value={maximumBalance}
                      onChange={(e) => setMaximumBalance(e.target.value)}
                      data-testid="input-maximum-balance"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={autoRefill}
                      onCheckedChange={setAutoRefill}
                      data-testid="switch-auto-refill"
                    />
                    <Label>Enable Auto Refill</Label>
                  </div>
                  
                  {autoRefill && (
                    <div className="space-y-2">
                      <Label htmlFor="refillThreshold">Auto Refill Threshold ($)</Label>
                      <Input
                        id="refillThreshold"
                        type="number"
                        step="0.01"
                        value={refillThreshold}
                        onChange={(e) => setRefillThreshold(e.target.value)}
                        data-testid="input-refill-threshold"
                      />
                    </div>
                  )}
                </>
              )}
              
              <Button 
                onClick={handleSave} 
                disabled={saveSettingsMutation.isPending}
                data-testid="button-save-wallet"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>Wallet Statistics</span>
              </CardTitle>
              <CardDescription>Overview of digital wallet usage and transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600" data-testid="text-total-wallets">0</p>
                    <p className="text-sm text-gray-500">Active Wallets</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600" data-testid="text-total-balance">₹0.00</p>
                    <p className="text-sm text-gray-500">Total Balance</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600" data-testid="text-transactions">0</p>
                    <p className="text-sm text-gray-500">Transactions Today</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600" data-testid="text-topup-amount">₹0.00</p>
                    <p className="text-sm text-gray-500">Top-ups Today</p>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Average Wallet Balance</span>
                    <span className="font-medium" data-testid="text-avg-balance">₹0.00</span>
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