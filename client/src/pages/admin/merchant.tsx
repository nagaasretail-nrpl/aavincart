import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import AdminLayout from './layout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Edit, Trash2, Copy, Upload, User, LogIn, Building2, MapPin, Users, Download, FileSpreadsheet, RefreshCw, Key, Eye, EyeOff, LogOut } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { formatTimestamp } from '@/lib/format-timestamp';
import { downloadSampleExcel, SAMPLE_EXCEL_CONFIGS } from '@/lib/excel-utils';

interface Merchant {
  id: string;
  restaurantName: string;
  contactName: string;
  restaurantPhone: string;
  contactEmail: string;
  contactPhone: string;
  status: string;
  createdAt: Date;
  restaurantSlug: string;
  address: string;
  isCommission?: boolean;
  pricingTierCode?: string;
  username?: string;
  password?: string;
  merchantUuid?: string;
}

export default function MerchantManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState('25');
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Merchant | null>(null);
  const [credentialsMerchant, setCredentialsMerchant] = useState<Merchant | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const { data: merchants = [], isLoading, error } = useQuery<Merchant[]>({
    queryKey: ['/api/admin/merchants'],
  });

  const deleteMerchantMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/merchants/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete District Union');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/merchants'] });
      toast({ title: "Success", description: "District Union deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete District Union", variant: "destructive" });
    },
  });

  const updateMerchantMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Merchant> }) => {
      const response = await fetch(`/api/admin/merchants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update District Union');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/merchants'] });
      setEditingMerchant(null);
      toast({ title: "Success", description: "District Union updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update District Union", variant: "destructive" });
    },
  });

  const duplicateMerchantMutation = useMutation({
    mutationFn: async (merchant: Merchant) => {
      const duplicateData = {
        merchantUuid: `MER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        restaurantName: `${merchant.restaurantName} (Copy)`,
        restaurantSlug: `${merchant.restaurantSlug}-copy-${Date.now()}`,
        restaurantPhone: merchant.restaurantPhone,
        contactName: merchant.contactName,
        contactPhone: merchant.contactPhone,
        contactEmail: `copy_${Date.now()}_${merchant.contactEmail}`,
        address: merchant.address,
        username: `copy_${Date.now()}`,
        password: 'password123',
        status: 'pending',
      };
      const response = await fetch('/api/admin/merchants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicateData),
      });
      if (!response.ok) throw new Error('Failed to duplicate merchant');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/merchants'] });
      toast({ title: "Success", description: "District Union duplicated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to duplicate District Union", variant: "destructive" });
    },
  });

  const forceLogoutMutation = useMutation({
    mutationFn: async (merchantId: string) => {
      const response = await fetch(`/api/admin/force-logout-merchant/${merchantId}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to invalidate sessions');
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Sessions Invalidated", description: data.message || "All active sessions have been logged out." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to invalidate sessions", variant: "destructive" });
    },
  });

  const filteredMerchants = merchants.filter((merchant: Merchant) =>
    merchant.restaurantName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    merchant.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    merchant.contactEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    merchant.restaurantSlug?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayedMerchants = filteredMerchants.slice(0, parseInt(entriesPerPage));

  const isFederationDairy = (m: Merchant) => m.id.startsWith('merchant-fed-');
  const isDistrictUnion = (m: Merchant) => !m.id.startsWith('merchant-fed-');

  const stats = {
    total: merchants.length,
    districtUnions: merchants.filter(m => isDistrictUnion(m)).length,
    fedDairies: merchants.filter(m => isFederationDairy(m)).length,
    active: merchants.filter(m => m.status === 'active').length,
    pending: merchants.filter(m => m.status === 'pending').length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 text-white text-xs">Active</Badge>;
      case 'pending':
        return <Badge className="bg-orange-400 text-white text-xs">Pending</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-400 text-white text-xs">Inactive</Badge>;
      case 'suspended':
        return <Badge className="bg-red-500 text-white text-xs">Suspended</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{status}</Badge>;
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Union Name', 'Contact Name', 'Email', 'Phone', 'Slug', 'Status', 'Pricing Tier', 'Address'];
    const rows = filteredMerchants.map(m => [
      m.id,
      m.restaurantName,
      m.contactName,
      m.contactEmail,
      m.contactPhone || m.restaurantPhone || '',
      m.restaurantSlug,
      m.status,
      m.pricingTierCode || '',
      m.address || '',
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'district_unions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse mb-6" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="text-center py-8">
          <p className="text-red-600">Failed to load District Unions</p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/merchants'] })}>
            Retry
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
    <div className="p-4 md:p-6 bg-white min-h-screen space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">All District Unions</h1>
          <p className="text-sm text-gray-500">Manage all 27 District Cooperative Milk Producers Unions & 4 Federation Dairies</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/admin/merchant/add">
            <Button className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2" size="sm">
              <Plus className="h-4 w-4" />
              Add New
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadSampleExcel(SAMPLE_EXCEL_CONFIGS.districtUnions)}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Sample Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/merchants'] })}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600">Total</p>
                <p className="text-2xl font-bold text-blue-800">{stats.total}</p>
              </div>
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600">District Unions</p>
                <p className="text-2xl font-bold text-green-800">{stats.districtUnions}</p>
              </div>
              <MapPin className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-600">Federation Dairies</p>
                <p className="text-2xl font-bold text-purple-800">{stats.fedDairies}</p>
              </div>
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-600">Active</p>
                <p className="text-2xl font-bold text-emerald-800">{stats.active}</p>
              </div>
              <Users className="h-6 w-6 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-600">Pending</p>
                <p className="text-2xl font-bold text-orange-800">{stats.pending}</p>
              </div>
              <Users className="h-6 w-6 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-gray-600 text-sm">Show</span>
          <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-gray-600 text-sm">entries</span>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search unions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-gray-300"
          />
        </div>
      </div>

      <div className="hidden md:block">
        <TooltipProvider delayDuration={100}>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="font-semibold text-gray-700">Name</TableHead>
                  <TableHead className="font-semibold text-gray-700">Code</TableHead>
                  <TableHead className="font-semibold text-gray-700">Contact</TableHead>
                  <TableHead className="font-semibold text-gray-700">Type</TableHead>
                  <TableHead className="font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="font-semibold text-gray-700">Created</TableHead>
                  <TableHead className="font-semibold text-gray-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedMerchants.map((merchant: Merchant) => (
                  <TableRow key={merchant.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-blue-600" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-800">{merchant.restaurantName}</p>
                        <p className="text-xs text-gray-500">{merchant.contactName}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm font-bold text-blue-600">
                        {merchant.restaurantSlug?.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="text-sm">{merchant.contactEmail || '-'}</p>
                        <p className="text-xs text-gray-500">{merchant.contactPhone || merchant.restaurantPhone || '-'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        isFederationDairy(merchant)
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }>
                        {isFederationDairy(merchant) ? 'Federation' : 'District Union'}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(merchant.status)}</TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-500">{formatTimestamp(merchant.createdAt)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href={`/admin/merchant/edit/${merchant.id}`}>
                              <Button variant="outline" size="icon" className="h-8 w-8 border-gray-300">
                                <Edit className="h-4 w-4 text-gray-600" />
                              </Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" className="h-8 w-8 border-gray-300"
                              onClick={() => { setCredentialsMerchant(merchant); setShowPassword(false); }}>
                              <Key className="h-4 w-4 text-gray-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Credentials</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" className="h-8 w-8 border-gray-300"
                              onClick={() => setDeleteConfirm(merchant)}>
                              <Trash2 className="h-4 w-4 text-gray-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" className="h-8 w-8 border-gray-300"
                              onClick={() => duplicateMerchantMutation.mutate(merchant)}
                              disabled={duplicateMerchantMutation.isPending}>
                              <Copy className="h-4 w-4 text-gray-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Duplicate</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" className="h-8 w-8 border-gray-300"
                              onClick={() => {
                                const loginUrl = `/union/dashboard?auto_login=${merchant.id}`;
                                window.open(loginUrl, '_blank');
                                toast({ title: "Auto Login", description: `Opening ${merchant.restaurantName} dashboard...` });
                              }}>
                              <LogIn className="h-4 w-4 text-gray-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Auto Login</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {displayedMerchants.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  {searchQuery ? 'No unions found matching your search.' : 'No district unions found.'}
                </p>
              </div>
            )}
          </div>
        </TooltipProvider>
      </div>

      <div className="md:hidden space-y-3">
        {displayedMerchants.map((merchant: Merchant) => (
          <Card key={merchant.id} className="border">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{merchant.restaurantName}</p>
                    <p className="text-xs text-gray-500">{merchant.contactName}</p>
                  </div>
                </div>
                {getStatusBadge(merchant.status)}
              </div>
              <div className="text-sm space-y-1 mt-3 ml-12">
                <p className="text-gray-600">
                  <span className="font-mono text-blue-600 font-bold">{merchant.restaurantSlug?.toUpperCase()}</span>
                  {' · '}
                  <Badge className={isFederationDairy(merchant) ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'} variant="secondary">
                    {isFederationDairy(merchant) ? 'Federation' : 'District Union'}
                  </Badge>
                </p>
                <p className="text-gray-500">{merchant.contactEmail}</p>
                <p className="text-gray-500">{merchant.contactPhone || merchant.restaurantPhone || '-'}</p>
                <p className="text-xs text-gray-400">{formatTimestamp(merchant.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2 mt-3 ml-12 flex-wrap">
                <Link href={`/admin/merchant/edit/${merchant.id}`}>
                  <Button variant="outline" size="sm"><Edit className="h-3 w-3 mr-1" /> Edit</Button>
                </Link>
                <Button variant="outline" size="sm" onClick={() => { setCredentialsMerchant(merchant); setShowPassword(false); }}>
                  <Key className="h-3 w-3 mr-1" /> Credentials
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(merchant)}>
                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                </Button>
                <Button variant="outline" size="sm"
                  onClick={() => {
                    window.open(`/union/dashboard?auto_login=${merchant.id}`, '_blank');
                    toast({ title: "Auto Login", description: `Opening ${merchant.restaurantName} dashboard...` });
                  }}>
                  <LogIn className="h-3 w-3 mr-1" /> Login
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {displayedMerchants.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">
              {searchQuery ? 'No unions found matching your search.' : 'No district unions found.'}
            </p>
          </div>
        )}
      </div>

      <div className="text-sm text-gray-600">
        Showing 1 to {Math.min(displayedMerchants.length, parseInt(entriesPerPage))} of {filteredMerchants.length} entries
      </div>

      <Dialog open={!!editingMerchant} onOpenChange={(open) => !open && setEditingMerchant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit District Union</DialogTitle>
          </DialogHeader>
          {editingMerchant && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Union Name</p>
                <p className="font-medium">{editingMerchant.restaurantName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Contact</p>
                <p className="font-medium">{editingMerchant.contactName}</p>
                <p className="text-sm">{editingMerchant.contactEmail}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">Status</p>
                <Select
                  value={editingMerchant.status}
                  onValueChange={(value) => setEditingMerchant({ ...editingMerchant, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active (Approved)</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex space-x-2 pt-4">
                <Button
                  onClick={() => updateMerchantMutation.mutate({
                    id: editingMerchant.id,
                    updates: { status: editingMerchant.status }
                  })}
                  disabled={updateMerchantMutation.isPending}
                  className="flex-1"
                >
                  {updateMerchantMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                {editingMerchant.status === 'pending' && (
                  <Button
                    variant="default"
                    onClick={() => updateMerchantMutation.mutate({
                      id: editingMerchant.id,
                      updates: { status: 'active' }
                    })}
                    disabled={updateMerchantMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Approve
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!credentialsMerchant} onOpenChange={(open) => { if (!open) { setCredentialsMerchant(null); setShowPassword(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login Credentials — {credentialsMerchant?.restaurantName}</DialogTitle>
          </DialogHeader>
          {credentialsMerchant && (
            <div className="space-y-4 py-2">
              <div>
                <p className="text-sm text-gray-500">Union Code</p>
                <p className="font-mono font-bold text-blue-600">{credentialsMerchant.restaurantSlug?.toUpperCase()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Username</p>
                <p className="font-mono">{credentialsMerchant.username || credentialsMerchant.contactEmail}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Password</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono">{showPassword ? (credentialsMerchant.password || '-') : '••••••••'}</p>
                  <Button variant="ghost" size="sm" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                {getStatusBadge(credentialsMerchant.status)}
              </div>
              <div className="flex gap-2 pt-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => {
                  navigator.clipboard.writeText(`Username: ${credentialsMerchant.username || credentialsMerchant.contactEmail}\nPassword: ${credentialsMerchant.password || ''}`);
                  toast({ title: "Copied", description: "Credentials copied to clipboard" });
                }}>
                  <Copy className="h-4 w-4 mr-2" /> Copy Credentials
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  window.open(`/union/dashboard?auto_login=${credentialsMerchant.id}`, '_blank');
                  toast({ title: "Auto Login", description: `Opening ${credentialsMerchant.restaurantName} dashboard...` });
                }}>
                  <LogIn className="h-4 w-4 mr-2" /> Auto Login
                </Button>
                <Button variant="outline" size="sm" className="border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => forceLogoutMutation.mutate(credentialsMerchant.id)}
                  disabled={forceLogoutMutation.isPending}>
                  <LogOut className="h-4 w-4 mr-2" /> Force Logout All
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete District Union</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.restaurantName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteConfirm) {
                  deleteMerchantMutation.mutate(deleteConfirm.id);
                  setDeleteConfirm(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </AdminLayout>
  );
}
