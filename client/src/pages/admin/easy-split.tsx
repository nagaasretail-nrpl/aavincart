import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from './layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Building2, RefreshCw, ArrowUpDown, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface SplitVendor {
  id: number;
  vendorId: string;
  unionId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  bankAccount: string | null;
  ifsc: string | null;
  upiVpa: string | null;
  status: string;
  scheduleOption: number | null;
  kycStatus: string | null;
  dashboardAccess: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface OrderSplit {
  id: number;
  orderId: string | null;
  cfOrderId: string | null;
  vendorId: string | null;
  splitAmount: string | null;
  splitPercentage: string | null;
  status: string | null;
  settlementId: string | null;
  createdAt: string | null;
}

const SEGMENTS = [
  { value: 'fresh_milk', label: 'Fresh Milk' },
  { value: 'products', label: 'Products (Dairy)' },
  { value: 'ice_cream', label: 'Ice Cream' },
];

export default function EasySplitPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('vendors');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    unionId: '',
    email: '',
    phone: '',
    bankAccount: '',
    ifsc: '',
    upiVpa: '',
    scheduleOption: '1',
  });

  const { data: vendors = [], isLoading: vendorsLoading } = useQuery<SplitVendor[]>({
    queryKey: ['/api/cashfree/split/vendors'],
  });

  const { data: settlements = [], isLoading: settlementsLoading } = useQuery<OrderSplit[]>({
    queryKey: ['/api/cashfree/split/settlements'],
  });

  const { data: merchants = [] } = useQuery<any[]>({
    queryKey: ['/api/merchants'],
  });

  const createVendorMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/cashfree/split/vendors', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cashfree/split/vendors'] });
      setShowAddDialog(false);
      setFormData({ name: '', unionId: '', email: '', phone: '', bankAccount: '', ifsc: '', upiVpa: '', scheduleOption: '1' });
      toast({ title: 'Vendor Created', description: 'Split vendor registered successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to create vendor', variant: 'destructive' });
    },
  });

  const updateVendorMutation = useMutation({
    mutationFn: async ({ vendorId, data }: { vendorId: string; data: any }) => {
      return await apiRequest('PATCH', `/api/cashfree/split/vendors/${vendorId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cashfree/split/vendors'] });
      toast({ title: 'Updated', description: 'Vendor updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to update vendor', variant: 'destructive' });
    },
  });

  const handleCreateVendor = () => {
    if (!formData.name) {
      toast({ title: 'Error', description: 'Vendor name is required', variant: 'destructive' });
      return;
    }
    createVendorMutation.mutate({
      ...formData,
      scheduleOption: parseInt(formData.scheduleOption) || 1,
    });
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="secondary">Unknown</Badge>;
    switch (status.toUpperCase()) {
      case 'ACTIVE': return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />Active</Badge>;
      case 'INACTIVE': return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Inactive</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getKycBadge = (kyc: string | null) => {
    if (!kyc) return <Badge variant="outline">N/A</Badge>;
    switch (kyc.toUpperCase()) {
      case 'VERIFIED': return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
      case 'PENDING': return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'FAILED': return <Badge variant="destructive">Failed</Badge>;
      default: return <Badge variant="outline">{kyc}</Badge>;
    }
  };

  const getSplitStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline">—</Badge>;
    switch (status.toLowerCase()) {
      case 'created': return <Badge className="bg-blue-100 text-blue-800">Created</Badge>;
      case 'settled': return <Badge className="bg-green-100 text-green-800">Settled</Badge>;
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getUnionName = (unionId: string | null) => {
    if (!unionId) return '—';
    const merchant = merchants.find((m: any) => m.id === unionId);
    return merchant?.restaurantName || unionId;
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Easy Split</h1>
            <p className="text-gray-500 text-sm">Auto-split customer payments to respective union vendors by product segment</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Vendor</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Register Split Vendor</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>Vendor Name *</Label>
                  <Input
                    placeholder="e.g., Salem District Union - Fresh Milk"
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>District Union</Label>
                  <Select value={formData.unionId} onValueChange={v => setFormData(p => ({ ...p, unionId: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select union..." />
                    </SelectTrigger>
                    <SelectContent>
                      {merchants.map((m: any) => (
                        <SelectItem key={m.id} value={m.id}>{m.restaurantName}</SelectItem>
                      ))}
                      <SelectItem value="fresh_milk">Fresh Milk Segment</SelectItem>
                      <SelectItem value="products">Products Segment</SelectItem>
                      <SelectItem value="ice_cream">Ice Cream Segment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Email</Label>
                    <Input
                      placeholder="vendor@union.com"
                      value={formData.email}
                      onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      placeholder="9876543210"
                      value={formData.phone}
                      onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Bank Account</Label>
                    <Input
                      placeholder="Account number"
                      value={formData.bankAccount}
                      onChange={e => setFormData(p => ({ ...p, bankAccount: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>IFSC Code</Label>
                    <Input
                      placeholder="e.g., SBIN0001234"
                      value={formData.ifsc}
                      onChange={e => setFormData(p => ({ ...p, ifsc: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label>UPI VPA (optional)</Label>
                  <Input
                    placeholder="vendor@upi"
                    value={formData.upiVpa}
                    onChange={e => setFormData(p => ({ ...p, upiVpa: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Settlement Schedule</Label>
                  <Select value={formData.scheduleOption} onValueChange={v => setFormData(p => ({ ...p, scheduleOption: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Option 1 — T+1 Settlement</SelectItem>
                      <SelectItem value="2">Option 2 — T+2 Settlement</SelectItem>
                      <SelectItem value="3">Option 3 — T+3 Settlement</SelectItem>
                      <SelectItem value="4">Option 4 — Weekly Settlement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  onClick={handleCreateVendor}
                  disabled={createVendorMutation.isPending}
                >
                  {createVendorMutation.isPending ? 'Creating...' : 'Register Vendor'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{vendors.length}</p>
                <p className="text-gray-500 text-sm">Registered Vendors</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{vendors.filter(v => v.status === 'ACTIVE').length}</p>
                <p className="text-gray-500 text-sm">Active Vendors</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{settlements.length}</p>
                <p className="text-gray-500 text-sm">Total Splits</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="vendors">Vendor Mapping</TabsTrigger>
            <TabsTrigger value="settlements">Split History</TabsTrigger>
            <TabsTrigger value="config">Segment Config</TabsTrigger>
          </TabsList>

          <TabsContent value="vendors" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Split Vendors</CardTitle>
                <CardDescription>Map each District Union to a Cashfree vendor for auto-split settlements</CardDescription>
              </CardHeader>
              <CardContent>
                {vendorsLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading vendors...</div>
                ) : vendors.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Building2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No split vendors registered</p>
                    <p className="text-sm mt-1">Create vendors for each union/segment to enable auto-split payments</p>
                    <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />Add First Vendor
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vendor ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Union</TableHead>
                          <TableHead>Bank/UPI</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>KYC</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vendors.map(vendor => (
                          <TableRow key={vendor.id}>
                            <TableCell className="font-mono text-xs">{vendor.vendorId}</TableCell>
                            <TableCell className="font-medium">{vendor.name}</TableCell>
                            <TableCell>{getUnionName(vendor.unionId)}</TableCell>
                            <TableCell>
                              {vendor.bankAccount ? (
                                <span className="text-xs">
                                  A/C: ****{vendor.bankAccount.slice(-4)}<br />
                                  IFSC: {vendor.ifsc}
                                </span>
                              ) : vendor.upiVpa ? (
                                <span className="text-xs">UPI: {vendor.upiVpa}</span>
                              ) : (
                                <span className="text-gray-400 text-xs">Not set</span>
                              )}
                            </TableCell>
                            <TableCell>{getStatusBadge(vendor.status)}</TableCell>
                            <TableCell>{getKycBadge(vendor.kycStatus)}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {vendor.status === 'ACTIVE' ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateVendorMutation.mutate({ vendorId: vendor.vendorId, data: { status: 'INACTIVE' } })}
                                    disabled={updateVendorMutation.isPending}
                                  >
                                    Deactivate
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => updateVendorMutation.mutate({ vendorId: vendor.vendorId, data: { status: 'ACTIVE' } })}
                                    disabled={updateVendorMutation.isPending}
                                  >
                                    Activate
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settlements" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg">Split History & Settlements</CardTitle>
                    <CardDescription>View all payment splits and settlement status</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/cashfree/split/settlements'] })}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {settlementsLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading settlements...</div>
                ) : settlements.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <ArrowUpDown className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No split transactions yet</p>
                    <p className="text-sm mt-1">Splits will appear here when customers pay via Cashfree for multi-segment orders</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>CF Order</TableHead>
                          <TableHead>Vendor</TableHead>
                          <TableHead className="text-right">Split Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Settlement ID</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {settlements.map(split => {
                          const vendor = vendors.find(v => v.vendorId === split.vendorId);
                          return (
                            <TableRow key={split.id}>
                              <TableCell className="font-mono text-xs">{split.orderId || '—'}</TableCell>
                              <TableCell className="font-mono text-xs">{split.cfOrderId || '—'}</TableCell>
                              <TableCell>{vendor?.name || split.vendorId || '—'}</TableCell>
                              <TableCell className="text-right font-medium">₹{parseFloat(split.splitAmount || '0').toFixed(2)}</TableCell>
                              <TableCell>{getSplitStatusBadge(split.status)}</TableCell>
                              <TableCell className="font-mono text-xs">{split.settlementId || '—'}</TableCell>
                              <TableCell className="text-xs">
                                {split.createdAt ? new Date(split.createdAt).toLocaleDateString('en-IN') : '—'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="config" className="mt-4">
            <div className="grid gap-4 md:grid-cols-3">
              {SEGMENTS.map(seg => {
                const matchedVendor = vendors.find(v =>
                  v.status === 'ACTIVE' && v.unionId && (
                    v.name?.toLowerCase().includes(seg.label.toLowerCase()) ||
                    v.unionId.toLowerCase().includes(seg.value)
                  )
                );
                return (
                  <Card key={seg.value}>
                    <CardHeader>
                      <CardTitle className="text-base">{seg.label}</CardTitle>
                      <CardDescription>
                        {seg.label === 'Fresh Milk' && 'Standardised, toned, double toned milk'}
                        {seg.label === 'Products (Dairy)' && 'Curd, buttermilk, paneer, ghee, sweets'}
                        {seg.label === 'Ice Cream' && 'All ice cream, kulfi, frozen desserts'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {matchedVendor ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <span className="font-medium text-sm">Mapped</span>
                          </div>
                          <p className="text-sm text-gray-600">{matchedVendor.name}</p>
                          <p className="text-xs text-gray-400 font-mono">{matchedVendor.vendorId}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <XCircle className="h-5 w-5 text-gray-400" />
                            <span className="text-sm text-gray-500">Not mapped</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                              setFormData(p => ({ ...p, unionId: seg.value, name: `${seg.label} Vendor` }));
                              setShowAddDialog(true);
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />Map Vendor
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">How Auto-Split Works</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 space-y-2">
                <p>When a customer places an order with items from multiple segments (Fresh Milk, Products, Ice Cream), the payment is automatically split to the respective union vendor.</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Customer adds Fresh Milk (₹500) + Ice Cream (₹300) to cart</li>
                  <li>At checkout, Cashfree PG order is created with <code className="bg-gray-100 px-1 rounded">order_splits</code></li>
                  <li>Fresh Milk vendor receives ₹500, Ice Cream vendor receives ₹300</li>
                  <li>Settlements happen per vendor's schedule option (T+1, T+2, etc.)</li>
                </ol>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
