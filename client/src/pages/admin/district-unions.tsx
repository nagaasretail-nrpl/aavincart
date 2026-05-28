import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from "./layout";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Search, Edit2, Building2, Users, MapPin, Mail, Phone, Download, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { downloadSampleExcel, SAMPLE_EXCEL_CONFIGS } from '@/lib/excel-utils';

type Merchant = {
  id: string;
  merchantUuid: string;
  restaurantName: string;
  restaurantSlug: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  username: string;
  password: string;
  status: string;
  pricingTierCode?: string;
  address?: string;
};

export default function DistrictUnionsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUnion, setEditingUnion] = useState<Merchant | null>(null);
  const [editForm, setEditForm] = useState({ password: '', status: '' });

  const { data: merchants = [], isLoading } = useQuery<Merchant[]>({
    queryKey: ['/api/admin/merchants'],
  });

  const districtUnions = merchants.filter(m => 
    m.pricingTierCode === 'INTER_UNION' || m.pricingTierCode === 'FEDERATION'
  );

  const filteredUnions = districtUnions.filter(union =>
    union.restaurantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    union.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    union.contactEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Merchant> }) => {
      return apiRequest('PUT', `/api/admin/merchants/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/merchants'] });
      toast({
        title: 'Success',
        description: 'District union updated successfully',
      });
      setEditingUnion(null);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update district union',
        variant: 'destructive',
      });
    },
  });

  const handleEdit = (union: Merchant) => {
    setEditingUnion(union);
    setEditForm({ password: union.password, status: union.status });
  };

  const handleSave = () => {
    if (!editingUnion) return;
    updateMutation.mutate({
      id: editingUnion.id,
      updates: editForm,
    });
  };

  const handleExportCSV = () => {
    const headers = ['Union Code', 'Union Name', 'Full Name', 'Email', 'Username', 'Password', 'Status', 'Pricing Tier'];
    const rows = filteredUnions.map(u => [
      u.restaurantSlug.toUpperCase(),
      u.contactName,
      u.restaurantName,
      u.contactEmail,
      u.username,
      u.password,
      u.status,
      u.pricingTierCode || '',
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

  const stats = {
    total: districtUnions.length,
    districtUnions: districtUnions.filter(u => u.pricingTierCode === 'INTER_UNION').length,
    fedDairies: districtUnions.filter(u => u.pricingTierCode === 'FEDERATION').length,
    active: districtUnions.filter(u => u.status === 'active').length,
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-40 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">District Union Users</h1>
          <p className="text-gray-500">Manage all 27 District Cooperative Milk Producers Unions</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => downloadSampleExcel(SAMPLE_EXCEL_CONFIGS.districtUnions)}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Sample Excel
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/merchants'] })}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Total Unions</p>
                <p className="text-2xl font-bold text-blue-800">{stats.total}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">District Unions</p>
                <p className="text-2xl font-bold text-green-800">{stats.districtUnions}</p>
              </div>
              <MapPin className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">Federation Dairies</p>
                <p className="text-2xl font-bold text-purple-800">{stats.fedDairies}</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600">Active Unions</p>
                <p className="text-2xl font-bold text-emerald-800">{stats.active}</p>
              </div>
              <Users className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Union Credentials</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search unions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Union Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Password</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUnions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No district unions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUnions.map((union) => (
                  <TableRow key={union.id}>
                    <TableCell className="font-mono font-bold text-blue-600">
                      {union.restaurantSlug.toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{union.contactName}</p>
                        <p className="text-xs text-gray-500">{union.restaurantName}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {union.contactEmail}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{union.username}</TableCell>
                    <TableCell className="font-mono text-gray-500">{union.password}</TableCell>
                    <TableCell>
                      <Badge className={
                        union.pricingTierCode === 'FEDERATION' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }>
                        {union.pricingTierCode === 'FEDERATION' ? 'Federation' : 'District Union'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        union.status === 'active' ? 'bg-green-100 text-green-800' :
                        union.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }>
                        {union.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(union)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit {union.contactName}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <label className="text-sm font-medium">Union Code</label>
                              <Input value={union.restaurantSlug.toUpperCase()} disabled className="bg-gray-100" />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Username</label>
                              <Input value={union.username} disabled className="bg-gray-100" />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Password</label>
                              <Input 
                                value={editForm.password}
                                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Status</label>
                              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="inactive">Inactive</SelectItem>
                                  <SelectItem value="suspended">Suspended</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button onClick={handleSave} className="w-full" disabled={updateMutation.isPending}>
                              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}
