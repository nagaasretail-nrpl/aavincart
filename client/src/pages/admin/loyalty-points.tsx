import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Gift, ArrowLeft, Save, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from './layout';

export default function LoyaltyPoints() {
  const { toast } = useToast();
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(true);
  const [pointsPerDollar, setPointsPerDollar] = useState('10');
  const [minimumRedemption, setMinimumRedemption] = useState('100');
  const [redemptionValue, setRedemptionValue] = useState('0.01');

  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return settings;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Loyalty points settings updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update loyalty points settings",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveSettingsMutation.mutate({ 
      loyaltyEnabled, 
      pointsPerDollar, 
      minimumRedemption, 
      redemptionValue 
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
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-loyalty-points">
              Loyalty Points
            </h1>
            <p className="text-gray-600">Configure customer loyalty and rewards program</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Gift className="h-5 w-5" />
                <span>Loyalty Program Settings</span>
              </CardTitle>
              <CardDescription>Configure how customers earn and redeem loyalty points</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={loyaltyEnabled}
                  onCheckedChange={setLoyaltyEnabled}
                  data-testid="switch-loyalty-enabled"
                />
                <Label>Enable Loyalty Program</Label>
              </div>
              
              {loyaltyEnabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="pointsPerDollar">Points per Dollar Spent</Label>
                    <Input
                      id="pointsPerDollar"
                      type="number"
                      value={pointsPerDollar}
                      onChange={(e) => setPointsPerDollar(e.target.value)}
                      data-testid="input-points-per-dollar"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="minimumRedemption">Minimum Points for Redemption</Label>
                    <Input
                      id="minimumRedemption"
                      type="number"
                      value={minimumRedemption}
                      onChange={(e) => setMinimumRedemption(e.target.value)}
                      data-testid="input-minimum-redemption"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="redemptionValue">Point Value ($ per point)</Label>
                    <Input
                      id="redemptionValue"
                      type="number"
                      step="0.01"
                      value={redemptionValue}
                      onChange={(e) => setRedemptionValue(e.target.value)}
                      data-testid="input-redemption-value"
                    />
                  </div>
                </>
              )}
              
              <Button 
                onClick={handleSave} 
                disabled={saveSettingsMutation.isPending}
                data-testid="button-save-loyalty"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Star className="h-5 w-5" />
                <span>Program Statistics</span>
              </CardTitle>
              <CardDescription>Overview of loyalty program performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600" data-testid="text-active-members">0</p>
                    <p className="text-sm text-gray-500">Active Members</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600" data-testid="text-points-issued">0</p>
                    <p className="text-sm text-gray-500">Points Issued</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600" data-testid="text-points-redeemed">0</p>
                    <p className="text-sm text-gray-500">Points Redeemed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600" data-testid="text-redemption-value">₹0.00</p>
                    <p className="text-sm text-gray-500">Total Redemption Value</p>
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