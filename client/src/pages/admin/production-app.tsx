import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Factory, ArrowLeft, Save, Clock, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from './layout';

interface ProductionOrder {
  id: string;
  orderNumber: string;
  items: string[];
  status: 'pending' | 'preparing' | 'ready';
  estimatedTime: number;
  priority: 'low' | 'medium' | 'high';
  productSegment?: 'Fresh Milk' | 'Products' | 'Ice Cream';
}

export default function ProductionApp() {
  const { toast } = useToast();
  const [productionAppEnabled, setProductionAppEnabled] = useState(true);
  const [soundNotifications, setSoundNotifications] = useState(true);
  const [autoAcceptOrders, setAutoAcceptOrders] = useState(false);
  const [segmentFilter, setSegmentFilter] = useState<string>('all');

  const { data: productionOrders = [] } = useQuery<ProductionOrder[]>({
    queryKey: ['/api/admin/production-orders'],
    queryFn: async () => [
      { 
        id: '1', 
        orderNumber: 'ORD-001', 
        items: ['Milk 500ml', 'Curd 200g'], 
        status: 'preparing', 
        estimatedTime: 15,
        priority: 'high'
      },
      { 
        id: '2', 
        orderNumber: 'ORD-002', 
        items: ['Butter 100g', 'Paneer 200g'], 
        status: 'pending', 
        estimatedTime: 12,
        priority: 'medium'
      },
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
        description: "Production app settings updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update production app settings",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveSettingsMutation.mutate({ 
      productionAppEnabled, 
      soundNotifications, 
      autoAcceptOrders 
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, color: 'text-yellow-600' },
      preparing: { variant: 'default' as const, color: 'text-blue-600' },
      ready: { variant: 'default' as const, color: 'text-green-600' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{status}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { variant: 'outline' as const },
      medium: { variant: 'secondary' as const },
      high: { variant: 'destructive' as const },
    };
    
    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.low;
    return <Badge variant={config.variant}>{priority} priority</Badge>;
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
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-production-app">
              Production App
            </h1>
            <p className="text-gray-600">Manage production operations and order processing</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Factory className="h-5 w-5" />
                <span>Production Settings</span>
              </CardTitle>
              <CardDescription>Configure production app features and notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={productionAppEnabled}
                  onCheckedChange={setProductionAppEnabled}
                  data-testid="switch-production-enabled"
                />
                <Label>Enable Production App</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={soundNotifications}
                  onCheckedChange={setSoundNotifications}
                  data-testid="switch-sound-notifications"
                />
                <Label>Sound Notifications</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={autoAcceptOrders}
                  onCheckedChange={setAutoAcceptOrders}
                  data-testid="switch-auto-accept"
                />
                <Label>Auto Accept Orders</Label>
              </div>
              
              <Button 
                onClick={handleSave} 
                disabled={saveSettingsMutation.isPending}
                data-testid="button-save-production"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
              </Button>

              <div className="pt-4 border-t">
                <Button variant="outline" className="w-full" data-testid="button-download-app">
                  <Download className="h-4 w-4 mr-2" />
                  Download Production App
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Production Orders</CardTitle>
              <CardDescription>Current orders being processed in production</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {productionOrders.map((order: ProductionOrder) => (
                  <div key={order.id} className="border rounded-lg p-4 space-y-2" data-testid={`order-${order.id}`}>
                    <div className="flex items-center justify-between">
                      <div className="font-medium" data-testid={`text-order-number-${order.id}`}>
                        {order.orderNumber}
                      </div>
                      {getStatusBadge(order.status)}
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      <div data-testid={`text-items-${order.id}`}>
                        Items: {order.items.join(', ')}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Clock className="h-4 w-4" />
                        <span data-testid={`text-time-${order.id}`}>{order.estimatedTime} min</span>
                        {getPriorityBadge(order.priority)}
                      </div>
                    </div>
                  </div>
                ))}
                
                {productionOrders.length === 0 && (
                  <div className="text-center py-8" data-testid="no-orders-message">
                    <Factory className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No active production orders</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
