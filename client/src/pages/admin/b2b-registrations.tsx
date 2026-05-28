import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import AdminLayout from './layout';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatTimestamp } from '@/lib/format-timestamp';
import {
  Search, CheckCircle, XCircle, Eye, Trash2, Shield, Users,
  Building2, Milk, Package, IceCream, Clock, UserPlus, RefreshCw,
  Download, Phone, MapPin, FileText, Hash, ArrowRight, ChevronRight, History, FileSpreadsheet
} from 'lucide-react';
import { downloadSampleExcel, SAMPLE_EXCEL_CONFIGS } from '@/lib/excel-utils';

const PRICING_ROLES = ['FEDERATION', 'INTER_UNION', 'WHOLESALE_DEALER', 'DEALER', 'RETAILER', 'MRP'];

const ROLE_LABELS: Record<string, string> = {
  federation: 'Federation',
  inter_union: 'District Union',
  wsd: 'WSD',
  'dealer_/_agent': 'Dealer/Agent',
  dealer: 'Dealer',
  retailer: 'Retailer',
  mpcs: 'MPCS',
  hotel: 'Hotel',
  institution: 'Institution',
  private_parlour: 'Private Parlour',
  union_parlour: 'Union Parlour',
  'general_shop_/_retail': 'General Shop/Retail',
  b2b: 'B2B',
};

const ROLE_COLORS: Record<string, string> = {
  federation: 'bg-purple-100 text-purple-800',
  inter_union: 'bg-indigo-100 text-indigo-800',
  wsd: 'bg-blue-100 text-blue-800',
  'dealer_/_agent': 'bg-green-100 text-green-800',
  dealer: 'bg-green-100 text-green-800',
  retailer: 'bg-orange-100 text-orange-800',
  mpcs: 'bg-teal-100 text-teal-800',
  hotel: 'bg-amber-100 text-amber-800',
  institution: 'bg-rose-100 text-rose-800',
  private_parlour: 'bg-cyan-100 text-cyan-800',
  union_parlour: 'bg-sky-100 text-sky-800',
  'general_shop_/_retail': 'bg-lime-100 text-lime-800',
};

const TIER_LABELS: Record<string, string> = {
  M: 'MRP', R: 'Retailer', D: 'Dealer', W: 'WSD', U: 'District Union', F: 'Federation', X: 'No Access',
};

const APPROVAL_LEVEL_NAMES: Record<number, string> = {
  5: 'Executive',
  4: 'Dy. Manager',
  3: 'Manager',
  2: 'AGM',
  1: 'GM',
  0: 'Completed',
};

const APPROVAL_LEVEL_COLORS: Record<number, string> = {
  5: 'bg-slate-100 text-slate-700',
  4: 'bg-indigo-100 text-indigo-700',
  3: 'bg-blue-100 text-blue-700',
  2: 'bg-purple-100 text-purple-700',
  1: 'bg-amber-100 text-amber-700',
  0: 'bg-green-100 text-green-700',
};

function ApprovalPipeline({ reg }: { reg: any }) {
  const levels = [5, 4, 3, 2, 1];
  const chain = Array.isArray(reg.approvalChain) ? reg.approvalChain : [];
  const currentLevel = reg.status === 'approved' ? 0 : (reg.currentApproverLevel ?? 5);

  return (
    <div className="flex items-center gap-0.5 flex-wrap">
      {levels.map((lvl, i) => {
        const approved = chain.some((c: any) => c.level === lvl && c.action === 'approved');
        const rejected = chain.some((c: any) => c.level === lvl && c.action === 'rejected');
        const isCurrent = currentLevel === lvl && reg.status === 'pending';
        return (
          <span key={lvl} className="flex items-center gap-0.5">
            <span
              className={`text-[9px] px-1 py-0.5 rounded font-medium ${
                rejected ? 'bg-red-100 text-red-700' :
                approved ? 'bg-green-100 text-green-700' :
                isCurrent ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-400' :
                'bg-gray-100 text-gray-400'
              }`}
              title={`${APPROVAL_LEVEL_NAMES[lvl]}: ${rejected ? 'Rejected' : approved ? 'Approved' : isCurrent ? 'Pending' : 'Waiting'}`}
            >
              {APPROVAL_LEVEL_NAMES[lvl]}
            </span>
            {i < levels.length - 1 && <ChevronRight className="h-2.5 w-2.5 text-gray-300" />}
          </span>
        );
      })}
    </div>
  );
}

function ApprovalTimeline({ chain, status }: { chain: any[]; status: string }) {
  if (!chain || chain.length === 0) {
    return (
      <div className="text-center py-4 text-gray-400 text-sm">
        <History className="h-5 w-5 mx-auto mb-1" />
        No approval actions yet
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {chain.map((entry: any, i: number) => (
        <div key={i} className={`flex items-start gap-3 p-2 rounded-lg ${entry.action === 'approved' ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className={`mt-0.5 rounded-full p-1 ${entry.action === 'approved' ? 'bg-green-200' : 'bg-red-200'}`}>
            {entry.action === 'approved' ? <CheckCircle className="h-3 w-3 text-green-700" /> : <XCircle className="h-3 w-3 text-red-700" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={APPROVAL_LEVEL_COLORS[entry.level] || 'bg-gray-100 text-gray-700'}>
                {APPROVAL_LEVEL_NAMES[entry.level] || `Level ${entry.level}`}
              </Badge>
              <span className="text-xs font-medium">{entry.staffName || 'Staff'}</span>
              {entry.designation && <span className="text-xs text-gray-500">({entry.designation})</span>}
            </div>
            {entry.comments && <p className="text-xs text-gray-600 mt-1">{entry.comments}</p>}
            <p className="text-[10px] text-gray-400 mt-0.5">{entry.timestamp ? new Date(entry.timestamp).toLocaleString('en-IN') : '-'}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminB2BRegistrations() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReg, setSelectedReg] = useState<any>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
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

  const { data, isLoading, refetch } = useQuery<{ success: boolean; registrations: any[] }>({
    queryKey: ['/api/admin/b2b-registrations'],
  });

  const { data: wsdsData } = useQuery<{ success: boolean; dealers: any[] }>({
    queryKey: ['/api/admin/wholesale-dealers'],
  });

  const { data: merchantsData } = useQuery<any[]>({
    queryKey: ['/api/admin/merchants'],
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest('POST', `/api/admin/b2b-registrations/${id}/approve`, data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        if (data.duplicateWarnings && data.duplicateWarnings.length > 0) {
          toast({ title: 'Approved — Duplicate Warning', description: data.duplicateWarnings.join('; '), variant: 'destructive' });
        } else {
          toast({ title: 'Approved', description: 'Registration approved and mapped successfully' });
        }
        queryClient.invalidateQueries({ queryKey: ['/api/admin/b2b-registrations'] });
        setIsApproveOpen(false);
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' });
      }
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await apiRequest('POST', `/api/admin/b2b-registrations/${id}/reject`, { rejectedReason: reason });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Rejected', description: 'Registration has been rejected' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/b2b-registrations'] });
      setIsRejectOpen(false);
      setRejectReason('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/admin/b2b-registrations/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Deleted', description: 'Registration deleted' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/b2b-registrations'] });
    },
  });

  const registrations = data?.registrations || [];
  const wsds = wsdsData?.dealers || [];
  const merchants = merchantsData || [];

  const parentOptions = [
    ...wsds.map((w: any) => ({ id: w.id || w.wsdCode, role: 'wsd', name: `WSD: ${w.name || w.wsdCode}`, email: w.email })),
    ...merchants.map((m: any) => ({ id: m.id, role: 'inter_union', name: `Union: ${m.name}`, email: m.contactEmail })),
  ];

  const pendingCount = registrations.filter((r: any) => r.status === 'pending').length;
  const approvedCount = registrations.filter((r: any) => r.status === 'approved').length;
  const rejectedCount = registrations.filter((r: any) => r.status === 'rejected').length;
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const isRecent = (r: any) => {
    if (!r.createdAt) return false;
    const d = new Date(r.createdAt);
    return !isNaN(d.getTime()) && d >= threeDaysAgo;
  };
  const recentCount = registrations.filter(isRecent).length;

  const filtered = registrations
    .filter((r: any) => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'recent') return isRecent(r);
      return r.status === statusFilter;
    })
    .filter((r: any) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (r.businessName?.toLowerCase().includes(term) ||
              r.contactName?.toLowerCase().includes(term) ||
              r.phone?.toLowerCase().includes(term) ||
              r.businessCode?.toLowerCase().includes(term) ||
              r.district?.toLowerCase().includes(term) ||
              r.districtUnion?.toLowerCase().includes(term) ||
              r.gstin?.toLowerCase().includes(term));
    });

  const openApprove = (reg: any) => {
    setSelectedReg(reg);
    setApprovalData({
      parentId: '',
      parentRole: '',
      parentName: '',
      pricingTier: reg.role === 'retailer' || reg.role === 'general_shop_/_retail' ? 'RETAILER' : reg.role === 'wsd' ? 'WHOLESALE_DEALER' : reg.role === 'inter_union' ? 'INTER_UNION' : reg.role === 'federation' ? 'FEDERATION' : 'DEALER',
      freshMilkApproved: !!reg.freshMilkSegment,
      productsApproved: !!reg.productsSegment,
      iceCreamApproved: !!reg.iceCreamSegment,
      freshMilkPricingRole: reg.freshMilkTier ? TIER_LABELS[reg.freshMilkTier] || 'DEALER' : 'DEALER',
      productsPricingRole: reg.productTier ? TIER_LABELS[reg.productTier] || 'DEALER' : 'DEALER',
      iceCreamPricingRole: reg.iceCreamTier ? TIER_LABELS[reg.iceCreamTier] || 'DEALER' : 'DEALER',
    });
    setIsApproveOpen(true);
  };

  const exportCSV = () => {
    window.open('/api/admin/b2b-registrations/export/csv', '_blank');
  };

  const getRoleLabel = (role: string) => ROLE_LABELS[role] || role || '-';
  const getRoleColor = (role: string) => ROLE_COLORS[role] || 'bg-gray-100 text-gray-800';

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <UserPlus className="h-6 w-6 text-blue-600" /> B2B Registrations
            </h1>
            <p className="text-gray-500 text-sm">Manage B2B user registrations, approvals, and hierarchy mapping</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => downloadSampleExcel(SAMPLE_EXCEL_CONFIGS.b2bRegistrations)}>
              <FileSpreadsheet className="h-4 w-4 mr-1" /> Sample Excel
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Card className={`cursor-pointer hover:shadow-md ${statusFilter === 'all' ? 'ring-2 ring-blue-400' : ''}`} onClick={() => setStatusFilter('all')}>
            <CardContent className="p-4 text-center">
              <Users className="h-6 w-6 mx-auto mb-1 text-gray-600" />
              <p className="text-2xl font-bold">{registrations.length}</p>
              <p className="text-xs text-gray-500">Total</p>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer hover:shadow-md ${statusFilter === 'recent' ? 'ring-2 ring-purple-400' : ''}`} onClick={() => setStatusFilter('recent')}>
            <CardContent className="p-4 text-center">
              <History className="h-6 w-6 mx-auto mb-1 text-purple-500" />
              <p className="text-2xl font-bold text-purple-600">{recentCount}</p>
              <p className="text-xs text-gray-500">Recent (3 days)</p>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer hover:shadow-md ${statusFilter === 'pending' ? 'ring-2 ring-orange-400' : ''}`} onClick={() => setStatusFilter('pending')}>
            <CardContent className="p-4 text-center">
              <Clock className="h-6 w-6 mx-auto mb-1 text-orange-500" />
              <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
              <p className="text-xs text-gray-500">Pending</p>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer hover:shadow-md ${statusFilter === 'approved' ? 'ring-2 ring-green-400' : ''}`} onClick={() => setStatusFilter('approved')}>
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-6 w-6 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
              <p className="text-xs text-gray-500">Approved</p>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer hover:shadow-md ${statusFilter === 'rejected' ? 'ring-2 ring-red-400' : ''}`} onClick={() => setStatusFilter('rejected')}>
            <CardContent className="p-4 text-center">
              <XCircle className="h-6 w-6 mx-auto mb-1 text-red-500" />
              <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
              <p className="text-xs text-gray-500">Rejected</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-lg">
                {statusFilter === 'all' ? 'All' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Registrations ({filtered.length})
              </CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input className="pl-9" placeholder="Search name, phone, code, district..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-gray-500">Loading registrations...</p>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <UserPlus className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No registrations found</p>
              </div>
            ) : (
              <>
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">S.No</TableHead>
                      <TableHead>District / Union</TableHead>
                      <TableHead>Business Type</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Business Name</TableHead>
                      <TableHead>Route / Point</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Segments</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((reg: any, idx: number) => (
                      <TableRow key={reg.id}>
                        <TableCell className="text-xs text-gray-400">{idx + 1}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{reg.district || '-'}</p>
                            <p className="text-xs text-gray-500">{reg.districtUnion || '-'}</p>
                            {reg.office && <p className="text-xs text-gray-400">{reg.office}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRoleColor(reg.role)}>
                            {reg.businessType || getRoleLabel(reg.role)}
                          </Badge>
                          {reg.businessTypeCode && (
                            <span className="text-xs font-mono text-gray-400 ml-1">{reg.businessTypeCode}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                            {reg.businessCode || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm font-medium flex items-center gap-1.5">
                              <span>{reg.businessName}</span>
                              {isRecent(reg) && <span className="inline-flex items-center rounded-full bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0 font-semibold">New</span>}
                            </div>
                            {reg.address && <p className="text-xs text-gray-500 truncate max-w-[150px]">{reg.address}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            {reg.businessRoute && <p>{reg.businessRoute}</p>}
                            {reg.businessPoint && <p className="text-gray-500">{reg.businessPoint}</p>}
                            {!reg.businessRoute && !reg.businessPoint && <span className="text-gray-400">-</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <p>{reg.phone || '-'}</p>
                            {reg.mobile2 && <p className="text-gray-400">{reg.mobile2}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-0.5 flex-wrap">
                            {reg.freshMilkSegment && <span className="text-[10px] bg-cyan-100 text-cyan-700 px-1 rounded">FM:{reg.freshMilkTier || '-'}</span>}
                            {reg.productsSegment && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded">P:{reg.productTier || '-'}</span>}
                            {reg.iceCreamSegment && <span className="text-[10px] bg-pink-100 text-pink-700 px-1 rounded">IC:{reg.iceCreamTier || '-'}</span>}
                            {!reg.freshMilkSegment && !reg.productsSegment && !reg.iceCreamSegment && <span className="text-gray-400 text-xs">-</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              {reg.status === 'pending' && <Badge className="bg-orange-100 text-orange-800 text-[10px]">Pending</Badge>}
                              {reg.status === 'approved' && <Badge className="bg-green-100 text-green-800 text-[10px]">Approved</Badge>}
                              {reg.status === 'rejected' && <Badge className="bg-red-100 text-red-800 text-[10px]">Rejected</Badge>}
                              {reg.status === 'pending' && (
                                <Badge className={`text-[10px] ${APPROVAL_LEVEL_COLORS[reg.currentApproverLevel ?? 5]}`}>
                                  @{APPROVAL_LEVEL_NAMES[reg.currentApproverLevel ?? 5]}
                                </Badge>
                              )}
                            </div>
                            <ApprovalPipeline reg={reg} />
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {formatTimestamp(reg.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => { setSelectedReg(reg); setIsViewOpen(true); }}>
                              <Eye className="h-3 w-3" />
                            </Button>
                            {reg.status === 'pending' && (
                              <>
                                <Button size="sm" variant="ghost" className="text-green-600" onClick={() => openApprove(reg)}>
                                  <CheckCircle className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => { setSelectedReg(reg); setIsRejectOpen(true); }}>
                                  <XCircle className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                            <Button size="sm" variant="ghost" className="text-red-400" onClick={() => { if (confirm('Delete this registration permanently?')) deleteMutation.mutate(reg.id); }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden space-y-3">
                {filtered.map((reg: any, idx: number) => (
                  <div key={reg.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate flex items-center gap-1">
                          <span>{reg.businessName}</span>
                          {isRecent(reg) && <span className="inline-flex items-center rounded-full bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0 font-semibold shrink-0">New</span>}
                        </div>
                        <Badge className={`mt-1 ${getRoleColor(reg.role)}`}>
                          {reg.businessType || getRoleLabel(reg.role)}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">#{idx + 1}</span>
                    </div>

                    {reg.businessCode && (
                      <div className="flex items-center gap-1 text-xs">
                        <Hash className="h-3 w-3 text-gray-400" />
                        <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{reg.businessCode}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <MapPin className="h-3 w-3 text-gray-400 shrink-0" />
                      <span>{reg.district || '-'} / {reg.districtUnion || '-'}</span>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <Phone className="h-3 w-3 text-gray-400 shrink-0" />
                      <span>{reg.phone || '-'}</span>
                      {reg.mobile2 && <span className="text-gray-400">/ {reg.mobile2}</span>}
                    </div>

                    <div className="flex gap-1 flex-wrap">
                      {reg.freshMilkSegment && <span className="text-[10px] bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded">FM:{reg.freshMilkTier || '-'}</span>}
                      {reg.productsSegment && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">P:{reg.productTier || '-'}</span>}
                      {reg.iceCreamSegment && <span className="text-[10px] bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded">IC:{reg.iceCreamTier || '-'}</span>}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1 flex-wrap">
                        {reg.status === 'pending' && <Badge className="bg-orange-100 text-orange-800 text-[10px]">Pending</Badge>}
                        {reg.status === 'approved' && <Badge className="bg-green-100 text-green-800 text-[10px]">Approved</Badge>}
                        {reg.status === 'rejected' && <Badge className="bg-red-100 text-red-800 text-[10px]">Rejected</Badge>}
                        {reg.status === 'pending' && (
                          <Badge className={`text-[10px] ${APPROVAL_LEVEL_COLORS[reg.currentApproverLevel ?? 5]}`}>
                            @{APPROVAL_LEVEL_NAMES[reg.currentApproverLevel ?? 5]}
                          </Badge>
                        )}
                      </div>
                      <ApprovalPipeline reg={reg} />
                    </div>

                    <div className="text-xs text-gray-500">
                      {formatTimestamp(reg.createdAt)}
                    </div>

                    <div className="flex gap-1 pt-1 border-t">
                      <Button size="sm" variant="ghost" onClick={() => { setSelectedReg(reg); setIsViewOpen(true); }}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> View
                      </Button>
                      {reg.status === 'pending' && (
                        <>
                          <Button size="sm" variant="ghost" className="text-green-600" onClick={() => openApprove(reg)}>
                            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => { setSelectedReg(reg); setIsRejectOpen(true); }}>
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" className="text-red-400 ml-auto" onClick={() => { if (confirm('Delete this registration permanently?')) deleteMutation.mutate(reg.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              </>
            )}
          </CardContent>
        </Card>

        {selectedReg && (
          <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" /> Registration Details
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Badge className={getRoleColor(selectedReg.role)}>
                    {selectedReg.businessType || getRoleLabel(selectedReg.role)}
                  </Badge>
                  {selectedReg.businessCode && (
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded flex items-center gap-1">
                      <Hash className="h-3 w-3" /> {selectedReg.businessCode}
                    </span>
                  )}
                  {selectedReg.status === 'pending' && <Badge className="bg-orange-100 text-orange-800">Pending</Badge>}
                  {selectedReg.status === 'approved' && <Badge className="bg-green-100 text-green-800">Approved</Badge>}
                  {selectedReg.status === 'rejected' && <Badge className="bg-red-100 text-red-800">Rejected</Badge>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="py-2 px-3">
                      <CardTitle className="text-xs text-gray-500 flex items-center gap-1"><Building2 className="h-3 w-3" /> Union & Office</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 text-sm space-y-1">
                      <p><span className="text-gray-400">District:</span> {selectedReg.district || '-'}</p>
                      <p><span className="text-gray-400">District Union:</span> {selectedReg.districtUnion || '-'}</p>
                      <p><span className="text-gray-400">Office:</span> {selectedReg.office || '-'}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="py-2 px-3">
                      <CardTitle className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> Location</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 text-sm space-y-1">
                      <p><span className="text-gray-400">Route:</span> {selectedReg.businessRoute || '-'}</p>
                      <p><span className="text-gray-400">Point:</span> {selectedReg.businessPoint || '-'}</p>
                      <p><span className="text-gray-400">Address:</span> {selectedReg.address || '-'}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="py-2 px-3">
                      <CardTitle className="text-xs text-gray-500 flex items-center gap-1"><Phone className="h-3 w-3" /> Contact</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 text-sm space-y-1">
                      <p><span className="text-gray-400">Business:</span> {selectedReg.businessName}</p>
                      <p><span className="text-gray-400">Contact:</span> {selectedReg.contactName || '-'}</p>
                      <p><span className="text-gray-400">Mobile 1:</span> {selectedReg.phone || '-'}</p>
                      <p><span className="text-gray-400">Mobile 2:</span> {selectedReg.mobile2 || '-'}</p>
                      <p><span className="text-gray-400">Email:</span> {selectedReg.email || '-'}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="py-2 px-3">
                      <CardTitle className="text-xs text-gray-500 flex items-center gap-1"><FileText className="h-3 w-3" /> Documents</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 text-sm space-y-1">
                      <p><span className="text-gray-400">GSTIN:</span> {selectedReg.gstin || '-'}</p>
                      <p><span className="text-gray-400">PAN:</span> {selectedReg.panNumber || '-'}</p>
                      <p><span className="text-gray-400">Aadhaar:</span> {selectedReg.aadhaarNumber || '-'}</p>
                      <p><span className="text-gray-400">FSSAI:</span> {selectedReg.fssaiLicense || '-'}</p>
                      <p><span className="text-gray-400">MSME/UDYAM:</span> {selectedReg.msmeUdyam || '-'}</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs text-gray-500 flex items-center gap-1"><Shield className="h-3 w-3" /> Segments & Pricing</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className={`rounded-lg p-2 text-center ${selectedReg.freshMilkSegment ? 'bg-cyan-50 border border-cyan-200' : 'bg-gray-50'}`}>
                        <Milk className={`h-5 w-5 mx-auto mb-1 ${selectedReg.freshMilkSegment ? 'text-cyan-600' : 'text-gray-300'}`} />
                        <p className="text-xs font-medium">Fresh Milk</p>
                        <p className="text-xs">{selectedReg.freshMilkSegment ? `Tier: ${selectedReg.freshMilkTier || '-'}` : 'Not selected'}</p>
                      </div>
                      <div className={`rounded-lg p-2 text-center ${selectedReg.productsSegment ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                        <Package className={`h-5 w-5 mx-auto mb-1 ${selectedReg.productsSegment ? 'text-blue-600' : 'text-gray-300'}`} />
                        <p className="text-xs font-medium">Products</p>
                        <p className="text-xs">{selectedReg.productsSegment ? `Tier: ${selectedReg.productTier || '-'}` : 'Not selected'}</p>
                      </div>
                      <div className={`rounded-lg p-2 text-center ${selectedReg.iceCreamSegment ? 'bg-pink-50 border border-pink-200' : 'bg-gray-50'}`}>
                        <IceCream className={`h-5 w-5 mx-auto mb-1 ${selectedReg.iceCreamSegment ? 'text-pink-600' : 'text-gray-300'}`} />
                        <p className="text-xs font-medium">Ice Cream</p>
                        <p className="text-xs">{selectedReg.iceCreamSegment ? `Tier: ${selectedReg.iceCreamTier || '-'}` : 'Not selected'}</p>
                      </div>
                    </div>
                    {selectedReg.securityDeposit && (
                      <p className="text-sm mt-3"><span className="text-gray-400">Security Deposit:</span> ₹{selectedReg.securityDeposit}</p>
                    )}
                  </CardContent>
                </Card>

                {selectedReg.parentName && (
                  <div className="bg-blue-50 rounded-lg p-3 text-sm">
                    <p className="font-semibold text-blue-800">Mapped To:</p>
                    <p>{selectedReg.parentName} ({selectedReg.parentRole})</p>
                    <p>Pricing: {selectedReg.pricingTier}</p>
                  </div>
                )}

                <Card>
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs text-gray-500 flex items-center gap-1"><History className="h-3 w-3" /> Approval Pipeline</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <div className="mb-3">
                      <ApprovalPipeline reg={selectedReg} />
                      {selectedReg.status === 'pending' && (
                        <p className="text-xs text-orange-600 mt-2">
                          Currently pending at: <span className="font-semibold">{APPROVAL_LEVEL_NAMES[selectedReg.currentApproverLevel ?? 5]}</span>
                        </p>
                      )}
                    </div>
                    <ApprovalTimeline chain={selectedReg.approvalChain || []} status={selectedReg.status} />
                  </CardContent>
                </Card>

                {selectedReg.rejectedReason && (
                  <div className="bg-red-50 rounded-lg p-3 text-sm">
                    <p className="font-semibold text-red-800">Rejection Reason:</p>
                    <p>{selectedReg.rejectedReason}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  {selectedReg.status === 'pending' && (
                    <>
                      <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => { setIsViewOpen(false); openApprove(selectedReg); }}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Approve & Map
                      </Button>
                      <Button variant="destructive" className="flex-1" onClick={() => { setIsViewOpen(false); setIsRejectOpen(true); }}>
                        <XCircle className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {selectedReg && (
          <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" /> Approve & Map: {selectedReg.businessName}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-gray-500">Type:</span> <Badge className={getRoleColor(selectedReg.role)}>{selectedReg.businessType || getRoleLabel(selectedReg.role)}</Badge></div>
                    <div><span className="text-gray-500">Code:</span> <span className="font-mono">{selectedReg.businessCode || '-'}</span></div>
                    <div><span className="text-gray-500">Business:</span> {selectedReg.businessName}</div>
                    <div><span className="text-gray-500">Phone:</span> {selectedReg.phone}</div>
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
                      setApprovalData(prev => ({
                        ...prev,
                        parentId: v,
                        parentRole: parent?.role || '',
                        parentName: parent?.name || '',
                      }));
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
                </div>

                <div>
                  <label className="text-sm font-medium mb-1">Pricing Tier</label>
                  <Select value={approvalData.pricingTier} onValueChange={(v) => setApprovalData(prev => ({...prev, pricingTier: v}))}>
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
                        <Switch checked={approvalData.freshMilkApproved} onCheckedChange={(v) => setApprovalData(prev => ({...prev, freshMilkApproved: v}))} />
                      </div>
                      {approvalData.freshMilkApproved && (
                        <Select value={approvalData.freshMilkPricingRole} onValueChange={(v) => setApprovalData(prev => ({...prev, freshMilkPricingRole: v}))}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>{PRICING_ROLES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2"><Package className="h-4 w-4 text-blue-600" /><span className="text-sm font-medium">Products</span></div>
                        <Switch checked={approvalData.productsApproved} onCheckedChange={(v) => setApprovalData(prev => ({...prev, productsApproved: v}))} />
                      </div>
                      {approvalData.productsApproved && (
                        <Select value={approvalData.productsPricingRole} onValueChange={(v) => setApprovalData(prev => ({...prev, productsPricingRole: v}))}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>{PRICING_ROLES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="bg-pink-50 border border-pink-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2"><IceCream className="h-4 w-4 text-pink-600" /><span className="text-sm font-medium">Ice Cream</span></div>
                        <Switch checked={approvalData.iceCreamApproved} onCheckedChange={(v) => setApprovalData(prev => ({...prev, iceCreamApproved: v}))} />
                      </div>
                      {approvalData.iceCreamApproved && (
                        <Select value={approvalData.iceCreamPricingRole} onValueChange={(v) => setApprovalData(prev => ({...prev, iceCreamPricingRole: v}))}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>{PRICING_ROLES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setIsApproveOpen(false)}>Cancel</Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={approveMutation.isPending}
                    onClick={() => {
                      const data = { ...approvalData };
                      if (data.parentId === 'none') {
                        data.parentId = '';
                        data.parentRole = '';
                        data.parentName = '';
                      }
                      approveMutation.mutate({ id: selectedReg.id, data });
                    }}
                  >
                    {approveMutation.isPending ? 'Approving...' : 'Approve & Map'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {selectedReg && (
          <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" /> Reject: {selectedReg.businessName}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <p><span className="text-gray-500">Type:</span> {selectedReg.businessType || getRoleLabel(selectedReg.role)}</p>
                  <p><span className="text-gray-500">Contact:</span> {selectedReg.contactName} ({selectedReg.phone})</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Reason for Rejection</label>
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter reason for rejection..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setIsRejectOpen(false)}>Cancel</Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={rejectMutation.isPending}
                    onClick={() => rejectMutation.mutate({ id: selectedReg.id, reason: rejectReason })}
                  >
                    {rejectMutation.isPending ? 'Rejecting...' : 'Reject Registration'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AdminLayout>
  );
}
