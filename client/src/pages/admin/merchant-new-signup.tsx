import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AdminLayout from './layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Check, X, Eye, Clock, Search, CheckCircle, XCircle, Trash2, Shield,
  Users, Building2, Milk, Package, IceCream, UserPlus, RefreshCw, Store
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Merchant } from "@shared/schema";

const PRICING_ROLES = ['FEDERATION', 'INTER_UNION', 'WHOLESALE_DEALER', 'DEALER', 'RETAILER', 'MRP'];

const ROLE_LABELS: Record<string, string> = {
  federation: 'Federation',
  inter_union: 'District Union',
  wsd: 'WSD (Wholesale Dealer)',
  dealer: 'Dealer',
  retailer: 'Retailer',
};

const ROLE_COLORS: Record<string, string> = {
  federation: 'bg-purple-100 text-purple-800',
  inter_union: 'bg-indigo-100 text-indigo-800',
  wsd: 'bg-blue-100 text-blue-800',
  dealer: 'bg-green-100 text-green-800',
  retailer: 'bg-orange-100 text-orange-800',
};

export default function MerchantNewSignup() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject'>('approve');

  const [selectedReg, setSelectedReg] = useState<any>(null);
  const [isB2bViewOpen, setIsB2bViewOpen] = useState(false);
  const [isB2bApproveOpen, setIsB2bApproveOpen] = useState(false);
  const [isB2bRejectOpen, setIsB2bRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approvalData, setApprovalData] = useState({
    parentId: '',
    parentRole: '',
    parentName: '',
    pricingTier: 'DEALER',
    freshMilkApproved: false,
    productsApproved: true,
    iceCreamApproved: false,
    freshMilkPricingRole: 'DEALER',
    productsPricingRole: 'DEALER',
    iceCreamPricingRole: 'DEALER',
  });

  const { data: merchants, isLoading: merchantsLoading } = useQuery<Merchant[]>({
    queryKey: ["/api/admin/merchants", "pending"],
    queryFn: async () => {
      const res = await fetch("/api/admin/merchants?status=pending", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch pending merchants");
      return res.json();
    },
  });

  const { data: b2bData, isLoading: b2bLoading, refetch: refetchB2b } = useQuery<{ success: boolean; registrations: any[] }>({
    queryKey: ['/api/admin/b2b-registrations'],
  });

  const { data: wsdsData } = useQuery<{ success: boolean; dealers: any[] }>({
    queryKey: ['/api/admin/wholesale-dealers'],
  });

  const { data: allMerchantsData } = useQuery<any[]>({
    queryKey: ['/api/admin/merchants'],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PUT", `/api/admin/merchants/${id}`, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/merchants", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/merchants"] });
      toast({
        title: "Success",
        description: `District Union ${variables.status === 'active' ? 'approved' : 'rejected'} successfully`,
      });
      setIsConfirmDialogOpen(false);
      setSelectedMerchant(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const b2bApproveMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest('POST', `/api/admin/b2b-registrations/${id}/approve`, data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: 'Approved', description: 'B2B registration approved and mapped successfully' });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/b2b-registrations'] });
        setIsB2bApproveOpen(false);
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' });
      }
    },
  });

  const b2bRejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await apiRequest('POST', `/api/admin/b2b-registrations/${id}/reject`, { rejectedReason: reason });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Rejected', description: 'Registration has been rejected' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/b2b-registrations'] });
      setIsB2bRejectOpen(false);
      setRejectReason('');
    },
  });

  const b2bDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/admin/b2b-registrations/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Deleted', description: 'Registration deleted' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/b2b-registrations'] });
    },
  });

  const pendingMerchants = merchants || [];
  const allRegistrations = b2bData?.registrations || [];
  const pendingB2b = allRegistrations.filter((r: any) => r.status === 'pending');
  const wsds = wsdsData?.dealers || [];
  const allMerchants = allMerchantsData || [];

  const parentOptions = [
    ...wsds.map((w: any) => ({ id: w.id || w.wsdCode, role: 'wsd', name: `WSD: ${w.name || w.wsdCode}`, email: w.email })),
    ...allMerchants.map((m: any) => ({ id: m.id, role: 'inter_union', name: `Union: ${m.name || m.restaurantName}`, email: m.contactEmail })),
  ];

  const b2bByRole = (role: string) => pendingB2b.filter((r: any) => r.role === role);
  const federationCount = b2bByRole('federation').length;
  const districtUnionCount = pendingMerchants.length + b2bByRole('inter_union').length;
  const wsdCount = b2bByRole('wsd').length;
  const dealerCount = b2bByRole('dealer').length;
  const retailerCount = b2bByRole('retailer').length;
  const totalPending = pendingMerchants.length + pendingB2b.length;

  const getFilteredB2b = (role?: string) => {
    let list = role ? pendingB2b.filter((r: any) => r.role === role) : pendingB2b;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter((r: any) =>
        r.businessName?.toLowerCase().includes(term) ||
        r.contactName?.toLowerCase().includes(term) ||
        r.email?.toLowerCase().includes(term) ||
        r.gstin?.toLowerCase().includes(term)
      );
    }
    return list;
  };

  const getFilteredMerchants = () => {
    if (!searchTerm) return pendingMerchants;
    const term = searchTerm.toLowerCase();
    return pendingMerchants.filter(m =>
      m.restaurantName?.toLowerCase().includes(term) ||
      m.contactName?.toLowerCase().includes(term) ||
      m.contactEmail?.toLowerCase().includes(term)
    );
  };

  const handleView = (merchant: Merchant) => {
    setSelectedMerchant(merchant);
    setIsViewDialogOpen(true);
  };
  const handleApprove = (merchant: Merchant) => {
    setSelectedMerchant(merchant);
    setConfirmAction('approve');
    setIsConfirmDialogOpen(true);
  };
  const handleReject = (merchant: Merchant) => {
    setSelectedMerchant(merchant);
    setConfirmAction('reject');
    setIsConfirmDialogOpen(true);
  };
  const confirmStatusChange = () => {
    if (selectedMerchant) {
      updateStatusMutation.mutate({
        id: selectedMerchant.id,
        status: confirmAction === 'approve' ? 'active' : 'suspended',
      });
    }
  };

  const openB2bApprove = (reg: any) => {
    setSelectedReg(reg);
    setApprovalData({
      parentId: '',
      parentRole: '',
      parentName: '',
      pricingTier: reg.role === 'retailer' ? 'RETAILER' : reg.role === 'dealer' ? 'DEALER' : reg.role === 'wsd' ? 'WHOLESALE_DEALER' : reg.role === 'inter_union' ? 'INTER_UNION' : 'FEDERATION',
      freshMilkApproved: false,
      productsApproved: true,
      iceCreamApproved: false,
      freshMilkPricingRole: 'DEALER',
      productsPricingRole: 'DEALER',
      iceCreamPricingRole: 'DEALER',
    });
    setIsB2bApproveOpen(true);
  };

  const isLoading = merchantsLoading || b2bLoading;

  const renderB2bTable = (registrations: any[]) => {
    if (registrations.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <UserPlus className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No pending applications in this category</p>
        </div>
      );
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Business Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Applied On</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {registrations.map((reg: any) => (
            <TableRow key={reg.id}>
              <TableCell className="font-medium">{reg.businessName}</TableCell>
              <TableCell>
                <Badge className={ROLE_COLORS[reg.role] || 'bg-gray-100 text-gray-800'}>
                  {ROLE_LABELS[reg.role] || reg.role}
                </Badge>
              </TableCell>
              <TableCell>{reg.contactName}</TableCell>
              <TableCell>{reg.email}</TableCell>
              <TableCell>{reg.phone || '-'}</TableCell>
              <TableCell>{reg.createdAt ? new Date(reg.createdAt).toLocaleDateString() : '-'}</TableCell>
              <TableCell className="text-right space-x-1">
                <Button size="sm" variant="outline" onClick={() => { setSelectedReg(reg); setIsB2bViewOpen(true); }}>
                  <Eye className="h-4 w-4 mr-1" /> View
                </Button>
                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => openB2bApprove(reg)}>
                  <Check className="h-4 w-4 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => { setSelectedReg(reg); setIsB2bRejectOpen(true); }}>
                  <X className="h-4 w-4 mr-1" /> Reject
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">New Signups</h1>
            <p className="text-muted-foreground">Review and approve all new registration applications</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              <Clock className="h-4 w-4 mr-2" />
              {totalPending} Pending
            </Badge>
            <Button variant="outline" size="sm" onClick={() => { refetchB2b(); queryClient.invalidateQueries({ queryKey: ["/api/admin/merchants", "pending"] }); }}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className={`cursor-pointer hover:shadow-md transition-shadow ${activeTab === 'all' ? 'ring-2 ring-blue-500' : ''}`} onClick={() => setActiveTab('all')}>
            <CardContent className="p-3 text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-gray-600" />
              <p className="text-xl font-bold">{totalPending}</p>
              <p className="text-xs text-gray-500">All</p>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer hover:shadow-md transition-shadow ${activeTab === 'federation' ? 'ring-2 ring-blue-500' : ''}`} onClick={() => setActiveTab('federation')}>
            <CardContent className="p-3 text-center">
              <Shield className="h-5 w-5 mx-auto mb-1 text-purple-600" />
              <p className="text-xl font-bold text-purple-600">{federationCount}</p>
              <p className="text-xs text-gray-500">Federation</p>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer hover:shadow-md transition-shadow ${activeTab === 'district_union' ? 'ring-2 ring-blue-500' : ''}`} onClick={() => setActiveTab('district_union')}>
            <CardContent className="p-3 text-center">
              <Building2 className="h-5 w-5 mx-auto mb-1 text-teal-600" />
              <p className="text-xl font-bold text-teal-600">{districtUnionCount}</p>
              <p className="text-xs text-gray-500">District Union</p>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer hover:shadow-md transition-shadow ${activeTab === 'wsd' ? 'ring-2 ring-blue-500' : ''}`} onClick={() => setActiveTab('wsd')}>
            <CardContent className="p-3 text-center">
              <Package className="h-5 w-5 mx-auto mb-1 text-blue-600" />
              <p className="text-xl font-bold text-blue-600">{wsdCount}</p>
              <p className="text-xs text-gray-500">WSD</p>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer hover:shadow-md transition-shadow ${activeTab === 'dealer' ? 'ring-2 ring-blue-500' : ''}`} onClick={() => setActiveTab('dealer')}>
            <CardContent className="p-3 text-center">
              <UserPlus className="h-5 w-5 mx-auto mb-1 text-green-600" />
              <p className="text-xl font-bold text-green-600">{dealerCount}</p>
              <p className="text-xs text-gray-500">Dealer</p>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer hover:shadow-md transition-shadow ${activeTab === 'retailer' ? 'ring-2 ring-blue-500' : ''}`} onClick={() => setActiveTab('retailer')}>
            <CardContent className="p-3 text-center">
              <Store className="h-5 w-5 mx-auto mb-1 text-orange-600" />
              <p className="text-xl font-bold text-orange-600">{retailerCount}</p>
              <p className="text-xs text-gray-500">Retailer</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-lg">
                {activeTab === 'all' ? 'All Pending Applications' :
                 activeTab === 'district_union' ? 'District Union Applications' :
                 `${ROLE_LABELS[activeTab] || activeTab} Applications`}
              </CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input className="pl-9" placeholder="Search by name, email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Federation section - shown in 'all' and 'federation' tabs */}
            {(activeTab === 'all' || activeTab === 'federation') && (
              <div className="mb-6">
                {activeTab === 'all' && getFilteredB2b('federation').length > 0 && (
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <Badge className={ROLE_COLORS['federation']}>Federation</Badge>
                    <span className="text-gray-500">({getFilteredB2b('federation').length})</span>
                  </h3>
                )}
                {activeTab === 'federation' || activeTab === 'all' ? (
                  getFilteredB2b('federation').length > 0 ? (
                    <>
                      {renderB2bTable(getFilteredB2b('federation'))}
                      {activeTab === 'all' && <div className="border-t my-6" />}
                    </>
                  ) : activeTab === 'federation' ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Shield className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p>No pending Federation applications</p>
                    </div>
                  ) : null
                ) : null}
              </div>
            )}

            {/* District Union section - shown in 'all' and 'district_union' tabs, includes inter_union B2B */}
            {(activeTab === 'all' || activeTab === 'district_union') && (
              <div className="mb-6">
                {activeTab === 'all' && (getFilteredMerchants().length > 0 || getFilteredB2b('inter_union').length > 0) && (
                  <h3 className="text-sm font-semibold text-teal-700 flex items-center gap-2 mb-3">
                    <Building2 className="h-4 w-4" /> District Union ({districtUnionCount})
                  </h3>
                )}
                {getFilteredMerchants().length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>District Union Name</TableHead>
                        <TableHead>Contact Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Applied On</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredMerchants().map((merchant) => (
                        <TableRow key={merchant.id}>
                          <TableCell className="font-medium">{merchant.restaurantName}</TableCell>
                          <TableCell>{merchant.contactName}</TableCell>
                          <TableCell>{merchant.contactEmail}</TableCell>
                          <TableCell>{merchant.contactPhone}</TableCell>
                          <TableCell>{merchant.createdAt ? new Date(merchant.createdAt).toLocaleDateString() : "N/A"}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button size="sm" variant="outline" onClick={() => handleView(merchant)}>
                              <Eye className="h-4 w-4 mr-1" /> View
                            </Button>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(merchant)}>
                              <Check className="h-4 w-4 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleReject(merchant)}>
                              <X className="h-4 w-4 mr-1" /> Reject
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : null}
                {getFilteredB2b('inter_union').length > 0 && (
                  <>
                    {getFilteredMerchants().length > 0 && <div className="border-t my-4" />}
                    {renderB2bTable(getFilteredB2b('inter_union'))}
                  </>
                )}
                {getFilteredMerchants().length === 0 && getFilteredB2b('inter_union').length === 0 && activeTab === 'district_union' && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p>No pending District Union applications</p>
                  </div>
                )}
                {activeTab === 'all' && (getFilteredMerchants().length > 0 || getFilteredB2b('inter_union').length > 0) && (
                  <div className="border-t my-6" />
                )}
              </div>
            )}

            {/* WSD section */}
            {(activeTab === 'all' || activeTab === 'wsd') && (
              <div className="mb-6">
                {activeTab === 'all' && getFilteredB2b('wsd').length > 0 && (
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <Badge className={ROLE_COLORS['wsd']}>WSD (Wholesale Dealer)</Badge>
                    <span className="text-gray-500">({getFilteredB2b('wsd').length})</span>
                  </h3>
                )}
                {getFilteredB2b('wsd').length > 0 ? (
                  <>
                    {renderB2bTable(getFilteredB2b('wsd'))}
                    {activeTab === 'all' && <div className="border-t my-6" />}
                  </>
                ) : activeTab === 'wsd' ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p>No pending WSD applications</p>
                  </div>
                ) : null}
              </div>
            )}

            {/* Dealer section */}
            {(activeTab === 'all' || activeTab === 'dealer') && (
              <div className="mb-6">
                {activeTab === 'all' && getFilteredB2b('dealer').length > 0 && (
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <Badge className={ROLE_COLORS['dealer']}>Dealer</Badge>
                    <span className="text-gray-500">({getFilteredB2b('dealer').length})</span>
                  </h3>
                )}
                {getFilteredB2b('dealer').length > 0 ? (
                  <>
                    {renderB2bTable(getFilteredB2b('dealer'))}
                    {activeTab === 'all' && <div className="border-t my-6" />}
                  </>
                ) : activeTab === 'dealer' ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserPlus className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p>No pending Dealer applications</p>
                  </div>
                ) : null}
              </div>
            )}

            {/* Retailer section */}
            {(activeTab === 'all' || activeTab === 'retailer') && (
              <div className="mb-6">
                {activeTab === 'all' && getFilteredB2b('retailer').length > 0 && (
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <Badge className={ROLE_COLORS['retailer']}>Retailer</Badge>
                    <span className="text-gray-500">({getFilteredB2b('retailer').length})</span>
                  </h3>
                )}
                {getFilteredB2b('retailer').length > 0 ? (
                  renderB2bTable(getFilteredB2b('retailer'))
                ) : activeTab === 'retailer' ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Store className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p>No pending Retailer applications</p>
                  </div>
                ) : null}
              </div>
            )}

            {activeTab === 'all' && totalPending === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No pending applications</p>
                <p className="text-sm">New signups will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* District Union View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>District Union Details</DialogTitle>
            <DialogDescription>Review District Union application details</DialogDescription>
          </DialogHeader>
          {selectedMerchant && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">District Union Name</label>
                  <p className="text-lg font-semibold">{selectedMerchant.restaurantName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Union Slug</label>
                  <p>{selectedMerchant.restaurantSlug}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Contact Name</label>
                  <p>{selectedMerchant.contactName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Contact Email</label>
                  <p>{selectedMerchant.contactEmail}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Contact Phone</label>
                  <p>{selectedMerchant.contactPhone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Union Phone</label>
                  <p>{selectedMerchant.restaurantPhone}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Address</label>
                  <p>{selectedMerchant.address || "Not provided"}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p>{selectedMerchant.description || "Not provided"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Delivery Distance</label>
                  <p>{selectedMerchant.deliveryDistanceCovered} miles</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Applied On</label>
                  <p>{selectedMerchant.createdAt ? new Date(selectedMerchant.createdAt).toLocaleDateString() : "N/A"}</p>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
                <Button className="bg-green-600 hover:bg-green-700" onClick={() => { setIsViewDialogOpen(false); handleApprove(selectedMerchant); }}>
                  <Check className="h-4 w-4 mr-1" /> Approve
                </Button>
                <Button variant="destructive" onClick={() => { setIsViewDialogOpen(false); handleReject(selectedMerchant); }}>
                  <X className="h-4 w-4 mr-1" /> Reject
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* District Union Confirm Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === 'approve' ? 'Approve District Union' : 'Reject District Union'}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === 'approve'
                ? `Are you sure you want to approve "${selectedMerchant?.restaurantName}"? They will be able to start receiving orders.`
                : `Are you sure you want to reject "${selectedMerchant?.restaurantName}"? Their account will be suspended.`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>Cancel</Button>
            <Button
              variant={confirmAction === 'approve' ? 'default' : 'destructive'}
              className={confirmAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
              onClick={confirmStatusChange}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? 'Processing...' : (confirmAction === 'approve' ? 'Approve' : 'Reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* B2B View Dialog */}
      {selectedReg && (
        <Dialog open={isB2bViewOpen} onOpenChange={setIsB2bViewOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" /> B2B Registration Details
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className={ROLE_COLORS[selectedReg.role] || ''}>
                  {ROLE_LABELS[selectedReg.role] || selectedReg.role}
                </Badge>
                <Badge className="bg-orange-100 text-orange-800">Pending</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Business:</span><p className="font-medium">{selectedReg.businessName}</p></div>
                <div><span className="text-gray-500">Contact:</span><p className="font-medium">{selectedReg.contactName}</p></div>
                <div><span className="text-gray-500">Email:</span><p className="font-medium">{selectedReg.email}</p></div>
                <div><span className="text-gray-500">Phone:</span><p className="font-medium">{selectedReg.phone || '-'}</p></div>
                <div><span className="text-gray-500">GSTIN:</span><p className="font-medium">{selectedReg.gstin || '-'}</p></div>
                <div><span className="text-gray-500">PAN:</span><p className="font-medium">{selectedReg.panNumber || '-'}</p></div>
                <div className="col-span-2"><span className="text-gray-500">Address:</span><p className="font-medium">{selectedReg.address || '-'}, {selectedReg.city || ''} {selectedReg.pincode || ''}</p></div>
                <div><span className="text-gray-500">District Union:</span><p className="font-medium">{selectedReg.districtUnion || '-'}</p></div>
                <div><span className="text-gray-500">FSSAI:</span><p className="font-medium">{selectedReg.fssaiLicense || '-'}</p></div>
                {selectedReg.bankName && <div><span className="text-gray-500">Bank:</span><p className="font-medium">{selectedReg.bankName}</p></div>}
                {selectedReg.bankIfsc && <div><span className="text-gray-500">IFSC:</span><p className="font-medium">{selectedReg.bankIfsc}</p></div>}
                {selectedReg.notes && <div className="col-span-2"><span className="text-gray-500">Notes:</span><p className="font-medium">{selectedReg.notes}</p></div>}
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => { setIsB2bViewOpen(false); openB2bApprove(selectedReg); }}>
                  <CheckCircle className="h-4 w-4 mr-1" /> Approve & Map
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => { setIsB2bViewOpen(false); setIsB2bRejectOpen(true); }}>
                  <XCircle className="h-4 w-4 mr-1" /> Reject
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* B2B Approve Dialog */}
      {selectedReg && (
        <Dialog open={isB2bApproveOpen} onOpenChange={setIsB2bApproveOpen}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" /> Approve & Map: {selectedReg.businessName}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-gray-500">Role:</span> <Badge className={ROLE_COLORS[selectedReg.role] || ''}>{ROLE_LABELS[selectedReg.role]}</Badge></div>
                  <div><span className="text-gray-500">Business:</span> {selectedReg.businessName}</div>
                  <div><span className="text-gray-500">Contact:</span> {selectedReg.contactName}</div>
                  <div><span className="text-gray-500">Email:</span> {selectedReg.email}</div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium flex items-center gap-1 mb-1">
                  <Shield className="h-3 w-3" /> Map to Parent (WSD / Union)
                </label>
                <Select
                  value={approvalData.parentId}
                  onValueChange={(v) => {
                    const parent = parentOptions.find((p: any) => p.id === v);
                    setApprovalData(prev => ({ ...prev, parentId: v, parentRole: parent?.role || '', parentName: parent?.name || '' }));
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select parent (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Parent (Direct)</SelectItem>
                    {parentOptions.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400 mt-1">Map this user to a WSD or District Union</p>
              </div>

              <div>
                <label className="text-sm font-medium mb-1">Pricing Tier</label>
                <Select value={approvalData.pricingTier} onValueChange={(v) => setApprovalData(prev => ({ ...prev, pricingTier: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRICING_ROLES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div>
                <h4 className="text-sm font-semibold flex items-center gap-1 mb-2"><Shield className="h-4 w-4" /> Product Segment Access</h4>
                <div className="space-y-3">
                  <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2"><Milk className="h-4 w-4 text-cyan-600" /><span className="text-sm font-medium">Fresh Milk</span></div>
                      <Switch checked={approvalData.freshMilkApproved} onCheckedChange={(v) => setApprovalData(prev => ({ ...prev, freshMilkApproved: v }))} />
                    </div>
                    {approvalData.freshMilkApproved && (
                      <Select value={approvalData.freshMilkPricingRole} onValueChange={(v) => setApprovalData(prev => ({ ...prev, freshMilkPricingRole: v }))}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{PRICING_ROLES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2"><Package className="h-4 w-4 text-blue-600" /><span className="text-sm font-medium">Products</span></div>
                      <Switch checked={approvalData.productsApproved} onCheckedChange={(v) => setApprovalData(prev => ({ ...prev, productsApproved: v }))} />
                    </div>
                    {approvalData.productsApproved && (
                      <Select value={approvalData.productsPricingRole} onValueChange={(v) => setApprovalData(prev => ({ ...prev, productsPricingRole: v }))}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{PRICING_ROLES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="bg-pink-50 border border-pink-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2"><IceCream className="h-4 w-4 text-pink-600" /><span className="text-sm font-medium">Ice Cream</span></div>
                      <Switch checked={approvalData.iceCreamApproved} onCheckedChange={(v) => setApprovalData(prev => ({ ...prev, iceCreamApproved: v }))} />
                    </div>
                    {approvalData.iceCreamApproved && (
                      <Select value={approvalData.iceCreamPricingRole} onValueChange={(v) => setApprovalData(prev => ({ ...prev, iceCreamPricingRole: v }))}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{PRICING_ROLES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </div>

              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={b2bApproveMutation.isPending}
                onClick={() => {
                  b2bApproveMutation.mutate({
                    id: selectedReg.id,
                    data: {
                      ...approvalData,
                      parentId: approvalData.parentId === 'none' ? null : approvalData.parentId,
                    },
                  });
                }}
              >
                {b2bApproveMutation.isPending ? 'Approving...' : 'Approve & Map Registration'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* B2B Reject Dialog */}
      {selectedReg && (
        <Dialog open={isB2bRejectOpen} onOpenChange={setIsB2bRejectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" /> Reject: {selectedReg.businessName}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea placeholder="Reason for rejection (optional)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} />
              <Button
                variant="destructive"
                className="w-full"
                disabled={b2bRejectMutation.isPending}
                onClick={() => b2bRejectMutation.mutate({ id: selectedReg.id, reason: rejectReason })}
              >
                {b2bRejectMutation.isPending ? 'Rejecting...' : 'Reject Registration'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
}
