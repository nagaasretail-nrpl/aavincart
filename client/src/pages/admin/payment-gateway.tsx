import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard, Edit, Trash2, Plus, ArrowLeft, CheckCircle, XCircle, Loader2, Wifi, Settings, Smartphone, Link2, DollarSign, SplitSquareVertical } from 'lucide-react';
import { SiPaypal, SiRazorpay } from 'react-icons/si';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { PaymentGateway } from '@shared/schema';
import AdminLayout from './layout';

export default function PaymentGatewayManagement() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('gateways');

  const { data: gateways = [], isLoading } = useQuery<PaymentGateway[]>({
    queryKey: ['/api/admin/payment-gateways']
  });

  const { data: cashfreeConfig } = useQuery<{ available: boolean; active: boolean; environment: string }>({
    queryKey: ['/api/cashfree/config']
  });

  const { data: cfTransactions = [] } = useQuery<any[]>({
    queryKey: ['/api/cashfree/transactions'],
    enabled: activeTab === 'cf-transactions',
  });

  const { data: cfPaymentLinks = [] } = useQuery<any[]>({
    queryKey: ['/api/cashfree/payment-links'],
    enabled: activeTab === 'cf-links',
  });

  const { data: cfPayouts = [] } = useQuery<any[]>({
    queryKey: ['/api/cashfree/payouts/transfers'],
    enabled: activeTab === 'cf-payouts',
  });

  const { data: cfTerminals = [] } = useQuery<any[]>({
    queryKey: ['/api/cashfree/softpos/terminals'],
    enabled: activeTab === 'cf-terminals',
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'inactive' }) => {
      return await apiRequest('PUT', `/api/admin/payment-gateways/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payment-gateways'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cashfree/config'] });
      toast({ title: "Success", description: "Payment gateway status updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/admin/payment-gateways/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payment-gateways'] });
      toast({ title: "Success", description: "Payment gateway deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete", variant: "destructive" });
    }
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/cashfree/test-connection');
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast({ title: "Connection Successful", description: data.message });
      } else {
        toast({ title: "Connection Failed", description: data.message, variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Test failed", variant: "destructive" });
    }
  });

  const handleStatusToggle = (gateway: PaymentGateway) => {
    const newStatus = gateway.status === 'active' ? 'inactive' : 'active';
    updateStatusMutation.mutate({ id: gateway.id, status: newStatus });
  };

  const handleEdit = (id: string) => setLocation(`/admin/payment-gateway/edit/${id}`);
  const handleDeleteConfirm = (id: string) => deleteMutation.mutate(id);
  const handleAddNew = () => setLocation('/admin/payment-gateway/create');
  const handleGoBack = () => setLocation('/admin/dashboard');

  const cashfreeGateway = gateways.find(g => g.paymentCode === 'cashfree');
  const razorpayGateway = gateways.find(g => g.paymentCode === 'razorpay');

  const getPaymentIcon = (paymentCode: string) => {
    const iconMap: Record<string, () => JSX.Element> = {
      paypal: () => (
        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-gray-200 shadow-sm">
          <SiPaypal className="h-6 w-6 text-blue-500" />
        </div>
      ),
      razorpay: () => (
        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-gray-200 shadow-sm">
          <SiRazorpay className="h-6 w-6 text-blue-600" />
        </div>
      ),
      cashfree: () => (
        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-gray-200 shadow-sm">
          <CreditCard className="h-6 w-6 text-violet-600" />
        </div>
      ),
      sbi_upi: () => (
        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-gray-200 shadow-sm">
          <CreditCard className="h-6 w-6 text-green-600" />
        </div>
      )
    };
    const IconComponent = iconMap[paymentCode.toLowerCase()];
    return IconComponent ? IconComponent() : (
      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-gray-200 shadow-sm">
        <CreditCard className="h-6 w-6 text-gray-600" />
      </div>
    );
  };

  const maskedValue = (val: string | undefined) => {
    if (!val) return '••••••••';
    if (val.length <= 8) return '••••••••';
    return val.substring(0, 4) + '••••' + val.substring(val.length - 4);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AdminLayout>
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={handleGoBack} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Payment Gateways</h1>
            <p className="text-gray-600">Configure and manage your payment methods</p>
          </div>
        </div>
        <Button onClick={handleAddNew} className="bg-orange-500 hover:bg-orange-600 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add Payment Gateway
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="gateways">Gateways</TabsTrigger>
          <TabsTrigger value="cf-transactions">Transactions</TabsTrigger>
          <TabsTrigger value="cf-links">Payment Links</TabsTrigger>
          <TabsTrigger value="cf-payouts">Payouts</TabsTrigger>
          <TabsTrigger value="cf-splits">Split Settlements</TabsTrigger>
          <TabsTrigger value="cf-terminals">SoftPOS</TabsTrigger>
        </TabsList>

        <TabsContent value="gateways" className="space-y-6">
          {cashfreeGateway && (
            <Card className="border-violet-200 bg-violet-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-violet-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span>Cashfree Configuration</span>
                      <Badge variant={cashfreeGateway.status === 'active' ? 'default' : 'secondary'} className={cashfreeGateway.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' : ''}>
                        {cashfreeGateway.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-sm font-normal text-gray-500 mt-1">Cashfree Payments — PG, Payment Links, SoftPOS, Payouts, Easy Split</p>
                  </div>
                  <Switch
                    checked={cashfreeGateway.status === 'active'}
                    onCheckedChange={() => handleStatusToggle(cashfreeGateway)}
                    disabled={updateStatusMutation.isPending}
                    className="data-[state=checked]:bg-violet-500"
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">Client ID</Label>
                    <Input value={cashfreeConfig?.available ? '••••••••••••  (via env secrets)' : 'Not configured'} readOnly className="bg-gray-50 font-mono text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Client Secret</Label>
                    <Input value={cashfreeConfig?.available ? '••••••••••••  (via env secrets)' : 'Not configured'} readOnly className="bg-gray-50 font-mono text-sm" type="password" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-gray-500">Environment:</Label>
                    <Badge variant="outline" className={cashfreeConfig?.environment === 'production' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}>
                      {cashfreeConfig?.environment === 'production' ? 'Production' : 'Sandbox'}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testConnectionMutation.mutate()}
                    disabled={testConnectionMutation.isPending}
                    className="ml-auto"
                  >
                    {testConnectionMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Testing...</>
                    ) : (
                      <><Wifi className="h-4 w-4 mr-2" />Test Connection</>
                    )}
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
                  <div className="text-center p-3 bg-white rounded-lg border">
                    <CreditCard className="h-5 w-5 mx-auto text-violet-500 mb-1" />
                    <p className="text-xs font-medium">PG Payments</p>
                    <p className="text-[10px] text-gray-400">Online Checkout</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border">
                    <Link2 className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                    <p className="text-xs font-medium">Payment Links</p>
                    <p className="text-[10px] text-gray-400">Shareable Links</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border">
                    <Smartphone className="h-5 w-5 mx-auto text-green-500 mb-1" />
                    <p className="text-xs font-medium">SoftPOS</p>
                    <p className="text-[10px] text-gray-400">Card Terminal</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border">
                    <DollarSign className="h-5 w-5 mx-auto text-amber-500 mb-1" />
                    <p className="text-xs font-medium">Payouts</p>
                    <p className="text-[10px] text-gray-400">Disbursements</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border">
                    <SplitSquareVertical className="h-5 w-5 mx-auto text-pink-500 mb-1" />
                    <p className="text-xs font-medium">Easy Split</p>
                    <p className="text-[10px] text-gray-400">Auto Split</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {gateways.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">No payment gateways configured</p>
                <p className="text-sm text-gray-500 mb-4">Add your first payment gateway to start accepting payments</p>
                <Button onClick={handleAddNew} className="bg-orange-500 hover:bg-orange-600 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Payment Gateway
                </Button>
              </div>
            ) : (
              gateways.map((gateway) => (
                <div
                  key={gateway.id}
                  className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center space-x-4">
                    {getPaymentIcon(gateway.paymentCode)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className="text-lg font-medium text-gray-900">{gateway.paymentName}</h3>
                        <Badge
                          variant={gateway.status === 'active' ? 'default' : 'secondary'}
                          className={gateway.status === 'active'
                            ? 'bg-green-100 text-green-800 border-green-200 text-xs px-2 py-1'
                            : 'bg-gray-100 text-gray-800 border-gray-200 text-xs px-2 py-1'
                          }
                        >
                          {gateway.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Code: {gateway.paymentCode}</span>
                        <span className="text-blue-600">Online Payment</span>
                        <span className="text-green-600">Plan Available</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Switch
                      checked={gateway.status === 'active'}
                      onCheckedChange={() => handleStatusToggle(gateway)}
                      disabled={updateStatusMutation.isPending}
                      className="data-[state=checked]:bg-orange-500"
                    />
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(gateway.id)} className="h-8 w-8 text-gray-600 hover:text-gray-900">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Payment Gateway</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {gateway.paymentName}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteConfirm(gateway.id)}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={deleteMutation.isPending}
                          >
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gateway Status Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <SiRazorpay className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Razorpay</p>
                    <div className="flex items-center gap-1">
                      {razorpayGateway?.status === 'active' ? (
                        <><CheckCircle className="h-3 w-3 text-green-500" /><span className="text-xs text-green-600">Active</span></>
                      ) : (
                        <><XCircle className="h-3 w-3 text-gray-400" /><span className="text-xs text-gray-500">{razorpayGateway ? 'Inactive' : 'Not configured'}</span></>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <CreditCard className="h-5 w-5 text-violet-600" />
                  <div>
                    <p className="text-sm font-medium">Cashfree</p>
                    <div className="flex items-center gap-1">
                      {cashfreeGateway?.status === 'active' && cashfreeConfig?.available ? (
                        <><CheckCircle className="h-3 w-3 text-green-500" /><span className="text-xs text-green-600">Active</span></>
                      ) : cashfreeGateway?.status === 'active' && !cashfreeConfig?.available ? (
                        <><XCircle className="h-3 w-3 text-yellow-500" /><span className="text-xs text-yellow-600">No credentials</span></>
                      ) : cashfreeConfig?.available ? (
                        <><XCircle className="h-3 w-3 text-gray-400" /><span className="text-xs text-gray-500">Inactive (configured)</span></>
                      ) : (
                        <><XCircle className="h-3 w-3 text-gray-400" /><span className="text-xs text-gray-500">Not configured</span></>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-lg border bg-blue-50">
                  <p className="text-sm font-medium text-blue-800">Checkout Behavior</p>
                  <p className="text-xs text-blue-600 mt-1">
                    {razorpayGateway?.status === 'active' && cashfreeGateway?.status === 'active'
                      ? 'Both gateways shown — customer selects'
                      : razorpayGateway?.status === 'active'
                      ? 'Razorpay only shown at checkout'
                      : cashfreeGateway?.status === 'active'
                      ? 'Cashfree only shown at checkout'
                      : 'COD / Credit / Wallet only'}
                  </p>
                </div>
                <div className="p-3 rounded-lg border bg-green-50">
                  <p className="text-sm font-medium text-green-800">Total Gateways</p>
                  <p className="text-2xl font-bold text-green-700">{gateways.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cf-transactions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-violet-500" />
                Cashfree PG Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cfTransactions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No transactions yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>CF Order ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cfTransactions.map((tx: any) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-mono text-sm">{tx.orderId}</TableCell>
                        <TableCell className="font-mono text-sm">{tx.cfOrderId}</TableCell>
                        <TableCell>₹{parseFloat(tx.amount || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={tx.status === 'paid' ? 'default' : tx.status === 'failed' ? 'destructive' : 'secondary'}
                            className={tx.status === 'paid' ? 'bg-green-100 text-green-800' : ''}>
                            {tx.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{tx.paymentMethod || '-'}</TableCell>
                        <TableCell className="text-sm text-gray-500">{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cf-links">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-blue-500" />
                Payment Links
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cfPaymentLinks.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No payment links created yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Link ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cfPaymentLinks.map((link: any) => (
                      <TableRow key={link.id}>
                        <TableCell className="font-mono text-sm">{link.linkId}</TableCell>
                        <TableCell>₹{parseFloat(link.amount || 0).toFixed(2)}</TableCell>
                        <TableCell>{link.purpose || '-'}</TableCell>
                        <TableCell>{link.customerName || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={link.status === 'paid' ? 'default' : link.status === 'expired' ? 'destructive' : 'secondary'}
                            className={link.status === 'paid' ? 'bg-green-100 text-green-800' : link.status === 'active' ? 'bg-blue-100 text-blue-800' : ''}>
                            {link.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{link.createdAt ? new Date(link.createdAt).toLocaleDateString() : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cf-payouts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-amber-500" />
                Payout Transfers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cfPayouts.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No payouts initiated yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transfer ID</TableHead>
                      <TableHead>Beneficiary</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>UTR</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cfPayouts.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-sm">{p.transferId}</TableCell>
                        <TableCell>{p.beneId}</TableCell>
                        <TableCell>₹{parseFloat(p.amount || 0).toFixed(2)}</TableCell>
                        <TableCell>{p.transferMode}</TableCell>
                        <TableCell>
                          <Badge variant={p.status === 'SUCCESS' ? 'default' : p.status === 'FAILED' ? 'destructive' : 'secondary'}
                            className={p.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : ''}>
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{p.utr || '-'}</TableCell>
                        <TableCell className="text-sm text-gray-500">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cf-splits">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SplitSquareVertical className="h-5 w-5 text-pink-500" />
                Split Settlements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <SplitSquareVertical className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 mb-2">Split settlement reports will appear here</p>
                <p className="text-sm text-gray-400">Configure vendor mappings in the Easy Split section to enable auto-split payments to unions</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cf-terminals">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-green-500" />
                SoftPOS Terminals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cfTerminals.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No SoftPOS terminals registered yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Terminal ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Merchant</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cfTerminals.map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-sm">{t.terminalId}</TableCell>
                        <TableCell>{t.terminalName}</TableCell>
                        <TableCell>{t.merchantId}</TableCell>
                        <TableCell>
                          <Badge variant={t.status === 'ACTIVE' ? 'default' : 'secondary'}
                            className={t.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : ''}>
                            {t.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </AdminLayout>
  );
}