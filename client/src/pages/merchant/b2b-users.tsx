import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatTimestamp } from '@/lib/format-timestamp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Building, Search, Download, Upload, CheckCircle2, XCircle, AlertCircle, FileSpreadsheet, Loader2, Trash2, Pencil, Key, LogIn, Copy, Check, ChevronDown, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import MerchantLayout from './layout';
import { useMerchantContext } from './context';
import { downloadSampleExcel, SAMPLE_EXCEL_CONFIGS, parseB2BUsersExcel, buildXlsxBuffer, type B2BUserRow } from '@/lib/excel-utils';

function MerchantCombobox({ value, onChange, options, placeholder }: {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes((search || value).toLowerCase()));

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Input
          value={open ? search : value}
          onChange={(e) => {
            setSearch(e.target.value);
            onChange(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => { setOpen(true); setSearch(value); }}
          placeholder={placeholder}
        />
        <button type="button" onClick={() => setOpen(!open)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-40 overflow-auto bg-white border border-gray-200 rounded-md shadow-lg">
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 ${opt === value ? 'bg-blue-100 font-medium' : ''}`}
              onClick={() => { onChange(opt); setSearch(''); setOpen(false); }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  pricingRole: string;
  pricingTier: string;
  freshMilkPricingRole: string;
  productsPricingRole: string;
  iceCreamPricingRole: string;
  status: string;
  district: string;
  districtUnion: string;
  office: string;
  businessType: string;
  businessTypeCode: string;
  businessRoute: string;
  businessPoint: string;
  businessCode: string;
  businessName: string;
  businessAddress: string;
  addressLat: string;
  addressLng: string;
  gstNumber: string;
  panNumber: string;
  aadhaarNumber: string;
  msmeNumber: string;
  securityDeposit: string;
  unionId: string;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  dealer: 'Dealer',
  wholesale_dealer: 'Wholesale Dealer (WSD)',
  wsd: 'Wholesale Dealer (WSD)',
  retailer: 'Retailer',
  inter_union: 'Inter Union',
  federation: 'Federation',
  fmd: 'Fresh Milk Dealer',
  mpcs: 'MPCS',
  hotel: 'Hotel',
  institution: 'Institution',
  private_parlour: 'Private Parlour',
  union_parlour: 'Union Parlour',
  general_shop: 'General Shop / Retail',
  customer: 'Consumer',
  consumer: 'Consumer',
};

const TIER_LABELS: Record<string, string> = {
  DLR: 'Dealer',
  WSD: 'Wholesale Dealer',
  RTL: 'Retailer',
  FED: 'Federation',
  INT: 'Inter-Union',
  MRP: 'MRP',
  X: 'No Access',
  DEALER: 'Dealer',
  WHOLESALE_DEALER: 'Wholesale Dealer',
  RETAILER: 'Retailer',
  FEDERATION: 'Federation',
  INTER_UNION: 'Inter-Union',
};

const ROLE_TO_TIER: Record<string, string> = {
  WHOLESALE_DEALER: 'WSD',
  DEALER: 'DLR',
  RETAILER: 'RTL',
  FEDERATION: 'FED',
  INTER_UNION: 'INT',
};

const TIER_TO_ROLE: Record<string, string> = {
  WSD: 'WHOLESALE_DEALER',
  DLR: 'DEALER',
  RTL: 'RETAILER',
  FED: 'FEDERATION',
  INT: 'INTER_UNION',
  MRP: 'MRP',
  X: 'X',
};

export default function MerchantB2BUsers() {
  const { merchantId } = useMerchantContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [parsedRows, setParsedRows] = useState<B2BUserRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [credUser, setCredUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [autoLoginUrl, setAutoLoginUrl] = useState('');
  const [autoLoginUser, setAutoLoginUser] = useState<User | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addingUser, setAddingUser] = useState(false);
  const [addForm, setAddForm] = useState({
    businessName: '',
    name: '',
    phone: '',
    email: '',
    role: 'dealer',
    businessCode: '',
    password: 'Aavincart@123',
    freshMilkPricingRole: 'DLR',
    productsPricingRole: 'DLR',
    iceCreamPricingRole: 'X',
    gstNumber: '',
  });
  const { toast } = useToast();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users', 'b2b'],
    queryFn: async () => {
      const res = await fetch('/api/admin/users?type=b2b', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const { data: routesPointsData } = useQuery<{
    routes: string[];
    points: string[];
    routePointMap: Record<string, string[]>;
  }>({
    queryKey: ['/api/b2b/routes-points'],
  });

  const { data: mmoOffices = [] } = useQuery<{ id: string; officeName: string; officeCode: string }[]>({
    queryKey: ['/api/mmo/offices'],
  });

  const { data: allUnions = [] } = useQuery<{ id: string; restaurantName: string }[]>({
    queryKey: ['/api/restaurants'],
    select: (data: any[]) => data.map((m: any) => ({ id: m.id, restaurantName: m.restaurantName || m.contactName || m.id })),
  });

  const { data: duplicatesData, error: duplicatesError } = useQuery<{ totalGroups: number; groups: any[] }>({
    queryKey: [`/api/admin/b2b-users/duplicates?merchantId=${merchantId}`],
    enabled: !!merchantId,
    retry: 1,
  });
  const [showDuplicates, setShowDuplicates] = useState(false);

  const allRoutes = routesPointsData?.routes || [];
  const allPoints = routesPointsData?.points || [];
  const routePointMap = routesPointsData?.routePointMap || {};

  const editPointOptions = editForm.businessRoute && routePointMap[editForm.businessRoute]
    ? routePointMap[editForm.businessRoute]
    : allPoints;

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; label: string }> = {
      active: { className: 'bg-green-100 text-green-800', label: 'Active' },
      inactive: { className: 'bg-gray-100 text-gray-800', label: 'Inactive' },
      pending: { className: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
    };
    const c = config[status] || config.active;
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      federation: 'bg-purple-100 text-purple-800',
      inter_union: 'bg-blue-100 text-blue-800',
      wholesale_dealer: 'bg-indigo-100 text-indigo-800',
      wsd: 'bg-indigo-100 text-indigo-800',
      dealer: 'bg-orange-100 text-orange-800',
      retailer: 'bg-teal-100 text-teal-800',
      fmd: 'bg-cyan-100 text-cyan-800',
      mpcs: 'bg-lime-100 text-lime-800',
      hotel: 'bg-rose-100 text-rose-800',
      institution: 'bg-amber-100 text-amber-800',
      private_parlour: 'bg-pink-100 text-pink-800',
      union_parlour: 'bg-sky-100 text-sky-800',
      general_shop: 'bg-emerald-100 text-emerald-800',
      customer: 'bg-green-100 text-green-800',
      consumer: 'bg-green-100 text-green-800',
    };
    return (
      <Badge className={colors[role] || 'bg-gray-100 text-gray-800'}>
        {ROLE_LABELS[role] || role}
      </Badge>
    );
  };

  const getTierBadge = (tier: string) => {
    if (!tier || tier === 'X' || tier === '') return <span className="text-gray-400 text-xs">—</span>;
    const colors: Record<string, string> = {
      DLR: 'bg-orange-50 text-orange-700 border-orange-200',
      WSD: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      RTL: 'bg-teal-50 text-teal-700 border-teal-200',
      FED: 'bg-purple-50 text-purple-700 border-purple-200',
      INT: 'bg-blue-50 text-blue-700 border-blue-200',
      MRP: 'bg-gray-50 text-gray-700 border-gray-200',
      DEALER: 'bg-orange-50 text-orange-700 border-orange-200',
      WHOLESALE_DEALER: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      RETAILER: 'bg-teal-50 text-teal-700 border-teal-200',
      FEDERATION: 'bg-purple-50 text-purple-700 border-purple-200',
      INTER_UNION: 'bg-blue-50 text-blue-700 border-blue-200',
    };
    return (
      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${colors[tier] || ''}`}>
        {TIER_LABELS[tier] || tier}
      </Badge>
    );
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.phone?.includes(searchQuery) ||
                         user.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.businessCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.district?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.districtUnion?.toLowerCase().includes(searchQuery.toLowerCase());
    const pricingMap: Record<string, string> = { federation: 'FEDERATION', inter_union: 'INTER_UNION', wsd: 'WHOLESALE_DEALER', wholesale_dealer: 'WHOLESALE_DEALER', dealer: 'DEALER', retailer: 'RETAILER', fmd: 'FMD', mpcs: 'MRP', hotel: 'MRP', institution: 'MRP', private_parlour: 'MRP', union_parlour: 'MRP', general_shop: 'MRP' };
    const pr = pricingMap[roleFilter];
    const matchesRole = roleFilter === 'all' || user.role === roleFilter || (roleFilter === 'wsd' && user.role === 'wholesale_dealer') || user.pricingRole === pr || user.freshMilkPricingRole === pr || user.productsPricingRole === pr || user.iceCreamPricingRole === pr;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const uniqueRoles = Array.from(new Set(users.map(u => u.role)));

  const handleExportUsers = async () => {
    try {
      const res = await fetch('/api/admin/users?type=b2b', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch users');
      const allUsers: User[] = await res.json();
      const headers = ['S.No', 'District', 'District Union', 'Office', 'Business Type', 'Business Type Code', 'Business Route', 'Business Point', 'Business Code', 'Business Name', 'Contact Person', 'Phone', 'Email', 'Role', 'Pricing Tier', 'GSTIN', 'PAN Number', 'Aadhaar Number', 'MSME Number', 'Security Deposit', 'Business Address', 'Fresh Milk Tier', 'Products Tier', 'Ice Cream Tier', 'Status'];
      const dataRows = allUsers.map((u, i) => [
        String(i + 1), u.district || '', u.districtUnion || '', u.office || '', u.businessType || '', u.businessTypeCode || '', u.businessRoute || '', u.businessPoint || '', u.businessCode || '', u.businessName || '', u.name || '', u.phone || '', u.email || '', u.role || '', u.pricingRole || '', u.gstNumber || '', u.panNumber || '', u.aadhaarNumber || '', u.msmeNumber || '', u.securityDeposit || '', u.businessAddress || '', u.freshMilkPricingRole || '', u.productsPricingRole || '', u.iceCreamPricingRole || '', u.status || 'active',
      ]);
      const xlsxBuf = await buildXlsxBuffer([{ name: 'B2B Users', rows: [headers, ...dataRows] }]);
      const blob = new Blob([xlsxBuf.buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `B2B_Users_Export_${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Export Complete', description: `Exported ${allUsers.length} B2B users` });
    } catch (err: any) {
      toast({ title: 'Export Failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleDownloadCredentials = () => {
    if (users.length === 0) {
      toast({ title: 'No users', description: 'No B2B users to download', variant: 'destructive' });
      return;
    }

    const headers = ['S.No', 'Name', 'Business Name', 'Phone', 'Email', 'Role', 'District/Union', 'Fresh Milk Tier', 'Products Tier', 'Ice Cream Tier', 'Default Password', 'Status'];
    const rows = users.map((u, i) => {
      const defaultPassword = 'Aavincart@123';
      return [
        i + 1,
        u.name || '',
        u.businessName || '',
        u.phone || '',
        u.email || '',
        ROLE_LABELS[u.role] || u.role || '',
        u.districtUnion || u.district || '',
        TIER_LABELS[u.freshMilkPricingRole] || u.freshMilkPricingRole || '—',
        TIER_LABELS[u.productsPricingRole] || u.productsPricingRole || '—',
        TIER_LABELS[u.iceCreamPricingRole] || u.iceCreamPricingRole || '—',
        defaultPassword,
        u.status || 'active',
      ];
    });

    const sanitize = (val: string | number) => {
      let s = String(val);
      if (/^[=+\-@\t\r]/.test(s)) {
        s = "'" + s;
      }
      return s;
    };

    const escapeCsv = (val: string | number) => {
      const s = sanitize(val);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const csvContent = [headers.map(escapeCsv).join(','), ...rows.map(r => r.map(escapeCsv).join(','))].join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `b2b-user-credentials-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'Downloaded', description: `${users.length} user credentials exported` });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setImportResult(null);
    try {
      const rows = await parseB2BUsersExcel(file);
      setParsedRows(rows);
      setShowUploadDialog(true);
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      toast({ title: 'No valid rows', description: 'Please fix the errors and try again.', variant: 'destructive' });
      return;
    }
    setImporting(true);
    try {
      const res = await apiRequest('POST', '/api/admin/users/bulk-import', {
        rows: validRows.map(({ errors, isValid, sno, ...rest }) => rest),
      });
      const result = await res.json();
      setImportResult(result);
      if (result.created > 0 || result.updated > 0) {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
        toast({
          title: 'Import Successful',
          description: `Created: ${result.created || 0}, Updated: ${result.updated || 0}${result.errors?.length ? `, Errors: ${result.errors.length}` : ''}`,
        });
      }
    } catch (err) {
      toast({ title: 'Import Failed', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const toTierCode = (val: string) => ROLE_TO_TIER[val] || val || 'X';
  const toFullRole = (val: string) => TIER_TO_ROLE[val] || val;

  const handleOpenEdit = (user: User) => {
    setEditForm({
      name: user.name || '',
      phone: user.phone || '',
      email: user.email || '',
      businessName: user.businessName || '',
      businessType: user.businessType || '',
      businessCode: user.businessCode || '',
      district: user.district || '',
      businessRoute: user.businessRoute || '',
      businessPoint: user.businessPoint || '',
      office: user.office || '',
      unionId: user.unionId || merchantId || '',
      role: user.role || '',
      freshMilkPricingRole: toTierCode(user.freshMilkPricingRole),
      productsPricingRole: toTierCode(user.productsPricingRole),
      iceCreamPricingRole: toTierCode(user.iceCreamPricingRole),
      panNumber: user.panNumber || '',
      aadhaarNumber: user.aadhaarNumber || '',
      gstNumber: user.gstNumber || '',
      msmeNumber: user.msmeNumber || '',
      securityDeposit: user.securityDeposit || '',
      status: user.status || 'active',
    });
    setEditUser(user);
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const saveData = {
        ...editForm,
        freshMilkPricingRole: toFullRole(editForm.freshMilkPricingRole),
        productsPricingRole: toFullRole(editForm.productsPricingRole),
        iceCreamPricingRole: toFullRole(editForm.iceCreamPricingRole),
      };
      await apiRequest('PATCH', `/api/admin/users/${editUser.id}`, saveData);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: 'User Updated', description: `${editForm.name} has been updated successfully.` });
      setEditUser(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to update user', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!credUser || !newPassword) return;
    setResettingPassword(true);
    try {
      await apiRequest('POST', `/api/admin/users/${credUser.id}/reset-password`, { newPassword });
      toast({ title: 'Password Reset', description: 'Password has been reset successfully.' });
      setNewPassword('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to reset password', variant: 'destructive' });
    } finally {
      setResettingPassword(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    setDeletingUser(true);
    try {
      await apiRequest('DELETE', `/api/admin/users/${deleteUser.id}`);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: 'User Deleted', description: `${deleteUser.name} has been deleted.` });
      setDeleteUser(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to delete user', variant: 'destructive' });
    } finally {
      setDeletingUser(false);
    }
  };

  const handleAutoLogin = async (user: User) => {
    try {
      const res = await apiRequest('POST', `/api/admin/users/${user.id}/auto-login`);
      const data = await res.json();
      const relativeUrl = data.url || data.autoLoginUrl || '';
      setAutoLoginUrl(relativeUrl.startsWith('http') ? relativeUrl : `${window.location.origin}${relativeUrl}`);
      setAutoLoginUser(user);
      setCopied(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to generate auto-login link', variant: 'destructive' });
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(autoLoginUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddUser = async () => {
    if (!addForm.businessName || !addForm.phone) {
      toast({ title: 'Validation Error', description: 'Business Name and Phone are required.', variant: 'destructive' });
      return;
    }
    if (addForm.phone.replace(/\D/g, '').length !== 10) {
      toast({ title: 'Validation Error', description: 'Phone must be 10 digits.', variant: 'destructive' });
      return;
    }
    setAddingUser(true);
    try {
      await apiRequest('POST', '/api/admin/users', {
        name: addForm.name || addForm.businessName,
        phone: addForm.phone.replace(/\D/g, ''),
        email: addForm.email,
        password: addForm.password,
        role: addForm.role,
        businessName: addForm.businessName,
        businessCode: addForm.businessCode,
        freshMilkPricingRole: toFullRole(addForm.freshMilkPricingRole),
        productsPricingRole: toFullRole(addForm.productsPricingRole),
        iceCreamPricingRole: toFullRole(addForm.iceCreamPricingRole),
        gstNumber: addForm.gstNumber,
        unionId: merchantId,
        type: 'b2b',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: 'User Created', description: `${addForm.businessName} has been added successfully.` });
      setShowAddDialog(false);
      setAddForm({
        businessName: '', name: '', phone: '', email: '', role: 'dealer',
        businessCode: '', password: 'Aavincart@123', freshMilkPricingRole: 'DLR',
        productsPricingRole: 'DLR', iceCreamPricingRole: 'X', gstNumber: '',
      });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to create user', variant: 'destructive' });
    } finally {
      setAddingUser(false);
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.filter(r => !r.isValid).length;

  return (
    <MerchantLayout>
      <div className="space-y-6 max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">B2B Users</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage business partners — WSD, Dealers, Retailers, Federation, Inter-Union</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleExportUsers} disabled={users.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export All (Excel)
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadCredentials} disabled={users.length === 0}>
              <Key className="h-4 w-4 mr-2" />
              Credentials
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadSampleExcel(SAMPLE_EXCEL_CONFIGS.b2bUsers)}>
              <Download className="h-4 w-4 mr-2" />
              Sample Excel
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={parsing}>
              {parsing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload Excel
            </Button>
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add new
            </Button>
            {users.length > 0 && (
              <Button size="sm" variant="destructive" onClick={() => setShowDeleteDialog(true)} disabled={deleting}>
                {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Delete All
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>To bulk edit users: click <strong>Export All (Excel)</strong> to download, edit fields like Union Name, Office, Route, Phone, Tiers in Excel, then <strong>Upload Excel</strong> to update. Existing users are matched by Business Code or Phone.</span>
        </div>

        {duplicatesError && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-3 text-red-700 text-sm">
            Duplicate check error: {String(duplicatesError)}
          </div>
        )}

        {duplicatesData && duplicatesData.totalGroups > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 flex items-center justify-between" data-testid="duplicates-banner">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800 text-sm">{duplicatesData.totalGroups} potential duplicate group{duplicatesData.totalGroups > 1 ? 's' : ''} detected</p>
                <p className="text-xs text-amber-600">Users with matching dealer codes, phone numbers, GSTIN, or business names found</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="border-amber-400 text-amber-700 hover:bg-amber-100" onClick={() => setShowDuplicates(true)}>Review Duplicates</Button>
          </div>
        )}

        {showDuplicates && duplicatesData && (
          <Dialog open={showDuplicates} onOpenChange={setShowDuplicates}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Duplicate B2B Users ({duplicatesData.totalGroups} groups)</DialogTitle>
                <DialogDescription>Review and resolve duplicate user accounts. Keep one and delete the other, or edit to correct data.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {duplicatesData.groups.map((group: any, gi: number) => (
                  <Card key={gi} className="border-amber-200">
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-blue-100 text-blue-800 text-xs">Primary</Badge>
                          <span className="font-medium text-sm">{group.primary.name}</span>
                          <span className="text-xs text-muted-foreground font-mono">{group.primary.businessCode || '—'}</span>
                          <span className="text-xs text-muted-foreground">{group.primary.phone || '—'}</span>
                          <Badge variant="outline" className="text-xs">{group.primary.role}</Badge>
                        </div>
                        {group.duplicates.map((d: any, di: number) => (
                          <div key={di} className="flex items-center gap-2 pl-4 border-l-2 border-amber-300">
                            <Badge className="bg-amber-100 text-amber-800 text-xs">Duplicate</Badge>
                            <span className="font-medium text-sm">{d.name}</span>
                            <span className="text-xs text-muted-foreground font-mono">{d.businessCode || '—'}</span>
                            <span className="text-xs text-muted-foreground">{d.phone || '—'}</span>
                            <Badge variant="outline" className="text-xs">{d.role}</Badge>
                            <span className="text-xs text-red-600 ml-auto">{d.matchReason}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Use Edit or Delete actions from the user list to resolve</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {['federation', 'inter_union', 'wsd', 'dealer', 'retailer'].map(role => {
            const pricingMap: Record<string, string> = { federation: 'FEDERATION', inter_union: 'INTER_UNION', wsd: 'WHOLESALE_DEALER', dealer: 'DEALER', retailer: 'RETAILER' };
            const pr = pricingMap[role];
            const count = users.filter(u => u.role === role || (role === 'wsd' && u.role === 'wholesale_dealer') || u.pricingRole === pr || u.freshMilkPricingRole === pr || u.productsPricingRole === pr || u.iceCreamPricingRole === pr).length;
            return (
              <Card key={role} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setRoleFilter(role)}>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{count}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{ROLE_LABELS[role] || role}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="h-5 w-5" />
              <span>B2B Partners</span>
            </CardTitle>
            <CardDescription>All registered B2B business users with role-based pricing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {uniqueRoles.map(role => (
                    <SelectItem key={role} value={role}>{ROLE_LABELS[role] || role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No B2B users found</p>
                <p className="text-sm">Business partners will appear here once they register and get approved</p>
              </div>
            ) : (
              <>
              <div className="hidden md:block overflow-x-auto rounded-lg border">
                <Table className="min-w-[900px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Business</TableHead>
                      <TableHead>District / Union</TableHead>
                      <TableHead>Route / Point</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Compliance</TableHead>
                      <TableHead>Deposit</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-orange-100 text-orange-700 text-xs">
                                {getInitials(user.name || 'U')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-medium">{user.name}</span>
                              <p className="text-xs text-gray-500">{user.phone || user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium text-sm">{user.businessName || '-'}</span>
                            {user.businessType && (
                              <p className="text-xs text-gray-500">{user.businessType}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span>{user.district || '-'}</span>
                            {user.districtUnion && (
                              <p className="text-xs text-gray-500">{user.districtUnion}</p>
                            )}
                            {user.office && (
                              <p className="text-xs text-gray-400">Office: {user.office}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span>{user.businessRoute || '-'}</span>
                            {user.businessPoint && (
                              <p className="text-xs text-gray-500">{user.businessPoint}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.businessCode ? (
                            <Badge variant="outline" className="font-mono text-xs">{user.businessCode}</Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs space-y-0.5">
                            {user.panNumber && <div><span className="text-gray-400">PAN:</span> {user.panNumber}</div>}
                            {user.aadhaarNumber && <div><span className="text-gray-400">Aadhaar:</span> {user.aadhaarNumber}</div>}
                            {user.gstNumber && <div><span className="text-gray-400">GST:</span> {user.gstNumber}</div>}
                            {user.msmeNumber && <div><span className="text-gray-400">MSME:</span> {user.msmeNumber}</div>}
                            {!user.panNumber && !user.aadhaarNumber && !user.gstNumber && !user.msmeNumber && <span className="text-gray-400">-</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.securityDeposit ? (
                            <span className="text-sm font-medium text-green-700">₹{Number(user.securityDeposit).toLocaleString('en-IN')}</span>
                          ) : <span className="text-gray-400">-</span>}
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleOpenEdit(user)} title="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setCredUser(user); setNewPassword(''); }} title="Credentials">
                              <Key className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteUser(user)} title="Delete">
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleAutoLogin(user)} title="Auto-login">
                              <LogIn className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 md:hidden">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-orange-100 text-orange-700 text-xs">
                          {getInitials(user.name || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      {user.businessCode && (
                        <Badge variant="outline" className="font-mono text-xs shrink-0">{user.businessCode}</Badge>
                      )}
                    </div>
                    {user.businessName && (
                      <div className="bg-gray-50 rounded-md px-3 py-2">
                        <p className="text-sm font-medium">{user.businessName}</p>
                        {user.businessType && <p className="text-xs text-gray-500">{user.businessType}</p>}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-gray-400">Phone:</span> {user.phone || '-'}</div>
                      <div><span className="text-gray-400">Role:</span> {getRoleBadge(user.role)}</div>
                      <div><span className="text-gray-400">District:</span> {user.district || '-'}</div>
                      <div><span className="text-gray-400">Union:</span> {user.districtUnion || '-'}</div>
                      {user.office && <div><span className="text-gray-400">Office:</span> {user.office}</div>}
                      {user.businessRoute && <div><span className="text-gray-400">Route:</span> {user.businessRoute}</div>}
                      {user.businessPoint && <div><span className="text-gray-400">Point:</span> {user.businessPoint}</div>}
                      <div><span className="text-gray-400">Status:</span> {getStatusBadge(user.status)}</div>
                    </div>
                    {(user.panNumber || user.aadhaarNumber || user.gstNumber || user.msmeNumber || user.securityDeposit) && (
                      <div className="bg-blue-50 rounded-md px-3 py-2 text-xs space-y-1">
                        <p className="font-medium text-blue-800 text-xs">Compliance & Deposit</p>
                        {user.panNumber && <div><span className="text-gray-500">PAN:</span> {user.panNumber}</div>}
                        {user.aadhaarNumber && <div><span className="text-gray-500">Aadhaar:</span> {user.aadhaarNumber}</div>}
                        {user.gstNumber && <div><span className="text-gray-500">GSTIN:</span> {user.gstNumber}</div>}
                        {user.msmeNumber && <div><span className="text-gray-500">MSME:</span> {user.msmeNumber}</div>}
                        {user.securityDeposit && <div><span className="text-gray-500">Security Deposit:</span> <span className="font-medium text-green-700">₹{Number(user.securityDeposit).toLocaleString('en-IN')}</span></div>}
                      </div>
                    )}
                    {user.businessAddress && (
                      <div className="text-xs text-gray-500 border-t pt-2">
                        <span className="text-gray-400">Address:</span> {user.businessAddress}
                      </div>
                    )}
                    <div className="flex gap-1 border-t pt-2">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleOpenEdit(user)} title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setCredUser(user); setNewPassword(''); }} title="Credentials">
                        <Key className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteUser(user)} title="Delete">
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleAutoLogin(user)} title="Auto-login">
                        <LogIn className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              </>
            )}

            <div className="mt-4 text-sm text-gray-500">
              Showing {filteredUsers.length} of {users.length} B2B users
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showUploadDialog} onOpenChange={(open) => {
        setShowUploadDialog(open);
        if (!open) { setParsedRows([]); setImportResult(null); }
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              Upload B2B Users from Excel
            </DialogTitle>
            <DialogDescription>
              Review the parsed data below before importing. Invalid rows will be skipped.
            </DialogDescription>
          </DialogHeader>

          {importResult ? (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
                <CheckCircle2 className="h-8 w-8 text-green-600 shrink-0" />
                <div>
                  <p className="font-semibold text-green-800">Import Complete</p>
                  <p className="text-sm text-green-700">{importResult.message}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700">{importResult.total}</div>
                  <div className="text-xs text-blue-600">Total Rows</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">{importResult.created}</div>
                  <div className="text-xs text-green-600">Created</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-700">{importResult.errors?.length || 0}</div>
                  <div className="text-xs text-red-600">Errors</div>
                </div>
              </div>
              {importResult.errors?.length > 0 && (
                <div className="max-h-40 overflow-y-auto border rounded-lg p-3">
                  <p className="font-medium text-sm text-red-800 mb-2">Error Details:</p>
                  {importResult.errors.map((err: any, i: number) => (
                    <div key={i} className="text-xs text-red-600 py-1 border-b last:border-0">
                      Row {err.row}: {err.businessName || 'Unknown'} — {err.error}
                    </div>
                  ))}
                </div>
              )}
              <DialogFooter>
                <Button onClick={() => { setShowUploadDialog(false); setParsedRows([]); setImportResult(null); }}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-700">{validCount} valid</span>
                </div>
                {invalidCount > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="font-medium text-red-600">{invalidCount} invalid</span>
                  </div>
                )}
                <div className="text-sm text-gray-500">
                  {parsedRows.length} rows parsed from Excel
                </div>
              </div>

              <div className="flex-1 overflow-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-8">#</TableHead>
                      <TableHead className="w-6"></TableHead>
                      <TableHead>Business Name</TableHead>
                      <TableHead>Type / Code</TableHead>
                      <TableHead>District / Union</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Bus. Code</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>FM Tier</TableHead>
                      <TableHead>Prod Tier</TableHead>
                      <TableHead>IC Tier</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.map((row, idx) => (
                      <TableRow key={idx} className={row.isValid ? '' : 'bg-red-50'}>
                        <TableCell className="text-xs text-gray-400">{row.sno}</TableCell>
                        <TableCell>
                          {row.isValid ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <div className="flex items-start gap-1.5">
                              <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                              <span className="text-xs text-red-600 leading-tight">{row.errors.join('; ')}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-sm max-w-[200px] truncate">{row.businessName || '-'}</TableCell>
                        <TableCell className="text-xs">
                          <div>{row.businessType || '-'}</div>
                          {row.businessTypeCode && <span className="font-mono text-gray-400">{row.businessTypeCode}</span>}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div>{row.district || '-'}</div>
                          <div className="text-gray-400">{row.districtUnion || ''}</div>
                        </TableCell>
                        <TableCell className="text-xs">{row.businessRoute || '-'}</TableCell>
                        <TableCell>
                          {row.businessCode ? (
                            <Badge variant="outline" className="font-mono text-[10px]">{row.businessCode}</Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-xs font-mono">{row.phone || '-'}</TableCell>
                        <TableCell className="text-xs">{row.role || row.pricingTier || '-'}</TableCell>
                        <TableCell>{getTierBadge(row.freshMilkTier)}</TableCell>
                        <TableCell>{getTierBadge(row.productsTier)}</TableCell>
                        <TableCell>{getTierBadge(row.iceCreamTier)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <DialogFooter className="flex-row gap-3 sm:gap-3">
                <Button variant="outline" onClick={() => { setShowUploadDialog(false); setParsedRows([]); }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={importing || validCount === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {importing ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing...</>
                  ) : (
                    <><Upload className="h-4 w-4 mr-2" /> Import {validCount} Users</>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Delete All B2B Users
            </DialogTitle>
            <DialogDescription>
              This will permanently delete all {users.length} B2B/customer users. Admin, merchant, and driver accounts will be preserved. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-3 sm:gap-3">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                try {
                  const res = await apiRequest('DELETE', '/api/admin/users/bulk-delete');
                  const data = await res.json();
                  toast({ title: 'Users Deleted', description: data.message || `Deleted ${data.deleted} users` });
                  queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
                  setShowDeleteDialog(false);
                } catch (err: any) {
                  toast({ title: 'Error', description: err.message || 'Failed to delete users', variant: 'destructive' });
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting...</>
              ) : (
                <><Trash2 className="h-4 w-4 mr-2" /> Yes, Delete All</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" /> Edit User
            </DialogTitle>
            <DialogDescription>Update user details for {editUser?.name}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Name</label>
              <Input value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Phone</label>
              <Input value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-sm font-medium">Email</label>
              <Input value={editForm.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Business Name</label>
              <Input value={editForm.businessName || ''} onChange={(e) => setEditForm({ ...editForm, businessName: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Business Type</label>
              <Input value={editForm.businessType || ''} onChange={(e) => setEditForm({ ...editForm, businessType: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Business Code</label>
              <Input value={editForm.businessCode || ''} onChange={(e) => setEditForm({ ...editForm, businessCode: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">District</label>
              <Input value={editForm.district || ''} onChange={(e) => setEditForm({ ...editForm, district: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Route</label>
              <MerchantCombobox
                value={editForm.businessRoute || ''}
                onChange={(val) => setEditForm({ ...editForm, businessRoute: val })}
                options={allRoutes}
                placeholder="Select or type a route"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Point</label>
              <MerchantCombobox
                value={editForm.businessPoint || ''}
                onChange={(val) => setEditForm({ ...editForm, businessPoint: val })}
                options={editPointOptions}
                placeholder="Select or type a point"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Office</label>
              <Select value={editForm.office || ''} onValueChange={(v) => setEditForm({ ...editForm, office: v })}>
                <SelectTrigger><SelectValue placeholder="Select office" /></SelectTrigger>
                <SelectContent>
                  {mmoOffices.map(o => (
                    <SelectItem key={o.id} value={o.officeName}>{o.officeName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Union</label>
              <Select value={editForm.unionId || ''} onValueChange={(v) => setEditForm({ ...editForm, unionId: v })}>
                <SelectTrigger><SelectValue placeholder="Select union" /></SelectTrigger>
                <SelectContent>
                  {allUnions.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.restaurantName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Role</label>
              <Select value={editForm.role || ''} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="wholesale_dealer">Wholesale Dealer</SelectItem>
                  <SelectItem value="dealer">Dealer</SelectItem>
                  <SelectItem value="retailer">Retailer</SelectItem>
                  <SelectItem value="inter_union">Inter Union</SelectItem>
                  <SelectItem value="federation">Federation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Fresh Milk Tier</label>
              <Select value={editForm.freshMilkPricingRole || 'X'} onValueChange={(v) => setEditForm({ ...editForm, freshMilkPricingRole: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['DLR', 'WSD', 'RTL', 'FED', 'INT', 'MRP', 'X'].map(t => (
                    <SelectItem key={t} value={t}>{TIER_LABELS[t] || t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Products Tier</label>
              <Select value={editForm.productsPricingRole || 'X'} onValueChange={(v) => setEditForm({ ...editForm, productsPricingRole: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['DLR', 'WSD', 'RTL', 'FED', 'INT', 'MRP', 'X'].map(t => (
                    <SelectItem key={t} value={t}>{TIER_LABELS[t] || t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Ice Cream Tier</label>
              <Select value={editForm.iceCreamPricingRole || 'X'} onValueChange={(v) => setEditForm({ ...editForm, iceCreamPricingRole: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['DLR', 'WSD', 'RTL', 'FED', 'INT', 'MRP', 'X'].map(t => (
                    <SelectItem key={t} value={t}>{TIER_LABELS[t] || t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">PAN</label>
              <Input value={editForm.panNumber || ''} onChange={(e) => setEditForm({ ...editForm, panNumber: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Aadhaar</label>
              <Input value={editForm.aadhaarNumber || ''} onChange={(e) => setEditForm({ ...editForm, aadhaarNumber: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">GST</label>
              <Input value={editForm.gstNumber || ''} onChange={(e) => setEditForm({ ...editForm, gstNumber: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">MSME</label>
              <Input value={editForm.msmeNumber || ''} onChange={(e) => setEditForm({ ...editForm, msmeNumber: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Security Deposit</label>
              <Input value={editForm.securityDeposit || ''} onChange={(e) => setEditForm({ ...editForm, securityDeposit: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Status</label>
              <Select value={editForm.status || 'active'} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!credUser} onOpenChange={(open) => { if (!open) { setCredUser(null); setNewPassword(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" /> User Credentials
            </DialogTitle>
            <DialogDescription>Login credentials for {credUser?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Login Email:</span> <span className="font-medium">{credUser?.email || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Business Code:</span> <span className="font-mono font-medium">{credUser?.businessCode || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Phone:</span> <span className="font-medium">{credUser?.phone || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Default Password:</span> <span className="font-mono font-medium">Aavincart@123</span></div>
            </div>
            <div className="border-t pt-3 space-y-2">
              <label className="text-sm font-medium">Reset Password</label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <Button onClick={handleResetPassword} disabled={resettingPassword || !newPassword} size="sm">
                  {resettingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset'}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCredUser(null); setNewPassword(''); }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteUser} onOpenChange={(open) => { if (!open) setDeleteUser(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Delete User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteUser?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-3 sm:gap-3">
            <Button variant="outline" onClick={() => setDeleteUser(null)} disabled={deletingUser}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={deletingUser}>
              {deletingUser ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting...</> : <><Trash2 className="h-4 w-4 mr-2" /> Yes, Delete</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!autoLoginUser} onOpenChange={(open) => { if (!open) { setAutoLoginUser(null); setAutoLoginUrl(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" /> Auto-Login Link
            </DialogTitle>
            <DialogDescription>Generated auto-login link for {autoLoginUser?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Auto-login URL:</p>
              <p className="text-sm font-mono break-all">{autoLoginUrl}</p>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" variant="outline" onClick={handleCopyUrl}>
                {copied ? <><Check className="h-4 w-4 mr-2" /> Copied!</> : <><Copy className="h-4 w-4 mr-2" /> Copy Link</>}
              </Button>
              <Button className="flex-1" onClick={() => window.open(autoLoginUrl, '_blank')}>
                <LogIn className="h-4 w-4 mr-2" /> Open Link
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAutoLoginUser(null); setAutoLoginUrl(''); }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" /> Add New B2B User
            </DialogTitle>
            <DialogDescription>Create a new business user account</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Business Name *</Label>
              <Input value={addForm.businessName} onChange={(e) => setAddForm({ ...addForm, businessName: e.target.value })} placeholder="e.g. M/S ROJAMAL & SONS" />
            </div>
            <div className="space-y-1">
              <Label>Contact Name</Label>
              <Input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="Contact person name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Phone *</Label>
                <Input value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} placeholder="10-digit phone" />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} placeholder="email@example.com" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Role</Label>
                <Select value={addForm.role} onValueChange={(v) => setAddForm({ ...addForm, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dealer">Dealer</SelectItem>
                    <SelectItem value="wholesale_dealer">Wholesale Dealer (WSD)</SelectItem>
                    <SelectItem value="retailer">Retailer</SelectItem>
                    <SelectItem value="inter_union">Inter Union</SelectItem>
                    <SelectItem value="federation">Federation</SelectItem>
                    <SelectItem value="fmd">Fresh Milk Dealer</SelectItem>
                    <SelectItem value="mpcs">MPCS</SelectItem>
                    <SelectItem value="hotel">Hotel</SelectItem>
                    <SelectItem value="institution">Institution</SelectItem>
                    <SelectItem value="private_parlour">Private Parlour</SelectItem>
                    <SelectItem value="union_parlour">Union Parlour</SelectItem>
                    <SelectItem value="general_shop">General Shop / Retail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Business Code</Label>
                <Input value={addForm.businessCode} onChange={(e) => setAddForm({ ...addForm, businessCode: e.target.value })} placeholder="e.g. AA0001" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Password</Label>
              <Input value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} placeholder="Password" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Fresh Milk Tier</Label>
                <Select value={addForm.freshMilkPricingRole} onValueChange={(v) => setAddForm({ ...addForm, freshMilkPricingRole: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DLR">Dealer</SelectItem>
                    <SelectItem value="WSD">WSD</SelectItem>
                    <SelectItem value="RTL">Retailer</SelectItem>
                    <SelectItem value="FED">Federation</SelectItem>
                    <SelectItem value="INT">Inter-Union</SelectItem>
                    <SelectItem value="MRP">MRP</SelectItem>
                    <SelectItem value="X">No Access</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Products Tier</Label>
                <Select value={addForm.productsPricingRole} onValueChange={(v) => setAddForm({ ...addForm, productsPricingRole: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DLR">Dealer</SelectItem>
                    <SelectItem value="WSD">WSD</SelectItem>
                    <SelectItem value="RTL">Retailer</SelectItem>
                    <SelectItem value="FED">Federation</SelectItem>
                    <SelectItem value="INT">Inter-Union</SelectItem>
                    <SelectItem value="MRP">MRP</SelectItem>
                    <SelectItem value="X">No Access</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Ice Cream Tier</Label>
                <Select value={addForm.iceCreamPricingRole} onValueChange={(v) => setAddForm({ ...addForm, iceCreamPricingRole: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DLR">Dealer</SelectItem>
                    <SelectItem value="WSD">WSD</SelectItem>
                    <SelectItem value="RTL">Retailer</SelectItem>
                    <SelectItem value="FED">Federation</SelectItem>
                    <SelectItem value="INT">Inter-Union</SelectItem>
                    <SelectItem value="MRP">MRP</SelectItem>
                    <SelectItem value="X">No Access</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>GST Number</Label>
              <Input value={addForm.gstNumber} onChange={(e) => setAddForm({ ...addForm, gstNumber: e.target.value })} placeholder="e.g. 33AABCR1234H1ZQ" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={addingUser}>Cancel</Button>
            <Button onClick={handleAddUser} disabled={addingUser}>
              {addingUser ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding...</> : <><Plus className="h-4 w-4 mr-2" /> Add User</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MerchantLayout>
  );
}