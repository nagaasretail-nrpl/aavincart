import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { formatTimestamp } from '@/lib/format-timestamp';
import { 
  Package, LogOut, User, MapPin, Phone, Mail, Building2, 
  Search, ShoppingCart, Plus, Minus, Truck, FileText, Milk,
  LayoutDashboard, Users, ShoppingBag, CheckCircle, XCircle,
  Clock, TrendingUp, Store, ChevronDown, ChevronRight,
  UserPlus, Shield, Edit, Trash2, IceCream, Menu, X, Bell, Home
} from "lucide-react";

interface WSDDealer {
  id: string;
  wsdCode: string;
  name: string;
  email: string;
  location: string;
  address: string;
  mobileNumber: string;
  districtUnion: string;
  pricingTier: string;
  gstin: string;
  hasFreshMilkAccess?: boolean;
}

interface HierarchyUser {
  id: string;
  parentId: string;
  parentEmail: string;
  parentName: string;
  childId: string;
  childRole: string;
  childEmail: string;
  childName: string;
  childPhone: string;
  childAddress: string;
  childGstin: string;
  childBusinessName: string;
  approvalStatus: string;
  pricingTier: string;
  freshMilkApproved: boolean;
  productsApproved: boolean;
  iceCreamApproved: boolean;
  freshMilkPricingRole: string;
  productsPricingRole: string;
  iceCreamPricingRole: string;
  districtUnion: string;
  createdAt: string;
}

interface SidebarItem {
  id: string;
  label: string;
  icon: any;
  subItems?: { id: string; label: string; count?: number; countColor?: string }[];
}

const PRICING_ROLES = ['FEDERATION', 'INTER_UNION', 'WHOLESALE_DEALER', 'DEALER', 'RETAILER', 'MRP'];

export default function WsdDashboard() {
  const [, setLocation] = useLocation();
  const { user, logout: authLogout } = useAuth();
  const [dealer, setDealer] = useState<WSDDealer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<HierarchyUser | null>(null);
  const [addUserRole, setAddUserRole] = useState<'dealer' | 'retailer'>('dealer');
  const { toast } = useToast();

  // New user form state
  const [newUser, setNewUser] = useState({
    childName: '', childEmail: '', childPhone: '', childRole: 'dealer',
    childAddress: '', childGstin: '', childBusinessName: '',
    pricingTier: 'DEALER', districtUnion: '',
    freshMilkApproved: false, productsApproved: true, iceCreamApproved: false,
    freshMilkPricingRole: 'DEALER', productsPricingRole: 'DEALER', iceCreamPricingRole: 'DEALER',
  });

  const { data: profileData, isLoading: profileLoading, error: profileError } = useQuery<{ success: boolean; dealer: WSDDealer }>({
    queryKey: ["/api/wsd/me"],
    retry: false
  });

  useEffect(() => {
    if (profileData?.success && profileData?.dealer) {
      setDealer(profileData.dealer);
    }
  }, [profileData]);

  useEffect(() => {
    if (profileLoading) return;
    if (dealer) return;

    if (profileData?.success && profileData?.dealer) {
      setDealer(profileData.dealer);
      return;
    }

    if (!user) {
      setLocation("/login?tab=b2b");
      return;
    }

    const extUser = user as any;
    const allRoles = [extUser.pricingRole, extUser.freshMilkPricingRole, extUser.productsPricingRole, extUser.iceCreamPricingRole].filter(Boolean);
    if (allRoles.includes('WHOLESALE_DEALER')) {
      setDealer({
        id: user.id,
        wsdCode: extUser.businessCode || user.name || '',
        name: extUser.businessName || user.name || '',
        email: user.email,
        location: extUser.district || '',
        address: extUser.businessAddress || extUser.address || '',
        mobileNumber: user.phone || '',
        districtUnion: extUser.districtUnion || '',
        pricingTier: 'WHOLESALE_DEALER',
        gstin: extUser.gstNumber || '',
        hasFreshMilkAccess: extUser.freshMilkPricingRole && extUser.freshMilkPricingRole !== 'MRP'
      });
    } else {
      setLocation("/login?tab=b2b");
    }
  }, [profileLoading, profileData, user, dealer, setLocation]);

  const { data: hierarchyData, isLoading: hierarchyLoading } = useQuery<{ success: boolean; users: HierarchyUser[] }>({
    queryKey: ["/api/hierarchy/my-users"],
    enabled: !!dealer
  });

  const { data: downstreamOrdersData } = useQuery<{ success: boolean; orders: any[]; childCount: number }>({
    queryKey: ["/api/hierarchy/downstream-orders"],
    enabled: !!dealer
  });

  const { data: productsData, isLoading: productsLoading } = useQuery<any[]>({
    queryKey: ["/api/menu-items"],
    enabled: !!dealer
  });

  const hierarchyUsers = hierarchyData?.users || [];
  const dealers = hierarchyUsers.filter(u => u.childRole === 'dealer');
  const retailers = hierarchyUsers.filter(u => u.childRole === 'retailer');
  const pendingApprovals = hierarchyUsers.filter(u => u.approvalStatus === 'pending');
  const approvedUsers = hierarchyUsers.filter(u => u.approvalStatus === 'approved');
  const downstreamOrders = downstreamOrdersData?.orders || [];
  const products = productsData || [];

  const addUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const res = await apiRequest('POST', '/api/hierarchy/add-user', userData);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "User Added", description: "User has been added to your hierarchy" });
        queryClient.invalidateQueries({ queryKey: ["/api/hierarchy/my-users"] });
        setIsAddUserOpen(false);
        resetNewUserForm();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add user", variant: "destructive" });
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest('POST', `/api/hierarchy/${id}/update`, data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Updated", description: "User has been updated successfully" });
        queryClient.invalidateQueries({ queryKey: ["/api/hierarchy/my-users"] });
        queryClient.invalidateQueries({ queryKey: ["/api/hierarchy/downstream-orders"] });
        setIsEditUserOpen(false);
        setEditingUser(null);
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update user", variant: "destructive" });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/hierarchy/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Removed", description: "User removed from hierarchy" });
      queryClient.invalidateQueries({ queryKey: ["/api/hierarchy/my-users"] });
    }
  });

  const resetNewUserForm = () => {
    setNewUser({
      childName: '', childEmail: '', childPhone: '', childRole: 'dealer',
      childAddress: '', childGstin: '', childBusinessName: '',
      pricingTier: 'DEALER', districtUnion: dealer?.districtUnion || '',
      freshMilkApproved: false, productsApproved: true, iceCreamApproved: false,
      freshMilkPricingRole: 'DEALER', productsPricingRole: 'DEALER', iceCreamPricingRole: 'DEALER',
    });
  };

  const handleLogout = async () => {
    await fetch("/api/wsd/logout", { method: "POST", credentials: "include" });
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    authLogout();
    setLocation("/login?tab=b2b");
  };

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev =>
      prev.includes(menuId) ? prev.filter(id => id !== menuId) : [...prev, menuId]
    );
  };

  const sidebarItems: SidebarItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'catalog', label: 'Order Products', icon: ShoppingCart },
    { id: 'orders', label: 'Orders', icon: ShoppingBag, subItems: [
      { id: 'my-orders', label: 'My Orders' },
      { id: 'downstream-orders', label: 'Downstream Orders', count: downstreamOrders.length },
    ]},
    { id: 'my-users', label: 'My Users', icon: Users, subItems: [
      { id: 'dealers-list', label: 'Dealers', count: dealers.length },
      { id: 'retailers-list', label: 'Retailers', count: retailers.length },
      { id: 'add-dealer', label: 'Add Dealer' },
      { id: 'add-retailer', label: 'Add Retailer' },
    ]},
    { id: 'approvals', label: 'Approvals', icon: Shield, subItems: [
      { id: 'pending-approvals', label: 'Pending', count: pendingApprovals.length, countColor: 'bg-orange-500' },
      { id: 'approved-users', label: 'Approved', count: approvedUsers.length, countColor: 'bg-green-500' },
    ]},
    { id: 'commission', label: 'Commission', icon: TrendingUp },
    { id: 'gst', label: 'GST & E-way', icon: FileText },
    { id: 'home', label: 'Aavin Home', icon: Home },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-500 text-white">Approved</Badge>;
      case 'pending': return <Badge className="bg-orange-500 text-white">Pending</Badge>;
      case 'rejected': return <Badge className="bg-red-500 text-white">Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dealers-list':
        return <UserListSection users={dealers} title="My Dealers" role="dealer" onEdit={(u) => { setEditingUser(u); setIsEditUserOpen(true); }} onDelete={(id) => deleteUserMutation.mutate(id)} onApprove={(id, data) => updateUserMutation.mutate({ id, data })} />;
      case 'retailers-list':
        return <UserListSection users={retailers} title="My Retailers" role="retailer" onEdit={(u) => { setEditingUser(u); setIsEditUserOpen(true); }} onDelete={(id) => deleteUserMutation.mutate(id)} onApprove={(id, data) => updateUserMutation.mutate({ id, data })} />;
      case 'add-dealer':
        setAddUserRole('dealer');
        if (!isAddUserOpen) setIsAddUserOpen(true);
        return <UserListSection users={dealers} title="My Dealers" role="dealer" onEdit={(u) => { setEditingUser(u); setIsEditUserOpen(true); }} onDelete={(id) => deleteUserMutation.mutate(id)} onApprove={(id, data) => updateUserMutation.mutate({ id, data })} />;
      case 'add-retailer':
        setAddUserRole('retailer');
        if (!isAddUserOpen) setIsAddUserOpen(true);
        return <UserListSection users={retailers} title="My Retailers" role="retailer" onEdit={(u) => { setEditingUser(u); setIsEditUserOpen(true); }} onDelete={(id) => deleteUserMutation.mutate(id)} onApprove={(id, data) => updateUserMutation.mutate({ id, data })} />;
      case 'pending-approvals':
        return <UserListSection users={pendingApprovals} title="Pending Approvals" role="all" onEdit={(u) => { setEditingUser(u); setIsEditUserOpen(true); }} onDelete={(id) => deleteUserMutation.mutate(id)} onApprove={(id, data) => updateUserMutation.mutate({ id, data })} />;
      case 'approved-users':
        return <UserListSection users={approvedUsers} title="Approved Users" role="all" onEdit={(u) => { setEditingUser(u); setIsEditUserOpen(true); }} onDelete={(id) => deleteUserMutation.mutate(id)} onApprove={(id, data) => updateUserMutation.mutate({ id, data })} />;
      case 'downstream-orders':
        return <DownstreamOrdersSection orders={downstreamOrders} users={hierarchyUsers} />;
      case 'my-orders':
        return <MyOrdersSection />;
      case 'catalog':
        return <CatalogSection products={products} dealer={dealer} isLoading={productsLoading} toast={toast} />;
      default:
        return <DashboardOverview 
          dealer={dealer} dealers={dealers} retailers={retailers}
          pendingApprovals={pendingApprovals} approvedUsers={approvedUsers}
          downstreamOrders={downstreamOrders}
          onNavigate={(section: string) => setActiveSection(section)}
        />;
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Truck className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-500">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!dealer) return null;

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 lg:w-56 bg-[#1a3a5f] min-h-screen flex flex-col transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-4 border-b border-blue-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <Avatar className="h-10 w-10 bg-blue-600 flex-shrink-0">
                <AvatarFallback className="bg-blue-600 text-white">{dealer.name?.charAt(0) || 'W'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{dealer.name}</p>
                <p className="text-blue-300 text-xs truncate">{dealer.email}</p>
              </div>
            </div>
            <button className="lg:hidden text-white" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {sidebarItems.map(item => {
            const Icon = item.icon;
            const isExpanded = expandedMenus.includes(item.id);
            const isActive = activeSection === item.id || item.subItems?.some(s => s.id === activeSection);

            return (
              <div key={item.id}>
                <button
                  onClick={() => {
                    if (item.id === 'home') {
                      setLocation('/');
                      return;
                    }
                    if (item.subItems) {
                      toggleMenu(item.id);
                    } else {
                      setActiveSection(item.id);
                      setSidebarOpen(false);
                    }
                  }}
                  className={`w-full flex items-center px-4 py-2.5 text-sm transition-colors ${isActive ? 'bg-blue-700 text-white' : 'text-blue-200 hover:bg-blue-800 hover:text-white'}`}
                >
                  <Icon className="h-4 w-4 mr-3 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.subItems && (isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
                </button>
                {item.subItems && isExpanded && (
                  <div className="bg-blue-900/50">
                    {item.subItems.map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => { setActiveSection(sub.id); setSidebarOpen(false); }}
                        className={`w-full flex items-center px-4 py-2 pl-11 text-xs transition-colors ${activeSection === sub.id ? 'bg-blue-700 text-white' : 'text-blue-300 hover:bg-blue-800 hover:text-white'}`}
                      >
                        <span className="flex-1 text-left">{sub.label}</span>
                        {sub.count !== undefined && sub.count > 0 && (
                          <Badge className={`${sub.countColor || 'bg-blue-500'} text-white text-xs px-1.5 py-0`}>{sub.count}</Badge>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-blue-800">
          <button onClick={handleLogout} className="w-full flex items-center px-4 py-2 text-sm text-red-300 hover:bg-red-900/30 rounded-lg transition-colors">
            <LogOut className="h-4 w-4 mr-3" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 hover:bg-gray-100 rounded-lg" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-800">WSD Dashboard</h1>
              <p className="text-xs text-gray-500">{dealer.districtUnion} District Union</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-100 text-blue-800">{dealer.wsdCode}</Badge>
            <Badge className="bg-green-100 text-green-800">{dealer.pricingTier}</Badge>
            <Link href="/">
              <button className="p-2 hover:bg-muted rounded-lg text-[#4AB3E8]" title="Go to Aavin Home">
                <Home className="h-5 w-5" />
              </button>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-3 md:p-6 overflow-auto">
          {renderContent()}
        </main>
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add New {addUserRole === 'dealer' ? 'Dealer' : 'Retailer'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Business Name *</label>
                <Input value={newUser.childBusinessName} onChange={e => setNewUser(p => ({...p, childBusinessName: e.target.value}))} placeholder="Business name" />
              </div>
              <div>
                <label className="text-sm font-medium">Contact Name *</label>
                <Input value={newUser.childName} onChange={e => setNewUser(p => ({...p, childName: e.target.value}))} placeholder="Full name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Email *</label>
                <Input value={newUser.childEmail} onChange={e => setNewUser(p => ({...p, childEmail: e.target.value}))} placeholder="email@example.com" type="email" />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input value={newUser.childPhone} onChange={e => setNewUser(p => ({...p, childPhone: e.target.value}))} placeholder="+91 XXXXX XXXXX" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Address</label>
              <Input value={newUser.childAddress} onChange={e => setNewUser(p => ({...p, childAddress: e.target.value}))} placeholder="Full address" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">GSTIN</label>
                <Input value={newUser.childGstin} onChange={e => setNewUser(p => ({...p, childGstin: e.target.value}))} placeholder="GST Number" />
              </div>
              <div>
                <label className="text-sm font-medium">District Union</label>
                <Input value={newUser.districtUnion} onChange={e => setNewUser(p => ({...p, districtUnion: e.target.value}))} placeholder="District Union" />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Shield className="h-4 w-4" /> Pricing & Segment Approval</h3>
              
              <div className="mb-4">
                <label className="text-sm font-medium">Default Pricing Tier</label>
                <Select value={newUser.pricingTier} onValueChange={v => setNewUser(p => ({...p, pricingTier: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRICING_ROLES.map(role => (
                      <SelectItem key={role} value={role}>{role.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Milk className="h-4 w-4 text-cyan-600" />
                      <span className="font-medium text-sm">Fresh Milk</span>
                    </div>
                    <Switch checked={newUser.freshMilkApproved} onCheckedChange={v => setNewUser(p => ({...p, freshMilkApproved: v}))} />
                  </div>
                  {newUser.freshMilkApproved && (
                    <Select value={newUser.freshMilkPricingRole} onValueChange={v => setNewUser(p => ({...p, freshMilkPricingRole: v}))}>
                      <SelectTrigger className="mt-2"><SelectValue placeholder="Pricing role for Fresh Milk" /></SelectTrigger>
                      <SelectContent>
                        {PRICING_ROLES.map(role => (
                          <SelectItem key={role} value={role}>{role.replace(/_/g, ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-sm">Products</span>
                    </div>
                    <Switch checked={newUser.productsApproved} onCheckedChange={v => setNewUser(p => ({...p, productsApproved: v}))} />
                  </div>
                  {newUser.productsApproved && (
                    <Select value={newUser.productsPricingRole} onValueChange={v => setNewUser(p => ({...p, productsPricingRole: v}))}>
                      <SelectTrigger className="mt-2"><SelectValue placeholder="Pricing role for Products" /></SelectTrigger>
                      <SelectContent>
                        {PRICING_ROLES.map(role => (
                          <SelectItem key={role} value={role}>{role.replace(/_/g, ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <IceCream className="h-4 w-4 text-pink-600" />
                      <span className="font-medium text-sm">Ice Cream</span>
                    </div>
                    <Switch checked={newUser.iceCreamApproved} onCheckedChange={v => setNewUser(p => ({...p, iceCreamApproved: v}))} />
                  </div>
                  {newUser.iceCreamApproved && (
                    <Select value={newUser.iceCreamPricingRole} onValueChange={v => setNewUser(p => ({...p, iceCreamPricingRole: v}))}>
                      <SelectTrigger className="mt-2"><SelectValue placeholder="Pricing role for Ice Cream" /></SelectTrigger>
                      <SelectContent>
                        {PRICING_ROLES.map(role => (
                          <SelectItem key={role} value={role}>{role.replace(/_/g, ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsAddUserOpen(false)}>Cancel</Button>
              <Button 
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={!newUser.childName || !newUser.childEmail || addUserMutation.isPending}
                onClick={() => addUserMutation.mutate({ ...newUser, childRole: addUserRole })}
              >
                {addUserMutation.isPending ? 'Adding...' : `Add ${addUserRole === 'dealer' ? 'Dealer' : 'Retailer'}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      {editingUser && (
        <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Edit {editingUser.childRole === 'dealer' ? 'Dealer' : 'Retailer'}: {editingUser.childName}
              </DialogTitle>
            </DialogHeader>
            <EditUserForm 
              user={editingUser}
              onSave={(data) => updateUserMutation.mutate({ id: editingUser.id, data })}
              onCancel={() => { setIsEditUserOpen(false); setEditingUser(null); }}
              isPending={updateUserMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function EditUserForm({ user, onSave, onCancel, isPending }: { user: HierarchyUser; onSave: (data: any) => void; onCancel: () => void; isPending: boolean }) {
  const [formData, setFormData] = useState({
    approvalStatus: user.approvalStatus,
    pricingTier: user.pricingTier,
    freshMilkApproved: user.freshMilkApproved,
    productsApproved: user.productsApproved,
    iceCreamApproved: user.iceCreamApproved,
    freshMilkPricingRole: user.freshMilkPricingRole || 'DEALER',
    productsPricingRole: user.productsPricingRole || 'DEALER',
    iceCreamPricingRole: user.iceCreamPricingRole || 'DEALER',
  });

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-500">Name:</span> <span className="font-medium">{user.childName}</span></div>
          <div><span className="text-gray-500">Email:</span> <span className="font-medium">{user.childEmail}</span></div>
          <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{user.childPhone || 'N/A'}</span></div>
          <div><span className="text-gray-500">GSTIN:</span> <span className="font-medium">{user.childGstin || 'N/A'}</span></div>
          <div><span className="text-gray-500">Business:</span> <span className="font-medium">{user.childBusinessName || 'N/A'}</span></div>
          <div><span className="text-gray-500">Role:</span> <Badge variant="outline">{user.childRole}</Badge></div>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Approval Status</label>
        <Select value={formData.approvalStatus} onValueChange={v => setFormData(p => ({...p, approvalStatus: v}))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium">Default Pricing Tier</label>
        <Select value={formData.pricingTier} onValueChange={v => setFormData(p => ({...p, pricingTier: v}))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {PRICING_ROLES.map(role => (
              <SelectItem key={role} value={role}>{role.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <h3 className="font-semibold flex items-center gap-2 pt-2"><Shield className="h-4 w-4" /> Product Segment Approval</h3>

      <div className="space-y-3">
        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Milk className="h-4 w-4 text-cyan-600" />
              <span className="font-medium text-sm">Fresh Milk</span>
            </div>
            <Switch checked={formData.freshMilkApproved} onCheckedChange={v => setFormData(p => ({...p, freshMilkApproved: v}))} />
          </div>
          {formData.freshMilkApproved && (
            <Select value={formData.freshMilkPricingRole} onValueChange={v => setFormData(p => ({...p, freshMilkPricingRole: v}))}>
              <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRICING_ROLES.map(role => (<SelectItem key={role} value={role}>{role.replace(/_/g, ' ')}</SelectItem>))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-sm">Products</span>
            </div>
            <Switch checked={formData.productsApproved} onCheckedChange={v => setFormData(p => ({...p, productsApproved: v}))} />
          </div>
          {formData.productsApproved && (
            <Select value={formData.productsPricingRole} onValueChange={v => setFormData(p => ({...p, productsPricingRole: v}))}>
              <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRICING_ROLES.map(role => (<SelectItem key={role} value={role}>{role.replace(/_/g, ' ')}</SelectItem>))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <IceCream className="h-4 w-4 text-pink-600" />
              <span className="font-medium text-sm">Ice Cream</span>
            </div>
            <Switch checked={formData.iceCreamApproved} onCheckedChange={v => setFormData(p => ({...p, iceCreamApproved: v}))} />
          </div>
          {formData.iceCreamApproved && (
            <Select value={formData.iceCreamPricingRole} onValueChange={v => setFormData(p => ({...p, iceCreamPricingRole: v}))}>
              <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRICING_ROLES.map(role => (<SelectItem key={role} value={role}>{role.replace(/_/g, ' ')}</SelectItem>))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={isPending} onClick={() => onSave(formData)}>
          {isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}

function DashboardOverview({ dealer, dealers, retailers, pendingApprovals, approvedUsers, downstreamOrders, onNavigate }: any) {
  const pendingDownstream = downstreamOrders.filter((o: any) => o.status === 'pending');
  const totalRevenue = downstreamOrders.reduce((sum: number, o: any) => sum + parseFloat(o.total || '0'), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('dealers-list')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">My Dealers</p>
                <p className="text-2xl font-bold">{dealers.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('retailers-list')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">My Retailers</p>
                <p className="text-2xl font-bold">{retailers.length}</p>
              </div>
              <Store className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('pending-approvals')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Pending Approvals</p>
                <p className="text-2xl font-bold text-orange-600">{pendingApprovals.length}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('downstream-orders')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Downstream Orders</p>
                <p className="text-2xl font-bold">{downstreamOrders.length}</p>
              </div>
              <ShoppingBag className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <p className="text-sm text-blue-600 font-medium">Total Revenue (Downstream)</p>
            <p className="text-2xl font-bold text-blue-800">₹{totalRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-4">
            <p className="text-sm text-orange-600 font-medium">Pending Orders</p>
            <p className="text-2xl font-bold text-orange-800">{pendingDownstream.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <p className="text-sm text-green-600 font-medium">Approved Users</p>
            <p className="text-2xl font-bold text-green-800">{approvedUsers.length}</p>
          </CardContent>
        </Card>
      </div>

      {pendingApprovals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Pending Approvals ({pendingApprovals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingApprovals.slice(0, 5).map((user: HierarchyUser) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-orange-200 text-orange-800 text-xs">{user.childName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{user.childName}</p>
                      <p className="text-xs text-gray-500">{user.childEmail} | {user.childRole}</p>
                    </div>
                  </div>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => onNavigate('pending-approvals')}>
                    Review
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {downstreamOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-purple-500" />
              Recent Downstream Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {downstreamOrders.slice(0, 5).map((order: any) => (
                <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Order #{order.orderNumber || order.id?.slice(-6)}</p>
                    <p className="text-xs text-gray-500">{order.customerName} | {order.customerEmail}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">₹{parseFloat(order.total || '0').toFixed(2)}</p>
                    <Badge className={order.status === 'pending' ? 'bg-orange-500' : order.status === 'delivered' ? 'bg-green-500' : 'bg-blue-500'}>
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function UserListSection({ users, title, role, onEdit, onDelete, onApprove }: { users: HierarchyUser[]; title: string; role: string; onEdit: (u: HierarchyUser) => void; onDelete: (id: string) => void; onApprove: (id: string, data: any) => void }) {
  const [search, setSearch] = useState('');
  const filtered = users.filter(u => 
    u.childName?.toLowerCase().includes(search.toLowerCase()) ||
    u.childEmail?.toLowerCase().includes(search.toLowerCase()) ||
    u.childBusinessName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{title}</h2>
        <Badge variant="outline">{users.length} users</Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No {role === 'all' ? 'users' : role + 's'} found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(user => (
            <Card key={user.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className={user.approvalStatus === 'approved' ? 'bg-green-100 text-green-800' : user.approvalStatus === 'pending' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'}>
                        {user.childName?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{user.childName}</p>
                      {user.childBusinessName && <p className="text-sm text-gray-600">{user.childBusinessName}</p>}
                      <p className="text-xs text-gray-500">{user.childEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{user.childRole}</Badge>
                    {user.approvalStatus === 'approved' ? (
                      <Badge className="bg-green-500 text-white">Approved</Badge>
                    ) : user.approvalStatus === 'pending' ? (
                      <Badge className="bg-orange-500 text-white">Pending</Badge>
                    ) : (
                      <Badge className="bg-red-500 text-white">Rejected</Badge>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="bg-gray-50 rounded p-2">
                    <span className="text-gray-500">Pricing:</span>
                    <span className="font-medium ml-1">{user.pricingTier?.replace(/_/g, ' ')}</span>
                  </div>
                  <div className={`rounded p-2 ${user.freshMilkApproved ? 'bg-cyan-50 text-cyan-800' : 'bg-gray-50 text-gray-400'}`}>
                    <Milk className="h-3 w-3 inline mr-1" />
                    Fresh Milk: {user.freshMilkApproved ? (user.freshMilkPricingRole?.replace(/_/g, ' ') || 'Yes') : 'No'}
                  </div>
                  <div className={`rounded p-2 ${user.productsApproved ? 'bg-blue-50 text-blue-800' : 'bg-gray-50 text-gray-400'}`}>
                    <Package className="h-3 w-3 inline mr-1" />
                    Products: {user.productsApproved ? (user.productsPricingRole?.replace(/_/g, ' ') || 'Yes') : 'No'}
                  </div>
                  <div className={`rounded p-2 ${user.iceCreamApproved ? 'bg-pink-50 text-pink-800' : 'bg-gray-50 text-gray-400'}`}>
                    <IceCream className="h-3 w-3 inline mr-1" />
                    Ice Cream: {user.iceCreamApproved ? (user.iceCreamPricingRole?.replace(/_/g, ' ') || 'Yes') : 'No'}
                  </div>
                </div>

                {user.childPhone && (
                  <p className="text-xs text-gray-500 mt-2"><Phone className="h-3 w-3 inline mr-1" />{user.childPhone}</p>
                )}

                <div className="mt-3 flex gap-2">
                  {user.approvalStatus === 'pending' && (
                    <>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => onApprove(user.id, { approvalStatus: 'approved' })}>
                        <CheckCircle className="h-3 w-3 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => onApprove(user.id, { approvalStatus: 'rejected' })}>
                        <XCircle className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="outline" onClick={() => onEdit(user)}>
                    <Edit className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => { if (confirm('Remove this user?')) onDelete(user.id); }}>
                    <Trash2 className="h-3 w-3 mr-1" /> Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function DownstreamOrdersSection({ orders, users }: { orders: any[]; users: HierarchyUser[] }) {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  const getChildName = (email: string) => {
    const user = users.find(u => u.childEmail === email);
    return user?.childName || email;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Downstream Orders</h2>
        <Badge variant="outline">{orders.length} orders</Badge>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'confirmed', 'delivered', 'cancelled'].map(status => (
          <Button key={status} size="sm" variant={filter === status ? 'default' : 'outline'} onClick={() => setFilter(status)} className="capitalize">
            {status} {status !== 'all' && `(${orders.filter(o => o.status === status).length})`}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No {filter === 'all' ? '' : filter} orders found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => (
            <Card key={order.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">Order #{order.orderNumber || order.id?.slice(-6)}</p>
                      {order.productSegment && <Badge variant="outline" className="text-xs">{order.productSegment}</Badge>}
                      {order.pricingRole && <Badge variant="outline" className="text-xs">{order.pricingRole}</Badge>}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      By: {getChildName(order.customerEmail)} ({order.customerEmail})
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{formatTimestamp(order.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">₹{parseFloat(order.total || '0').toFixed(2)}</p>
                    <Badge className={
                      order.status === 'pending' ? 'bg-orange-500' :
                      order.status === 'confirmed' ? 'bg-blue-500' :
                      order.status === 'delivered' ? 'bg-green-500' :
                      order.status === 'cancelled' ? 'bg-red-500' : 'bg-gray-500'
                    }>{order.status}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function MyOrdersSection() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">My Orders</h2>
      <Card>
        <CardContent className="p-8 text-center">
          <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Your own orders will appear here</p>
        </CardContent>
      </Card>
    </div>
  );
}

function CatalogSection({ products, dealer, isLoading, toast }: { products: any[]; dealer: any; isLoading: boolean; toast: any }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSegment, setActiveSegment] = useState("Products");
  const [cart, setCart] = useState<Record<string, number>>({});

  const segmentProducts = products.filter(p => p.productSegment === activeSegment);
  const filtered = segmentProducts.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (id: string) => {
    const product = products.find(x => x.id === id);
    const caseUnits = product?.unitsPerPackage || 1;
    setCart(p => ({...p, [id]: (p[id] || 0) + caseUnits}));
  };
  const removeFromCart = (id: string) => {
    const product = products.find(x => x.id === id);
    const caseUnits = product?.unitsPerPackage || 1;
    setCart(p => {
      const q = (p[id] || 0) - caseUnits;
      if (q <= 0) { const {[id]: _, ...rest} = p; return rest; }
      return {...p, [id]: q};
    });
  };

  const getWsdBillingPrice = (p: any) => {
    const base = parseFloat(p.wholesalePrice || p.price || '0');
    const gst = parseFloat(p.gstPercent || '0');
    return base + (base * gst / 100);
  };

  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const p = products.find(x => x.id === id);
    if (p) {
      return sum + getWsdBillingPrice(p) * qty;
    }
    return sum;
  }, 0);
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Order Products</h2>
        {cartCount > 0 && (
          <Badge className="bg-green-600 text-white px-3 py-1">
            <ShoppingCart className="h-4 w-4 mr-1 inline" /> {cartCount} items | ₹{cartTotal.toFixed(2)}
          </Badge>
        )}
      </div>

      <Tabs value={activeSegment} onValueChange={setActiveSegment}>
        <TabsList>
          <TabsTrigger value="Fresh Milk" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white">
            <Milk className="h-4 w-4 mr-1" /> Fresh Milk
          </TabsTrigger>
          <TabsTrigger value="Products" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Package className="h-4 w-4 mr-1" /> Products
          </TabsTrigger>
          <TabsTrigger value="Ice Cream" className="data-[state=active]:bg-pink-600 data-[state=active]:text-white">
            <IceCream className="h-4 w-4 mr-1" /> Ice Cream
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input placeholder="Search products..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-500">Loading products...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(product => {
            const price = product.wholesalePrice || product.price || '0';
            const mrp = product.mrp || product.price || '0';
            const qty = cart[product.id] || 0;

            return (
              <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-video bg-gray-100 relative">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Package className="h-12 w-12 text-gray-300" /></div>
                  )}
                  <Badge className="absolute top-2 left-2 bg-blue-600">{product.category}</Badge>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold">{product.name}</h3>
                  {product.packagingType && product.unitsPerPackage && (
                    <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-700 mt-1">
                      1 Case ({product.packagingType}) = {product.unitsPerPackage} {product.unitType || 'units'}
                    </Badge>
                  )}
                  <div className="flex items-baseline justify-between mt-2 mb-3">
                    <span className="text-sm text-gray-400 line-through">₹{parseFloat(mrp).toFixed(2)}</span>
                    <span className="text-xl font-bold text-green-700">₹{getWsdBillingPrice(product).toFixed(2)}</span>
                  </div>
                  {product.unitsPerPackage && (
                    <p className="text-xs text-gray-500 mb-2">Per Case: ₹{(getWsdBillingPrice(product) * product.unitsPerPackage).toFixed(2)}</p>
                  )}
                  {qty > 0 ? (
                    <div className="flex items-center justify-between bg-blue-50 rounded-lg p-2">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => removeFromCart(product.id)}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <div className="text-center">
                        <span className="font-bold text-lg">{qty}</span>
                        <p className="text-xs text-gray-500">{product.unitsPerPackage ? `${Math.round(qty / product.unitsPerPackage)} case${Math.round(qty / product.unitsPerPackage) !== 1 ? 's' : ''}` : 'units'}</p>
                      </div>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => addToCart(product.id)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => addToCart(product.id)}>
                      <ShoppingCart className="h-4 w-4 mr-2" /> {product.unitsPerPackage ? 'Add 1 Case' : 'Add to Order'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No products found in this segment</p>
        </div>
      )}

      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-20">
          <div className="max-w-5xl mx-auto">
            <div className="max-h-48 overflow-y-auto mb-2 space-y-2">
              {Object.entries(cart).map(([id, qty]) => {
                const p = products.find(x => x.id === id);
                if (!p) return null;
                const base = parseFloat(p.wholesalePrice || p.price || '0');
                const gstPct = parseFloat(p.gstPercent || '0');
                const gstAmt = base * gstPct / 100;
                return (
                  <div key={id} className="border-b pb-1.5">
                    <div className="flex justify-between text-sm font-medium">
                      <span>{p.name} x{qty} {p.unitsPerPackage ? `(${Math.round(qty / p.unitsPerPackage)} case${Math.round(qty / p.unitsPerPackage) !== 1 ? 's' : ''})` : ''}</span>
                      <span>₹{((base + gstAmt) * qty).toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Base: ₹{(base * qty).toFixed(2)} + GST({gstPct}%): ₹{(gstAmt * qty).toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between border-t pt-2">
              <div>
                <p className="text-sm text-gray-500">{cartCount} items in cart</p>
                <p className="text-2xl font-bold text-green-700">₹{cartTotal.toFixed(2)} <span className="text-xs font-normal text-gray-500">(incl. GST)</span></p>
              </div>
              <Button className="bg-green-600 hover:bg-green-700 h-12 px-8" onClick={() => toast({ title: "Order", description: "Order placement coming soon!" })}>
                <ShoppingCart className="h-5 w-5 mr-2" /> Place Order
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
