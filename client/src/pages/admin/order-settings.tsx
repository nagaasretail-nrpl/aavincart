import { useState } from 'react';
import AdminLayout from './layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Settings, 
  LayoutList, 
  Square, 
  Truck, 
  FileText,
  Plus,
  Pencil,
  Trash2,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type SettingsTab = 'order-status' | 'order-tabs' | 'order-buttons' | 'order-tracking' | 'template';

const tabs = [
  { id: 'order-status' as SettingsTab, label: 'Order Status', icon: Settings },
  { id: 'order-tabs' as SettingsTab, label: 'Order Tabs', icon: LayoutList },
  { id: 'order-buttons' as SettingsTab, label: 'Order Buttons', icon: Square },
  { id: 'order-tracking' as SettingsTab, label: 'Order Tracking', icon: Truck },
  { id: 'template' as SettingsTab, label: 'Template', icon: FileText },
];

interface OrderStatusSettings {
  newOrder: string;
  deliveredOrder: string;
  completedPickupDinein: string;
  cancelOrder: string;
  orderRejection: string;
  deliveryFailed: string;
  failedPickupDinein: string;
}

interface OrderTabConfig {
  name: string;
  statuses: string[];
}

interface OrderButton {
  id: string;
  name: string;
  status: string;
}

interface OrderTrackingSettings {
  lateOrderThreshold: string;
  cancellationThreshold: string;
  lateDeliveryThreshold: string;
  cancellationLateDeliveryThreshold: string;
  statusOrderProcessing: string;
  statusFoodReady: string;
  statusInTransit: string;
  statusDelivered: string;
  statusDeliveryFailed: string;
  statusCompletedPickupDinein: string;
  statusFailedPickupDinein: string;
}

interface TemplateSettings {
  templateInvoice: string;
  templateRefund: string;
  templatePartialRefund: string;
  delayOrder: string;
}

export default function OrderSettings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('order-status');
  const { toast } = useToast();

  const [orderStatus, setOrderStatus] = useState<OrderStatusSettings>({
    newOrder: 'new',
    deliveredOrder: 'delivered',
    completedPickupDinein: 'complete',
    cancelOrder: 'cancelled',
    orderRejection: 'rejected',
    deliveryFailed: 'delivery failed',
    failedPickupDinein: 'cancelled',
  });

  const [orderTabs, setOrderTabs] = useState<OrderTabConfig[]>([
    { name: 'New Orders', statuses: ['new'] },
    { name: 'Orders Processing', statuses: ['accepted'] },
    { name: 'Orders Ready', statuses: ['ready for pickup', 'delivery on its way'] },
    { name: 'Completed Today', statuses: ['delivered', 'complete'] },
  ]);

  const [orderButtons, setOrderButtons] = useState({
    newOrders: [
      { id: '1', name: 'as accepted', status: 'as accepted' },
      { id: '2', name: 'reject', status: 'rejected' },
    ],
    orderProcessing: [
      { id: '3', name: 'ready for pickup', status: 'ready for pickup' },
    ],
    ordersReady: [
      { id: '4', name: 'delivery on its way', status: 'delivery on its way, delivered' },
      { id: '5', name: 'markasread', status: 'delivered, delivered' },
      { id: '6', name: 'delivery failed', status: 'delivery failed, delivery failed' },
      { id: '7', name: 'complete', status: 'complete, pickuped' },
      { id: '8', name: 'order failed', status: 'order failed, cancelled' },
      { id: '9', name: 'Complete', status: 'complete, delivered' },
      { id: '10', name: 'order done', status: 'order done, delivered' },
    ],
  });

  const [orderTracking, setOrderTracking] = useState<OrderTrackingSettings>({
    lateOrderThreshold: '0',
    cancellationThreshold: '0',
    lateDeliveryThreshold: '0',
    cancellationLateDeliveryThreshold: '0',
    statusOrderProcessing: 'accepted',
    statusFoodReady: 'ready for pickup',
    statusInTransit: 'delivery on its way',
    statusDelivered: 'picked',
    statusDeliveryFailed: 'delivery failed',
    statusCompletedPickupDinein: 'complete',
    statusFailedPickupDinein: 'cancelled',
  });

  const [templateSettings, setTemplateSettings] = useState<TemplateSettings>({
    templateInvoice: 'Order Invoice',
    templateRefund: 'Customer Full Refund',
    templatePartialRefund: 'Customer Partial Full Refund',
    delayOrder: 'Delay Order',
  });

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your order settings have been updated successfully.",
    });
  };

  const addStatusToTab = (tabIndex: number, status: string) => {
    const newTabs = [...orderTabs];
    if (!newTabs[tabIndex].statuses.includes(status)) {
      newTabs[tabIndex].statuses.push(status);
      setOrderTabs(newTabs);
    }
  };

  const removeStatusFromTab = (tabIndex: number, status: string) => {
    const newTabs = [...orderTabs];
    newTabs[tabIndex].statuses = newTabs[tabIndex].statuses.filter(s => s !== status);
    setOrderTabs(newTabs);
  };

  const renderOrderStatusSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Status for new order</label>
        <Select value={orderStatus.newOrder} onValueChange={(v) => setOrderStatus({...orderStatus, newOrder: v})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">new</SelectItem>
            <SelectItem value="pending">pending</SelectItem>
            <SelectItem value="received">received</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Status for delivered order</label>
        <Select value={orderStatus.deliveredOrder} onValueChange={(v) => setOrderStatus({...orderStatus, deliveredOrder: v})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="delivered">delivered</SelectItem>
            <SelectItem value="completed">completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Status for completed pickup/dinein order</label>
        <Select value={orderStatus.completedPickupDinein} onValueChange={(v) => setOrderStatus({...orderStatus, completedPickupDinein: v})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="complete">complete</SelectItem>
            <SelectItem value="picked up">picked up</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Status for cancel order</label>
        <Select value={orderStatus.cancelOrder} onValueChange={(v) => setOrderStatus({...orderStatus, cancelOrder: v})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cancelled">cancelled</SelectItem>
            <SelectItem value="voided">voided</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Status for order rejection</label>
        <Select value={orderStatus.orderRejection} onValueChange={(v) => setOrderStatus({...orderStatus, orderRejection: v})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rejected">rejected</SelectItem>
            <SelectItem value="declined">declined</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Status for delivery failed</label>
        <Select value={orderStatus.deliveryFailed} onValueChange={(v) => setOrderStatus({...orderStatus, deliveryFailed: v})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="delivery failed">delivery failed</SelectItem>
            <SelectItem value="undelivered">undelivered</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Status for failed pickup/dinein order</label>
        <Select value={orderStatus.failedPickupDinein} onValueChange={(v) => setOrderStatus({...orderStatus, failedPickupDinein: v})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cancelled">cancelled</SelectItem>
            <SelectItem value="no show">no show</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleSave} className="w-full bg-green-500 hover:bg-green-600">
        Save
      </Button>
    </div>
  );

  const renderOrderTabsSettings = () => (
    <div className="space-y-8">
      {orderTabs.map((tab, tabIndex) => (
        <div key={tab.name} className="space-y-3">
          <div>
            <h3 className="font-semibold text-gray-800">{tab.name}</h3>
            <p className="text-sm text-gray-500">select the status that will show on this tab.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {tab.statuses.map(status => (
              <Badge 
                key={status} 
                variant="secondary" 
                className="bg-gray-800 text-white px-3 py-1 flex items-center gap-1"
              >
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => removeStatusFromTab(tabIndex, status)}
                />
                {status}
              </Badge>
            ))}
          </div>
          <Button onClick={handleSave} size="sm" className="bg-green-500 hover:bg-green-600">
            Save
          </Button>
        </div>
      ))}
    </div>
  );

  const renderOrderButtonsSettings = () => (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-800">New Orders</h3>
            <p className="text-sm text-gray-500">define the buttons for this tab.</p>
          </div>
          <Button size="sm" className="bg-green-500 hover:bg-green-600">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Button Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orderButtons.newOrders.map(btn => (
              <TableRow key={btn.id}>
                <TableCell>{btn.name}</TableCell>
                <TableCell>{btn.status}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm"><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-800">Order Processing</h3>
            <p className="text-sm text-gray-500">define the buttons for this tab.</p>
          </div>
          <Button size="sm" className="bg-green-500 hover:bg-green-600">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Button Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orderButtons.orderProcessing.map(btn => (
              <TableRow key={btn.id}>
                <TableCell>{btn.name}</TableCell>
                <TableCell>{btn.status}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm"><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-800">Orders Ready</h3>
            <p className="text-sm text-gray-500">define the buttons for this tab.</p>
          </div>
          <Button size="sm" className="bg-green-500 hover:bg-green-600">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Button Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orderButtons.ordersReady.map(btn => (
              <TableRow key={btn.id}>
                <TableCell>{btn.name}</TableCell>
                <TableCell>{btn.status}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm"><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  const renderOrderTrackingSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Threshold for late orders (Accepting) <span className="text-blue-500 cursor-pointer">ⓘ</span>
        </label>
        <Input 
          value={orderTracking.lateOrderThreshold} 
          onChange={(e) => setOrderTracking({...orderTracking, lateOrderThreshold: e.target.value})}
          placeholder="0 minutes"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Threshold for Cancellation (Accepting) <span className="text-blue-500 cursor-pointer">ⓘ</span>
        </label>
        <Input 
          value={orderTracking.cancellationThreshold} 
          onChange={(e) => setOrderTracking({...orderTracking, cancellationThreshold: e.target.value})}
          placeholder="0 minutes"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Late Delivery Threshold</label>
        <Input 
          value={orderTracking.lateDeliveryThreshold} 
          onChange={(e) => setOrderTracking({...orderTracking, lateDeliveryThreshold: e.target.value})}
          placeholder="0 minutes"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cancellation Threshold for Late Delivery <span className="text-blue-500 cursor-pointer">ⓘ</span>
        </label>
        <Input 
          value={orderTracking.cancellationLateDeliveryThreshold} 
          onChange={(e) => setOrderTracking({...orderTracking, cancellationLateDeliveryThreshold: e.target.value})}
          placeholder="0"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Status for order processing</label>
        <Select value={orderTracking.statusOrderProcessing} onValueChange={(v) => setOrderTracking({...orderTracking, statusOrderProcessing: v})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="accepted">accepted</SelectItem>
            <SelectItem value="processing">processing</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Status for food ready</label>
        <Select value={orderTracking.statusFoodReady} onValueChange={(v) => setOrderTracking({...orderTracking, statusFoodReady: v})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ready for pickup">ready for pickup</SelectItem>
            <SelectItem value="prepared">prepared</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Status for In-transit</label>
        <Select value={orderTracking.statusInTransit} onValueChange={(v) => setOrderTracking({...orderTracking, statusInTransit: v})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="delivery on its way">delivery on its way</SelectItem>
            <SelectItem value="out for delivery">out for delivery</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Status for delivered</label>
        <Select value={orderTracking.statusDelivered} onValueChange={(v) => setOrderTracking({...orderTracking, statusDelivered: v})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="picked">picked</SelectItem>
            <SelectItem value="delivered">delivered</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Status for delivery failed</label>
        <Select value={orderTracking.statusDeliveryFailed} onValueChange={(v) => setOrderTracking({...orderTracking, statusDeliveryFailed: v})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="delivery failed">delivery failed</SelectItem>
            <SelectItem value="undelivered">undelivered</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Status for completed pickup/dinein order</label>
        <Select value={orderTracking.statusCompletedPickupDinein} onValueChange={(v) => setOrderTracking({...orderTracking, statusCompletedPickupDinein: v})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="complete">complete</SelectItem>
            <SelectItem value="picked up">picked up</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Status for failed pickup/dinein order</label>
        <Select value={orderTracking.statusFailedPickupDinein} onValueChange={(v) => setOrderTracking({...orderTracking, statusFailedPickupDinein: v})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cancelled">cancelled</SelectItem>
            <SelectItem value="no show">no show</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleSave} className="w-full bg-green-500 hover:bg-green-600">
        Save
      </Button>
    </div>
  );

  const renderTemplateSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Template Invoice</label>
        <Select value={templateSettings.templateInvoice} onValueChange={(v) => setTemplateSettings({...templateSettings, templateInvoice: v})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Order Invoice">Order Invoice</SelectItem>
            <SelectItem value="Standard Invoice">Standard Invoice</SelectItem>
            <SelectItem value="Detailed Invoice">Detailed Invoice</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Template Refund</label>
        <Select value={templateSettings.templateRefund} onValueChange={(v) => setTemplateSettings({...templateSettings, templateRefund: v})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Customer Full Refund">Customer Full Refund</SelectItem>
            <SelectItem value="Standard Refund">Standard Refund</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Template Partial Refund</label>
        <Select value={templateSettings.templatePartialRefund} onValueChange={(v) => setTemplateSettings({...templateSettings, templatePartialRefund: v})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Customer Partial Full Refund">Customer Partial Full Refund</SelectItem>
            <SelectItem value="Partial Refund Standard">Partial Refund Standard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Delay Order</label>
        <Select value={templateSettings.delayOrder} onValueChange={(v) => setTemplateSettings({...templateSettings, delayOrder: v})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Delay Order">Delay Order</SelectItem>
            <SelectItem value="Order Delayed Notification">Order Delayed Notification</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleSave} className="w-full bg-green-500 hover:bg-green-600">
        Save
      </Button>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'order-status':
        return renderOrderStatusSettings();
      case 'order-tabs':
        return renderOrderTabsSettings();
      case 'order-buttons':
        return renderOrderButtonsSettings();
      case 'order-tracking':
        return renderOrderTrackingSettings();
      case 'template':
        return renderTemplateSettings();
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Orders</span>
          <span>»</span>
          <span className="font-medium">Settings</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-1">
            <CardContent className="p-2">
              <nav className="space-y-1">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm font-medium transition-colors ${
                        activeTab === tab.id 
                          ? 'bg-green-500 text-white' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardContent className="p-6">
              {renderTabContent()}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
