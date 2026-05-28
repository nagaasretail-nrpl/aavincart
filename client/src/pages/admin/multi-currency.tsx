import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Coins, ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from './layout';

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  isDefault: boolean;
}

export default function MultiCurrency() {
  const { toast } = useToast();
  const [multiCurrencyEnabled, setMultiCurrencyEnabled] = useState(false);
  const [autoUpdateRates, setAutoUpdateRates] = useState(true);
  const [newCurrency, setNewCurrency] = useState({
    code: '',
    name: '',
    symbol: '',
    exchangeRate: '1.00'
  });

  const { data: currencies = [] } = useQuery<Currency[]>({
    queryKey: ['/api/admin/currencies'],
    queryFn: async () => [
      { id: '1', code: 'USD', name: 'US Dollar', symbol: '$', exchangeRate: 1.00, isDefault: true },
      { id: '2', code: 'EUR', name: 'Euro', symbol: '€', exchangeRate: 0.85, isDefault: false },
    ],
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return settings;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Multi-currency settings updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update multi-currency settings",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveSettingsMutation.mutate({ multiCurrencyEnabled, autoUpdateRates });
  };

  const handleAddCurrency = () => {
    // In a real app, this would make an API call
    toast({
      title: "Info",
      description: "Add currency functionality would be implemented here",
    });
    setNewCurrency({ code: '', name: '', symbol: '', exchangeRate: '1.00' });
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
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-multi-currency">
              Multi Currency
            </h1>
            <p className="text-gray-600">Configure multi-currency support and exchange rates</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Coins className="h-5 w-5" />
                <span>Currency Settings</span>
              </CardTitle>
              <CardDescription>Configure multi-currency features and automatic rate updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={multiCurrencyEnabled}
                  onCheckedChange={setMultiCurrencyEnabled}
                  data-testid="switch-multi-currency"
                />
                <Label>Enable Multi-Currency Support</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={autoUpdateRates}
                  onCheckedChange={setAutoUpdateRates}
                  data-testid="switch-auto-update"
                />
                <Label>Auto Update Exchange Rates</Label>
              </div>
              
              <Button 
                onClick={handleSave} 
                disabled={saveSettingsMutation.isPending}
                data-testid="button-save-currency"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add New Currency</CardTitle>
              <CardDescription>Add support for a new currency</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currencyCode">Currency Code</Label>
                  <Input
                    id="currencyCode"
                    value={newCurrency.code}
                    onChange={(e) => setNewCurrency({...newCurrency, code: e.target.value})}
                    placeholder="USD, EUR, GBP"
                    data-testid="input-currency-code"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currencySymbol">Symbol</Label>
                  <Input
                    id="currencySymbol"
                    value={newCurrency.symbol}
                    onChange={(e) => setNewCurrency({...newCurrency, symbol: e.target.value})}
                    placeholder="$, €, £"
                    data-testid="input-currency-symbol"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="currencyName">Currency Name</Label>
                <Input
                  id="currencyName"
                  value={newCurrency.name}
                  onChange={(e) => setNewCurrency({...newCurrency, name: e.target.value})}
                  placeholder="US Dollar, Euro, British Pound"
                  data-testid="input-currency-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="exchangeRate">Exchange Rate (to USD)</Label>
                <Input
                  id="exchangeRate"
                  type="number"
                  step="0.0001"
                  value={newCurrency.exchangeRate}
                  onChange={(e) => setNewCurrency({...newCurrency, exchangeRate: e.target.value})}
                  data-testid="input-exchange-rate"
                />
              </div>
              
              <Button onClick={handleAddCurrency} className="w-full" data-testid="button-add-currency">
                <Plus className="h-4 w-4 mr-2" />
                Add Currency
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Supported Currencies</CardTitle>
            <CardDescription>Manage supported currencies and their exchange rates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currencies.map((currency: Currency) => (
                <div key={currency.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`currency-${currency.id}`}>
                  <div className="flex items-center space-x-4">
                    <div className="font-medium" data-testid={`text-currency-code-${currency.id}`}>
                      {currency.code}
                    </div>
                    <div className="text-gray-600" data-testid={`text-currency-name-${currency.id}`}>
                      {currency.name}
                    </div>
                    <div className="font-mono" data-testid={`text-currency-symbol-${currency.id}`}>
                      {currency.symbol}
                    </div>
                    {currency.isDefault && (
                      <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Default</div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-sm text-gray-500" data-testid={`text-exchange-rate-${currency.id}`}>
                      Rate: {currency.exchangeRate}
                    </div>
                    {!currency.isDefault && (
                      <Button variant="outline" size="sm" data-testid={`button-delete-${currency.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              
              {currencies.length === 0 && (
                <div className="text-center py-8" data-testid="no-currencies-message">
                  <Coins className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No currencies configured</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}