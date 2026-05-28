import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Wallet, ArrowLeft, Plus, Edit, Trash2, CreditCard, Banknote, Smartphone } from 'lucide-react';
import { Link } from 'wouter';
import AdminLayout from './layout';

export default function PaymentGatewayMethods() {
  // Mock payment methods data
  const paymentMethods = [
    {
      id: "1",
      name: "Credit/Debit Cards",
      type: "card",
      icon: CreditCard,
      enabled: true,
      supportedGateways: ["PayPal", "Razorpay"],
      fees: "2.9% + ₹25",
      description: "Accept Visa, Mastercard, American Express, and other major cards"
    },
    {
      id: "2", 
      name: "Digital Wallets",
      type: "wallet",
      icon: Smartphone,
      enabled: true,
      supportedGateways: ["PayPal", "Razorpay"],
      fees: "2.9% + ₹25",
      description: "Apple Pay, Google Pay, Samsung Pay, and other digital wallets"
    },
    {
      id: "3",
      name: "Bank Transfers",
      type: "bank",
      icon: Banknote,
      enabled: false,
      supportedGateways: ["Razorpay"],
      fees: "0.8%",
      description: "Direct bank transfers and UPI payments"
    },
    {
      id: "4",
      name: "Buy Now Pay Later",
      type: "bnpl", 
      icon: CreditCard,
      enabled: false,
      supportedGateways: ["PayPal"],
      fees: "6% + ₹25",
      description: "Klarna, Afterpay, and other BNPL services"
    }
  ];

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
        <span className="text-gray-600">Payment Methods</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Methods</h1>
          <p className="text-gray-600">Configure and manage available payment options for customers</p>
        </div>
        <Button data-testid="button-add-method">
          <Plus className="h-4 w-4 mr-2" />
          Add Payment Method
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-gray-500">Out of 4 total methods</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Most Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Credit Cards</div>
            <p className="text-xs text-gray-500">67% of all transactions</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Average Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.1%</div>
            <p className="text-xs text-gray-500">Across all active methods</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {paymentMethods.map((method) => {
          const IconComponent = method.icon;
          return (
            <Card key={method.id} className="relative" data-testid={`card-method-${method.id}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <IconComponent className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{method.name}</CardTitle>
                      <CardDescription>{method.type}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={method.enabled}
                      data-testid={`switch-${method.id}`}
                    />
                    <Badge variant={method.enabled ? "default" : "secondary"}>
                      {method.enabled ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">{method.description}</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Processing Fees:</span>
                    <span className="font-medium">{method.fees}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Supported Gateways:</span>
                    <div className="flex gap-1">
                      {method.supportedGateways.map((gateway) => (
                        <Badge key={gateway} variant="outline" className="text-xs">
                          {gateway}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" data-testid={`button-edit-${method.id}`}>
                    <Edit className="h-4 w-4 mr-1" />
                    Configure
                  </Button>
                  <Button variant="outline" size="sm" data-testid={`button-test-${method.id}`}>
                    Test Payment
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Configuration Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuration Guidelines</CardTitle>
          <CardDescription>Best practices for setting up payment methods</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Recommended Setup</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Always enable credit/debit cards as primary option</li>
                <li>• Configure digital wallets for mobile customers</li>
                <li>• Test all payment methods before going live</li>
                <li>• Monitor transaction success rates regularly</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Security Notes</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• All payments are processed securely by gateway providers</li>
                <li>• PCI compliance is handled by payment processors</li>
                <li>• Enable 3D Secure for enhanced card security</li>
                <li>• Regularly review and update gateway credentials</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}