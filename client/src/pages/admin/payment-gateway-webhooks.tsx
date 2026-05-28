import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Zap, ArrowLeft, Plus, Edit, Trash2, Eye, RefreshCw, Copy, AlertTriangle } from 'lucide-react';
import { Link } from 'wouter';
import AdminLayout from './layout';

export default function PaymentGatewayWebhooks() {
  // Mock webhook data
  const webhooks = [
    {
      id: "wh_paypal_001", 
      gateway: "PayPal",
      url: "https://yourapp.com/api/webhooks/paypal",
      events: ["payment.completed", "payment.failed", "subscription.cancelled"],
      status: "active",
      lastDelivery: "2024-01-15 13:15:18",
      successRate: 96.2,
      secret: "[DEMO_PAYPAL_SECRET]"
    },
    {
      id: "wh_razorpay_001",
      gateway: "Razorpay", 
      url: "https://yourapp.com/api/webhooks/razorpay",
      events: ["payment.captured", "payment.failed", "subscription.completed"],
      status: "failed",
      lastDelivery: "2024-01-15 10:45:30",
      successRate: 87.3,
      secret: "[DEMO_RAZORPAY_SECRET]"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AdminLayout>
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <Link href="/admin/payment-gateway">
          <Button variant="outline" size="sm" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Payment Gateway
          </Button>
        </Link>
        <span className="text-gray-400">→</span>
        <span className="text-gray-600">Webhook Management</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Webhook Management</h1>
          <p className="text-gray-600">Configure and monitor webhook endpoints for real-time payment notifications</p>
        </div>
        <Button data-testid="button-add-webhook">
          <Plus className="h-4 w-4 mr-2" />
          Add Webhook
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Webhooks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-green-600">All configured</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">94.0%</div>
            <p className="text-xs text-gray-500">Average across all webhooks</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Failed Deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">12</div>
            <p className="text-xs text-gray-500">Last 24 hours</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Events Processed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,847</div>
            <p className="text-xs text-gray-500">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Webhooks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Webhooks</CardTitle>
          <CardDescription>Manage webhook endpoints and monitor their performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {webhooks.map((webhook) => (
              <div key={webhook.id} className="border rounded-lg p-4" data-testid={`webhook-${webhook.id}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Zap className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">{webhook.gateway} Webhook</h4>
                      <p className="text-sm text-gray-600">{webhook.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(webhook.status)}>
                      {webhook.status}
                    </Badge>
                    <Switch checked={webhook.status === 'active'} />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div>
                    <Label className="text-xs text-gray-600">Success Rate</Label>
                    <div className="font-medium">{webhook.successRate}%</div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Last Delivery</Label>
                    <div className="font-medium">{webhook.lastDelivery}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Events</Label>
                    <div className="font-medium">{webhook.events.length} configured</div>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  <Label className="text-xs text-gray-600">Subscribed Events</Label>
                  <div className="flex flex-wrap gap-1">
                    {webhook.events.map((event) => (
                      <Badge key={event} variant="outline" className="text-xs">
                        {event}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" data-testid={`button-edit-${webhook.id}`}>
                      <Edit className="h-4 w-4 mr-1" />
                      Configure
                    </Button>
                    <Button variant="outline" size="sm" data-testid={`button-test-${webhook.id}`}>
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Test
                    </Button>
                    <Button variant="outline" size="sm" data-testid={`button-logs-${webhook.id}`}>
                      <Eye className="h-4 w-4 mr-1" />
                      View Logs
                    </Button>
                  </div>
                  <Button
                    variant="outline" 
                    size="sm"
                    data-testid={`button-copy-secret-${webhook.id}`}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy Secret
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Webhook Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add New Webhook</CardTitle>
            <CardDescription>Configure a new webhook endpoint</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <Input 
                id="webhook-url"
                placeholder="https://yourapp.com/api/webhooks/payment"
                data-testid="input-webhook-url"
              />
            </div>
            
            <div>
              <Label htmlFor="webhook-events">Events</Label>
              <Textarea 
                id="webhook-events"
                placeholder="payment.completed, payment.failed, subscription.created"
                rows={3}
                data-testid="textarea-webhook-events"
              />
            </div>
            
            <Button className="w-full" data-testid="button-create-webhook">
              Create Webhook
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Security & Best Practices</CardTitle>
            <CardDescription>Important webhook security guidelines</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-3 p-3 bg-yellow-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Verify Signatures</h4>
                  <p className="text-sm text-yellow-700">Always verify webhook signatures to ensure requests are from the payment provider</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Security Checklist</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Use HTTPS endpoints only</li>
                  <li>• Verify webhook signatures</li>
                  <li>• Implement idempotency checks</li>
                  <li>• Monitor failed deliveries</li>
                  <li>• Set up retry mechanisms</li>
                  <li>• Log all webhook events</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </AdminLayout>
  );
}