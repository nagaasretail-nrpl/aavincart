import { useState, useEffect, lazy, Suspense } from 'react';
import { formatTimestamp } from '@/lib/format-timestamp';
import { formatOrderId } from '@/lib/format-order-id';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useSearch, Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { MERCHANT_PERMISSIONS } from '@shared/schema';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  LayoutDashboard,
  Store, 
  ShoppingBag, 
  CalendarDays,
  Monitor,
  Megaphone,
  MessageSquare,
  Tags,
  UtensilsCrossed,
  FileText,
  Image,
  FileStack,
  Wallet,
  Receipt,
  Users,
  User,
  BarChart3,
  Printer,
  Package,
  Truck,
  Bell,
  Globe,
  Settings,
  ChevronDown,
  ChevronRight,
  Eye,
  RefreshCw,
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
  Save,
  Bold,
  Underline,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  Filter,
  Send,
  Download,
  ShoppingCart,
  Search,
  Upload,
  ArrowUpDown,
  ToggleLeft,
  ToggleRight,
  Star,
  Mail,
  Wifi,
  CheckCircle,
  XCircle,
  Copy,
  UserPlus,
  Shield,
  LogOut,
  AlertCircle,
  Layers
} from 'lucide-react';

interface Merchant {
  id: string;
  restaurantName: string;
  contactName: string;
  contactEmail: string;
  restaurantPhone: string;
  address: string;
  status: string;
  logo?: string;
  description?: string;
}

interface SidebarItem {
  id: string;
  label: string;
  icon: any;
  subItems?: { id: string; label: string; count?: number; countColor?: string }[];
}

const sidebarItems: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'merchant', label: 'District Union', icon: Store, subItems: [
    { id: 'merchant-info', label: 'Union Information' },
    { id: 'merchant-settings', label: 'Settings' },
    { id: 'banner', label: 'Banner' },
  ]},
  { id: 'people', label: 'People', icon: Users, subItems: [
    { id: 'users-all', label: 'All Users' },
    { id: 'users-b2c', label: 'B2C Users' },
    { id: 'users-b2b', label: 'B2B Users' },
    { id: 'users-b2b-registrations', label: 'B2B Registrations' },
  ]},
  { id: 'orders', label: 'Orders', icon: ShoppingBag, subItems: [
    { id: 'new-orders', label: 'New Orders', count: 0, countColor: 'green' },
    { id: 'orders-processing', label: 'Orders Processing', count: 0, countColor: 'yellow' },
    { id: 'orders-ready', label: 'Orders Ready', count: 0, countColor: 'blue' },
    { id: 'completed-orders', label: 'Completed', count: 0, countColor: 'green' },
    { id: 'all-orders', label: 'All Orders', count: 0, countColor: 'teal' },
    { id: 'bulk-invoices', label: 'Bulk Invoices' },
  ]},
  { id: 'food', label: 'Products', icon: Package, subItems: [
    { id: 'food-category', label: 'Category' },
    { id: 'food-items', label: 'Items' },
    { id: 'items-availability', label: 'Availability' },
  ]},
  { id: 'inventory', label: 'Inventory & Stock', icon: Layers, subItems: [
    { id: 'inventory-batches', label: 'Inventory & Batches' },
    { id: 'inventory-grn', label: 'Goods Receipt Notes' },
  ]},
  { id: 'pos', label: 'POS', icon: Monitor, subItems: [
    { id: 'pos-create-order', label: 'Create Order' },
    { id: 'pos-order-history', label: 'Order History' },
  ]},
  { id: 'account', label: 'Account', icon: Wallet, subItems: [
    { id: 'account-statement', label: 'Statement' },
    { id: 'account-withdrawals', label: 'Withdrawals' },
  ]},
  { id: 'invoice', label: 'Invoice', icon: Receipt, subItems: [
    { id: 'invoice-list', label: 'List' },
  ]},
  { id: 'staff', label: 'Staff Management', icon: UserPlus, subItems: [
    { id: 'sub-users-list', label: 'Manage Staff' },
    { id: 'sub-users-permissions', label: 'Permissions' },
  ]},
  { id: 'reports', label: 'Reports', icon: BarChart3, subItems: [
    { id: 'sales-report', label: 'Sales Report' },
    { id: 'daily-sales-report', label: 'Daily Sales Report' },
    { id: 'sales-summary', label: 'Sales Summary' },
  ]},
  { id: 'communication', label: 'Communication', icon: MessageSquare, subItems: [
    { id: 'chats', label: 'Chats' },
  ]},
  { id: 'supplier', label: 'Delivery', icon: Truck },
];


// Map permissions to allowed menu items
const permissionToMenuMap: Record<string, string[]> = {
  dashboard: ['dashboard'],
  orders_view: ['orders', 'new-orders', 'orders-processing', 'orders-ready', 'completed-orders', 'all-orders'],
  orders_manage: ['orders', 'new-orders', 'orders-processing', 'orders-ready', 'completed-orders', 'all-orders'],
  products_view: ['food', 'food-category', 'food-items', 'items-availability'],
  products_manage: ['food', 'food-category', 'food-items', 'items-availability'],
  inventory_view: ['food', 'food-items', 'items-availability'],
  inventory_manage: ['food', 'food-items', 'items-availability'],
  customers_view: ['people', 'users-all', 'users-b2c', 'users-b2b', 'users-b2b-registrations'],
  customers_manage: ['people', 'users-all', 'users-b2c', 'users-b2b', 'users-b2b-registrations'],
  reports_view: ['reports', 'sales-report', 'daily-sales-report', 'sales-summary'],
  pos_access: ['pos', 'pos-create-order', 'pos-order-history'],
  settings_view: ['merchant', 'merchant-info', 'merchant-settings'],
  settings_manage: ['merchant', 'merchant-info', 'merchant-settings', 'banner'],
  subusers_manage: ['staff', 'sub-users-list', 'sub-users-permissions'],
};

interface SubUserSession {
  id: string;
  name: string;
  email: string;
  permissions: string[];
  isSubUser: boolean;
}

export default function MerchantDashboard() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const autoLoginId = params.get('auto_login');
  const storedMerchantId = typeof window !== 'undefined' ? sessionStorage.getItem('merchantDashboardId') : null;
  const [merchantId] = useState<string | null>(autoLoginId || storedMerchantId);

  useEffect(() => {
    if (merchantId) {
      sessionStorage.setItem('merchantDashboardId', merchantId);
    }
  }, [merchantId]);
  const [acceptingOrders, setAcceptingOrders] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Get sub-user session from sessionStorage
  const [subUserSession, setSubUserSession] = useState<SubUserSession | null>(null);
  
  useEffect(() => {
    const storedSubUser = sessionStorage.getItem('merchantSubUser');
    if (storedSubUser) {
      try {
        setSubUserSession(JSON.parse(storedSubUser));
      } catch (e) {
        console.error('Failed to parse sub-user session:', e);
      }
    }
  }, []);
  
  // Get display name - show sub-user name if logged in as sub-user
  const displayName = subUserSession?.isSubUser ? subUserSession.name : null;

  const { data: merchant, isLoading, error } = useQuery<Merchant>({
    queryKey: ['/api/merchant', merchantId],
    queryFn: async () => {
      if (!merchantId) throw new Error('No merchant ID');
      const response = await fetch(`/api/merchant/${merchantId}`);
      if (!response.ok) throw new Error('Failed to fetch merchant');
      return response.json();
    },
    enabled: !!merchantId,
    staleTime: 60000, // Cache merchant data for 1 minute
    retry: 2,
  });

  // Fetch order counts for sidebar badges
  const { data: ordersData = [] } = useQuery<any[]>({
    queryKey: ['/api/orders', merchantId],
    queryFn: async () => {
      if (!merchantId) return [];
      const response = await fetch(`/api/orders?merchantId=${merchantId}`, { credentials: 'include' });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!merchantId && !!merchant, // Only fetch after merchant is loaded
    staleTime: 15000, // Cache for 15 seconds
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Calculate order counts by status
  const orderCounts = {
    newOrders: ordersData.filter((o: any) => o.status === 'pending').length,
    processing: ordersData.filter((o: any) => o.status === 'accepted').length,
    ready: ordersData.filter((o: any) => o.status === 'ready').length,
    completed: ordersData.filter((o: any) => o.status === 'completed').length,
    scheduled: ordersData.filter((o: any) => o.status === 'scheduled').length,
    all: ordersData.length,
  };

  // Get allowed menu items based on sub-user permissions
  const getAllowedMenuItems = (): Set<string> => {
    if (!subUserSession?.isSubUser || !subUserSession.permissions) {
      // If not a sub-user, allow all items (merchant has full access)
      return new Set(sidebarItems.flatMap(item => [item.id, ...(item.subItems?.map(sub => sub.id) || [])]));
    }
    
    const allowed = new Set<string>();
    subUserSession.permissions.forEach(permission => {
      const menuItems = permissionToMenuMap[permission];
      if (menuItems) {
        menuItems.forEach(item => allowed.add(item));
      }
    });
    return allowed;
  };
  
  const allowedMenuItems = getAllowedMenuItems();

  // Dynamic sidebar items with real order counts and permission filtering
  const dynamicSidebarItems = sidebarItems
    .filter(item => allowedMenuItems.has(item.id))
    .map(item => {
      // Filter sub-items based on permissions
      const filteredSubItems = item.subItems?.filter(subItem => allowedMenuItems.has(subItem.id));
      
      if (item.id === 'orders' && filteredSubItems) {
        return {
          ...item,
          subItems: filteredSubItems.map((subItem: any) => {
            switch (subItem.id) {
              case 'new-orders':
                return { ...subItem, count: orderCounts.newOrders };
              case 'orders-processing':
                return { ...subItem, count: orderCounts.processing };
              case 'orders-ready':
                return { ...subItem, count: orderCounts.ready };
              case 'completed-orders':
                return { ...subItem, count: orderCounts.completed };
              case 'scheduled':
                return { ...subItem, count: orderCounts.scheduled };
              case 'all-orders':
                return { ...subItem, count: orderCounts.all };
              default:
                return subItem;
            }
          }),
        };
      }
      return { ...item, subItems: filteredSubItems };
    });

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev => 
      prev.includes(menuId) 
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  if (!merchantId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>District Union Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Please login to access the District Union dashboard.</p>
            <div className="space-y-2">
              <Link href="/merchant/login">
                <Button className="w-full">Go to District Union Login</Button>
              </Link>
              <Link href="/admin/merchant">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go to Admin Panel
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-purple-900 flex flex-col items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full mb-4"></div>
        <p className="text-white text-lg">Loading Dashboard...</p>
      </div>
    );
  }

  if (error || !merchant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Failed to load District Union data.</p>
            <Link href="/union/login">
              <Button>Go to Union Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'merchant-info':
        return <MerchantInfoSection merchant={merchant} />;
      case 'merchant-settings':
        return <MerchantSettingsSection />;
      case 'order-limit':
        return <OrderLimitSection />;
      case 'banner':
        return <BannerSection />;
      case 'pages':
        return <PagesSection />;
      case 'menu':
        return <MenuSection />;
      case 'all-orders':
      case 'new-orders':
      case 'orders-processing':
      case 'orders-ready':
      case 'completed-orders':
      case 'scheduled':
        return <OrdersSection type={activeSection} />;
      case 'users-all':
      case 'users-b2c':
      case 'users-b2b':
      case 'users-b2b-registrations':
        return <UnionUsersSection type={activeSection} merchantId={merchantId} />;
      case 'pos-create-order':
      case 'pos-order-history':
        return <POSSection type={activeSection} merchantId={merchantId} />;
      case 'campaigns':
      case 'active-campaigns':
      case 'create-campaign':
        return <CampaignsSection type={activeSection} />;
      case 'chats':
        return <CommunicationSection type={activeSection} />;
      case 'attr-size':
      case 'attr-ingredients':
      case 'attr-cooking-ref':
        return <AttributesSection type={activeSection} />;
      case 'food-category':
      case 'addon-category':
      case 'addon-items':
      case 'food-items':
      case 'items-availability':
        return <FoodSection type={activeSection} merchantId={merchantId} onEditItem={(itemId) => {
          setSelectedItemId(itemId);
          setActiveSection('item-detail');
        }} />;
      case 'item-detail':
        return <ItemDetailSection itemId={selectedItemId} merchantId={merchantId} onBack={() => setActiveSection('food-items')} />;
      case 'order-type-pickup':
      case 'order-type-dinein':
      case 'order-type-delivery':
        return <OrderTypeSection type={activeSection} />;
      case 'gallery':
      case 'media-library':
        return <ImagesSection type={activeSection} />;
      case 'promo-coupon':
      case 'promo-offers':
        return <PromoSection type={activeSection} />;
      case 'account-statement':
      case 'account-withdrawals':
        return <AccountSection merchant={merchant} type={activeSection} />;
      case 'invoice-list':
        return <InvoiceSection type={activeSection} />;
      case 'sub-users-list':
      case 'sub-users-permissions':
        return <SubUsersSection merchantId={merchantId} type={activeSection} />;
      case 'customer-list':
      case 'review-list':
      case 'email-subscribers':
        return <BuyersSection type={activeSection} />;
      case 'all-user':
      case 'all-roles':
        return <UsersSection type={activeSection} merchantId={merchantId} />;
      case 'sales-report':
      case 'daily-sales-report':
      case 'sales-summary':
      case 'refund-report':
        return <ReportsSection type={activeSection} merchantId={merchantId} />;
      case 'all-printers':
      case 'printer-logs':
        return <PrintersSection type={activeSection} />;
      case 'supplier':
        return <SupplierSection />;
      case 'table-booking':
        return <TableBookingSection type="list" />;
      case 'pos':
        return <POSSection type="create" merchantId={merchantId} />;
      case 'communication':
        return <CommunicationSection type="chats" />;
      case 'attributes':
        return <AttributesSection type="size" />;
      case 'order-type':
        return <OrderTypeSection type="pickup" />;
      case 'images':
        return <ImagesSection type="gallery" />;
      case 'site-pages':
        return <SitePagesSection />;
      case 'account':
        return <AccountSection merchant={merchant} type="statement" />;
      case 'invoice':
        return <InvoiceSection type="invoice-list" />;
      case 'people':
        return <UnionUsersSection type="users-all" merchantId={merchantId} />;
      case 'buyers':
        return <BuyersSection type="customer-list" />;
      case 'reports':
        return <ReportsSection type="sales-report" merchantId={merchantId} />;
      case 'printers':
        return <PrintersSection type="all-printers" />;
      case 'users':
        return <UsersSection type="all-user" merchantId={merchantId} />;
      case 'inventory':
      case 'inventory-batches':
        return <MerchantInventorySection />;
      case 'inventory-grn':
        return <MerchantGrnSection />;
      case 'bulk-invoices':
        return <MerchantBulkInvoicesSection />;
      case 'food':
        return <FoodSection type="category" merchantId={merchantId} />;
      case 'promo':
        return <PromoSection type="coupon" />;
      default:
        return <DashboardSection merchantId={merchantId} setActiveSection={setActiveSection} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Left Sidebar */}
      <aside className="w-56 bg-[#2d1b4e] min-h-screen flex flex-col">
        <div className="p-4 border-b border-purple-800">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10 bg-purple-600">
              <AvatarFallback className="bg-purple-600 text-white">
                {(displayName || merchant.restaurantName)?.charAt(0) || 'M'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{displayName || merchant.restaurantName}</p>
              <p className="text-purple-300 text-xs truncate">
                {subUserSession?.isSubUser ? `${merchant.restaurantName}` : merchant.contactEmail}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {dynamicSidebarItems.map((item) => (
            <div key={item.id}>
              <button
                onClick={() => {
                  if (item.subItems) {
                    toggleMenu(item.id);
                  } else {
                    setActiveSection(item.id);
                  }
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                  activeSection === item.id || (item.subItems && item.subItems.some(sub => sub.id === activeSection))
                    ? 'bg-purple-700 text-white border-l-4 border-green-400'
                    : 'text-purple-200 hover:bg-purple-800 hover:text-white'
                }`}
              >
                <div className="flex items-center">
                  <item.icon className="h-4 w-4 mr-3" />
                  {item.label}
                </div>
                {item.subItems && (
                  expandedMenus.includes(item.id) 
                    ? <ChevronDown className="h-4 w-4" />
                    : <ChevronRight className="h-4 w-4" />
                )}
              </button>
              {item.subItems && expandedMenus.includes(item.id) && (
                <div className="bg-purple-900/50">
                  {item.subItems.map((subItem: any) => (
                    <button
                      key={subItem.id}
                      onClick={() => setActiveSection(subItem.id)}
                      className={`w-full flex items-center justify-between pl-12 pr-4 py-2 text-sm transition-colors ${
                        activeSection === subItem.id
                          ? 'text-green-400 bg-purple-800'
                          : 'text-purple-300 hover:text-white hover:bg-purple-800'
                      }`}
                    >
                      <span>{subItem.label}</span>
                      {subItem.count !== undefined && (
                        <span className={`flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-xs font-medium ${
                          subItem.countColor === 'green' ? 'bg-green-100 text-green-600' :
                          subItem.countColor === 'yellow' ? 'bg-yellow-100 text-yellow-600' :
                          subItem.countColor === 'blue' ? 'bg-blue-100 text-blue-600' :
                          subItem.countColor === 'teal' ? 'bg-teal-100 text-teal-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {subItem.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b h-14 flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch 
                checked={acceptingOrders}
                onCheckedChange={setAcceptingOrders}
                className="data-[state=checked]:bg-green-500"
              />
              <span className={`text-sm font-medium ${acceptingOrders ? 'text-green-600' : 'text-gray-500'}`}>
                {acceptingOrders ? 'Accepting Orders' : 'Not Accepting'}
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-gray-600"
              onClick={() => setActiveSection('all-printers')}
              title="Manage Printers"
            >
              <Printer className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5 text-gray-600" />
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">3</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <div className="p-2 border-b">
                  <p className="font-semibold text-sm">Notifications</p>
                </div>
                <DropdownMenuItem className="p-3 cursor-pointer">
                  <div>
                    <p className="text-sm font-medium">New order received</p>
                    <p className="text-xs text-gray-500">Order #428356 - ₹5,108</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-3 cursor-pointer">
                  <div>
                    <p className="text-sm font-medium">Low stock alert</p>
                    <p className="text-xs text-gray-500">Fresh Milk running low</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-3 cursor-pointer">
                  <div>
                    <p className="text-sm font-medium">Payment received</p>
                    <p className="text-xs text-gray-500">₹35,583 via UPI</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="justify-center text-blue-600" onClick={() => setActiveSection('all-notifications')}>
                  View All Notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Globe className="h-5 w-5 text-gray-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                    const restaurantId = merchantId?.replace('merchant-', '') || merchantId;
                    window.open(`/union/${restaurantId}`, '_blank');
                  }}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Storefront
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveSection('site-pages')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Manage Pages
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 hover:bg-gray-100">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-orange-500 text-white text-xs">
                      {(displayName || merchant.contactName)?.charAt(0) || 'M'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-gray-700">{displayName || merchant.contactName}</span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {subUserSession?.isSubUser && (
                  <div className="px-2 py-1.5 text-xs text-gray-500 border-b">
                    Sub-user of {merchant.restaurantName}
                  </div>
                )}
                <DropdownMenuItem onClick={() => setActiveSection('account')}>
                  <User className="h-4 w-4 mr-2" />
                  My Account
                </DropdownMenuItem>
                {!subUserSession?.isSubUser && (
                  <DropdownMenuItem onClick={() => setActiveSection('merchant-settings')}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600 focus:text-red-600" 
                  onClick={() => {
                    // Clear sub-user session on logout
                    sessionStorage.removeItem('merchantSubUser');
                    window.location.href = '/merchant/login';
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" onClick={() => setActiveSection('merchant-settings')}>
              <Settings className="h-5 w-5 text-gray-600" />
            </Button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

function DashboardSection({ merchantId, setActiveSection }: { merchantId: string; setActiveSection: (section: string) => void }) {
  const { data: dashboardStats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ['/api/union', merchantId, 'dashboard-stats'],
    queryFn: async () => {
      const res = await fetch(`/api/union/${merchantId}/dashboard-stats`, { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!merchantId,
    staleTime: 15000,
    refetchInterval: 30000,
  });

  const { data: recentOrdersRaw = [] } = useQuery<any[]>({
    queryKey: ['/api/orders', merchantId, 'recent'],
    queryFn: async () => {
      const res = await fetch(`/api/orders?merchantId=${merchantId}`, { credentials: 'include' });
      if (!res.ok) return [];
      const orders = await res.json();
      return orders.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 5);
    },
    enabled: !!merchantId,
    staleTime: 15000,
    refetchInterval: 30000,
  });

  const today = dashboardStats?.today || { orders: 0, sales: 0, delivered: 0, pending: 0 };
  const segmentBreakdown: Record<string, { count: number; revenue: number }> = dashboardStats?.segmentBreakdown || {};
  const liveTopCustomers: { name: string; orders: number; revenue: number }[] = dashboardStats?.topCustomers || [];
  const ordersByStatus: Record<string, number> = dashboardStats?.ordersByStatus || {};

  const processingCount = (ordersByStatus['accepted'] || 0) + (ordersByStatus['processing'] || 0);
  const completedCount = (ordersByStatus['completed'] || 0) + (ordersByStatus['delivered'] || 0);

  const segmentIcons: Record<string, string> = {
    'Fresh Milk': '🥛',
    'Products': '🧈',
    'Ice Cream': '🍦',
    'Curd': '🍶',
    'Ghee': '🫕',
    'Paneer': '🧀',
  };
  const segmentColors: Record<string, string> = {
    'Fresh Milk': 'border-blue-400 bg-blue-50 hover:bg-blue-100',
    'Products': 'border-amber-400 bg-amber-50 hover:bg-amber-100',
    'Ice Cream': 'border-pink-400 bg-pink-50 hover:bg-pink-100',
  };

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <Card key={i} className="bg-white animate-pulse">
              <CardContent className="p-4 h-20" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 lg:col-span-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-500 text-2xl font-bold">{today.orders}</span>
              </div>
              <p className="text-gray-500 text-sm">Order received</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-500 text-2xl font-bold">{today.delivered}</span>
              </div>
              <p className="text-gray-500 text-sm">Today delivered</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-gray-700 text-2xl font-bold">₹{today.sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <p className="text-gray-500 text-sm">Today sales</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-orange-500 text-2xl font-bold">{today.pending}</span>
              </div>
              <p className="text-gray-500 text-sm">Today pending</p>
            </CardContent>
          </Card>
        </div>

        {Object.keys(segmentBreakdown).length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(segmentBreakdown).map(([segment, data]) => (
              <Card
                key={segment}
                className={`cursor-pointer border-l-4 transition-colors ${segmentColors[segment] || 'border-gray-400 bg-gray-50 hover:bg-gray-100'}`}
                onClick={() => setActiveSection('all-orders')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-2xl">{segmentIcons[segment] || '📦'}</span>
                    <span className="font-semibold text-sm">{segment}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">{data.count}</p>
                      <p className="text-xs text-gray-500">orders today</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-green-600">₹{data.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                      <p className="text-xs text-gray-500">revenue</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Last Orders</CardTitle>
                <p className="text-sm text-gray-500">Quick management of the last 5 orders</p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">{processingCount}</Badge>
                <span className="text-sm text-gray-500">Processing</span>
                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">{completedCount}</Badge>
                <span className="text-sm text-gray-500">Completed</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrdersRaw.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">No orders yet</p>
              )}
              {recentOrdersRaw.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="font-medium text-sm text-blue-600">{formatOrderId(order)}</p>
                      <p className="text-xs text-gray-500">{order.customerName || 'Walk-in Customer'}</p>
                      <p className="text-xs text-gray-400">{order.orderType || order.productSegment || 'Order'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₹{parseFloat(order.total || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-gray-500">{order.paymentMethod || 'N/A'}</p>
                  </div>
                  <Badge 
                    variant="outline"
                    className={
                      order.status === 'pending' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                      order.status === 'accepted' || order.status === 'processing' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                      order.status === 'completed' || order.status === 'delivered' ? 'bg-green-100 text-green-700 border-green-200' :
                      order.status === 'cancelled' ? 'bg-red-100 text-red-700 border-red-200' :
                      'bg-gray-100 text-gray-700 border-gray-200'
                    }
                  >
                    {order.status}
                  </Badge>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:bg-blue-100"
                      title="View Order Details"
                      onClick={() => setActiveSection('all-orders')}
                    >
                      <Eye className="h-4 w-4 text-blue-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="col-span-12 lg:col-span-4 space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Order Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(ordersByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{status.replace(/_/g, ' ')}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
              {Object.keys(ordersByStatus).length === 0 && (
                <p className="text-gray-400 text-sm text-center">No orders</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Top Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {liveTopCustomers.length === 0 && (
                <p className="text-gray-400 text-sm text-center">No customer data</p>
              )}
              {liveTopCustomers.map((customer, idx) => (
                <div key={idx} className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-orange-100 text-orange-600 text-xs">
                      {customer.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{customer.name}</p>
                    <p className="text-xs text-gray-500">{customer.orders} order{customer.orders !== 1 ? 's' : ''}</p>
                    <p className="text-xs text-green-600">₹{customer.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button className="w-full mt-4 bg-green-500 hover:bg-green-600" onClick={() => setActiveSection('users-all')}>
              View All Customer
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Total Orders</span>
                <span className="font-semibold">{dashboardStats?.totalOrders || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Total Revenue</span>
                <span className="font-semibold text-green-600">₹{(dashboardStats?.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Avg Order Value</span>
                <span className="font-semibold">₹{(dashboardStats?.avgOrderValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Delivery Rate</span>
                <span className="font-semibold">{dashboardStats?.deliveryRate || 0}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <FreeMilkPendingWidget merchantId={merchantId} setActiveSection={setActiveSection} />
      </div>
    </div>
  );
}

function FreeMilkPendingWidget({ merchantId, setActiveSection }: { merchantId: string; setActiveSection: (s: string) => void }) {
  const { data: pending = [] } = useQuery<any[]>({
    queryKey: ['/api/free-milk/requests', merchantId, 'pending'],
    queryFn: async () => {
      const res = await fetch('/api/free-milk/requests?status=pending', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!merchantId,
    staleTime: 30000,
    refetchInterval: 60000,
  });
  if (pending.length === 0) return null;
  return (
    <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold">{pending.length}</span>
            Free Milk Requests
          </CardTitle>
          <a href="/merchant/free-milk-requests" className="text-xs text-amber-700 underline">View all</a>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {pending.slice(0, 3).map((r: any) => (
            <div key={r.id} className="flex items-center justify-between text-xs bg-white dark:bg-amber-900 rounded p-2">
              <div>
                <p className="font-medium text-foreground">{r.employeeName}</p>
                <p className="text-muted-foreground">{parseFloat(r.quantityLiters).toFixed(1)} L · {r.deliveryType === 'pickup' ? 'Pickup' : 'Route'}</p>
              </div>
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-[10px]">Pending</Badge>
            </div>
          ))}
          {pending.length > 3 && (
            <p className="text-xs text-amber-700 text-center">+{pending.length - 3} more pending</p>
          )}
        </div>
        <a href="/merchant/free-milk-requests">
          <Button size="sm" className="w-full mt-3 bg-amber-500 hover:bg-amber-600 text-white text-xs">
            Review Requests
          </Button>
        </a>
      </CardContent>
    </Card>
  );
}

function MerchantInfoSection({ merchant }: { merchant: Merchant }) {
  const [activeTab, setActiveTab] = useState<'merchant-info' | 'login-info' | 'address'>('merchant-info');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [headerPreview, setHeaderPreview] = useState<string | null>(null);

  const tabs = [
    { id: 'merchant-info' as const, label: 'District Union information', icon: Store },
    { id: 'login-info' as const, label: 'Login information', icon: Users },
    { id: 'address' as const, label: 'Address', icon: Globe },
  ];

  const removeLogo = () => setLogoPreview(null);
  const removeHeader = () => setHeaderPreview(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>Update Information</span>
        <span>»</span>
        <span className="text-gray-900 font-medium">{merchant.restaurantName}</span>
      </div>

      <div className="flex gap-6">
        {/* Left Sidebar with Tabs */}
        <div className="w-64 flex-shrink-0">
          {/* Union Avatar */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mb-2 overflow-hidden">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Store className="h-10 w-10 text-amber-600" />
              )}
            </div>
          </div>

          {/* Tab Buttons */}
          <div className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1">
          <Card>
            <CardContent className="p-6 space-y-6">
              {activeTab === 'merchant-info' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-gray-500 text-sm">Union name</Label>
                      <Input defaultValue={merchant.restaurantName} className="mt-1 border-gray-200" />
                    </div>
                    <div>
                      <Label className="text-gray-500 text-sm">Union Slug</Label>
                      <Input defaultValue={merchant.restaurantName?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || ''} className="mt-1 border-gray-200" />
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-500 text-sm">Contact Name</Label>
                    <Input defaultValue={merchant.contactName} className="mt-1 border-gray-200" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-gray-500 text-sm">Contact Phone</Label>
                      <Input defaultValue={merchant.restaurantPhone} className="mt-1 border-gray-200" />
                    </div>
                    <div>
                      <Label className="text-gray-500 text-sm">Contact email</Label>
                      <Input defaultValue={merchant.contactEmail} className="mt-1 border-gray-200" />
                    </div>
                  </div>

                  {/* Logo Upload */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Logo</span>
                      <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                        Browse
                      </Button>
                    </div>
                    {logoPreview && (
                      <div className="mt-4 relative inline-block">
                        <img src={logoPreview} alt="Logo preview" className="w-32 h-32 object-cover rounded-lg" />
                        <button 
                          onClick={removeLogo}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600"
                        >
                          ×
                        </button>
                      </div>
                    )}
                    <p className="text-sm text-gray-400 mt-2">Recommended image size: 600x600 pixels.</p>
                  </div>

                  {/* Header Upload */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Header</span>
                      <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                        Browse
                      </Button>
                    </div>
                    {headerPreview && (
                      <div className="mt-4 relative inline-block">
                        <img src={headerPreview} alt="Header preview" className="w-full h-24 object-cover rounded-lg" />
                        <button 
                          onClick={removeHeader}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600"
                        >
                          ×
                        </button>
                      </div>
                    )}
                    <p className="text-sm text-gray-400 mt-2">Recommended image size: 1400x600 pixels.</p>
                  </div>

                  {/* About Section with Rich Text Editor */}
                  <div>
                    <Label className="text-gray-600 font-medium">About</Label>
                    <div className="mt-2 border rounded-lg overflow-hidden">
                      <div className="flex items-center gap-1 p-2 border-b bg-gray-50 flex-wrap">
                        <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded font-bold">B</button>
                        <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded underline">U</button>
                        <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded italic">I</button>
                        <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded">⊞</button>
                        <div className="w-px h-6 bg-gray-300 mx-1"></div>
                        <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded">≡</button>
                        <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded">≡</button>
                        <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded">≡</button>
                        <div className="w-px h-6 bg-gray-300 mx-1"></div>
                        <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded text-red-500">A</button>
                        <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded">⊞</button>
                        <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded">🔗</button>
                        <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded">📷</button>
                        <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded">📹</button>
                        <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded">✂</button>
                        <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded">↺</button>
                        <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded">↻</button>
                      </div>
                      <Textarea 
                        className="border-0 min-h-[150px] focus-visible:ring-0 rounded-none" 
                        placeholder="Write about your union..."
                        defaultValue={merchant.description || ''}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button className="bg-green-500 hover:bg-green-600 text-white px-6">
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </>
              )}

              {activeTab === 'login-info' && (
                <>
                  <h3 className="text-lg font-semibold">Login Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-gray-500 text-sm">Username</Label>
                      <Input defaultValue={merchant.contactEmail?.split('@')[0] || ''} className="mt-1 border-gray-200" />
                    </div>
                    <div>
                      <Label className="text-gray-500 text-sm">Email</Label>
                      <Input defaultValue={merchant.contactEmail} className="mt-1 border-gray-200" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-gray-500 text-sm">New Password</Label>
                      <Input type="password" placeholder="Enter new password" className="mt-1 border-gray-200" />
                    </div>
                    <div>
                      <Label className="text-gray-500 text-sm">Confirm Password</Label>
                      <Input type="password" placeholder="Confirm new password" className="mt-1 border-gray-200" />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button className="bg-green-500 hover:bg-green-600 text-white px-6">
                      <Save className="h-4 w-4 mr-2" />
                      Update Login
                    </Button>
                  </div>
                </>
              )}

              {activeTab === 'address' && (
                <>
                  <h3 className="text-lg font-semibold">Address Information</h3>
                  <div>
                    <Label className="text-gray-500 text-sm">Street Address</Label>
                    <Textarea defaultValue={merchant.address || ''} className="mt-1 border-gray-200" rows={3} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <Label className="text-gray-500 text-sm">City</Label>
                      <Input placeholder="City" className="mt-1 border-gray-200" />
                    </div>
                    <div>
                      <Label className="text-gray-500 text-sm">State</Label>
                      <Input placeholder="State" defaultValue="Tamil Nadu" className="mt-1 border-gray-200" />
                    </div>
                    <div>
                      <Label className="text-gray-500 text-sm">Pincode</Label>
                      <Input placeholder="Pincode" className="mt-1 border-gray-200" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-gray-500 text-sm">Latitude</Label>
                      <Input placeholder="e.g., 11.6643" className="mt-1 border-gray-200" />
                    </div>
                    <div>
                      <Label className="text-gray-500 text-sm">Longitude</Label>
                      <Input placeholder="e.g., 78.1460" className="mt-1 border-gray-200" />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button className="bg-green-500 hover:bg-green-600 text-white px-6">
                      <Save className="h-4 w-4 mr-2" />
                      Save Address
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MerchantInfoSectionOld({ merchant }: { merchant: Merchant }) {
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(['American', 'Barbecue', 'Chinese', 'Deli', 'Diner', 'Halal', 'Indian', 'Italian', 'Korean', 'Mediterranean', 'Middle Eastern']);
  const [selectedServices, setSelectedServices] = useState<string[]>(['delivery', 'pickup', 'dinein']);
  const [selectedPosServices, setSelectedPosServices] = useState<string[]>([]);
  const [selectedTablesideServices, setSelectedTablesideServices] = useState<string[]>([]);

  const cuisineOptions = ['American', 'Barbecue', 'Chinese', 'Deli', 'Diner', 'Fast Food', 'Greek', 'Halal', 'Indian', 'Italian', 'Japanese', 'Korean', 'Mediterranean', 'Mexican', 'Middle Eastern', 'Pizza', 'Seafood', 'Thai', 'Vietnamese'];
  const serviceOptions = ['Delivery', 'Pickup', 'Dinein', 'Takeout', 'POS'];

  const toggleCuisine = (cuisine: string) => {
    setSelectedCuisines(prev => 
      prev.includes(cuisine) ? prev.filter(c => c !== cuisine) : [...prev, cuisine]
    );
  };

  const toggleService = (service: string) => {
    const s = service.toLowerCase();
    setSelectedServices(prev => 
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">District Union Information</h2>
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-gray-600">Union Name</Label>
              <Input defaultValue={merchant.restaurantName} className="mt-2 bg-gray-50 border-gray-200" />
            </div>
            <div>
              <Label className="text-gray-600">Contact Name</Label>
              <Input defaultValue={merchant.contactName} className="mt-2 bg-gray-50 border-gray-200" />
            </div>
            <div>
              <Label className="text-gray-600">Contact Email</Label>
              <Input defaultValue={merchant.contactEmail} className="mt-2 bg-gray-50 border-gray-200" />
            </div>
            <div>
              <Label className="text-gray-600">Phone Number</Label>
              <Input defaultValue={merchant.restaurantPhone} className="mt-2 bg-gray-50 border-gray-200" />
            </div>
          </div>

          <div>
            <Label className="text-gray-600">Address</Label>
            <Textarea defaultValue={merchant.address || ''} className="mt-2 bg-gray-50 border-gray-200" rows={2} />
          </div>

          <div>
            <Label className="text-gray-600">Description</Label>
            <Textarea defaultValue={merchant.description || 'Quality dairy products and cooperative services'} className="mt-2 bg-gray-50 border-gray-200" rows={3} />
          </div>

          <div className="border-t pt-6">
            <Label className="text-gray-600">Logo</Label>
            <div className="mt-2 flex items-start space-x-4">
              <div className="w-24 h-24 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                <Image className="h-8 w-8 text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-2">Maximum image size: 5MB (300x300px)</p>
                <Button variant="outline" size="sm" className="bg-green-500 text-white hover:bg-green-600">
                  Browse
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <Label className="text-gray-600">Header Image</Label>
            <div className="mt-2 flex items-start space-x-4">
              <div className="w-40 h-24 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                <Image className="h-8 w-8 text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-2">Recommended image size: 1920x400px</p>
                <Button variant="outline" size="sm" className="bg-green-500 text-white hover:bg-green-600">
                  Browse
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <Label className="text-gray-600">About</Label>
            <div className="mt-2 border rounded-lg">
              <div className="flex items-center space-x-1 p-2 border-b bg-gray-50">
                {['B', 'I', 'U', 'S', '≡', '≡', '≡', '≡', '¶', '⊞', '🔗', '📷'].map((btn, i) => (
                  <button key={i} className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded text-sm font-medium">
                    {btn}
                  </button>
                ))}
              </div>
              <Textarea 
                className="border-0 min-h-[150px] focus-visible:ring-0" 
                defaultValue="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum et enim ante. Curabitur viverra magna vel lorem volutpat, id lobortis felis aliquam. Cras vehicula mi vitae malesuada venenatis."
              />
            </div>
          </div>

          <div className="border-t pt-6">
            <Label className="text-gray-600">Short About</Label>
            <Textarea 
              className="mt-2 bg-gray-50 border-gray-200" 
              rows={4}
              defaultValue="Short description about your union that will appear in search results and previews."
            />
          </div>

          <div className="border-t pt-6">
            <Label className="text-gray-600">Cuisine</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {cuisineOptions.map((cuisine) => (
                <Badge
                  key={cuisine}
                  variant={selectedCuisines.includes(cuisine) ? 'default' : 'outline'}
                  className={`cursor-pointer px-3 py-1 ${
                    selectedCuisines.includes(cuisine) 
                      ? 'bg-green-500 hover:bg-green-600 text-white' 
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => toggleCuisine(cuisine)}
                >
                  {selectedCuisines.includes(cuisine) && '× '}{cuisine}
                </Badge>
              ))}
            </div>
          </div>

          <div className="border-t pt-6">
            <Label className="text-gray-600">Active Services</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {serviceOptions.map((service) => (
                <Badge
                  key={service}
                  variant={selectedServices.includes(service.toLowerCase()) ? 'default' : 'outline'}
                  className={`cursor-pointer px-3 py-1 ${
                    selectedServices.includes(service.toLowerCase()) 
                      ? 'bg-green-500 hover:bg-green-600 text-white' 
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => toggleService(service)}
                >
                  {selectedServices.includes(service.toLowerCase()) && '× '}{service}
                </Badge>
              ))}
            </div>
          </div>

          <div className="border-t pt-6">
            <Label className="text-gray-600">POS Services <span className="text-gray-400 font-normal text-xs">(if empty will use online services instead)</span></Label>
            <div className="mt-2 border rounded-lg bg-gray-50">
              <div className="p-2 border-b">
                <Input placeholder="Search..." className="border-0 bg-transparent focus-visible:ring-0" />
              </div>
              <div className="max-h-32 overflow-y-auto">
                {serviceOptions.map(service => (
                  <div 
                    key={service} 
                    className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${selectedPosServices.includes(service.toLowerCase()) ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}`}
                    onClick={() => {
                      const s = service.toLowerCase();
                      setSelectedPosServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
                    }}
                  >
                    {service}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <Label className="text-gray-600">Tableside Services <span className="text-gray-400 font-normal text-xs">(if empty will use online services instead)</span></Label>
            <div className="mt-2 border rounded-lg bg-gray-50">
              <div className="p-2 border-b">
                <Input placeholder="Search..." className="border-0 bg-transparent focus-visible:ring-0" />
              </div>
              <div className="max-h-32 overflow-y-auto">
                {serviceOptions.map(service => (
                  <div 
                    key={service} 
                    className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${selectedTablesideServices.includes(service.toLowerCase()) ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}`}
                    onClick={() => {
                      const s = service.toLowerCase();
                      setSelectedTablesideServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
                    }}
                  >
                    {service}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <Label className="text-gray-600">Tags</Label>
            <Input className="mt-2 bg-gray-50 border-gray-200" placeholder="Enter tags separated by commas" />
          </div>

          <div className="border-t pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-gray-600">Percent Commission Rate</Label>
              <Input type="number" className="mt-2 bg-gray-50 border-gray-200" placeholder="0" />
            </div>
            <div>
              <Label className="text-gray-600">Flat</Label>
              <Select>
                <SelectTrigger className="mt-2 bg-gray-50 border-gray-200">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subtotal">Subtotal</SelectItem>
                  <SelectItem value="total">Total</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="publishStore" className="rounded" defaultChecked />
              <Label htmlFor="publishStore" className="text-gray-600 cursor-pointer">Publish store</Label>
            </div>
          </div>

          <div className="pt-6">
            <Button className="w-full bg-green-500 hover:bg-green-600 h-12 text-lg">
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MerchantSettingsSection() {
  const { toast } = useToast();
  const [activeSettingsTab, setActiveSettingsTab] = useState('basic');
  const [enabledTipTransactions, setEnabledTipTransactions] = useState(['delivery', 'dinein', 'pickup']);

  const settingsTabs = [
    { id: 'basic', label: 'Basic Settings', icon: Settings },
    { id: 'timezone', label: 'Time Zone', icon: Globe },
    { id: 'hours', label: 'Store Hours', icon: CalendarDays },
    { id: 'taxes', label: 'Taxes', icon: Receipt },
    { id: 'seo', label: 'SEO', icon: BarChart3 },
    { id: 'kitchen', label: 'Kitchen Workload', icon: UtensilsCrossed },
    { id: 'search', label: 'Search Mode', icon: Eye },
    { id: 'login', label: 'Login & Signup', icon: Users },
    { id: 'phone', label: 'Phone Settings', icon: MessageSquare },
    { id: 'social', label: 'Social Settings', icon: Globe },
    { id: 'recaptcha', label: 'Google Recaptcha', icon: Settings },
    { id: 'mapapi', label: 'Map API Keys', icon: Globe },
    { id: 'notifications', label: 'Notification Settings', icon: Bell },
    { id: 'orders', label: 'Orders Settings', icon: ShoppingBag },
    { id: 'menu', label: 'Menu Options', icon: UtensilsCrossed },
    { id: 'mobile', label: 'Mobile Page', icon: Monitor },
  ];

  const toggleTipTransaction = (type: string) => {
    setEnabledTipTransactions(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>
      <div className="flex gap-6">
        <Card className="w-56 shrink-0">
          <CardContent className="p-2">
            <div className="flex items-center justify-center p-4 mb-2">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                <UtensilsCrossed className="h-8 w-8 text-orange-500" />
              </div>
            </div>
            <nav className="space-y-1">
              {settingsTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSettingsTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                    activeSettingsTab === tab.id
                      ? 'bg-green-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardContent className="p-6">
            {activeSettingsTab === 'basic' && (
              <div className="space-y-6">
                <div>
                  <Label className="text-gray-600">Default Auto Print Status</Label>
                  <Select>
                    <SelectTrigger className="mt-2 bg-gray-50">
                      <SelectValue placeholder="Please select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enabled">Enabled</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-600">Tax number</Label>
                  <Input className="mt-2 bg-gray-50" placeholder="2 of 54" />
                  <p className="text-xs text-gray-400 mt-1">You sell taxable or other items</p>
                </div>

                <div>
                  <Label className="text-gray-600">Two Flavor Options</Label>
                  <Select>
                    <SelectTrigger className="mt-2 bg-gray-50">
                      <SelectValue placeholder="Surrup and divided by 2" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="surrup">Surrup and divided by 2</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-600">Website address</Label>
                  <Input className="mt-2 bg-gray-50" placeholder="Enter your website address" />
                </div>

                <div>
                  <Label className="text-gray-600">Default Preparation Time (minutes)</Label>
                  <Input className="mt-2 bg-gray-50" type="number" placeholder="30" />
                </div>

                <div>
                  <Label className="text-gray-600">WhatsApp Phone number</Label>
                  <Input className="mt-2 bg-gray-50" placeholder="Enter WhatsApp number" />
                  <p className="text-xs text-gray-400 mt-1">Include country code</p>
                </div>

                <div className="border-t pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Close Store</span>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Enabled Voucher</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Enabled Tips</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Enabled Whatsapp Ordering</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Enabled Age Verification Popup</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Enabled language (Single app only)</span>
                    <Switch />
                  </div>
                </div>

                <div className="border-t pt-6">
                  <Label className="text-gray-600">Checkout Time Selection</Label>
                  <div className="mt-3 space-y-2">
                    <label className="flex items-center space-x-2">
                      <input type="radio" name="checkoutTime" value="time" className="text-green-500" />
                      <span className="text-gray-600">Time only</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="radio" name="checkoutTime" value="auto" className="text-green-500" />
                      <span className="text-gray-600">Auto only</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="radio" name="checkoutTime" value="both" defaultChecked className="text-green-500" />
                      <span className="text-gray-600">Both</span>
                    </label>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-600">Default Tip</Label>
                  <Select>
                    <SelectTrigger className="mt-2 bg-gray-50">
                      <SelectValue placeholder="1" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-600">Tip Type</Label>
                  <Select>
                    <SelectTrigger className="mt-2 bg-gray-50">
                      <SelectValue placeholder="Fixed" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed</SelectItem>
                      <SelectItem value="percent">Percentage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-600">Enabled Tips on the following transaction</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {['Delivery', 'Dinein', 'Pickup'].map((type) => (
                      <Badge
                        key={type}
                        variant={enabledTipTransactions.includes(type.toLowerCase()) ? 'default' : 'outline'}
                        className={`cursor-pointer px-3 py-1 ${
                          enabledTipTransactions.includes(type.toLowerCase())
                            ? 'bg-green-500 hover:bg-green-600 text-white'
                            : 'hover:bg-gray-100'
                        }`}
                        onClick={() => toggleTipTransaction(type.toLowerCase())}
                      >
                        {enabledTipTransactions.includes(type.toLowerCase()) && '× '}{type}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="pt-6">
                  <Button 
                    className="w-full bg-green-500 hover:bg-green-600 h-12"
                    onClick={() => toast({ title: "Settings Saved", description: "Your settings have been updated successfully." })}
                  >
                    Save
                  </Button>
                </div>
              </div>
            )}

            {activeSettingsTab === 'timezone' && (
              <div className="space-y-6">
                <div>
                  <Label className="text-gray-600">Set Your Time Zone</Label>
                  <Select>
                    <SelectTrigger className="mt-2 bg-gray-50">
                      <SelectValue placeholder="Please Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asia/kolkata">Asia/Kolkata (IST)</SelectItem>
                      <SelectItem value="america/new_york">America/New_York (EST)</SelectItem>
                      <SelectItem value="europe/london">Europe/London (GMT)</SelectItem>
                      <SelectItem value="asia/tokyo">Asia/Tokyo (JST)</SelectItem>
                      <SelectItem value="asia/dubai">Asia/Dubai (GST)</SelectItem>
                      <SelectItem value="australia/sydney">Australia/Sydney (AEST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-600">Time interval</Label>
                  <Input className="mt-2 bg-gray-50" type="number" defaultValue="10" />
                </div>
                <Button className="w-full bg-green-500 hover:bg-green-600 h-12" onClick={() => toast({ title: "Settings Saved", description: "Timezone settings have been updated successfully." })}>Save</Button>
              </div>
            )}

            {activeSettingsTab === 'hours' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">Regular Menu Hours</h3>
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                      <p className="font-medium text-gray-700">Plan Ahead: Set Special Hours for Holidays</p>
                      <p className="text-sm text-gray-500">Planning a holiday closure or special hours? Easily update your schedule for specific holidays or events. View and manage all holiday dates in one place. <a href="#" className="text-purple-600 hover:underline">View all events</a></p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => toast({ title: "Edit Hours", description: "Opening hours editor..." })}><Edit className="h-3 w-3" /> Edit</Button>
                    <Button variant="outline" size="sm" onClick={() => toast({ title: "Edit Availability", description: "Availability settings opening..." })}>Edit availability</Button>
                  </div>
                </div>
                <p className="text-sm text-gray-500">These are the hours your store is available</p>
                <div className="space-y-2">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                    <div key={day} className="flex items-center justify-between py-3 border-b">
                      <span className="font-medium w-28">{day}</span>
                      <span className="text-gray-600">12:15 AM - 11:59 PM</span>
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">open</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSettingsTab === 'taxes' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Tax enabled</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Tax on service fee</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Tax on small order fee</span>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Tax on delivery fee</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Tax on packaging fee</span>
                    <Switch defaultChecked />
                  </div>
                </div>

                <div className="border-t pt-6">
                  <Label className="text-gray-600 font-medium">Tax Calculation Method</Label>
                  <div className="mt-3 space-y-2">
                    <label className="flex items-center space-x-2">
                      <input type="radio" name="taxMethod" value="standard" defaultChecked className="text-green-500" />
                      <span className="text-gray-600">Standard Tax</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="radio" name="taxMethod" value="itemSpecific" className="text-green-500" />
                      <span className="text-gray-600">Item-specific Tax Rates</span>
                    </label>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <div className="flex gap-4 mb-4">
                    <button className="text-purple-600 border-b-2 border-purple-600 pb-1 font-medium">Standard Tax</button>
                    <button className="text-gray-500 pb-1">Item-specific Tax Rates</button>
                  </div>
                  <div>
                    <Label className="text-gray-600">Tax name</Label>
                    <Input className="mt-2 bg-gray-50" defaultValue="Tax" />
                  </div>
                  <div className="mt-4">
                    <Label className="text-gray-600">Tax Rate %</Label>
                    <Input className="mt-2 bg-gray-50" type="number" defaultValue="5.00" />
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-gray-600">Prices Include Tax</span>
                    <Switch />
                  </div>
                </div>

                <Button className="w-full bg-green-500 hover:bg-green-600 h-12">Save</Button>
              </div>
            )}

            {activeSettingsTab === 'seo' && (
              <div className="space-y-6">
                <div>
                  <Label className="text-gray-600">Page</Label>
                  <Input className="mt-2 bg-gray-50" placeholder="Enter page name" />
                </div>
                <div>
                  <Label className="text-gray-600">SEO Title</Label>
                  <Input className="mt-2 bg-gray-50" placeholder="Enter SEO title" />
                </div>
                <div>
                  <Label className="text-gray-600">Meta Description</Label>
                  <Textarea className="mt-2 bg-gray-50" placeholder="Enter meta description" rows={4} />
                </div>
                <div>
                  <Label className="text-gray-600">Meta Keywords</Label>
                  <Input className="mt-2 bg-gray-50" placeholder="Enter keywords separated by commas" />
                </div>
                <div>
                  <Label className="text-gray-600">Publish</Label>
                  <Select>
                    <SelectTrigger className="mt-2 bg-gray-50">
                      <SelectValue placeholder="Publish" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="publish">Publish</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="border-t pt-4">
                  <button className="text-gray-600 flex items-center gap-1">
                    Item translations <Plus className="h-4 w-4" />
                  </button>
                </div>
                <Button className="w-full bg-green-500 hover:bg-green-600 h-12">Save</Button>
              </div>
            )}

            {activeSettingsTab === 'kitchen' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-700">Low Workload</h3>
                  <div className="mt-3 space-y-4">
                    <div>
                      <Label className="text-gray-500 text-sm">Orders Below</Label>
                      <Input className="mt-1 bg-gray-50" type="number" defaultValue="0" />
                    </div>
                    <div>
                      <Label className="text-gray-500 text-sm">Add (Minutes)</Label>
                      <Input className="mt-1 bg-gray-50" type="number" defaultValue="0" />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold text-gray-700">Medium Workload</h3>
                  <div className="mt-3 space-y-4">
                    <div>
                      <Label className="text-gray-500 text-sm">Orders From</Label>
                      <Input className="mt-1 bg-gray-50" type="number" defaultValue="0" />
                    </div>
                    <div>
                      <Label className="text-gray-500 text-sm">Orders To</Label>
                      <Input className="mt-1 bg-gray-50" type="number" defaultValue="0" />
                    </div>
                    <div>
                      <Label className="text-gray-500 text-sm">Add (Minutes)</Label>
                      <Input className="mt-1 bg-gray-50" type="number" defaultValue="0" />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold text-gray-700">High Workload</h3>
                  <div className="mt-3 space-y-4">
                    <div>
                      <Label className="text-gray-500 text-sm">Orders Above</Label>
                      <Input className="mt-1 bg-gray-50" type="number" defaultValue="0" />
                    </div>
                    <div>
                      <Label className="text-gray-500 text-sm">Add (Minutes)</Label>
                      <Input className="mt-1 bg-gray-50" type="number" defaultValue="0" />
                    </div>
                  </div>
                </div>

                <Button className="w-full bg-green-500 hover:bg-green-600 h-12">Save</Button>
              </div>
            )}

            {activeSettingsTab === 'search' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Enable Search</span>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Search by Category</span>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Search by Item Name</span>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Enable Search Suggestions</span>
                  <Switch defaultChecked />
                </div>
                <Button className="w-full bg-green-500 hover:bg-green-600 h-12">Save</Button>
              </div>
            )}

            {activeSettingsTab === 'login' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-700">Signup Verifications</h3>
                  <p className="text-sm text-gray-500 mt-1">Notice: this section need to be fill only if you have single website union.</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-gray-600">Enabled</span>
                    <Switch />
                  </div>
                  <div className="mt-4">
                    <Label className="text-gray-600">Resend code interval</Label>
                    <Input className="mt-2 bg-gray-50" type="number" placeholder="60" />
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold text-gray-700">Guest Checkout</h3>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-gray-600">Enabled</span>
                    <Switch />
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold text-gray-700">Terms and condition</h3>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-gray-600">Enabled</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="mt-4 border rounded-lg">
                    <div className="flex items-center gap-1 p-2 border-b bg-gray-50">
                      <button className="p-1 hover:bg-gray-200 rounded"><Bold className="h-4 w-4" /></button>
                      <button className="p-1 hover:bg-gray-200 rounded"><Underline className="h-4 w-4" /></button>
                      <button className="p-1 hover:bg-gray-200 rounded"><Italic className="h-4 w-4" /></button>
                      <button className="p-1 hover:bg-gray-200 rounded"><AlignLeft className="h-4 w-4" /></button>
                      <button className="p-1 hover:bg-gray-200 rounded"><AlignCenter className="h-4 w-4" /></button>
                      <button className="p-1 hover:bg-gray-200 rounded"><AlignRight className="h-4 w-4" /></button>
                      <button className="p-1 hover:bg-gray-200 rounded"><List className="h-4 w-4" /></button>
                    </div>
                    <div className="p-3 min-h-[100px]">
                      <p className="text-sm text-gray-600">
                        By clicking "Submit," you agree to <a href="#" className="text-purple-600 hover:underline">E-delivery General Terms and Conditions</a> and acknowledge you have read the <a href="#" className="text-purple-600 hover:underline">Privacy Policy</a>.
                      </p>
                    </div>
                  </div>
                </div>

                <Button className="w-full bg-green-500 hover:bg-green-600 h-12">Save</Button>
              </div>
            )}

            {activeSettingsTab === 'phone' && (
              <div className="space-y-6">
                <div>
                  <Label className="text-gray-600">Primary Phone</Label>
                  <Input className="mt-2 bg-gray-50" placeholder="+91 9999999999" />
                </div>
                <div>
                  <Label className="text-gray-600">WhatsApp Number</Label>
                  <Input className="mt-2 bg-gray-50" placeholder="+91 9999999999" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Show Phone on Website</span>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Enable Click to Call</span>
                  <Switch defaultChecked />
                </div>
                <Button className="w-full bg-green-500 hover:bg-green-600 h-12">Save</Button>
              </div>
            )}

            {activeSettingsTab === 'social' && (
              <div className="space-y-6">
                <div>
                  <Label className="text-gray-600">Facebook URL</Label>
                  <Input className="mt-2 bg-gray-50" placeholder="https://facebook.com/..." />
                </div>
                <div>
                  <Label className="text-gray-600">Instagram URL</Label>
                  <Input className="mt-2 bg-gray-50" placeholder="https://instagram.com/..." />
                </div>
                <div>
                  <Label className="text-gray-600">Twitter URL</Label>
                  <Input className="mt-2 bg-gray-50" placeholder="https://twitter.com/..." />
                </div>
                <div>
                  <Label className="text-gray-600">YouTube URL</Label>
                  <Input className="mt-2 bg-gray-50" placeholder="https://youtube.com/..." />
                </div>
                <div>
                  <Label className="text-gray-600">LinkedIn URL</Label>
                  <Input className="mt-2 bg-gray-50" placeholder="https://linkedin.com/..." />
                </div>
                <Button className="w-full bg-green-500 hover:bg-green-600 h-12">Save</Button>
              </div>
            )}

            {activeSettingsTab === 'recaptcha' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Enable Google Recaptcha</span>
                  <Switch />
                </div>
                <div>
                  <Label className="text-gray-600">Site Key</Label>
                  <Input className="mt-2 bg-gray-50" placeholder="Enter site key" />
                </div>
                <div>
                  <Label className="text-gray-600">Secret Key</Label>
                  <Input className="mt-2 bg-gray-50" type="password" placeholder="Enter secret key" />
                </div>
                <Button className="w-full bg-green-500 hover:bg-green-600 h-12">Save</Button>
              </div>
            )}

            {activeSettingsTab === 'mapapi' && (
              <div className="space-y-6">
                <div>
                  <Label className="text-gray-600">Google Maps API Key</Label>
                  <Input className="mt-2 bg-gray-50" placeholder="Enter API key" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Enable Location Services</span>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Show Map on Store Page</span>
                  <Switch defaultChecked />
                </div>
                <Button className="w-full bg-green-500 hover:bg-green-600 h-12">Save</Button>
              </div>
            )}

            {activeSettingsTab === 'notifications' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Enabled Notification</span>
                  <Switch defaultChecked />
                </div>
                <p className="text-sm text-gray-500">Email and Mobile number who will receive notifications like new order and cancel order. Multiple email/mobile must be separated by comma.</p>
                
                <div>
                  <Label className="text-gray-500 text-sm">Email address</Label>
                  <Input className="mt-1 bg-gray-50" defaultValue="baselbzn@gmail.com" />
                </div>
                <div>
                  <Label className="text-gray-500 text-sm">Mobile number</Label>
                  <Input className="mt-1 bg-gray-50" defaultValue="+971501301347" />
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold text-gray-700">Web Settings</h3>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-gray-600">Enabled Continues alert for new order</span>
                    <Switch defaultChecked />
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold text-gray-700">Mobile Union Settings</h3>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-gray-600">Enable New Order Alert</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="mt-4">
                    <Label className="text-gray-600">New Order Alert Interval (seconds)</Label>
                    <Input className="mt-2 bg-gray-50" type="number" placeholder="30" />
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold text-gray-700">Tableside Settings</h3>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-gray-600">Enabled Continues alert for tableside ordering</span>
                    <Switch />
                  </div>
                </div>

                <Button className="w-full bg-green-500 hover:bg-green-600 h-12">Save</Button>
              </div>
            )}

            {activeSettingsTab === 'orders' && (
              <div className="space-y-6">
                <p className="text-sm text-gray-500">Define how many minutes that order set to critical order and needs attentions.</p>
                <div>
                  <Label className="text-gray-600">Critical minutes</Label>
                  <Input className="mt-2 bg-gray-50" type="number" defaultValue="10" />
                </div>
                <p className="text-sm text-gray-500">Define how many minutes that order will auto rejected.</p>
                <div>
                  <Label className="text-gray-600">Reject order minutes</Label>
                  <Input className="mt-2 bg-gray-50" type="number" placeholder="Enter minutes" />
                </div>
                <Button className="w-full bg-green-500 hover:bg-green-600 h-12">Save</Button>
              </div>
            )}

            {activeSettingsTab === 'menu' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-700">Menu Display Style (Mobile App)</h3>
                  <div className="mt-3 flex gap-4">
                    <label className="flex items-center space-x-2">
                      <input type="radio" name="menuStyle" value="all" className="text-green-500" />
                      <span className="text-gray-600">Show All Items</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="radio" name="menuStyle" value="categories" defaultChecked className="text-green-500" />
                      <span className="text-gray-600">Show Categories First</span>
                    </label>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold text-gray-700">Menu options for single app addon only</h3>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-gray-600">Addons use checkbox</span>
                    <Switch defaultChecked />
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold text-gray-700">Menu options</h3>
                  <div className="mt-3 flex gap-4">
                    <label className="flex items-center space-x-2">
                      <input type="radio" name="menuOpen" value="newWindow" className="text-green-500" />
                      <span className="text-gray-600">Open in new window</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="radio" name="menuOpen" value="popup" defaultChecked className="text-green-500" />
                      <span className="text-gray-600">Open in a pop up</span>
                    </label>
                  </div>
                </div>

                <Button className="w-full bg-green-500 hover:bg-green-600 h-12">Save</Button>
              </div>
            )}

            {activeSettingsTab === 'mobile' && (
              <div className="space-y-6">
                <div>
                  <Label className="text-gray-600">District Union Page Privacy Policy</Label>
                  <Select>
                    <SelectTrigger className="mt-2 bg-gray-50">
                      <SelectValue placeholder="Contact Us" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contact">Contact Us</SelectItem>
                      <SelectItem value="privacy">Privacy Policy</SelectItem>
                      <SelectItem value="terms">Terms of Service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-600">District Union Page Terms</Label>
                  <Select>
                    <SelectTrigger className="mt-2 bg-gray-50">
                      <SelectValue placeholder="Contact Us" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contact">Contact Us</SelectItem>
                      <SelectItem value="privacy">Privacy Policy</SelectItem>
                      <SelectItem value="terms">Terms of Service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-600">District Union Page About Us</Label>
                  <Select>
                    <SelectTrigger className="mt-2 bg-gray-50">
                      <SelectValue placeholder="Contact Us" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contact">Contact Us</SelectItem>
                      <SelectItem value="about">About Us</SelectItem>
                      <SelectItem value="faq">FAQ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full bg-green-500 hover:bg-green-600 h-12">Save</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function OrderLimitSection() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Order Limit</h2>
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Order Limit</p>
              <p className="text-sm text-gray-500">Limit the number of orders per time slot</p>
            </div>
            <Switch />
          </div>
          <div>
            <Label>Maximum Orders Per Hour</Label>
            <Input type="number" placeholder="10" className="mt-1 w-48" />
          </div>
          <div>
            <Label>Maximum Orders Per Day</Label>
            <Input type="number" placeholder="100" className="mt-1 w-48" />
          </div>
          <div className="flex justify-end">
            <Button className="bg-green-500 hover:bg-green-600">
              <Save className="h-4 w-4 mr-2" />
              Save Limits
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BannerSection() {
  const { toast } = useToast();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Banner Management</h2>
        <Button className="bg-green-500 hover:bg-green-600">
          <Plus className="h-4 w-4 mr-2" />
          Add Banner
        </Button>
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-orange-400 to-red-500 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">Banner {i}</span>
                </div>
                <div className="p-3 flex justify-between items-center">
                  <span className="text-sm font-medium">Promo Banner {i}</span>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast({ title: "Edit Banner", description: `Editing Banner ${i}...` })}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => toast({ title: "Delete Banner", description: `Banner ${i} deleted`, variant: "destructive" })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PagesSection() {
  const { toast } = useToast();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Pages</h2>
        <Button className="bg-green-500 hover:bg-green-600">
          <Plus className="h-4 w-4 mr-2" />
          Add Page
        </Button>
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {['About Us', 'Terms & Conditions', 'Privacy Policy', 'Contact Us'].map((page) => (
              <div key={page} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="font-medium">{page}</span>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => toast({ title: "Edit Page", description: `Editing ${page}...` })}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toast({ title: "Preview Page", description: `Previewing ${page}...` })}>
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MenuSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Menu Management</h2>
        <Button className="bg-green-500 hover:bg-green-600">
          <Plus className="h-4 w-4 mr-2" />
          Add Menu Item
        </Button>
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {['Appetizers', 'Main Course', 'Desserts', 'Beverages'].map((category) => (
              <div key={category} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">{category}</h3>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[1, 2].map((item) => (
                    <div key={item} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gray-200 rounded"></div>
                        <div>
                          <p className="font-medium">{category} Item {item}</p>
                          <p className="text-sm text-gray-500">₹999</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface OrderItem {
  itemId?: string;
  name: string;
  price: string;
  quantity: number;
}

interface DisplayOrder {
  id: string;
  fullId: string;
  customer: string;
  avatar: string;
  items: number;
  itemsList: OrderItem[];
  status: string;
  payment: string;
  orderType: string;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  date: string;
  platform: string;
  phone: string;
  email: string;
  address: string;
}

function OrdersSection({ type }: { type: string }) {
  const title = type === 'pending-orders' ? 'Pending Orders' : type === 'completed-orders' ? 'Completed Orders' : type === 'new-orders' ? 'New Orders' : type === 'orders-processing' ? 'Orders Processing' : type === 'orders-ready' ? 'Orders Ready' : type === 'scheduled' ? 'Scheduled Orders' : 'Order history';
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState('10');
  const [selectedOrder, setSelectedOrder] = useState<DisplayOrder | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [filteredOrders, setFilteredOrders] = useState<DisplayOrder[]>([]);
  const { toast } = useToast();
  
  // Fetch real orders from database
  const { data: dbOrders = [], isLoading } = useQuery({
    queryKey: ['/api/orders'],
    queryFn: async () => {
      const response = await fetch('/api/orders');
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Transform database orders to display format
  const allOrders: DisplayOrder[] = dbOrders.map((order: any) => {
    const initials = order.customerName?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'WC';
    const itemsList = Array.isArray(order.items) ? order.items : [];
    const itemCount = itemsList.length || 1;
    return {
      id: formatOrderId(order),
      fullId: order.id,
      customer: order.customerName || 'Walk-in Customer',
      avatar: initials,
      items: itemCount,
      itemsList: itemsList,
      status: order.status || 'pending',
      payment: order.paymentMethod || 'Cash',
      orderType: order.orderType === 'pickup' ? 'Pickup' : order.orderType === 'delivery' ? 'Delivery' : 'Dinein',
      subtotal: parseFloat(order.subtotal) || 0,
      tax: parseFloat(order.tax) || 0,
      deliveryFee: parseFloat(order.deliveryFee) || 0,
      total: parseFloat(order.total) || 0,
      date: order.createdAt || new Date().toISOString(),
      platform: order.deliveryAddress?.includes('Counter') || order.deliveryAddress?.includes('Dine') ? 'pos' : 'web',
      phone: order.customerPhone || '',
      email: order.customerEmail || '',
      address: order.deliveryAddress || 'N/A',
    };
  });

  useEffect(() => {
    let filtered = [...allOrders];
    if (type === 'new-orders') {
      filtered = allOrders.filter((o) => o.status === 'pending');
    } else if (type === 'orders-processing') {
      filtered = allOrders.filter((o) => o.status === 'accepted' || o.status === 'processing');
    } else if (type === 'completed-orders') {
      filtered = allOrders.filter((o) => o.status === 'completed');
    } else if (type === 'orders-ready') {
      filtered = allOrders.filter((o) => o.status === 'ready');
    }
    setFilteredOrders(filtered);
  }, [type, dbOrders]);

  const formatDate = (dateStr: string) => {
    return formatTimestamp(dateStr);
  };

  const handleFilter = () => {
    let filtered = [...allOrders];
    if (type === 'new-orders') {
      filtered = allOrders.filter(o => o.status === 'pending');
    } else if (type === 'orders-processing') {
      filtered = allOrders.filter(o => o.status === 'accepted');
    } else if (type === 'completed-orders') {
      filtered = allOrders.filter(o => o.status === 'completed');
    }
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59);
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.date);
        return orderDate >= start && orderDate <= end;
      });
    }
    
    setFilteredOrders(filtered);
    toast({ title: 'Filters Applied', description: `Showing ${filtered.length} orders` });
  };

  const handleExportExcel = () => {
    const headers = ['Order ID', 'Customer', 'Items', 'Status', 'Payment', 'Order Type', 'Total', 'Date', 'Platform'];
    const rows = filteredOrders.map(o => [o.id, o.customer, o.items, o.status, o.payment, o.orderType, `₹${o.total.toFixed(2)}`, formatDate(o.date), o.platform]);
    const csv = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    const blob = new Blob([csv], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders.xls';
    a.click();
    toast({ title: 'Export Complete', description: 'Orders exported to Excel' });
  };

  const handleExportCSV = () => {
    const headers = ['Order ID', 'Customer', 'Items', 'Status', 'Payment', 'Order Type', 'Total', 'Date', 'Platform'];
    const rows = filteredOrders.map(o => [o.id, o.customer, o.items, o.status, o.payment, o.orderType, `₹${o.total.toFixed(2)}`, formatDate(o.date), o.platform]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders.csv';
    a.click();
    toast({ title: 'Export Complete', description: 'Orders exported to CSV' });
  };

  const handleExportPDF = () => {
    const printContent = `
      <html><head><title>Order Report</title>
      <style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}</style></head>
      <body><h1>Order Report</h1><table><tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Status</th><th>Payment</th><th>Total</th><th>Date</th></tr>
      ${filteredOrders.map(o => `<tr><td>${o.id}</td><td>${o.customer}</td><td>${o.items}</td><td>${o.status}</td><td>${o.payment}</td><td>₹${o.total.toFixed(2)}</td><td>${formatDate(o.date)}</td></tr>`).join('')}
      </table></body></html>`;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.document.close();
      win.print();
    }
    toast({ title: 'PDF Export', description: 'Print dialog opened for PDF save' });
  };

  const handlePrint = () => {
    const printContent = `
      <html><head><title>Order Report</title>
      <style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}</style></head>
      <body><h1>Order Report</h1><table><tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Status</th><th>Payment</th><th>Total</th><th>Date</th></tr>
      ${filteredOrders.map(o => `<tr><td>${o.id}</td><td>${o.customer}</td><td>${o.items}</td><td>${o.status}</td><td>${o.payment}</td><td>₹${o.total.toFixed(2)}</td><td>${formatDate(o.date)}</td></tr>`).join('')}
      </table></body></html>`;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.document.close();
      win.print();
    }
  };

  const handleViewOrder = (order: DisplayOrder) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const handleDownloadReceipt = (order: DisplayOrder) => {
    const receipt = `
ORDER RECEIPT
=============
Order ID: ${order.id}
Customer: ${order.customer}
Phone: ${order.phone}
Date: ${formatDate(order.date)}
Order Type: ${order.orderType}
Address: ${order.address}
Payment: ${order.payment}
Items: ${order.items}
Total: ₹${order.total.toFixed(2)}
Status: ${order.status}
Platform: ${order.platform}
=============
Thank you for your order!`;
    const blob = new Blob([receipt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${order.id}.txt`;
    a.click();
    toast({ title: 'Receipt Downloaded', description: `Receipt for order ${order.id} saved` });
  };

  const displayOrders = filteredOrders.slice(0, parseInt(entriesPerPage));
  const totalAmount = allOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.total, 0);
  const cancelledCount = allOrders.filter(o => o.status === 'cancelled').length;
  const refundAmount = allOrders.filter(o => o.status === 'cancelled').reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{title}</h2>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-white">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Orders</p>
            <p className="text-2xl font-bold text-gray-800">{allOrders.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Cancel</p>
            <p className="text-2xl font-bold text-gray-800">{cancelledCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total refund</p>
            <p className="text-2xl font-bold text-gray-800">₹{refundAmount.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Orders</p>
            <p className="text-2xl font-bold text-gray-800">₹{totalAmount.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="w-36 bg-white" 
            />
            <span className="text-gray-500">--</span>
            <Input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="w-36 bg-white" 
            />
            <Button onClick={handleFilter} variant="default" className="bg-green-500 hover:bg-green-600 gap-1">
              <Filter className="h-4 w-4" /> Filters
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Show</span>
            <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
              <SelectTrigger className="w-20 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-500">entries</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleExportExcel} variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50">Excel</Button>
          <Button onClick={handleExportCSV} variant="outline" size="sm" className="text-blue-600 border-blue-600 hover:bg-blue-50">CSV</Button>
          <Button onClick={handleExportPDF} variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-50">PDF</Button>
          <Button onClick={handlePrint} variant="default" size="sm" className="bg-gray-700 hover:bg-gray-800">Print</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Order ID</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Customer</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Order Information</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Platform</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayOrders.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No orders found for the selected criteria</td></tr>
              ) : displayOrders.map((order) => (
                <tr key={order.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <span className="font-medium">{order.id}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-purple-100 text-purple-600">{order.avatar}</AvatarFallback>
                      </Avatar>
                      <span className="text-gray-700">{order.customer}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{order.items} items</span>
                        <Badge className={
                          order.status === 'completed' ? 'bg-green-500 text-white text-xs' :
                          order.status === 'accepted' ? 'bg-blue-500 text-white text-xs' :
                          order.status === 'cancelled' ? 'bg-red-500 text-white text-xs' :
                          'bg-orange-500 text-white text-xs'
                        }>
                          {order.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">{order.payment}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Order Type:</span>
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">{order.orderType}</Badge>
                      </div>
                      <p className="text-sm text-gray-500">Total: ₹{order.total.toFixed(2)}</p>
                      <p className="text-xs text-gray-400">Place on {formatDate(order.date)}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-gray-600">{order.platform}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button onClick={() => handleViewOrder(order)} variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-green-100">
                        <Eye className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button onClick={() => handleDownloadReceipt(order)} variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-blue-100">
                        <Download className="h-4 w-4 text-blue-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DialogTitle className="text-xl">Order #{selectedOrder?.id}</DialogTitle>
                {selectedOrder && (
                  <Badge className={
                    selectedOrder.status === 'completed' ? 'bg-green-500' : 
                    selectedOrder.status === 'cancelled' ? 'bg-red-500' : 
                    selectedOrder.status === 'accepted' ? 'bg-blue-500' :
                    'bg-orange-500'
                  }>{selectedOrder.status}</Badge>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-500">Placed on {selectedOrder && formatDate(selectedOrder.date)}</p>
          </DialogHeader>
          {selectedOrder && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Customer & Order Info */}
              <div className="space-y-6">
                {/* Customer Section */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" /> Customer
                  </h3>
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-purple-100 text-purple-600">{selectedOrder.avatar}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedOrder.customer}</p>
                      <p className="text-sm text-gray-500">{selectedOrder.phone}</p>
                      <p className="text-sm text-gray-500">{selectedOrder.email}</p>
                    </div>
                  </div>
                </div>

                {/* Order Details Table */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-3">Order Information</h3>
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 text-gray-500">Order Type</td>
                        <td className="py-2 text-right"><Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">{selectedOrder.orderType}</Badge></td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 text-gray-500">Delivery Date/Time</td>
                        <td className="py-2 text-right">ASAP</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 text-gray-500">Address</td>
                        <td className="py-2 text-right">{selectedOrder.address}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 text-gray-500">Payment</td>
                        <td className="py-2 text-right">{selectedOrder.payment}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 text-gray-500">Payment Status</td>
                        <td className="py-2 text-right">
                          <Badge className={selectedOrder.status === 'completed' ? 'bg-green-500' : 'bg-orange-500'}>
                            {selectedOrder.status === 'completed' ? 'Paid' : 'Unpaid'}
                          </Badge>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 text-gray-500">Platform</td>
                        <td className="py-2 text-right">{selectedOrder.platform}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Payment History */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-3">Payment History</h3>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="py-2 px-2 text-left text-gray-600">Date</th>
                        <th className="py-2 px-2 text-left text-gray-600">Payment</th>
                        <th className="py-2 px-2 text-right text-gray-600">Amount</th>
                        <th className="py-2 px-2 text-right text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-2 px-2">{formatDate(selectedOrder.date)}</td>
                        <td className="py-2 px-2">{selectedOrder.payment}</td>
                        <td className="py-2 px-2 text-right">₹{selectedOrder.total.toFixed(2)}</td>
                        <td className="py-2 px-2 text-right">
                          <Badge className={selectedOrder.status === 'completed' ? 'bg-green-500' : 'bg-orange-500'}>
                            {selectedOrder.status === 'completed' ? 'Paid' : 'Pending'}
                          </Badge>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column - Order Summary */}
              <div className="space-y-4">
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-4">Summary</h3>
                  
                  {/* Items List */}
                  <div className="space-y-3 mb-4">
                    {selectedOrder.itemsList && selectedOrder.itemsList.length > 0 ? (
                      selectedOrder.itemsList.map((item: OrderItem, index: number) => (
                        <div key={index} className="flex items-start justify-between border-b pb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                              <Package className="h-6 w-6 text-gray-400" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{item.quantity}x {item.name}</p>
                              <p className="text-xs text-gray-500">₹{item.price} each</p>
                            </div>
                          </div>
                          <p className="font-medium">₹{(parseFloat(item.price) * item.quantity).toFixed(2)}</p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-500 py-4">
                        <p>{selectedOrder.items} item(s)</p>
                      </div>
                    )}
                  </div>

                  {/* Price Breakdown */}
                  <div className="border-t pt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Subtotal ({selectedOrder.items} items)</span>
                      <span>₹{selectedOrder.subtotal.toFixed(2)}</span>
                    </div>
                    {selectedOrder.deliveryFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Delivery Fee</span>
                        <span>₹{selectedOrder.deliveryFee.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tax (5%)</span>
                      <span>₹{selectedOrder.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>Total</span>
                      <span>₹{selectedOrder.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button onClick={() => handleDownloadReceipt(selectedOrder)} className="flex-1 bg-green-500 hover:bg-green-600">
                    <Download className="h-4 w-4 mr-2" /> Download Receipt
                  </Button>
                  <Button variant="outline" onClick={() => window.print()}>
                    <Printer className="h-4 w-4 mr-2" /> Print
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FoodSection({ type, merchantId, onEditItem }: { type: string; merchantId: string | null; onEditItem?: (itemId: string) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState('10');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const { toast } = useToast();

  // Extract numeric restaurant ID from merchant ID (e.g., "merchant-3" -> "3")
  const restaurantId = merchantId?.replace('merchant-', '') || merchantId;

  // Fetch real items from API
  const { data: apiItems = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['/api/restaurants', restaurantId, 'menu'],
    queryFn: async () => {
      if (!restaurantId) return [];
      const response = await fetch(`/api/restaurants/${restaurantId}/menu`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!restaurantId && (type === 'food-items' || type === 'items-availability'),
  });

  // Fetch categories from API
  const { data: apiCategories = [], isLoading: categoriesLoading, refetch: refetchCategories } = useQuery<any[]>({
    queryKey: ['/api/merchant', merchantId, 'categories'],
    queryFn: async () => {
      if (!merchantId) return [];
      const response = await fetch(`/api/merchant/${merchantId}/categories`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!merchantId && type === 'food-category',
  });

  const titles: Record<string, string> = {
    'food-category': 'Category List',
    'addon-category': 'Addon Category List',
    'addon-items': 'Addon Items List',
    'food-items': 'Items List',
    'items-availability': 'Items Availability',
  };

  const categoryData = [
    { id: 1, name: 'Appetizers', available: true, items: 12 },
    { id: 2, name: 'Main Course', available: true, items: 24 },
    { id: 3, name: 'Desserts', available: true, items: 8 },
    { id: 4, name: 'Beverages', available: true, items: 15 },
    { id: 5, name: 'Specials', available: false, items: 5 },
  ];

  const addonCategoryData = [
    { id: 1, name: 'Fresh Additions', available: true, items: 10 },
    { id: 2, name: 'Beverages', available: true, items: 8 },
    { id: 3, name: 'Combo Packs', available: true, items: 6 },
  ];

  const addonItemsData = [
    { id: 1, name: 'Extra Cream (50ml)', price: 15, category: 'Fresh Additions', available: true },
    { id: 2, name: 'Flavored Milk Pack', price: 25, category: 'Beverages', available: true },
    { id: 3, name: 'Curd Cup (100g)', price: 20, category: 'Fresh Products', available: true },
    { id: 4, name: 'Buttermilk (200ml)', price: 15, category: 'Beverages', available: true },
  ];

  // Use API data for food items if available, otherwise use empty array
  const foodItemsData = apiItems.length > 0 
    ? apiItems.map((item: any, index: number) => ({
        id: item.id || index + 1,
        name: item.name,
        image: item.image || '📦',
        price: parseFloat(item.price || item.mrp || '0'),
        category: item.category || 'Uncategorized',
        available: item.isAvailable !== false,
        originalItem: item,
      }))
    : [];

  const availabilityData = foodItemsData.map(item => ({
    ...item,
    monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true
  }));

  const handleEdit = (item: any) => {
    setEditingItem(item.originalItem || item);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!merchantId || !editingItem) return;
    try {
      const response = await fetch(`/api/merchant/${merchantId}/menu-items/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingItem),
      });
      if (response.ok) {
        toast({ title: 'Success', description: 'Item updated successfully' });
        setEditDialogOpen(false);
        setEditingItem(null);
        refetch();
      } else {
        toast({ title: 'Error', description: 'Failed to update item', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update item', variant: 'destructive' });
    }
  };

  const handleDelete = async (item: any) => {
    setItemToDelete(item);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!merchantId || !itemToDelete) return;
    const itemId = itemToDelete.originalItem?.id || itemToDelete.id;
    try {
      const response = await fetch(`/api/merchant/${merchantId}/menu-items/${itemId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        toast({ title: 'Deleted', description: 'Item has been deleted successfully' });
        refetch();
      } else {
        toast({ title: 'Error', description: 'Failed to delete item', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete item', variant: 'destructive' });
    }
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  };

  const handleCopy = async (item: any) => {
    if (!merchantId) return;
    const itemId = item.originalItem?.id || item.id;
    try {
      const response = await fetch(`/api/merchant/${merchantId}/menu-items/${itemId}/copy`, {
        method: 'POST',
      });
      if (response.ok) {
        toast({ title: 'Copied', description: 'Item has been duplicated successfully' });
        refetch();
      } else {
        toast({ title: 'Error', description: 'Failed to copy item', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to copy item', variant: 'destructive' });
    }
  };

  const handleToggleAvailability = async (item: any) => {
    if (!merchantId) return;
    const itemId = item.originalItem?.id || item.id;
    const newAvailability = !item.available;
    try {
      const response = await fetch(`/api/merchant/${merchantId}/menu-items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: newAvailability }),
      });
      if (response.ok) {
        toast({ title: 'Updated', description: `Item is now ${newAvailability ? 'available' : 'unavailable'}` });
        refetch();
      } else {
        toast({ title: 'Error', description: 'Failed to update availability', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update availability', variant: 'destructive' });
    }
  };

  const handleToggleCategoryAvailability = async (categoryId: string, currentStatus: boolean) => {
    if (!merchantId) return;
    try {
      const response = await fetch(`/api/merchant/${merchantId}/categories/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (response.ok) {
        toast({ title: 'Updated', description: `Category ${!currentStatus ? 'enabled' : 'disabled'}` });
        refetchCategories();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update category', variant: 'destructive' });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!merchantId) return;
    try {
      const response = await fetch(`/api/merchant/${merchantId}/categories/${categoryId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        toast({ title: 'Deleted', description: 'Category has been deleted' });
        refetchCategories();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete category', variant: 'destructive' });
    }
  };

  const handleAddCategory = async () => {
    if (!merchantId) return;
    const name = prompt('Enter category name:');
    if (!name) return;
    try {
      const response = await fetch(`/api/merchant/${merchantId}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, isActive: true }),
      });
      if (response.ok) {
        toast({ title: 'Created', description: 'Category has been added' });
        refetchCategories();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create category', variant: 'destructive' });
    }
  };

  if (type === 'food-category') {
    const data = apiCategories.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      available: cat.isActive,
      sortOrder: cat.sortOrder,
    }));
    const filteredData = data.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{titles[type]}</h2>
          <div className="flex gap-3">
            <Button className="bg-green-500 hover:bg-green-600 text-white" onClick={handleAddCategory}>
              <Plus className="h-4 w-4 mr-2" />
              Add new
            </Button>
            <Button variant="outline" className="border-gray-300">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Sort
            </Button>
          </div>
        </div>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show</span>
                <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                  <SelectTrigger className="w-20 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-gray-600">entries</span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 w-56 h-9" />
              </div>
            </div>
            {categoriesLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading categories...</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No categories found. Add your first category!</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 border-b">
                    <TableHead className="w-16 font-medium text-gray-600">#</TableHead>
                    <TableHead className="w-28 font-medium text-gray-600">Available</TableHead>
                    <TableHead className="font-medium text-gray-600">Name</TableHead>
                    <TableHead className="w-28 text-center font-medium text-gray-600">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item, index) => (
                    <TableRow key={item.id} className="border-b hover:bg-gray-50/50">
                      <TableCell className="text-gray-500">{index + 1}</TableCell>
                      <TableCell>
                        <Switch 
                          checked={item.available} 
                          onCheckedChange={() => handleToggleCategoryAvailability(item.id, item.available)}
                          className="data-[state=checked]:bg-orange-500"
                        />
                      </TableCell>
                      <TableCell className="font-medium text-gray-800">{item.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-50">
                            <Edit className="h-4 w-4 text-gray-400 hover:text-blue-600" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50" onClick={() => handleDeleteCategory(item.id)}>
                            <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500">Showing 1 to {filteredData.length} of {filteredData.length} entries</p>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" disabled className="text-gray-400">Previous</Button>
                <Button size="sm" className="bg-green-500 text-white hover:bg-green-600 h-8 w-8 p-0">1</Button>
                <Button variant="ghost" size="sm" disabled className="text-gray-400">Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (type === 'addon-items') {
    const filteredData = addonItemsData.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{titles[type]}</h2>
          <div className="flex items-center gap-3">
            <Button className="bg-green-500 hover:bg-green-600 text-white">
              <Plus className="h-4 w-4 mr-2" />Add new
            </Button>
            <Button variant="outline" className="border-blue-500 text-blue-500 hover:bg-blue-50">
              <ArrowUpDown className="h-4 w-4 mr-2" />Sort
            </Button>
          </div>
        </div>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show</span>
                <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                  <SelectTrigger className="w-20 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-gray-600">entries</span>
              </div>
              <div className="flex items-center gap-2">
                <Input placeholder="Search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-48 h-9" />
                <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white h-9 w-9 p-0">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 border-b">
                  <TableHead className="w-16 font-medium text-gray-600">#</TableHead>
                  <TableHead className="w-16"></TableHead>
                  <TableHead className="w-24 font-medium text-gray-600">Available</TableHead>
                  <TableHead className="font-medium text-gray-600">Name</TableHead>
                  <TableHead className="font-medium text-gray-600">Addon Category</TableHead>
                  <TableHead className="font-medium text-gray-600">Price</TableHead>
                  <TableHead className="w-28 text-center font-medium text-gray-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item, index) => (
                  <TableRow key={item.id} className="border-b hover:bg-gray-50/50">
                    <TableCell className="text-gray-500">{index + 1}</TableCell>
                    <TableCell>
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                        <span className="text-lg">🍟</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch 
                        checked={item.available} 
                        onCheckedChange={() => handleToggleAvailability(item.id)}
                        className="data-[state=checked]:bg-green-500"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{item.name}</span>
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">Publish</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Date: {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">{item.category}</TableCell>
                    <TableCell className="font-medium">₹{item.price.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-50">
                          <Edit className="h-4 w-4 text-gray-400 hover:text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (type === 'food-items') {
    const filteredData = foodItemsData.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{titles[type]}</h2>
          <div className="flex items-center gap-3">
            <Button className="bg-green-500 hover:bg-green-600 text-white">
              <Plus className="h-4 w-4 mr-2" />Add new
            </Button>
            <Button variant="outline" className="border-blue-500 text-blue-500 hover:bg-blue-50">
              <ArrowUpDown className="h-4 w-4 mr-2" />Sort
            </Button>
            <Button variant="outline" className="border-purple-500 text-purple-500 hover:bg-purple-50">
              <Upload className="h-4 w-4 mr-2" />Upload Bulk
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show</span>
                <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-gray-600">entries</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <span className="text-sm text-gray-600 mr-2">Search:</span>
                  <Input placeholder="" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-48 inline-block" />
                </div>
                <div className="flex gap-1">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs px-3">Excel</Button>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs px-3">CSV</Button>
                  <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white text-xs px-3">PDF</Button>
                  <Button size="sm" className="bg-gray-600 hover:bg-gray-700 text-white text-xs px-3">Print</Button>
                </div>
              </div>
            </div>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading items...</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No items found. Add your first product!</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-16">#</TableHead>
                      <TableHead className="w-16"></TableHead>
                      <TableHead className="w-24">Available</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead className="w-32 text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item: any, index: number) => (
                      <TableRow key={item.id} className="hover:bg-gray-50">
                        <TableCell className="text-gray-500">{index + 1}</TableCell>
                        <TableCell>
                          {item.image && item.image.startsWith('http') ? (
                            <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover bg-gray-100" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center text-2xl">
                              {item.image || '📦'}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch 
                            checked={item.available !== false} 
                            onCheckedChange={() => handleToggleAvailability(item)}
                            className="data-[state=checked]:bg-green-500"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{item.name}</span>
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">Publish</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              Last Modified: {new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="text-xs text-gray-400">SKU#</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">{item.category}</TableCell>
                        <TableCell className="font-medium">₹{typeof item.price === 'number' ? item.price.toFixed(2) : item.price}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-50" onClick={() => onEditItem ? onEditItem(item.id) : handleEdit(item)}>
                              <Edit className="h-4 w-4 text-gray-500 hover:text-blue-600" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50" onClick={() => handleDelete(item)}>
                              <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-600" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100" onClick={() => handleCopy(item)}>
                              <Copy className="h-4 w-4 text-gray-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-500">Showing 1 to {filteredData.length} of {filteredData.length} entries</p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled>Previous</Button>
                    <Button variant="outline" size="sm" className="bg-green-500 text-white hover:bg-green-600">1</Button>
                    <Button variant="outline" size="sm" disabled>Next</Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Edit Item Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
            </DialogHeader>
            {editingItem && (
              <div className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input 
                    value={editingItem.name || ''} 
                    onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input 
                    value={editingItem.category || ''} 
                    onChange={(e) => setEditingItem({...editingItem, category: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>MRP (₹)</Label>
                    <Input 
                      type="number"
                      value={editingItem.mrp || ''} 
                      onChange={(e) => setEditingItem({...editingItem, mrp: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Retail Price (₹)</Label>
                    <Input 
                      type="number"
                      value={editingItem.retailPrice || ''} 
                      onChange={(e) => setEditingItem({...editingItem, retailPrice: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label>Image URL</Label>
                  <Input 
                    value={editingItem.image || ''} 
                    onChange={(e) => setEditingItem({...editingItem, image: e.target.value})}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={editingItem.isAvailable !== false}
                    onCheckedChange={(checked) => setEditingItem({...editingItem, isAvailable: checked})}
                  />
                  <Label>Available</Label>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                  <Button className="bg-green-500 hover:bg-green-600" onClick={handleSaveEdit}>Save Changes</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Delete</DialogTitle>
            </DialogHeader>
            <p className="text-gray-600">Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.</p>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
              <Button className="bg-red-500 hover:bg-red-600 text-white" onClick={confirmDelete}>Delete</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (type === 'items-availability') {
    const filteredItems = foodItemsData.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{titles[type]}</h2>
          <span className="text-gray-600">{filteredItems.length} items</span>
        </div>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Type a keyword" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="pl-10 h-10" 
                />
              </div>
              <Button className="bg-green-500 hover:bg-green-600 text-white h-10">
                Search
              </Button>
              <Button variant="outline" className="h-10 text-gray-600">
                <Filter className="h-4 w-4 mr-2" />
                Show all pause items
              </Button>
            </div>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading items...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No items found.</p>
              </div>
            ) : (
              <div className="space-y-0">
                {filteredItems.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between py-4 border-b last:border-b-0">
                    <div>
                      <h3 className="font-medium text-gray-900">{item.name}</h3>
                      <p className="text-gray-500">₹{typeof item.price === 'number' ? item.price.toFixed(2) : item.price}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      className="border-orange-500 text-orange-500 hover:bg-orange-50"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Pause availability
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (type === 'addon-category') {
    const filteredData = addonCategoryData.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{titles[type]}</h2>
          <div className="flex items-center gap-3">
            <Button className="bg-green-500 hover:bg-green-600 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add new
            </Button>
            <Button variant="outline" className="border-blue-500 text-blue-500 hover:bg-blue-50">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Sort
            </Button>
          </div>
        </div>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show</span>
                <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                  <SelectTrigger className="w-20 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-gray-600">entries</span>
              </div>
              <div className="relative">
                <Input placeholder="Search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-56 h-9 pr-10" />
                <Button size="sm" className="absolute right-0 top-0 h-9 px-3 bg-green-500 hover:bg-green-600 rounded-l-none">
                  <Search className="h-4 w-4 text-white" />
                </Button>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 border-b">
                  <TableHead className="w-16 font-medium text-gray-600">#</TableHead>
                  <TableHead className="w-28 font-medium text-gray-600">Available</TableHead>
                  <TableHead className="font-medium text-gray-600">Name</TableHead>
                  <TableHead className="w-28 text-center font-medium text-gray-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item, index) => (
                  <TableRow key={item.id} className="border-b hover:bg-gray-50/50">
                    <TableCell className="text-gray-500">{index + 1}</TableCell>
                    <TableCell>
                      <Switch 
                        checked={item.available} 
                        className="data-[state=checked]:bg-green-500"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{item.name}</span>
                          <Badge className="bg-green-100 text-green-700 text-xs hover:bg-green-100">Publish</Badge>
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.items} Items
                        </div>
                        <div className="text-xs text-gray-400">
                          Date: {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-50">
                          <Edit className="h-4 w-4 text-gray-400 hover:text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50">
                          <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500">Showing 1 to {filteredData.length} of {filteredData.length} entries</p>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" disabled className="text-gray-400">Previous</Button>
                <Button size="sm" className="bg-green-500 text-white hover:bg-green-600 h-8 w-8 p-0">1</Button>
                <Button variant="ghost" size="sm" disabled className="text-gray-400">Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Food Menu</h2>
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-500">Select a submenu to manage your food items.</p>
          </CardContent>
        </Card>
      </div>

      {/* Edit Item Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input 
                  value={editingItem.name || ''} 
                  onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                />
              </div>
              <div>
                <Label>Category</Label>
                <Input 
                  value={editingItem.category || ''} 
                  onChange={(e) => setEditingItem({...editingItem, category: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>MRP (₹)</Label>
                  <Input 
                    type="number"
                    value={editingItem.mrp || ''} 
                    onChange={(e) => setEditingItem({...editingItem, mrp: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Retail Price (₹)</Label>
                  <Input 
                    type="number"
                    value={editingItem.retailPrice || ''} 
                    onChange={(e) => setEditingItem({...editingItem, retailPrice: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label>Image URL</Label>
                <Input 
                  value={editingItem.image || ''} 
                  onChange={(e) => setEditingItem({...editingItem, image: e.target.value})}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  checked={editingItem.isAvailable !== false}
                  onCheckedChange={(checked) => setEditingItem({...editingItem, isAvailable: checked})}
                />
                <Label>Available</Label>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                <Button className="bg-green-500 hover:bg-green-600" onClick={handleSaveEdit}>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.</p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button className="bg-red-500 hover:bg-red-600 text-white" onClick={confirmDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ItemDetailSection({ itemId, merchantId, onBack }: { itemId: string | null; merchantId: string | null; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState('details');
  const { toast } = useToast();
  
  // Extract numeric restaurant ID from merchant ID (e.g., "merchant-3" -> "3")
  const restaurantId = merchantId?.replace('merchant-', '') || merchantId;
  
  // Form states for Details tab
  const [itemName, setItemName] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [category, setCategory] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('');
  const [status, setStatus] = useState('publish');
  const [hsnCode, setHsnCode] = useState('');
  const [gstPercent, setGstPercent] = useState('');
  
  // Price tab states
  const [prices, setPrices] = useState<{id: number; price: string; costPrice: string; discount: string; size: string}[]>([]);
  const [editPricesOpen, setEditPricesOpen] = useState(false);
  const [editFederationPrice, setEditFederationPrice] = useState('');
  const [editDistrictUnionPrice, setEditDistrictUnionPrice] = useState('');
  const [editWholesalePrice, setEditWholesalePrice] = useState('');
  const [editDealerPrice, setEditDealerPrice] = useState('');
  const [editMrp, setEditMrp] = useState('');
  const [isSavingPrices, setIsSavingPrices] = useState(false);
  
  // Addon tab states  
  const [addons, setAddons] = useState<{id: number; category: string; selectType: string; selectValue: number; required: boolean; price: string}[]>([]);
  
  // Attributes tab states
  const [enabledPoints, setEnabledPoints] = useState(true);
  const [enablePackaging, setEnablePackaging] = useState(false);
  const [cookingRefMandatory, setCookingRefMandatory] = useState(false);
  const [ingredientsPreSelected, setIngredientsPreSelected] = useState(false);
  const [pointsEarned, setPointsEarned] = useState('');
  const [packagingFee, setPackagingFee] = useState('');
  const [preparationTime, setPrepTime] = useState('30');
  const [extraTime, setExtraTime] = useState('5');
  const [allergens, setAllergens] = useState<string[]>(['Dairy', 'Wheat', 'Cheese']);
  const [cookingRef, setCookingRef] = useState<string[]>(['Extra']);
  const [ingredients, setIngredients] = useState<string[]>(['Cheese', 'Milk']);
  const [dish, setDish] = useState('');
  const [deliveryOptions, setDeliveryOptions] = useState<string[]>(['Bike']);
  
  // Availability tab states
  const [available, setAvailable] = useState(true);
  const [notForSale, setNotForSale] = useState(false);
  const [availableAtSpecifiedTimes, setAvailableAtSpecifiedTimes] = useState(false);
  const [daySchedule, setDaySchedule] = useState<{day: string; enabled: boolean; from: string; to: string}[]>([
    { day: 'monday', enabled: false, from: '', to: '' },
    { day: 'tuesday', enabled: false, from: '', to: '' },
    { day: 'wednesday', enabled: false, from: '', to: '' },
    { day: 'thursday', enabled: false, from: '', to: '' },
    { day: 'friday', enabled: false, from: '', to: '' },
    { day: 'saturday', enabled: false, from: '', to: '' },
    { day: 'sunday', enabled: false, from: '', to: '' },
  ]);
  
  // Inventory tab states
  const [trackStock, setTrackStock] = useState(true);
  const [sku, setSku] = useState('');
  const [supplier, setSupplier] = useState('');
  
  // Sales Promotion states
  const [promotions, setPromotions] = useState<{id: number; name: string}[]>([]);
  
  // Gallery states
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  
  // SEO states
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [keywords, setKeywords] = useState('');
  const [seoImage, setSeoImage] = useState('');

  // Fetch item data
  const { data: item, isLoading } = useQuery<any>({
    queryKey: ['/api/menu-items', itemId],
    queryFn: async () => {
      if (!itemId) return null;
      // Try to fetch from merchant menu items
      const response = await fetch(`/api/restaurants/${restaurantId}/menu`);
      if (!response.ok) return null;
      const items = await response.json();
      return items.find((i: any) => i.id === itemId) || null;
    },
    enabled: !!itemId && !!restaurantId,
  });

  // Populate form when item loads
  useEffect(() => {
    if (item) {
      setItemName(item.name || '');
      setShortDescription(item.description?.substring(0, 100) || '');
      setLongDescription(item.description || '');
      setCategory(item.category || '');
      setFeaturedImage(item.image || '');
      setHsnCode(item.hsnCode || '');
      setGstPercent(item.gstPercent || '5');
      setPrices([{ id: 1, price: item.price || '0', costPrice: '0.00', discount: '0', size: 'Regular' }]);
    }
  }, [item]);

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/merchant/${merchantId}/menu-items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: itemName,
          description: longDescription,
          category,
          image: featuredImage,
          price: prices[0]?.price || '0',
          isAvailable: available,
          hsnCode,
          gstPercent,
        }),
      });
      if (response.ok) {
        toast({ title: 'Success', description: 'Item saved successfully' });
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save item', variant: 'destructive' });
    }
  };

  const openEditPrices = () => {
    setEditFederationPrice(item?.federationPrice || '');
    setEditDistrictUnionPrice(item?.districtUnionPrice || '');
    setEditWholesalePrice(item?.wholesalePrice || '');
    setEditDealerPrice(item?.retailPrice || '');
    setEditMrp(item?.mrp || item?.price || '');
    setEditPricesOpen(true);
  };

  const handleSavePrices = async () => {
    setIsSavingPrices(true);
    try {
      const response = await fetch(`/api/menu-items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          federationPrice: editFederationPrice,
          districtUnionPrice: editDistrictUnionPrice,
          wholesalePrice: editWholesalePrice,
          retailPrice: editDealerPrice,
          mrp: editMrp,
          price: editMrp,
        }),
      });
      if (response.ok) {
        toast({ title: 'Success', description: 'Pricing tiers updated successfully' });
        setEditPricesOpen(false);
        window.location.reload();
      } else {
        throw new Error('Failed to save prices');
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update prices', variant: 'destructive' });
    } finally {
      setIsSavingPrices(false);
    }
  };

  const tabs = [
    { id: 'details', label: 'Details', icon: '⚙️' },
    { id: 'price', label: 'Price', icon: '💰' },
    { id: 'addon', label: 'Addon', icon: '➕' },
    { id: 'attributes', label: 'Attributes', icon: '🏷️' },
    { id: 'availability', label: 'Availability', icon: '✓' },
    { id: 'inventory', label: 'Inventory', icon: '📦' },
    { id: 'barcode', label: 'View Barcode', icon: '📊' },
    { id: 'promotion', label: 'Sales Promotion', icon: '🎁' },
    { id: 'gallery', label: 'Gallery', icon: '🖼️' },
    { id: 'seo', label: 'SEO', icon: '🌐' },
  ];

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
        <p className="text-gray-500 mt-2">Loading item...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4 mr-1" />
          All Item
        </Button>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <span className="font-medium">{itemName || 'Item Details'}</span>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <span className="text-gray-500 capitalize">{activeTab.replace('-', ' ')}</span>
      </div>

      <div className="flex gap-6">
        {/* Left Sidebar - Tabs */}
        <Card className="w-56 shrink-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b">
              <div className="w-16 h-16 rounded-lg bg-amber-100 flex items-center justify-center overflow-hidden">
                {featuredImage ? (
                  <img src={featuredImage} alt={itemName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">🍗</span>
                )}
              </div>
            </div>
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'bg-green-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="flex-1">
          {activeTab === 'details' && (
            <Card>
              <CardContent className="p-6 space-y-6">
                <div>
                  <Label className="text-gray-700">Item Name</Label>
                  <Input value={itemName} onChange={(e) => setItemName(e.target.value)} className="mt-1" />
                </div>
                
                <div>
                  <Label className="text-gray-700">Short Description</Label>
                  <Textarea 
                    value={shortDescription} 
                    onChange={(e) => setShortDescription(e.target.value)} 
                    className="mt-1 h-24"
                    placeholder="Brief description of the item..."
                  />
                </div>
                
                <div>
                  <Label className="text-gray-700">Long Description</Label>
                  <div className="mt-1 border rounded-lg">
                    <div className="flex items-center gap-1 p-2 border-b bg-gray-50">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Bold className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Italic className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Underline className="h-4 w-4" /></Button>
                      <div className="w-px h-4 bg-gray-300 mx-1" />
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><AlignLeft className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><AlignCenter className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><AlignRight className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><List className="h-4 w-4" /></Button>
                    </div>
                    <Textarea 
                      value={longDescription} 
                      onChange={(e) => setLongDescription(e.target.value)} 
                      className="border-0 min-h-[150px] focus-visible:ring-0"
                      placeholder="Detailed description..."
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-gray-700">Category</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">{category || 'Group Meals'}</Badge>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-700">Featured Image</Label>
                  <div className="mt-1 flex items-center gap-4">
                    <div className="w-20 h-20 rounded-lg bg-amber-100 flex items-center justify-center overflow-hidden border">
                      {featuredImage ? (
                        <img src={featuredImage} alt="Featured" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">🖼️</span>
                      )}
                    </div>
                    <Button variant="outline" className="bg-green-500 text-white hover:bg-green-600">Browse</Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-700">HSN Code *</Label>
                    <Input 
                      value={hsnCode} 
                      onChange={(e) => setHsnCode(e.target.value)} 
                      className="mt-1" 
                      placeholder="e.g., 0401 (4-8 digits)"
                      maxLength={8}
                    />
                    <p className="text-xs text-gray-500 mt-1">Required for invoices, E-way Bills & GST returns</p>
                  </div>
                  <div>
                    <Label className="text-gray-700">GST Rate (%)</Label>
                    <Select value={gstPercent} onValueChange={setGstPercent}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select GST %" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0% (Exempt)</SelectItem>
                        <SelectItem value="5">5%</SelectItem>
                        <SelectItem value="12">12%</SelectItem>
                        <SelectItem value="18">18%</SelectItem>
                        <SelectItem value="28">28%</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">Dairy products: 5% GST</p>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-700">Featured</Label>
                  <Input className="mt-1" placeholder="Featured text" />
                </div>

                <div>
                  <Label className="text-gray-700">Background Color Hex</Label>
                  <Input value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="mt-1" placeholder="#FFFFFF" />
                </div>

                <div>
                  <Label className="text-gray-700">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="publish">Publish</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="hidden">Hidden</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full bg-green-500 hover:bg-green-600 text-white" onClick={handleSave}>
                  Save
                </Button>
              </CardContent>
            </Card>
          )}

          {activeTab === 'price' && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Pricing Tiers</h3>
                  <Button className="bg-green-500 hover:bg-green-600 text-white" onClick={openEditPrices}>
                    <Edit className="h-4 w-4 mr-2" />Edit Prices
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  Different customers see different prices based on their registered role.
                </p>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Pricing Tier</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Discount from MRP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <span className="font-medium">Federation</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-red-600">{'\u20B9'}{item?.federationPrice || '0.00'}</TableCell>
                      <TableCell className="text-green-600">
                        {item?.mrp && item?.federationPrice ? 
                          `${((1 - parseFloat(item.federationPrice) / parseFloat(item.mrp)) * 100).toFixed(1)}%` : '-'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                          <span className="font-medium">District Union (Inter Union)</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-orange-600">{'\u20B9'}{item?.districtUnionPrice || '0.00'}</TableCell>
                      <TableCell className="text-green-600">
                        {item?.mrp && item?.districtUnionPrice ? 
                          `${((1 - parseFloat(item.districtUnionPrice) / parseFloat(item.mrp)) * 100).toFixed(1)}%` : '-'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          <span className="font-medium">Wholesale Dealer</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-blue-600">{'\u20B9'}{item?.wholesalePrice || '0.00'}</TableCell>
                      <TableCell className="text-green-600">
                        {item?.mrp && item?.wholesalePrice ? 
                          `${((1 - parseFloat(item.wholesalePrice) / parseFloat(item.mrp)) * 100).toFixed(1)}%` : '-'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span className="font-medium">Dealer</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-green-600">{'\u20B9'}{item?.retailPrice || '0.00'}</TableCell>
                      <TableCell className="text-green-600">
                        {item?.mrp && item?.retailPrice ? 
                          `${((1 - parseFloat(item.retailPrice) / parseFloat(item.mrp)) * 100).toFixed(1)}%` : '-'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                          <span className="font-medium">Retailer</span>
                          <span className="text-xs text-gray-400">(calculated)</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-purple-600">
                        {item?.mrp && item?.retailPrice ? 
                          `${'\u20B9'}${(parseFloat(item.mrp) - ((parseFloat(item.mrp) - parseFloat(item.retailPrice)) * 0.6)).toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-green-600">
                        {item?.mrp && item?.retailPrice ? 
                          `${(((parseFloat(item.mrp) - parseFloat(item.retailPrice)) * 0.6 / parseFloat(item.mrp)) * 100).toFixed(1)}%` : '-'}
                      </TableCell>
                    </TableRow>
                    <TableRow className="bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                          <span className="font-medium">MRP (Consumer)</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-gray-900">{'\u20B9'}{item?.mrp || item?.price || '0.00'}</TableCell>
                      <TableCell className="text-gray-500">Base Price</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                  <strong>Note:</strong> Retailer price is calculated automatically as: MRP - ((MRP - Dealer) × 60%)
                </div>
                {item?.gstPercent && (
                  <div className="mt-2 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-700">
                    <strong>GST:</strong> {item.gstPercent}% applicable on all prices
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'addon' && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Item addon</h3>
                  <div className="flex gap-2">
                    <Button className="bg-green-500 hover:bg-green-600 text-white">
                      <Plus className="h-4 w-4 mr-2" />Add new
                    </Button>
                    <Button variant="outline">
                      <ArrowUpDown className="h-4 w-4 mr-2" />Sort
                    </Button>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Addon Category</TableHead>
                      <TableHead>Select Type</TableHead>
                      <TableHead>Select Value</TableHead>
                      <TableHead>Required</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <div>
                          <div className="font-medium">Asafoetida</div>
                          <div className="text-xs text-gray-500">₹440.00</div>
                        </div>
                      </TableCell>
                      <TableCell>multiple</TableCell>
                      <TableCell>2</TableCell>
                      <TableCell>No</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div>
                          <div className="font-medium">Include Add-ons</div>
                          <div className="text-xs text-gray-500">₹440.00</div>
                        </div>
                      </TableCell>
                      <TableCell>multiple</TableCell>
                      <TableCell></TableCell>
                      <TableCell>No</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <div className="text-sm text-gray-500 mt-4">Showing 1 to 2 of 2 entries</div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'attributes' && (
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Enabled Points</Label>
                    <Switch checked={enabledPoints} onCheckedChange={setEnabledPoints} className="data-[state=checked]:bg-green-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Enabled Packaging Incremental</Label>
                    <Switch checked={enablePackaging} onCheckedChange={setEnablePackaging} className="data-[state=checked]:bg-green-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Cooking Reference Mandatory</Label>
                    <Switch checked={cookingRefMandatory} onCheckedChange={setCookingRefMandatory} className="data-[state=checked]:bg-green-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Ingredients pre-selected</Label>
                    <Switch checked={ingredientsPreSelected} onCheckedChange={setIngredientsPreSelected} className="data-[state=checked]:bg-green-500" />
                  </div>
                </div>

                <div>
                  <Label>Points earned</Label>
                  <Input value={pointsEarned} onChange={(e) => setPointsEarned(e.target.value)} className="mt-1" />
                </div>

                <div>
                  <Label>Packaging fee</Label>
                  <Input value={packagingFee} onChange={(e) => setPackagingFee(e.target.value)} className="mt-1" />
                </div>

                <div>
                  <Label>Preparation Time (minutes)</Label>
                  <Input value={preparationTime} onChange={(e) => setPrepTime(e.target.value)} className="mt-1" />
                </div>

                <div>
                  <Label>Extra Time (Minutes)</Label>
                  <Input value={extraTime} onChange={(e) => setExtraTime(e.target.value)} className="mt-1" />
                  <p className="text-xs text-gray-500 mt-1">example: for each extra Burger, add 2 minutes</p>
                </div>

                <div>
                  <Label>Allergens</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {allergens.map((a, i) => (
                      <Badge key={i} className="bg-green-500 text-white">× {a}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Cooking Reference</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {cookingRef.map((c, i) => (
                      <Badge key={i} className="bg-green-500 text-white">× {c}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Ingredients</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {ingredients.map((ing, i) => (
                      <Badge key={i} className="bg-green-500 text-white">× {ing}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Dish</Label>
                  <Input value={dish} onChange={(e) => setDish(e.target.value)} className="mt-1" />
                </div>

                <div>
                  <Label>Delivery options</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {deliveryOptions.map((opt, i) => (
                      <Badge key={i} className="bg-green-500 text-white">× {opt}</Badge>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Select order type for this item, can be used for delivery</p>
                </div>

                <Button className="w-full bg-green-500 hover:bg-green-600 text-white" onClick={handleSave}>
                  Save
                </Button>
              </CardContent>
            </Card>
          )}

          {activeTab === 'availability' && (
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Available</Label>
                  <Switch checked={available} onCheckedChange={setAvailable} className="data-[state=checked]:bg-green-500" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Not for sale</Label>
                    <span className="ml-2 text-gray-400">ⓘ</span>
                  </div>
                  <Switch checked={notForSale} onCheckedChange={setNotForSale} className="data-[state=checked]:bg-green-500" />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-base">Available at specified times</Label>
                  <div className="flex items-center gap-2">
                    <Switch checked={availableAtSpecifiedTimes} onCheckedChange={setAvailableAtSpecifiedTimes} className="data-[state=checked]:bg-green-500" />
                    <span className="text-sm text-gray-500">Check All</span>
                  </div>
                </div>

                <div className="space-y-3 pt-4">
                  {daySchedule.map((day, index) => (
                    <div key={day.day} className="flex items-center gap-4">
                      <Switch 
                        checked={day.enabled} 
                        onCheckedChange={(checked) => {
                          const newSchedule = [...daySchedule];
                          newSchedule[index].enabled = checked;
                          setDaySchedule(newSchedule);
                        }}
                        className="data-[state=checked]:bg-green-500"
                      />
                      <span className="w-24 capitalize">{day.day}</span>
                      <div className="flex items-center gap-2">
                        <Input 
                          placeholder="From" 
                          value={day.from}
                          onChange={(e) => {
                            const newSchedule = [...daySchedule];
                            newSchedule[index].from = e.target.value;
                            setDaySchedule(newSchedule);
                          }}
                          className="w-24"
                        />
                        <Input 
                          placeholder="To" 
                          value={day.to}
                          onChange={(e) => {
                            const newSchedule = [...daySchedule];
                            newSchedule[index].to = e.target.value;
                            setDaySchedule(newSchedule);
                          }}
                          className="w-24"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <Button className="w-full bg-green-500 hover:bg-green-600 text-white" onClick={handleSave}>
                  Save
                </Button>
              </CardContent>
            </Card>
          )}

          {activeTab === 'inventory' && (
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Track Stock</Label>
                  <Switch checked={trackStock} onCheckedChange={setTrackStock} className="data-[state=checked]:bg-green-500" />
                </div>

                <div>
                  <Label>SKU</Label>
                  <Input value={sku} onChange={(e) => setSku(e.target.value)} className="mt-1" />
                </div>

                <div>
                  <Label>Supplier</Label>
                  <Select value={supplier} onValueChange={setSupplier}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select Supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="supplier1">Supplier 1</SelectItem>
                      <SelectItem value="supplier2">Supplier 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full bg-green-500 hover:bg-green-600 text-white" onClick={handleSave}>
                  Save
                </Button>
              </CardContent>
            </Card>
          )}

          {activeTab === 'barcode' && (
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-end mb-4">
                  <Button className="bg-green-500 hover:bg-green-600 text-white">Print</Button>
                </div>
                <div className="border rounded-lg p-8 text-center">
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-24 h-24 bg-amber-100 rounded-lg flex items-center justify-center">
                      {featuredImage ? (
                        <img src={featuredImage} alt={itemName} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <span className="text-3xl">🍗</span>
                      )}
                    </div>
                    <div className="text-left">
                      <h2 className="text-xl font-bold uppercase">{itemName || '8-PC. CHICKEN MCSHARE BOX'}</h2>
                      <p className="text-sm text-gray-500">{shortDescription || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit...'}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-5xl font-bold">{prices[0]?.price || '440'}</span>
                      <span className="text-lg">.00</span>
                    </div>
                  </div>
                  <div className="mt-8">
                    <svg className="mx-auto" width="200" height="50" viewBox="0 0 200 50">
                      <rect x="0" y="0" width="2" height="50" fill="black" />
                      <rect x="4" y="0" width="1" height="50" fill="black" />
                      <rect x="8" y="0" width="3" height="50" fill="black" />
                      <rect x="14" y="0" width="2" height="50" fill="black" />
                      <rect x="20" y="0" width="1" height="50" fill="black" />
                      <rect x="24" y="0" width="4" height="50" fill="black" />
                      <rect x="32" y="0" width="2" height="50" fill="black" />
                      <rect x="38" y="0" width="1" height="50" fill="black" />
                      <rect x="42" y="0" width="3" height="50" fill="black" />
                      <rect x="50" y="0" width="2" height="50" fill="black" />
                      <rect x="56" y="0" width="4" height="50" fill="black" />
                      <rect x="64" y="0" width="1" height="50" fill="black" />
                      <rect x="68" y="0" width="2" height="50" fill="black" />
                      <rect x="74" y="0" width="3" height="50" fill="black" />
                      <rect x="82" y="0" width="1" height="50" fill="black" />
                      <rect x="86" y="0" width="4" height="50" fill="black" />
                      <rect x="96" y="0" width="2" height="50" fill="black" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'promotion' && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Sales Promotion</h3>
                  <Button className="bg-green-500 hover:bg-green-600 text-white">
                    <Plus className="h-4 w-4 mr-2" />Add new
                  </Button>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Show</span>
                    <Select defaultValue="10">
                      <SelectTrigger className="w-16"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm">entries</span>
                  </div>
                  <Input placeholder="Search..." className="w-48" />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Name</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-gray-500 py-8">
                        No data available in table
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                  <span>Showing 0 to 0 of 0 entries</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" disabled>Previous</Button>
                    <Button variant="ghost" size="sm" disabled>Next</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'gallery' && (
            <Card>
              <CardContent className="p-6 space-y-6">
                <div>
                  <Label>Gallery Image</Label>
                  <div className="mt-1 flex gap-2">
                    <Input placeholder="Select or upload image..." className="flex-1" />
                    <Button className="bg-green-500 hover:bg-green-600 text-white">Browse</Button>
                  </div>
                </div>

                <Button className="w-full bg-green-500 hover:bg-green-600 text-white" onClick={handleSave}>
                  Save
                </Button>
              </CardContent>
            </Card>
          )}

          {activeTab === 'seo' && (
            <Card>
              <CardContent className="p-6 space-y-6">
                <div>
                  <Label>Meta Title</Label>
                  <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className="mt-1" />
                </div>

                <div>
                  <Label>Meta description</Label>
                  <Textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} className="mt-1 h-24" />
                </div>

                <div>
                  <Label>Keywords</Label>
                  <Textarea value={keywords} onChange={(e) => setKeywords(e.target.value)} className="mt-1 h-24" />
                </div>

                <div>
                  <Label>Featured Image</Label>
                  <div className="mt-1 flex gap-2">
                    <Input placeholder="Select or upload image..." className="flex-1" value={seoImage} onChange={(e) => setSeoImage(e.target.value)} />
                    <Button className="bg-green-500 hover:bg-green-600 text-white">Browse</Button>
                  </div>
                </div>

                <Button className="w-full bg-green-500 hover:bg-green-600 text-white" onClick={handleSave}>
                  Save
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Pricing Tiers Dialog */}
      <Dialog open={editPricesOpen} onOpenChange={setEditPricesOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Pricing Tiers</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                Federation Price
              </Label>
              <div className="flex items-center mt-1">
                <span className="text-gray-500 mr-2">{'\u20B9'}</span>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={editFederationPrice} 
                  onChange={(e) => setEditFederationPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                District Union Price
              </Label>
              <div className="flex items-center mt-1">
                <span className="text-gray-500 mr-2">{'\u20B9'}</span>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={editDistrictUnionPrice} 
                  onChange={(e) => setEditDistrictUnionPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                Wholesale Dealer Price
              </Label>
              <div className="flex items-center mt-1">
                <span className="text-gray-500 mr-2">{'\u20B9'}</span>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={editWholesalePrice} 
                  onChange={(e) => setEditWholesalePrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                Dealer Price
              </Label>
              <div className="flex items-center mt-1">
                <span className="text-gray-500 mr-2">{'\u20B9'}</span>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={editDealerPrice} 
                  onChange={(e) => setEditDealerPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                MRP (Consumer Price)
              </Label>
              <div className="flex items-center mt-1">
                <span className="text-gray-500 mr-2">{'\u20B9'}</span>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={editMrp} 
                  onChange={(e) => setEditMrp(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="text-sm text-gray-500 bg-blue-50 p-2 rounded">
              <strong>Note:</strong> Retailer price is calculated automatically as: MRP - ((MRP - Dealer) × 60%)
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditPricesOpen(false)}>Cancel</Button>
              <Button 
                className="flex-1 bg-green-500 hover:bg-green-600 text-white" 
                onClick={handleSavePrices}
                disabled={isSavingPrices}
              >
                {isSavingPrices ? 'Saving...' : 'Save Prices'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TableBookingSection({ type }: { type?: string }) {
  const [entriesPerPage, setEntriesPerPage] = useState('10');
  const [enabledReservation, setEnabledReservation] = useState(true);
  const [enabledCaptcha, setEnabledCaptcha] = useState(false);
  const [allowGuestChooseTable, setAllowGuestChooseTable] = useState(true);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');

  const shiftData = [
    { id: 1, name: 'Breakfast', firstSeating: '08:00', lastSeating: '10:30', interval: '30 min', status: 'publish' },
    { id: 2, name: 'Lunch', firstSeating: '11:30', lastSeating: '14:00', interval: '30 min', status: 'publish' },
    { id: 3, name: 'Dinner', firstSeating: '18:00', lastSeating: '21:30', interval: '45 min', status: 'publish' },
  ];

  const roomData = [
    { id: 1, name: 'Main Hall', capacity: 50, totalTables: 12, status: 'active' },
    { id: 2, name: 'Private Room', capacity: 10, totalTables: 2, status: 'active' },
    { id: 3, name: 'Outdoor Patio', capacity: 30, totalTables: 8, status: 'active' },
  ];

  const tableData = [
    { id: 1, name: 'Table 1', room: 'Main Hall', minCovers: 2, maxCovers: 4, available: true },
    { id: 2, name: 'Table 2', room: 'Main Hall', minCovers: 2, maxCovers: 4, available: true },
    { id: 3, name: 'Table 3', room: 'Main Hall', minCovers: 4, maxCovers: 6, available: true },
    { id: 4, name: 'VIP Table', room: 'Private Room', minCovers: 6, maxCovers: 10, available: true },
    { id: 5, name: 'Patio 1', room: 'Outdoor Patio', minCovers: 2, maxCovers: 4, available: false },
  ];

  const { toast } = useToast();

  const handleExportExcel = (data: any[], title: string) => {
    const headers = Object.keys(data[0] || {}).join('\t');
    const rows = data.map(row => Object.values(row).join('\t')).join('\n');
    const content = headers + '\n' + rows;
    const blob = new Blob([content], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.xls`;
    a.click();
    toast({ title: 'Export Complete', description: `${title} exported to Excel` });
  };

  const handleExportCSV = (data: any[], title: string) => {
    const headers = Object.keys(data[0] || {}).join(',');
    const rows = data.map(row => Object.values(row).map(v => `"${v}"`).join(',')).join('\n');
    const content = headers + '\n' + rows;
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.csv`;
    a.click();
    toast({ title: 'Export Complete', description: `${title} exported to CSV` });
  };

  const handleExportPDF = (data: any[], title: string) => {
    const headers = Object.keys(data[0] || {});
    const printContent = `
      <html><head><title>${title}</title>
      <style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}</style></head>
      <body><h1>${title}</h1><table><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
      ${data.map(row => `<tr>${Object.values(row).map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}
      </table></body></html>`;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.document.close();
      win.print();
    }
  };

  const handlePrint = (data: any[], title: string) => {
    handleExportPDF(data, title);
  };

  const ExportButtons = ({ data, title }: { data: any[], title: string }) => (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => handleExportExcel(data, title)}>Excel</Button>
      <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => handleExportCSV(data, title)}>CSV</Button>
      <Button variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-50" onClick={() => handleExportPDF(data, title)}>PDF</Button>
      <Button variant="outline" size="sm" className="text-blue-600 border-blue-600 hover:bg-blue-50" onClick={() => handlePrint(data, title)}>Print</Button>
    </div>
  );

  const EntriesSelector = () => (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Show</span>
      <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="10">10</SelectItem>
          <SelectItem value="25">25</SelectItem>
          <SelectItem value="50">50</SelectItem>
          <SelectItem value="100">100</SelectItem>
        </SelectContent>
      </Select>
      <span className="text-sm text-gray-600">entries</span>
    </div>
  );

  const Pagination = () => (
    <div className="flex items-center justify-end gap-2 mt-4">
      <Button variant="outline" size="sm" disabled>Previous</Button>
      <Button variant="outline" size="sm" className="bg-green-500 text-white hover:bg-green-600">1</Button>
      <Button variant="outline" size="sm" disabled>Next</Button>
    </div>
  );

  if (type === 'table-booking-list' || type === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Reservation list</h2>
          <Button className="bg-green-500 hover:bg-green-600">
            <Plus className="h-4 w-4 mr-2" />
            Add Booking
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {[
            { label: 'Upcoming', value: 0, color: 'bg-blue-100 text-blue-600' },
            { label: 'Total', value: 0, color: 'bg-gray-100 text-gray-600' },
            { label: 'Denied', value: 0, color: 'bg-red-100 text-red-600' },
            { label: 'Cancelled', value: 0, color: 'bg-orange-100 text-orange-600' },
            { label: 'No show', value: 0, color: 'bg-yellow-100 text-yellow-600' },
            { label: 'Wait List', value: 0, color: 'bg-purple-100 text-purple-600' },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${stat.color.split(' ')[1]}`}>{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <EntriesSelector />
                <div className="flex items-center gap-2">
                  <Input type="date" className="w-40" />
                  <span className="text-gray-500">to</span>
                  <Input type="date" className="w-40" />
                </div>
              </div>
              <ExportButtons data={[]} title="Reservations" />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Request</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No reservations found
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <Pagination />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (type === 'table-booking-settings') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Booking Settings</h2>
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium">Enabled Reservation</p>
                <p className="text-sm text-gray-500">Allow customers to make table reservations</p>
              </div>
              <Switch checked={enabledReservation} onCheckedChange={setEnabledReservation} />
            </div>

            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium">Enabled Captcha</p>
                <p className="text-sm text-gray-500">Add captcha verification to booking form</p>
              </div>
              <Switch checked={enabledCaptcha} onCheckedChange={setEnabledCaptcha} />
            </div>

            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium">Allowed guest choose table</p>
                <p className="text-sm text-gray-500">Let guests select their preferred table</p>
              </div>
              <Switch checked={allowGuestChooseTable} onCheckedChange={setAllowGuestChooseTable} />
            </div>

            <div>
              <Label>Online booking custom confirmation message (optional)</Label>
              <Textarea 
                className="mt-2" 
                placeholder="Enter custom confirmation message..."
                value={confirmationMessage}
                onChange={(e) => setConfirmationMessage(e.target.value)}
                rows={4}
              />
            </div>

            <div>
              <Label>Online booking T&C (optional)</Label>
              <Textarea 
                className="mt-2" 
                placeholder="Enter terms and conditions..."
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                rows={4}
              />
            </div>

            <Button className="bg-green-500 hover:bg-green-600">
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (type === 'table-shifts') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Shift list</h2>
          <Button className="bg-green-500 hover:bg-green-600">
            <Plus className="h-4 w-4 mr-2" />
            Add Shift
          </Button>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <EntriesSelector />
              <ExportButtons data={shiftData} title="Shifts" />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>First/Last Seating</TableHead>
                  <TableHead>Interval</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shiftData.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell className="font-medium">{shift.name}</TableCell>
                    <TableCell>{shift.firstSeating} - {shift.lastSeating}</TableCell>
                    <TableCell>{shift.interval}</TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-700">{shift.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Pagination />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (type === 'table-room') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Room list</h2>
          <Button className="bg-green-500 hover:bg-green-600">
            <Plus className="h-4 w-4 mr-2" />
            Add Room
          </Button>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <EntriesSelector />
              <ExportButtons data={roomData} title="Rooms" />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room ID</TableHead>
                  <TableHead>Room Name</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Total tables</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roomData.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell className="font-medium">#{room.id}</TableCell>
                    <TableCell>{room.name}</TableCell>
                    <TableCell>{room.capacity}</TableCell>
                    <TableCell>{room.totalTables}</TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-700">{room.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Pagination />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (type === 'table-tables') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Table list</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="border-green-500 text-green-600 hover:bg-green-50">
              Generate Table
            </Button>
            <Button className="bg-green-500 hover:bg-green-600">
              <Plus className="h-4 w-4 mr-2" />
              Add Table
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <EntriesSelector />
              <ExportButtons data={tableData} title="Tables" />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Table name</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Min Covers</TableHead>
                  <TableHead>Max Covers</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map((table) => (
                  <TableRow key={table.id}>
                    <TableCell className="font-medium">{table.name}</TableCell>
                    <TableCell>{table.room}</TableCell>
                    <TableCell>{table.minCovers}</TableCell>
                    <TableCell>{table.maxCovers}</TableCell>
                    <TableCell>
                      <Badge className={table.available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                        {table.available ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4 text-gray-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Pagination />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Table Booking</h2>
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-500">Manage your table reservations here.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function POSSection({ type, merchantId }: { type?: string; merchantId: string | null }) {
  const [activeTab, setActiveTab] = useState('in-progress');
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
  const [posCategory, setPosCategory] = useState('all');
  const [orderType, setOrderType] = useState('dinein');
  const [cart, setCart] = useState<{id: string, name: string, price: number, qty: number, image?: string}[]>([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [posView, setPosView] = useState<'new' | 'orders' | 'hold' | 'table' | 'request'>('new');
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [customerType, setCustomerType] = useState<'mrp' | 'retailer' | 'dealer' | 'wholesale' | 'district' | 'federation'>('mrp');
  const [showPromoDialog, setShowPromoDialog] = useState(false);
  const [showDiscountDialog, setShowDiscountDialog] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [appliedPromoCode, setAppliedPromoCode] = useState('');
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [discountInput, setDiscountInput] = useState('');
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printOrderData, setPrintOrderData] = useState<any>(null);
  const [selectedParlour, setSelectedParlour] = useState('all');
  
  // Fetch merchant data for this POS section
  const { data: merchantData } = useQuery<any>({
    queryKey: ['/api/merchant', merchantId],
    queryFn: async () => {
      if (!merchantId) return null;
      const response = await fetch(`/api/merchant/${merchantId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!merchantId,
  });

  // Get union code from merchant name (e.g., "AAVIN Salem Union" -> "SLM")
  const getUnionCode = (merchantName: string | undefined): string => {
    if (!merchantName) return '';
    const nameMap: Record<string, string> = {
      'salem': 'SLM',
      'coimbatore': 'CBE',
      'madurai': 'MDU',
      'chennai': 'CHN',
      'erode': 'ERD',
      'tirupur': 'TPR',
      'vellore': 'VLR',
      'trichy': 'TRY',
      'thanjavur': 'TNJ',
      'tirunelveli': 'TNV',
    };
    const lowerName = merchantName.toLowerCase();
    for (const [city, code] of Object.entries(nameMap)) {
      if (lowerName.includes(city)) return code;
    }
    return '';
  };
  
  const unionCode = getUnionCode(merchantData?.restaurantName || merchantData?.name);
  
  // All parlours - filtered by union code
  const allParloursList = [
    { id: '1', code: 'SLM-001', name: 'Aavin Parlour - Salem Main' },
    { id: '2', code: 'SLM-002', name: 'Aavin Parlour - Salem Junction' },
    { id: '3', code: 'SLM-003', name: 'Aavin Parlour - Attur' },
    { id: '4', code: 'ERD-001', name: 'Aavin Parlour - Erode Central' },
    { id: '5', code: 'CBE-001', name: 'Aavin Parlour - Coimbatore RS Puram' },
    { id: '6', code: 'MDU-001', name: 'Aavin Parlour - Madurai Meenakshi' },
    { id: '7', code: 'CHN-001', name: 'Aavin Parlour - Chennai T Nagar' },
  ];
  
  // Filter parlours by union code - only show parlours belonging to this union
  const parloursList = [
    { id: 'all', code: 'ALL', name: 'All Parlours (Union HQ)' },
    ...allParloursList.filter(p => !unionCode || p.code.startsWith(unionCode))
  ];

  // Customer type labels for role-based pricing
  // District Unions can only sell to customers at their tier or below (WSD, Dealer, Retailer, MRP)
  // Federation and Inter-Union pricing tiers are hidden from District Union POS
  // Retailer tier is hidden by default - only shown when admin approves (retailerPriceEnabled)
  const retailerPriceEnabled = merchantData?.retailerPriceEnabled === true;
  const customerTypes = [
    { id: 'mrp', label: 'MRP/Consumer' },
    ...(retailerPriceEnabled ? [{ id: 'retailer', label: 'Retailer' }] : []),
    { id: 'dealer', label: 'Dealer' },
    { id: 'wholesale', label: 'Wholesale Dealer' },
  ];

  // Get price based on customer type
  const getPriceForCustomerType = (item: any) => {
    const mrp = parseFloat(item.mrp || item.price || '0');
    const dealerPrice = parseFloat(item.retailPrice || item.mrp || '0');
    
    switch (customerType) {
      case 'federation':
        return parseFloat(item.federationPrice || item.mrp || '0');
      case 'district':
        return parseFloat(item.districtUnionPrice || item.mrp || '0');
      case 'wholesale':
        return parseFloat(item.wholesalePrice || item.mrp || '0');
      case 'dealer':
        return parseFloat(item.retailPrice || item.mrp || '0'); // retailPrice field = Dealer price
      case 'retailer':
        // Retailer price = MRP - ((MRP - Dealer) × 60%)
        return mrp - ((mrp - dealerPrice) * 0.6);
      case 'mrp':
      default:
        return mrp;
    }
  };
  const [heldOrders, setHeldOrders] = useState<{id: string, customer: string, items: typeof cart, total: number, timestamp: Date, tableNo?: string}[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableArea, setTableArea] = useState('Main');
  const { toast } = useToast();

  // Table data
  const tableAreas = ['Main', 'Balcony', 'Outdoor'];
  const tablesData = [
    { id: '1', name: '1', capacity: '1-5', area: 'Main', status: 'available' as const },
    { id: '2', name: '2', capacity: '1-5', area: 'Main', status: 'ordered' as const },
    { id: '3', name: '3', capacity: '1-5', area: 'Main', status: 'available' as const },
    { id: '4', name: '4', capacity: '1-5', area: 'Main', status: 'available' as const },
    { id: '5', name: '5', capacity: '1-5', area: 'Main', status: 'available' as const },
    { id: '6', name: '6', capacity: '1-5', area: 'Main', status: 'ordered' as const },
    { id: '7', name: '7', capacity: '1-5', area: 'Main', status: 'available' as const },
    { id: '8', name: '8', capacity: '1-5', area: 'Main', status: 'available' as const },
    { id: '9', name: '9', capacity: '1-5', area: 'Main', status: 'available' as const },
    { id: '10', name: '10', capacity: '1-5', area: 'Main', status: 'available' as const },
    { id: 'D2', name: 'D2', capacity: '1-5', area: 'Main', status: 'available' as const },
    { id: 'JK2', name: 'JK2', capacity: '1-5', area: 'Main', status: 'ordered' as const },
    { id: 'B1', name: 'B1', capacity: '1-5', area: 'Balcony', status: 'available' as const },
    { id: 'B2', name: 'B2', capacity: '1-5', area: 'Balcony', status: 'occupied' as const },
    { id: 'O1', name: 'O1', capacity: '5-10', area: 'Outdoor', status: 'available' as const },
    { id: 'O2', name: 'O2', capacity: '5-10', area: 'Outdoor', status: 'waiting' as const },
  ];

  // Open orders (for Orders tab)
  const [openOrders, setOpenOrders] = useState([
    { id: '#T-JvsTt', customer: 'Walk-in Customer', orderType: 'Pickup', amount: 47.00, date: '27.01.2026, 20:22', elapsed: '1 days, 20:22:16' },
    { id: '#T-H5jeQ', customer: 'Walk-in Customer', orderType: 'Dinein [8]', amount: 322.00, date: '28.01.2026, 06:26', elapsed: '1 days, 10:17:35' },
  ]);

  // Customer requests
  const [customerRequests, setCustomerRequests] = useState<{id: string, table: string, request: string, time: string, status: string}[]>([]);

  // Order action dialogs
  const [showOrderViewDialog, setShowOrderViewDialog] = useState(false);
  const [showOrderDeleteDialog, setShowOrderDeleteDialog] = useState(false);
  const [showOrderTicketDialog, setShowOrderTicketDialog] = useState(false);
  const [selectedOpenOrder, setSelectedOpenOrder] = useState<typeof openOrders[0] | null>(null);

  // Order action handlers
  const handleOrderTicket = (order: typeof openOrders[0]) => {
    setSelectedOpenOrder(order);
    setShowOrderTicketDialog(true);
  };

  const handleOrderView = (order: typeof openOrders[0]) => {
    setSelectedOpenOrder(order);
    setShowOrderViewDialog(true);
  };

  const handleOrderDelete = (order: typeof openOrders[0]) => {
    setSelectedOpenOrder(order);
    setShowOrderDeleteDialog(true);
  };

  const confirmOrderDelete = () => {
    if (selectedOpenOrder) {
      setOpenOrders(prev => prev.filter(o => o.id !== selectedOpenOrder.id));
      toast({ title: "Order Deleted", description: `Order ${selectedOpenOrder.id} has been deleted` });
      setShowOrderDeleteDialog(false);
      setSelectedOpenOrder(null);
    }
  };

  const printOrderTicket = () => {
    if (selectedOpenOrder) {
      const ticketContent = `
        <html><head><title>Order Ticket ${selectedOpenOrder.id}</title>
        <style>body{font-family:monospace;padding:20px;max-width:300px}h2{margin:0;text-align:center}.line{border-top:1px dashed #000;margin:10px 0}p{margin:5px 0}</style></head>
        <body>
        <h2>ORDER TICKET</h2>
        <div class="line"></div>
        <p><strong>Order ID:</strong> ${selectedOpenOrder.id}</p>
        <p><strong>Customer:</strong> ${selectedOpenOrder.customer}</p>
        <p><strong>Type:</strong> ${selectedOpenOrder.orderType}</p>
        <p><strong>Date:</strong> ${selectedOpenOrder.date}</p>
        <div class="line"></div>
        <p style="text-align:center;font-size:20px"><strong>\u20B9${selectedOpenOrder.amount.toFixed(2)}</strong></p>
        <div class="line"></div>
        <p style="text-align:center;font-size:10px">Thank you for your order!</p>
        </body></html>`;
      const win = window.open('', '_blank', 'width=350,height=500');
      if (win) {
        win.document.write(ticketContent);
        win.document.close();
        win.print();
      }
      toast({ title: "Ticket Printed", description: `Ticket for ${selectedOpenOrder.id} printed` });
      setShowOrderTicketDialog(false);
    }
  };

  // Hold current order
  const holdCurrentOrder = () => {
    if (cart.length === 0) {
      toast({ title: "Cannot hold empty order", variant: "destructive" });
      return;
    }
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const tax = subtotal * 0.05;
    const total = subtotal + tax;
    const newHeldOrder = {
      id: `HOLD-${Date.now()}`,
      customer: customerName,
      items: [...cart],
      total: total,
      timestamp: new Date(),
      tableNo: selectedTable || undefined,
    };
    setHeldOrders(prev => [...prev, newHeldOrder]);
    setCart([]);
    setCustomerName('Walk-in Customer');
    setSelectedTable(null);
    toast({ title: "Order held", description: `Order ${newHeldOrder.id} has been held` });
  };

  // Resume held order
  const resumeHeldOrder = (orderId: string) => {
    const order = heldOrders.find(o => o.id === orderId);
    if (order) {
      setCart(order.items);
      setCustomerName(order.customer);
      setSelectedTable(order.tableNo || null);
      setHeldOrders(prev => prev.filter(o => o.id !== orderId));
      setPosView('new');
      toast({ title: "Order resumed", description: `Order ${orderId} loaded into cart` });
    }
  };

  // Delete held order
  const deleteHeldOrder = (orderId: string) => {
    setHeldOrders(prev => prev.filter(o => o.id !== orderId));
    toast({ title: "Order deleted", description: `Held order ${orderId} has been deleted` });
  };

  // Reset cart
  const resetCart = () => {
    setCart([]);
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    setSelectedTable(null);
    toast({ title: "Order reset", description: "Cart has been cleared" });
  };
  
  // Map merchant name to actual restaurant ID (e.g., "Salem District..." -> "UNI-SLM-01")
  const getRestaurantIdFromMerchant = (merchantName: string | undefined): string => {
    if (!merchantName) return '';
    const nameMap: Record<string, string> = {
      'salem': 'UNI-SLM-01',
      'coimbatore': 'UNI-CBE-01',
      'madurai': 'UNI-MDU-01',
      'chennai': 'UNI-CHN-01',
      'erode': 'UNI-ERD-01',
      'tirupur': 'UNI-TPR-01',
      'vellore': 'UNI-VLR-01',
      'trichy': 'UNI-TRY-01',
      'thanjavur': 'UNI-TNJ-01',
      'tirunelveli': 'UNI-TNV-01',
    };
    const lowerName = merchantName.toLowerCase();
    for (const [city, id] of Object.entries(nameMap)) {
      if (lowerName.includes(city)) return id;
    }
    return merchantId?.replace('merchant-', '') || '';
  };
  
  const restaurantId = getRestaurantIdFromMerchant(merchantData?.restaurantName || merchantData?.name);
  
  const { data: menuItems = [], isLoading: itemsLoading } = useQuery<any[]>({
    queryKey: ['/api/union', merchantId, 'my-products'],
    queryFn: async () => {
      if (!merchantId) return [];
      const response = await fetch(`/api/union/${merchantId}/my-products`, { credentials: 'include' });
      if (!response.ok) return [];
      const data = await response.json();
      return data.map((m: any) => ({
        id: m.masterProductId || m.id,
        name: m.masterProduct?.name || m.name || 'Product',
        price: parseFloat(m.mrp || m.masterProduct?.mrp || '0'),
        mrp: m.mrp || m.masterProduct?.mrp || '0',
        retailPrice: m.dealerPrice || m.masterProduct?.retailPrice || m.mrp || '0',
        wholesalePrice: m.wholesalePrice || m.masterProduct?.wholesalePrice || m.mrp || '0',
        federationPrice: m.federationPrice || m.masterProduct?.federationPrice || m.mrp || '0',
        districtUnionPrice: m.interUnionPrice || m.masterProduct?.districtUnionPrice || m.mrp || '0',
        category: m.masterProduct?.segment || 'Products',
        segment: m.masterProduct?.segment || '',
        unit: m.masterProduct?.unit || '',
        image: m.masterProduct?.image || null,
        isAvailable: m.isActive !== false,
        hsnCode: m.masterProduct?.hsnCode || '',
        gstRate: m.masterProduct?.gstPercent || '0',
      }));
    },
    enabled: !!merchantId,
  });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['/api/merchant', merchantId, 'categories'],
    queryFn: async () => {
      if (!merchantId) return [];
      const response = await fetch(`/api/merchant/${merchantId}/categories`);
      return response.json();
    },
    enabled: !!merchantId,
  });

  // Fetch real POS orders from database using merchant endpoint
  const { data: dbOrders = [], isLoading: ordersLoading } = useQuery<any[]>({
    queryKey: ['/api/merchant', merchantId, 'orders'],
    queryFn: async () => {
      if (!merchantId) return [];
      const response = await fetch(`/api/merchant/${merchantId}/orders`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!merchantId,
  });

  // Transform database orders to POS format
  const posOrders = dbOrders.map((order: any) => ({
    id: formatOrderId(order),
    orderId: order.id,
    orderType: order.orderType === 'pickup' ? 'Takeout' : order.orderType === 'delivery' ? 'Delivery' : 'Dine-in',
    customer: order.customerName || 'Walk-in Customer',
    phone: order.customerPhone || '',
    email: order.customerEmail || '',
    amount: `\u20B9${parseFloat(order.total || 0).toLocaleString('en-IN')}`,
    total: parseFloat(order.total || 0),
    date: order.createdAt ? formatTimestamp(order.createdAt) : '',
    status: ['pending', 'confirmed', 'preparing'].includes(order.status) ? 'in-progress' : 'completed',
    rawStatus: order.status,
    items: order.items || [],
    paymentMethod: order.paymentMethod || 'cash',
    deliveryAddress: order.deliveryAddress || '',
  }));

  const filteredOrders = activeTab === 'all' 
    ? posOrders 
    : activeTab === 'in-progress'
    ? posOrders.filter(o => o.status === 'in-progress')
    : posOrders.filter(o => o.status === 'completed');

  if (type === 'pos-order-history') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">POS Order History</h2>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className={selectedOrder ? "col-span-8" : "col-span-12"}>
            <Card>
              <CardContent className="p-0">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <div className="border-b px-4">
                    <TabsList className="bg-transparent h-12">
                      <TabsTrigger value="in-progress" className="data-[state=active]:border-b-2 data-[state=active]:border-green-500 rounded-none">
                        In Progress
                      </TabsTrigger>
                      <TabsTrigger value="order-history" className="data-[state=active]:border-b-2 data-[state=active]:border-green-500 rounded-none">
                        Order History
                      </TabsTrigger>
                      <TabsTrigger value="all" className="data-[state=active]:border-b-2 data-[state=active]:border-green-500 rounded-none">
                        All
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>ORDER TYPE</TableHead>
                        <TableHead>CUSTOMER</TableHead>
                        <TableHead>AMOUNT</TableHead>
                        <TableHead>DATE</TableHead>
                        <TableHead>STATUS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ordersLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            Loading orders...
                          </TableCell>
                        </TableRow>
                      ) : filteredOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            No orders found. Orders placed from POS or website will appear here.
                          </TableCell>
                        </TableRow>
                      ) : filteredOrders.map((order, idx) => (
                        <TableRow 
                          key={order.id} 
                          className={`cursor-pointer ${selectedOrder === idx ? 'bg-green-50' : 'hover:bg-gray-50'}`}
                          onClick={() => setSelectedOrder(idx)}
                        >
                          <TableCell className="font-medium text-blue-600">{order.id}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{order.orderType}</Badge>
                          </TableCell>
                          <TableCell>{order.customer}</TableCell>
                          <TableCell className="font-medium">{order.amount}</TableCell>
                          <TableCell className="text-gray-500">{order.date}</TableCell>
                          <TableCell>
                            <Badge className={order.status === 'in-progress' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}>
                              {order.status === 'in-progress' ? 'In Progress' : 'Completed'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {selectedOrder !== null && (
            <div className="col-span-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Order Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Order ID:</span>
                      <span className="font-medium">{filteredOrders[selectedOrder]?.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Type:</span>
                      <span>{filteredOrders[selectedOrder]?.orderType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Customer:</span>
                      <span>{filteredOrders[selectedOrder]?.customer}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Phone:</span>
                      <span>{filteredOrders[selectedOrder]?.phone || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Date:</span>
                      <span>{filteredOrders[selectedOrder]?.date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status:</span>
                      <Badge className={filteredOrders[selectedOrder]?.status === 'in-progress' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}>
                        {filteredOrders[selectedOrder]?.rawStatus || filteredOrders[selectedOrder]?.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Payment:</span>
                      <span>{filteredOrders[selectedOrder]?.paymentMethod}</span>
                    </div>
                  </div>
                  
                  {/* Order Items */}
                  {filteredOrders[selectedOrder]?.items?.length > 0 && (
                    <div className="border-t pt-3">
                      <h4 className="font-medium mb-2">Items</h4>
                      <div className="space-y-1 text-sm">
                        {filteredOrders[selectedOrder]?.items.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between">
                            <span>{item.name} x{item.quantity}</span>
                            <span>{'\u20B9'}{parseFloat(item.price || 0).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-green-600">{filteredOrders[selectedOrder]?.amount}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button className="flex-1 bg-green-500 hover:bg-green-600" onClick={() => {
                      const order = filteredOrders[selectedOrder];
                      if (!order) return;
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        printWindow.document.write(`
                          <html><head><title>Order ${order.id}</title>
                          <style>body{font-family:Arial;padding:20px;max-width:400px;margin:0 auto}
                          .header{text-align:center;margin-bottom:20px}
                          .line{border-bottom:1px dashed #000;margin:10px 0}
                          .item{display:flex;justify-content:space-between;padding:5px 0}
                          .total{font-weight:bold;font-size:18px;margin-top:15px}
                          </style></head><body>
                          <div class="header">
                            <h2>Aavincart</h2>
                            <p>Order Receipt</p>
                          </div>
                          <div class="line"></div>
                          <div class="item"><span>Order ID:</span><span>${order.id}</span></div>
                          <div class="item"><span>Customer:</span><span>${order.customer}</span></div>
                          <div class="item"><span>Date:</span><span>${order.date}</span></div>
                          <div class="item"><span>Type:</span><span>${order.orderType}</span></div>
                          <div class="line"></div>
                          <h4>Items</h4>
                          ${(order.items || []).map((item: any) => `<div class="item"><span>${item.name} x${item.quantity}</span><span>₹${parseFloat(item.price || 0).toFixed(2)}</span></div>`).join('')}
                          <div class="line"></div>
                          <div class="item total"><span>Total:</span><span>${order.amount}</span></div>
                          <div class="line"></div>
                          <p style="text-align:center;margin-top:20px">Thank you for your order!</p>
                          <p style="text-align:center">Contact: 9843777277</p>
                          </body></html>
                        `);
                        printWindow.document.close();
                        printWindow.print();
                      }
                    }}>Print</Button>
                    <Button variant="outline" className="flex-1" onClick={() => {
                      toast({ title: "Order Details", description: `Viewing order ${filteredOrders[selectedOrder]?.id}` });
                    }}>View</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    );
  }

  const uniqueCategories = [...new Set(menuItems.map(item => item.category).filter(Boolean))];
  const posCategories = [
    { id: 'all', name: 'All Items' },
    ...uniqueCategories.map(cat => ({ id: cat.toLowerCase().replace(/\s+/g, '-'), name: cat }))
  ];

  const posProducts = menuItems.filter(item => item.isAvailable !== false).map(item => ({
    id: item.id,
    name: item.name,
    price: getPriceForCustomerType(item),
    mrp: parseFloat(item.mrp || item.price || '0'),
    category: item.category?.toLowerCase().replace(/\s+/g, '-') || 'other',
    image: item.image || '',
  }));

  const filteredProducts = posCategory === 'all' ? posProducts : posProducts.filter(p => p.category === posCategory);

  const addToCart = (product: typeof posProducts[0]) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? {...item, qty: item.qty + 1} : item);
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, qty: 1, image: product.image }];
    });
  };

  // Apply promo code
  const applyPromoCode = () => {
    if (promoCodeInput.toUpperCase() === 'AAVIN10') {
      setAppliedPromoCode('AAVIN10');
      setAppliedDiscount(10);
      toast({ title: "Promo Applied!", description: "10% discount applied" });
    } else if (promoCodeInput.toUpperCase() === 'AAVIN20') {
      setAppliedPromoCode('AAVIN20');
      setAppliedDiscount(20);
      toast({ title: "Promo Applied!", description: "20% discount applied" });
    } else {
      toast({ title: "Invalid Code", description: "Promo code not recognized", variant: "destructive" });
    }
    setShowPromoDialog(false);
    setPromoCodeInput('');
  };

  // Apply manual discount
  const applyDiscount = () => {
    const discount = parseFloat(discountInput);
    if (!isNaN(discount) && discount >= 0 && discount <= 100) {
      setAppliedDiscount(discount);
      setAppliedPromoCode('Manual');
      toast({ title: "Discount Applied!", description: `${discount}% discount applied` });
    } else {
      toast({ title: "Invalid Discount", description: "Enter a value between 0 and 100", variant: "destructive" });
    }
    setShowDiscountDialog(false);
    setDiscountInput('');
  };

  // Print order receipt
  const printReceipt = (orderData: any) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
        <head>
          <title>Receipt - ${orderData.id || 'Order'}</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .item { display: flex; justify-content: space-between; margin: 5px 0; }
            .total { border-top: 1px dashed #000; padding-top: 10px; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>AAVINCART</h2>
            <p>Tamil Nadu Cooperative Milk<br/>Producers' Federation</p>
            <p>Contact: 9843777277</p>
          </div>
          <p><strong>Order:</strong> ${orderData.id || 'N/A'}</p>
          <p><strong>Customer:</strong> ${orderData.customer || 'Walk-in'}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          <hr/>
          ${(orderData.items || []).map((item: any) => `
            <div class="item">
              <span>${item.name} x${item.qty}</span>
              <span>₹${(item.price * item.qty).toFixed(2)}</span>
            </div>
          `).join('')}
          <div class="total">
            <div class="item"><span>Subtotal:</span><span>₹${orderData.subtotal?.toFixed(2) || '0.00'}</span></div>
            ${orderData.discount > 0 ? `<div class="item"><span>Discount:</span><span>-₹${orderData.discount.toFixed(2)}</span></div>` : ''}
            <div class="item"><span>Tax (5%):</span><span>₹${orderData.tax?.toFixed(2) || '0.00'}</span></div>
            <div class="item"><span>Total:</span><span>₹${orderData.total?.toFixed(2) || '0.00'}</span></div>
          </div>
          <div class="footer">
            <p>Thank you for your purchase!</p>
            <p>www.aavincart.com</p>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        return newQty > 0 ? {...item, qty: newQty} : item;
      }
      return item;
    }).filter(item => item.qty > 0));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discountAmount = subtotal * (appliedDiscount / 100);
  const subtotalAfterDiscount = subtotal - discountAmount;
  const tax = subtotalAfterDiscount * 0.05;
  const total = subtotalAfterDiscount + tax;

  const createOrderInDatabase = async (paymentMethodLabel: string, razorpayPaymentId?: string) => {
    const orderData = {
      restaurantId: merchantId,
      orderType: orderType === 'dinein' ? 'pickup' : orderType,
      customerName,
      customerEmail: 'pos@aavincart.com',
      customerPhone: customerPhone || '0000000000',
      paymentMethod: paymentMethodLabel,
      razorpayPaymentId: razorpayPaymentId || null,
      items: cart.map(item => ({
        itemId: item.id,
        name: item.name,
        price: String(item.price),
        quantity: item.qty,
      })),
      subtotal: String(subtotal.toFixed(2)),
      deliveryFee: '0.00',
      tax: String(tax.toFixed(2)),
      total: String(total.toFixed(2)),
      deliveryAddress: orderType === 'dinein' ? 'Dine-in' : orderType === 'pickup' ? 'Counter Pickup' : 'N/A',
      status: 'completed',
    };
    
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    
    if (!response.ok) throw new Error('Failed to create order');
    return response.json();
  };

  const processRazorpayPayment = async () => {
    try {
      // First create a Razorpay order
      const orderResponse = await fetch('/api/razorpay/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(total * 100), // Convert to paise
          currency: 'INR',
          receipt: `POS-${Date.now()}`,
          notes: {
            customerName,
            customerPhone,
            orderType,
          }
        }),
      });

      if (!orderResponse.ok) {
        const error = await orderResponse.json();
        throw new Error(error.error || 'Failed to create payment order');
      }

      const razorpayOrder = await orderResponse.json();

      // Get Razorpay config
      const configResponse = await fetch('/api/razorpay/config');
      if (!configResponse.ok) throw new Error('Payment gateway not configured');
      const config = await configResponse.json();

      // Load Razorpay script if not loaded
      if (!(window as any).Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Razorpay'));
          document.body.appendChild(script);
        });
      }

      // Open Razorpay checkout
      const options = {
        key: config.keyId,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'Aavincart',
        description: `POS Order - ${customerName}`,
        order_id: razorpayOrder.id,
        prefill: {
          name: customerName,
          contact: customerPhone || '',
        },
        theme: {
          color: '#22c55e'
        },
        handler: async function (response: any) {
          try {
            // Verify payment
            const verifyResponse = await fetch('/api/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            if (!verifyResponse.ok) {
              throw new Error('Payment verification failed');
            }

            // Create order in database
            const order = await createOrderInDatabase('Razorpay UPI', response.razorpay_payment_id);
            
            toast({
              title: "Payment Successful!",
              description: `Order ${formatOrderId(order)} has been processed.`,
            });
            
            setCart([]);
            setShowPaymentDialog(false);
            setCustomerName('Walk-in Customer');
            setCustomerPhone('');
            setPaymentMethod('cash');
          } catch (error) {
            toast({
              title: "Payment Verification Failed",
              description: "Please contact support with your payment details.",
              variant: "destructive",
            });
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: function() {
            setIsProcessing(false);
            toast({
              title: "Payment Cancelled",
              description: "The payment was cancelled.",
              variant: "destructive",
            });
          }
        }
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      setIsProcessing(false);
      toast({
        title: "Payment Failed",
        description: error.message || "Could not initiate payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const processPayment = async () => {
    if (cart.length === 0) return;
    
    setIsProcessing(true);
    
    // For UPI/Card payments, use Razorpay
    if (paymentMethod === 'upi' || paymentMethod === 'card') {
      await processRazorpayPayment();
      return;
    }
    
    // For cash payments, create order directly
    try {
      const order = await createOrderInDatabase('Cash');
      
      toast({
        title: "Order Completed!",
        description: `Order ${formatOrderId(order)} has been processed successfully.`,
      });
      
      setCart([]);
      setShowPaymentDialog(false);
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
      setPaymentMethod('cash');
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: "Could not process the order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Order type filters for Orders view
  const [orderTypeFilters, setOrderTypeFilters] = useState<string[]>([]);
  const [showOrdersFilters, setShowOrdersFilters] = useState(false);
  
  const toggleOrderTypeFilter = (type: string) => {
    setOrderTypeFilters(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };
  
  const filteredOpenOrders = orderTypeFilters.length === 0 
    ? openOrders 
    : openOrders.filter(o => orderTypeFilters.some(f => o.orderType.toLowerCase().includes(f.toLowerCase())));

  return (
    <div className="space-y-4">
      {/* POS Tab Navigation */}
      <div className="flex items-center gap-2">
        {[
          { id: 'new', label: 'New', color: 'bg-gray-600' },
          { id: 'orders', label: 'Orders', color: 'bg-orange-500' },
          { id: 'hold', label: 'Hold', color: 'bg-teal-500' },
          { id: 'table', label: 'Table', color: 'bg-green-500' },
          { id: 'request', label: 'Request', color: 'bg-purple-500' },
        ].map(tab => (
          <Button
            key={tab.id}
            className={`${posView === tab.id ? tab.color + ' text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            onClick={() => setPosView(tab.id as any)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Orders View */}
      {posView === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Open Orders</h2>
            <Button variant="outline" className="gap-2" onClick={() => setShowOrdersFilters(!showOrdersFilters)}>
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>
          
          <div className="grid grid-cols-12 gap-4">
            <div className={showOrdersFilters ? "col-span-9" : "col-span-12"}>
              <div className="flex flex-wrap gap-4">
                {filteredOpenOrders.length === 0 ? (
                  <div className="w-full text-center py-8 text-gray-500">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No open orders found</p>
                  </div>
                ) : (
                  filteredOpenOrders.map(order => (
                    <Card key={order.id} className="w-64 border-2">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-blue-600">{order.id}</p>
                            <p className="text-sm text-gray-600">{order.customer}</p>
                            <p className="text-sm text-gray-400">{order.date}</p>
                          </div>
                          <div className="text-right">
                            <Badge className="bg-purple-100 text-purple-700">{order.orderType}</Badge>
                            <p className="text-green-600 font-bold mt-1">{'\u20B9'}{order.amount.toFixed(2)}</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400">{order.elapsed}</p>
                        <div className="border-t pt-2">
                          <ChevronDown className="h-4 w-4 mx-auto text-gray-400" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <Button size="sm" className="bg-teal-500 hover:bg-teal-600 text-white text-xs" onClick={() => handleOrderTicket(order)}>Ticket</Button>
                          <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white text-xs" onClick={() => handleOrderView(order)}>View</Button>
                          <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white text-xs" onClick={() => handleOrderDelete(order)}>Delete</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
            
            {/* Filters Panel */}
            {showOrdersFilters && (
              <div className="col-span-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Order Type</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Select>
                      <SelectTrigger className="border-green-500 text-green-600">
                        <SelectValue placeholder="Select Order Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="delivery">Delivery</SelectItem>
                        <SelectItem value="dinein">Dinein</SelectItem>
                        <SelectItem value="pickup">Pickup</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="space-y-2 pt-2">
                      {['Delivery', 'Dinein', 'Pickup'].map(type => (
                        <label key={type} className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={orderTypeFilters.includes(type)}
                            onChange={() => toggleOrderTypeFilter(type)}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <span>{type}</span>
                        </label>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hold Orders View */}
      {posView === 'hold' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Held Orders</h2>
            <Badge variant="outline">{heldOrders.length} orders on hold</Badge>
          </div>
          
          {heldOrders.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-600">No Held Orders</h3>
                <p className="text-gray-400 mt-2">Orders you put on hold will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {heldOrders.map(order => (
                <Card key={order.id} className="border-2 border-teal-200">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-teal-600">{order.id}</p>
                        <p className="text-sm text-gray-600">{order.customer}</p>
                        {order.tableNo && <Badge variant="outline" className="mt-1">Table {order.tableNo}</Badge>}
                      </div>
                      <div className="text-right">
                        <p className="text-green-600 font-bold text-lg">{'\u20B9'}{order.total.toFixed(2)}</p>
                        <p className="text-xs text-gray-400">{order.items.length} items</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      Held at: {order.timestamp.toLocaleTimeString()}
                    </div>
                    <div className="border-t pt-3 space-y-1">
                      {order.items.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>{item.name} x{item.qty}</span>
                          <span>{'\u20B9'}{(item.price * item.qty).toFixed(2)}</span>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-xs text-gray-400">+{order.items.length - 3} more items</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <Button 
                        size="sm" 
                        className="bg-green-500 hover:bg-green-600 text-white"
                        onClick={() => {
                          setCart(order.items);
                          setCustomerName(order.customer);
                          if (order.tableNo) setSelectedTable(order.tableNo);
                          setHeldOrders(prev => prev.filter(o => o.id !== order.id));
                          setPosView('new');
                          toast({ title: "Order Restored", description: `${order.id} moved to cart` });
                        }}
                      >
                        Resume
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => {
                          setHeldOrders(prev => prev.filter(o => o.id !== order.id));
                          toast({ title: "Order Cancelled", description: `${order.id} has been removed` });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Order View */}
      {posView === 'new' && (
        <>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Create Order</h2>
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-gray-500" />
            <Select value={selectedParlour} onValueChange={setSelectedParlour}>
              <SelectTrigger className="w-[250px] h-9">
                <SelectValue placeholder="Select Parlour" />
              </SelectTrigger>
              <SelectContent>
                {parloursList.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="font-medium">{p.code}</span> - {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {['delivery', 'dinein', 'pickup'].map(t => (
            <Button 
              key={t} 
              variant={orderType === t ? 'default' : 'outline'}
              className={orderType === t ? 'bg-green-500 hover:bg-green-600' : ''}
              onClick={() => setOrderType(t)}
            >
              {t === 'delivery' ? '🚚 Delivery' : t === 'dinein' ? '🍽️ Dine-in' : '📦 Pickup'}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-220px)]">
        <div className="col-span-8 space-y-4 overflow-y-auto">
          <div className="flex gap-2 flex-wrap">
            {posCategories.map(cat => (
              <Button
                key={cat.id}
                variant={posCategory === cat.id ? 'default' : 'outline'}
                size="sm"
                className={posCategory === cat.id ? 'bg-green-500 hover:bg-green-600' : ''}
                onClick={() => setPosCategory(cat.id)}
              >
                {cat.name}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {itemsLoading ? (
              <div className="col-span-full text-center py-8 text-gray-500">Loading products...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No products found</p>
                <p className="text-sm">Add products in the Food &gt; Items section</p>
              </div>
            ) : (
              filteredProducts.map(product => (
                <Card 
                  key={product.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-green-500"
                  onClick={() => addToCart(product)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="h-16 w-16 mx-auto mb-2 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                      {product.image && product.image.startsWith('http') ? (
                        <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <p className="font-medium text-sm mb-1 line-clamp-2">{product.name}</p>
                    <p className="text-green-600 font-bold">{'\u20B9'}{product.price.toFixed(2)}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        <div className="col-span-4">
          <Card className="h-full flex flex-col">
            <CardHeader className="py-2 border-b space-y-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Current Order
                </CardTitle>
                <Badge variant="outline">{cart.length} items</Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded px-2 py-1">
                  <span className="text-sm text-gray-600 truncate">{customerName}</span>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setShowCustomerDialog(true)}>
                    <User className="h-3 w-3 mr-1" />
                    +Customer
                  </Button>
                </div>
              </div>
              <Select value={customerType} onValueChange={(v: any) => {
                setCustomerType(v);
                setCart([]); // Clear cart when changing customer type (prices change)
                toast({ title: "Customer Type Changed", description: `Prices updated for ${customerTypes.find(t => t.id === v)?.label}` });
              }}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select pricing tier" />
                </SelectTrigger>
                <SelectContent>
                  {customerTypes.map(ct => (
                    <SelectItem key={ct.id} value={ct.id}>{ct.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Cart is empty</p>
                  <p className="text-sm">Click products to add</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-green-600 text-sm">{'\u20B9'}{item.price}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.id, -1)}>-</Button>
                      <span className="w-6 text-center">{item.qty}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.id, 1)}>+</Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => removeFromCart(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
            <div className="border-t p-4 space-y-3">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal:</span><span>{'\u20B9'}{subtotal.toFixed(2)}</span></div>
                {appliedDiscount > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>Discount ({appliedDiscount}%):</span>
                    <span>-{'\u20B9'}{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-500"><span>Tax (5%):</span><span>{'\u20B9'}{tax.toFixed(2)}</span></div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t"><span>Total:</span><span className="text-green-600">{'\u20B9'}{total.toFixed(2)}</span></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setShowPromoDialog(true)}>
                  {appliedPromoCode ? `${appliedPromoCode}` : 'Promo'}
                </Button>
                <Button variant="outline" onClick={() => setShowDiscountDialog(true)}>
                  {appliedDiscount > 0 ? `${appliedDiscount}% Off` : 'Discount'}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  className="border-orange-500 text-orange-600"
                  onClick={() => {
                    toast({ title: "Sent to Kitchen", description: "Order sent to kitchen display" });
                  }}
                >
                  Kitchen
                </Button>
                <Button 
                  className="bg-green-500 hover:bg-green-600" 
                  disabled={cart.length === 0}
                  onClick={() => setShowPaymentDialog(true)}
                >
                  Proceed to Pay
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button variant="outline" onClick={resetCart}>Reset</Button>
                <Button variant="outline" onClick={holdCurrentOrder}>Hold Bill</Button>
                <Button variant="outline" onClick={() => {
                  const orderData = { id: `POS-${Date.now()}`, customer: customerName, items: cart, subtotal, discount: discountAmount, tax, total };
                  printReceipt(orderData);
                }}>Print</Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
      </>
      )}

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Customer Name</Label>
              <Input 
                value={customerName} 
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
              />
            </div>
            <div>
              <Label>Phone Number (Optional)</Label>
              <Input 
                value={customerPhone} 
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <Label>Payment Method</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                {[
                  { id: 'cash', label: 'Cash', icon: '💵' },
                  { id: 'upi', label: 'UPI', icon: '📱' },
                  { id: 'card', label: 'Card', icon: '💳' },
                ].map(method => (
                  <Button
                    key={method.id}
                    variant={paymentMethod === method.id ? 'default' : 'outline'}
                    className={paymentMethod === method.id ? 'bg-green-500 hover:bg-green-600' : ''}
                    onClick={() => setPaymentMethod(method.id)}
                  >
                    {method.icon} {method.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Subtotal:</span>
                <span>{'\u20B9'}{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>Tax (5%):</span>
                <span>{'\u20B9'}{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold">
                <span>Total:</span>
                <span className="text-green-600">{'\u20B9'}{total.toFixed(2)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
              <Button 
                className="bg-green-500 hover:bg-green-600"
                onClick={processPayment}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Confirm Payment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Promo Code Dialog */}
      <Dialog open={showPromoDialog} onOpenChange={setShowPromoDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Apply Promo Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Enter Promo Code</Label>
              <Input 
                value={promoCodeInput}
                onChange={(e) => setPromoCodeInput(e.target.value)}
                placeholder="e.g., AAVIN10"
              />
            </div>
            <p className="text-sm text-gray-500">Try: AAVIN10 (10% off) or AAVIN20 (20% off)</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => { setShowPromoDialog(false); setPromoCodeInput(''); }}>Cancel</Button>
              <Button className="bg-green-500 hover:bg-green-600" onClick={applyPromoCode}>Apply</Button>
            </div>
            {appliedPromoCode && (
              <Button variant="outline" className="w-full text-red-500" onClick={() => { setAppliedPromoCode(''); setAppliedDiscount(0); }}>
                Remove Applied Promo
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Discount Dialog */}
      <Dialog open={showDiscountDialog} onOpenChange={setShowDiscountDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Apply Discount</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Discount Percentage (%)</Label>
              <Input 
                type="number"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                placeholder="e.g., 10"
                min="0"
                max="100"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[5, 10, 15, 20].map(d => (
                <Button key={d} variant="outline" size="sm" onClick={() => setDiscountInput(String(d))}>{d}%</Button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => { setShowDiscountDialog(false); setDiscountInput(''); }}>Cancel</Button>
              <Button className="bg-green-500 hover:bg-green-600" onClick={applyDiscount}>Apply</Button>
            </div>
            {appliedDiscount > 0 && (
              <Button variant="outline" className="w-full text-red-500" onClick={() => { setAppliedDiscount(0); setAppliedPromoCode(''); }}>
                Remove Discount
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Details Dialog */}
      <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Customer Name</Label>
              <Input 
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
              />
            </div>
            <div>
              <Label>Phone Number</Label>
              <Input 
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <Label>Email (Optional)</Label>
              <Input 
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="Enter email address"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setShowCustomerDialog(false)}>Cancel</Button>
              <Button className="bg-green-500 hover:bg-green-600" onClick={() => {
                setShowCustomerDialog(false);
                toast({ title: "Customer Updated", description: customerName });
              }}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order View Dialog */}
      <Dialog open={showOrderViewDialog} onOpenChange={setShowOrderViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOpenOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-gray-500">Order ID</Label><p className="font-bold text-blue-600">{selectedOpenOrder.id}</p></div>
                <div><Label className="text-gray-500">Customer</Label><p className="font-medium">{selectedOpenOrder.customer}</p></div>
                <div><Label className="text-gray-500">Order Type</Label><Badge className="bg-purple-100 text-purple-700">{selectedOpenOrder.orderType}</Badge></div>
                <div><Label className="text-gray-500">Date</Label><p>{selectedOpenOrder.date}</p></div>
                <div><Label className="text-gray-500">Amount</Label><p className="font-bold text-green-600 text-lg">{'\u20B9'}{selectedOpenOrder.amount.toFixed(2)}</p></div>
                <div><Label className="text-gray-500">Elapsed</Label><p className="text-gray-400">{selectedOpenOrder.elapsed}</p></div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowOrderViewDialog(false)}>Close</Button>
                <Button className="bg-teal-500 hover:bg-teal-600" onClick={() => { setShowOrderViewDialog(false); handleOrderTicket(selectedOpenOrder); }}>Print Ticket</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Order Ticket Dialog */}
      <Dialog open={showOrderTicketDialog} onOpenChange={setShowOrderTicketDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Print Order Ticket</DialogTitle>
          </DialogHeader>
          {selectedOpenOrder && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="text-center border-b pb-2 mb-2">
                  <h3 className="font-bold text-lg">ORDER TICKET</h3>
                </div>
                <div className="space-y-1 text-sm">
                  <p><strong>Order ID:</strong> {selectedOpenOrder.id}</p>
                  <p><strong>Customer:</strong> {selectedOpenOrder.customer}</p>
                  <p><strong>Type:</strong> {selectedOpenOrder.orderType}</p>
                  <p><strong>Date:</strong> {selectedOpenOrder.date}</p>
                </div>
                <div className="border-t mt-2 pt-2 text-center">
                  <p className="text-xl font-bold text-green-600">{'\u20B9'}{selectedOpenOrder.amount.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowOrderTicketDialog(false)}>Cancel</Button>
                <Button className="bg-teal-500 hover:bg-teal-600" onClick={printOrderTicket}>Print</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Order Delete Dialog */}
      <Dialog open={showOrderDeleteDialog} onOpenChange={setShowOrderDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Order</DialogTitle>
          </DialogHeader>
          {selectedOpenOrder && (
            <div className="space-y-4">
              <p>Are you sure you want to delete order <strong className="text-blue-600">{selectedOpenOrder.id}</strong>?</p>
              <p className="text-sm text-gray-500">This action cannot be undone.</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowOrderDeleteDialog(false)}>Cancel</Button>
                <Button className="bg-red-500 hover:bg-red-600 text-white" onClick={confirmOrderDelete}>Delete</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CampaignsSection({ type }: { type: string }) {
  const [campaignName, setCampaignName] = useState('');
  const [campaignType, setCampaignType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [discount, setDiscount] = useState('');
  const [description, setDescription] = useState('');

  const campaigns = [
    { id: 1, name: 'Weekend Special', type: 'Discount', status: 'active', startDate: '2024-01-01', endDate: '2024-03-31', discount: '20%' },
    { id: 2, name: 'Happy Hour', type: 'Time-based', status: 'active', startDate: '2024-01-15', endDate: '2024-06-30', discount: '15%' },
    { id: 3, name: 'New Year Promo', type: 'Seasonal', status: 'ended', startDate: '2024-01-01', endDate: '2024-01-15', discount: '25%' },
    { id: 4, name: 'Loyalty Bonus', type: 'Loyalty', status: 'draft', startDate: '2024-02-01', endDate: '2024-12-31', discount: '10%' },
  ];

  const activeCampaigns = campaigns.filter(c => c.status === 'active');

  if (type === 'create-campaign') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Create Campaign</h2>
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>Campaign Name</Label>
                <Input 
                  className="mt-2" 
                  placeholder="Enter campaign name"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
              </div>
              <div>
                <Label>Campaign Type</Label>
                <Select value={campaignType} onValueChange={setCampaignType}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discount">Discount</SelectItem>
                    <SelectItem value="time-based">Time-based</SelectItem>
                    <SelectItem value="seasonal">Seasonal</SelectItem>
                    <SelectItem value="loyalty">Loyalty</SelectItem>
                    <SelectItem value="flash-sale">Flash Sale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>Start Date</Label>
                <Input 
                  type="date" 
                  className="mt-2"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input 
                  type="date" 
                  className="mt-2"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Discount Percentage</Label>
              <Input 
                className="mt-2" 
                placeholder="e.g., 10%"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea 
                className="mt-2" 
                placeholder="Enter campaign description..."
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex gap-4">
              <Button className="bg-green-500 hover:bg-green-600">
                <Save className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
              <Button variant="outline">Save as Draft</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayCampaigns = type === 'active-campaigns' ? activeCampaigns : campaigns;
  const title = type === 'active-campaigns' ? 'Active Campaigns' : 'All Campaigns';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        <Button className="bg-green-500 hover:bg-green-600">
          <Plus className="h-4 w-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayCampaigns.map((campaign) => (
          <Card key={campaign.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{campaign.name}</CardTitle>
                <Badge className={
                  campaign.status === 'active' ? 'bg-green-100 text-green-700' :
                  campaign.status === 'ended' ? 'bg-gray-100 text-gray-700' :
                  'bg-yellow-100 text-yellow-700'
                }>
                  {campaign.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{campaign.type}</Badge>
                <span className="text-green-600 font-semibold">{campaign.discount} OFF</span>
              </div>
              <div className="text-sm text-gray-500">
                <p>{campaign.startDate} - {campaign.endDate}</p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {displayCampaigns.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Megaphone className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No campaigns found. Create your first campaign!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CommunicationSection({ type }: { type?: string }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Record<string, {text: string, sender: 'user' | 'merchant', time: string}[]>>({
    '1': [{ text: 'Thanks for the quick delivery!', sender: 'user', time: '2 min ago' }],
    '2': [{ text: 'When will my order arrive?', sender: 'user', time: '15 min ago' }],
    '3': [{ text: 'The food was delicious!', sender: 'user', time: '1 hour ago' }],
    '4': [{ text: 'Can I modify my order?', sender: 'user', time: '2 hours ago' }],
    '5': [{ text: 'Please add extra sauce', sender: 'user', time: '3 hours ago' }],
  });
  const { toast } = useToast();

  const sendMessage = () => {
    if (!messageInput.trim() || !selectedChat) return;
    setChatMessages(prev => ({
      ...prev,
      [selectedChat]: [...(prev[selectedChat] || []), { text: messageInput, sender: 'merchant', time: 'Just now' }]
    }));
    setMessageInput('');
    toast({ title: "Message Sent", description: "Your message has been delivered" });
  };

  const chatData = [
    { id: '1', name: 'John Doe', avatar: 'JD', orderNumber: 'Order-428356', lastMessage: 'Thanks for the quick delivery!', time: '2 min ago', unread: 2 },
    { id: '2', name: 'Sarah Wilson', avatar: 'SW', orderNumber: 'Order-428125', lastMessage: 'When will my order arrive?', time: '15 min ago', unread: 1 },
    { id: '3', name: 'Mike Johnson', avatar: 'MJ', orderNumber: 'Order-426087', lastMessage: 'The food was delicious!', time: '1 hour ago', unread: 0 },
    { id: '4', name: 'Emily Brown', avatar: 'EB', orderNumber: 'Order-420635', lastMessage: 'Can I modify my order?', time: '2 hours ago', unread: 0 },
    { id: '5', name: 'David Lee', avatar: 'DL', orderNumber: 'Order-420005', lastMessage: 'Please add extra sauce', time: '3 hours ago', unread: 0 },
  ];

  const filteredChats = chatData.filter(chat => 
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{type === 'chats' ? 'Chats' : 'Communication'}</h2>
      <Card>
        <CardContent className="p-0">
          <div className="flex h-[600px]">
            <div className="w-80 border-r flex flex-col">
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedChat(chat.id)}
                    className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 border-b transition-colors ${
                      selectedChat === chat.id ? 'bg-green-50 border-l-4 border-l-green-500' : ''
                    }`}
                  >
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback className="bg-orange-100 text-orange-600 text-sm">
                        {chat.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">{chat.name}</p>
                        <span className="text-xs text-gray-400">{chat.time}</span>
                      </div>
                      <p className="text-xs text-blue-600">{chat.orderNumber}</p>
                      <p className="text-sm text-gray-500 truncate">{chat.lastMessage}</p>
                    </div>
                    {chat.unread > 0 && (
                      <Badge className="bg-green-500 text-white text-xs">{chat.unread}</Badge>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 flex flex-col bg-gray-50">
              {selectedChat ? (
                <div className="flex flex-col h-full">
                  {/* Chat Header */}
                  <div className="p-4 border-b bg-white flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-orange-100 text-orange-600">
                        {chatData.find(c => c.id === selectedChat)?.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{chatData.find(c => c.id === selectedChat)?.name}</p>
                      <p className="text-xs text-blue-600">{chatData.find(c => c.id === selectedChat)?.orderNumber}</p>
                    </div>
                  </div>
                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {selectedChat && chatMessages[selectedChat]?.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.sender === 'merchant' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`rounded-lg p-3 max-w-xs ${msg.sender === 'merchant' ? 'bg-green-500 text-white' : 'bg-white shadow-sm'}`}>
                          <p className="text-sm">{msg.text}</p>
                          <p className={`text-xs mt-1 ${msg.sender === 'merchant' ? 'text-green-100' : 'text-gray-400'}`}>{msg.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Chat Input */}
                  <div className="p-4 border-t bg-white">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Type a message..." 
                        className="flex-1" 
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      />
                      <Button className="bg-green-500 hover:bg-green-600" onClick={sendMessage}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No chats selected</p>
                    <p className="text-gray-400 text-sm">Select a conversation to start chatting</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AttributesSection({ type }: { type?: string }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState('10');
  const { toast } = useToast();

  const titles: Record<string, string> = {
    'attr-size': 'Size List',
    'attr-ingredients': 'Ingredients List',
    'attr-cooking-ref': 'Cooking Reference List',
    'size': 'Size List',
  };

  const sampleData: Record<string, { id: number; name: string; status: string }[]> = {
    'attr-size': [
      { id: 1, name: 'Small', status: 'publish' },
      { id: 2, name: 'Medium', status: 'publish' },
      { id: 3, name: 'Large', status: 'publish' },
      { id: 4, name: 'Extra Large', status: 'publish' },
    ],
    'attr-ingredients': [
      { id: 1, name: 'Cheese', status: 'publish' },
      { id: 2, name: 'Tomato', status: 'publish' },
      { id: 3, name: 'Onion', status: 'publish' },
      { id: 4, name: 'Mushroom', status: 'publish' },
      { id: 5, name: 'Pepperoni', status: 'publish' },
    ],
    'attr-cooking-ref': [
      { id: 1, name: 'Rare', status: 'publish' },
      { id: 2, name: 'Medium Rare', status: 'publish' },
      { id: 3, name: 'Medium', status: 'publish' },
      { id: 4, name: 'Well Done', status: 'publish' },
    ],
  };

  const data = sampleData[type || 'attr-size'] || sampleData['attr-size'];
  const filteredData = data.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (id: number) => {
    toast({ title: 'Deleted', description: `Item #${id} has been deleted` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{titles[type || 'size'] || 'Attributes'}</h2>
        <Button className="bg-green-500 hover:bg-green-600">
          <Plus className="h-4 w-4 mr-2" />
          Add new
        </Button>
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Show</span>
              <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-600">entries</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Badge className="bg-green-100 text-green-700">Publish</Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">Showing 1 to {filteredData.length} of {filteredData.length} entries</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>Previous</Button>
              <Button variant="outline" size="sm" className="bg-green-500 text-white hover:bg-green-600">1</Button>
              <Button variant="outline" size="sm" disabled>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OrderTypeSection({ type }: { type?: string }) {
  const [activeTab, setActiveTab] = useState('settings');
  const [deliveryChargeType, setDeliveryChargeType] = useState('fixed');
  const [contactlessDelivery, setContactlessDelivery] = useState(true);
  const [leaveAtDoor, setLeaveAtDoor] = useState(false);
  const { toast } = useToast();

  const titles: Record<string, string> = {
    'order-type-pickup': 'Pickup',
    'order-type-dinein': 'Dine-in',
    'order-type-delivery': 'Delivery',
    'pickup': 'Pickup',
  };

  const handleSave = () => {
    toast({ title: 'Saved', description: 'Settings have been saved successfully' });
  };

  if (type === 'order-type-pickup' || type === 'pickup') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Pickup Settings</h2>
        <Card>
          <CardContent className="p-0">
            <div className="flex">
              <div className="w-48 border-r bg-gray-50">
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors ${
                    activeTab === 'settings' ? 'bg-green-500 text-white' : 'hover:bg-gray-100'
                  }`}
                >
                  Settings
                </button>
                <button
                  onClick={() => setActiveTab('instructions')}
                  className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors ${
                    activeTab === 'instructions' ? 'bg-green-500 text-white' : 'hover:bg-gray-100'
                  }`}
                >
                  Instructions
                </button>
              </div>
              <div className="flex-1 p-6">
                {activeTab === 'settings' ? (
                  <div className="space-y-6">
                    <div>
                      <Label>Pickup estimation (minutes)</Label>
                      <Input type="number" defaultValue="30" className="mt-1" />
                    </div>
                    <div>
                      <Label>Minimum Order (₹)</Label>
                      <Input type="number" defaultValue="100" className="mt-1" />
                    </div>
                    <div>
                      <Label>Maximum Order (₹)</Label>
                      <Input type="number" defaultValue="10000" className="mt-1" />
                    </div>
                    <Button onClick={handleSave} className="bg-green-500 hover:bg-green-600">
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label>Pickup Instructions</Label>
                      <Textarea className="mt-1" placeholder="Enter pickup instructions for customers..." rows={6} />
                    </div>
                    <Button onClick={handleSave} className="bg-green-500 hover:bg-green-600">
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (type === 'order-type-dinein') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Dine-in Settings</h2>
        <Card>
          <CardContent className="p-0">
            <div className="flex">
              <div className="w-48 border-r bg-gray-50">
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors ${
                    activeTab === 'settings' ? 'bg-green-500 text-white' : 'hover:bg-gray-100'
                  }`}
                >
                  Settings
                </button>
                <button
                  onClick={() => setActiveTab('instructions')}
                  className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors ${
                    activeTab === 'instructions' ? 'bg-green-500 text-white' : 'hover:bg-gray-100'
                  }`}
                >
                  Instructions
                </button>
              </div>
              <div className="flex-1 p-6">
                {activeTab === 'settings' ? (
                  <div className="space-y-6">
                    <div>
                      <Label>Dine-in estimation (minutes)</Label>
                      <Input type="number" defaultValue="45" className="mt-1" />
                    </div>
                    <div>
                      <Label>Minimum Order (₹)</Label>
                      <Input type="number" defaultValue="200" className="mt-1" />
                    </div>
                    <div>
                      <Label>Maximum Order (₹)</Label>
                      <Input type="number" defaultValue="50000" className="mt-1" />
                    </div>
                    <Button onClick={handleSave} className="bg-green-500 hover:bg-green-600">
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label>Dine-in Instructions</Label>
                      <Textarea className="mt-1" placeholder="Enter dine-in instructions for customers..." rows={6} />
                    </div>
                    <Button onClick={handleSave} className="bg-green-500 hover:bg-green-600">
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (type === 'order-type-delivery') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Delivery Settings</h2>
        <Card>
          <CardContent className="p-0">
            <div className="flex">
              <div className="w-48 border-r bg-gray-50">
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors ${
                    activeTab === 'settings' ? 'bg-green-500 text-white' : 'hover:bg-gray-100'
                  }`}
                >
                  Settings
                </button>
                <button
                  onClick={() => setActiveTab('fixed')}
                  className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors ${
                    activeTab === 'fixed' ? 'bg-green-500 text-white' : 'hover:bg-gray-100'
                  }`}
                >
                  Fixed Charge
                </button>
                <button
                  onClick={() => setActiveTab('dynamic')}
                  className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors ${
                    activeTab === 'dynamic' ? 'bg-green-500 text-white' : 'hover:bg-gray-100'
                  }`}
                >
                  Dynamic Rates
                </button>
              </div>
              <div className="flex-1 p-6">
                {activeTab === 'settings' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">Contactless Delivery</p>
                        <p className="text-sm text-gray-500">Allow contactless delivery option</p>
                      </div>
                      <Switch checked={contactlessDelivery} onCheckedChange={setContactlessDelivery} />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">Leave at Door</p>
                        <p className="text-sm text-gray-500">Allow leave at door option</p>
                      </div>
                      <Switch checked={leaveAtDoor} onCheckedChange={setLeaveAtDoor} />
                    </div>
                    <div>
                      <Label>Delivery Charge Type</Label>
                      <Select value={deliveryChargeType} onValueChange={setDeliveryChargeType}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Fixed Charge</SelectItem>
                          <SelectItem value="dynamic">Dynamic (Distance-based)</SelectItem>
                          <SelectItem value="free">Free Delivery</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleSave} className="bg-green-500 hover:bg-green-600">
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                )}
                {activeTab === 'fixed' && (
                  <div className="space-y-6">
                    <div>
                      <Label>Fixed Delivery Charge (₹)</Label>
                      <Input type="number" defaultValue="50" className="mt-1" />
                    </div>
                    <div>
                      <Label>Free Delivery Above (₹)</Label>
                      <Input type="number" defaultValue="500" className="mt-1" />
                    </div>
                    <Button onClick={handleSave} className="bg-green-500 hover:bg-green-600">
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                )}
                {activeTab === 'dynamic' && (
                  <div className="space-y-6">
                    <div>
                      <Label>Base Charge (₹)</Label>
                      <Input type="number" defaultValue="30" className="mt-1" />
                    </div>
                    <div>
                      <Label>Per KM Charge (₹)</Label>
                      <Input type="number" defaultValue="10" className="mt-1" />
                    </div>
                    <div>
                      <Label>Maximum Delivery Distance (KM)</Label>
                      <Input type="number" defaultValue="15" className="mt-1" />
                    </div>
                    <Button onClick={handleSave} className="bg-green-500 hover:bg-green-600">
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Order Types</h2>
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-500">Select an order type from the sidebar to configure settings.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function ImagesSection({ type }: { type?: string }) {
  const isMediaLibrary = type === 'media-library';
  const [activeTab, setActiveTab] = useState('media-list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImages, setSelectedImages] = useState<number[]>([]);
  const [uploadedImages, setUploadedImages] = useState<{ id: number; url: string; name: string; size: string }[]>([
    { id: 1, url: '', name: 'food-1.jpg', size: '245 KB' },
    { id: 2, url: '', name: 'food-2.jpg', size: '312 KB' },
    { id: 3, url: '', name: 'restaurant-interior.jpg', size: '1.2 MB' },
    { id: 4, url: '', name: 'menu-banner.png', size: '856 KB' },
    { id: 5, url: '', name: 'logo.png', size: '124 KB' },
    { id: 6, url: '', name: 'promo-banner.jpg', size: '567 KB' },
  ]);
  const { toast } = useToast();

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newImages = Array.from(files).map((file, index) => ({
        id: Date.now() + index,
        url: URL.createObjectURL(file),
        name: file.name,
        size: `${(file.size / 1024).toFixed(0)} KB`,
      }));
      setUploadedImages(prev => [...prev, ...newImages]);
      toast({ 
        title: 'Upload Successful', 
        description: `${files.length} image(s) uploaded successfully` 
      });
    }
    e.target.value = '';
  };

  const handleDelete = (id: number) => {
    setUploadedImages(prev => prev.filter(img => img.id !== id));
    setSelectedImages(prev => prev.filter(imgId => imgId !== id));
    toast({ title: 'Deleted', description: 'Image has been deleted' });
  };

  const handleDeleteSelected = () => {
    setUploadedImages(prev => prev.filter(img => !selectedImages.includes(img.id)));
    setSelectedImages([]);
    toast({ title: 'Deleted', description: `${selectedImages.length} image(s) deleted` });
  };

  const toggleImageSelection = (id: number) => {
    setSelectedImages(prev => 
      prev.includes(id) ? prev.filter(imgId => imgId !== id) : [...prev, id]
    );
  };

  const filteredImages = uploadedImages.filter(img => 
    img.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isMediaLibrary) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Media Library</h2>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-2">
                <Button 
                  onClick={() => setActiveTab('media-list')}
                  className={activeTab === 'media-list' ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
                >
                  Media List
                </Button>
                <Button 
                  onClick={() => setActiveTab('upload-new')}
                  variant={activeTab === 'upload-new' ? 'default' : 'outline'}
                >
                  Upload New
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>

            {activeTab === 'media-list' ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {filteredImages.map((img) => (
                    <div key={img.id} className="relative group">
                      <div className="absolute top-2 left-2 z-10">
                        <input
                          type="checkbox"
                          checked={selectedImages.includes(img.id)}
                          onChange={() => toggleImageSelection(img.id)}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                      </div>
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border">
                        {img.url ? (
                          <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="mt-2">
                        <p className="text-sm font-medium truncate">{img.name}</p>
                        <p className="text-xs text-gray-500">{img.size}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-6">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled>Previous</Button>
                    <Button variant="outline" size="sm" className="bg-green-500 text-white hover:bg-green-600">1</Button>
                    <Button variant="outline" size="sm" disabled>Next</Button>
                  </div>
                  {selectedImages.length > 0 && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={handleDeleteSelected}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete File ({selectedImages.length})
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <input
                  type="file"
                  id="media-upload"
                  multiple
                  accept="image/*"
                  onChange={handleUpload}
                  className="hidden"
                />
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Drag and drop files here</p>
                <p className="text-gray-400 text-sm mb-4">or</p>
                <Button 
                  className="bg-green-500 hover:bg-green-600"
                  onClick={() => document.getElementById('media-upload')?.click()}
                >
                  Browse Files
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Image Gallery</h2>
        <div>
          <input type="file" id="image-upload" multiple accept="image/*" onChange={handleUpload} className="hidden" />
          <Button className="bg-green-500 hover:bg-green-600" onClick={() => document.getElementById('image-upload')?.click()}>
            <Upload className="h-4 w-4 mr-2" />Upload Image
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {uploadedImages.map((img) => (
              <div key={img.id} className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden">
                {img.url ? (
                  <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Image className="h-8 w-8 text-gray-400" /></div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/20 hover:bg-white/30 text-white" onClick={() => handleDelete(img.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">{img.name}</div>
              </div>
            ))}
            <button onClick={() => document.getElementById('image-upload')?.click()} className="aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-green-500 hover:bg-green-50 transition-colors">
              <Plus className="h-8 w-8 text-gray-400 mb-2" /><span className="text-sm text-gray-500">Add Image</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SitePagesSection() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Site Pages</h2>
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-500">Manage your website pages here.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function PromoSection({ type }: { type?: string }) {
  const isCoupon = type === 'promo-coupon' || type === 'coupon';
  const [searchQuery, setSearchQuery] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState('10');
  const { toast } = useToast();

  const couponData = [
    { id: 1, name: 'SUMMER25', status: 'publish', voucherType: 'Percentage', discount: '25%', expiration: '2026-03-31', lastUpdate: 'Jan 15, 2026', used: 45 },
    { id: 2, name: 'WELCOME10', status: 'publish', voucherType: 'Fixed', discount: '₹100', expiration: '2026-12-31', lastUpdate: 'Jan 10, 2026', used: 128 },
    { id: 3, name: 'FREESHIP', status: 'publish', voucherType: 'Free Shipping', discount: '₹0', expiration: '2026-06-30', lastUpdate: 'Jan 20, 2026', used: 67 },
    { id: 4, name: 'VIP50', status: 'draft', voucherType: 'Percentage', discount: '50%', expiration: '2026-02-28', lastUpdate: 'Jan 22, 2026', used: 12 },
  ];

  const offersData = [
    { id: 1, name: 'Buy 1 Get 1 Free', status: 'active', overAmount: '₹500', lastUpdate: 'Jan 18, 2026', validFrom: '2026-01-01', validTo: '2026-03-31' },
    { id: 2, name: 'Free Dessert', status: 'active', overAmount: '₹1,000', lastUpdate: 'Jan 15, 2026', validFrom: '2026-01-15', validTo: '2026-02-28' },
    { id: 3, name: 'Happy Hour 20% Off', status: 'inactive', overAmount: '₹300', lastUpdate: 'Jan 10, 2026', validFrom: '2026-02-01', validTo: '2026-04-30' },
  ];

  const handleExport = (format: string) => {
    toast({ title: 'Export Complete', description: `Data exported as ${format}` });
  };

  if (isCoupon) {
    const filteredData = couponData.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Coupon list</h2>
          <Button className="bg-green-500 hover:bg-green-600"><Plus className="h-4 w-4 mr-2" />Add new</Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show</span>
                <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem></SelectContent>
                </Select>
                <span className="text-sm text-gray-600">entries</span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 w-64" />
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-center">#Used</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.id}</TableCell>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.name}</span>
                          <Badge className={item.status === 'publish' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>{item.status === 'publish' ? 'Publish' : 'Draft'}</Badge>
                        </div>
                        <p className="text-sm text-gray-500">Voucher Type: {item.voucherType}</p>
                        <p className="text-sm text-gray-500">Discount: {item.discount}</p>
                        <p className="text-sm text-gray-500">Expiration: {item.expiration}</p>
                        <p className="text-xs text-gray-400">Last Update: {item.lastUpdate}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center"><Badge variant="outline">{item.used}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4 text-blue-600" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4 text-red-600" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">Showing 1 to {filteredData.length} of {filteredData.length} entries</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>Previous</Button>
                <Button variant="outline" size="sm" className="bg-green-500 text-white hover:bg-green-600">1</Button>
                <Button variant="outline" size="sm" disabled>Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredOffers = offersData.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Offers list</h2>
        <Button className="bg-green-500 hover:bg-green-600"><Plus className="h-4 w-4 mr-2" />Add new</Button>
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Show</span>
              <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem></SelectContent>
              </Select>
              <span className="text-sm text-gray-600">entries</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 w-64" />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Offers</TableHead>
                <TableHead>Valid dates</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOffers.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.name}</span>
                        <Badge className={item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>{item.status}</Badge>
                      </div>
                      <p className="text-sm text-gray-500">Over amount: {item.overAmount}</p>
                      <p className="text-xs text-gray-400">Last Update: {item.lastUpdate}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{item.validFrom} - {item.validTo}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4 text-blue-600" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4 text-red-600" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">Showing 1 to {filteredOffers.length} of {filteredOffers.length} entries</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>Previous</Button>
              <Button variant="outline" size="sm" className="bg-green-500 text-white hover:bg-green-600">1</Button>
              <Button variant="outline" size="sm" disabled>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AccountSection({ merchant, type }: { merchant: Merchant; type?: string }) {
  const isWithdrawals = type === 'account-withdrawals';
  const [entriesPerPage, setEntriesPerPage] = useState('10');
  const [transactionType, setTransactionType] = useState('all');
  const { toast } = useToast();
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [accountDetails, setAccountDetails] = useState({
    bankName: 'HDFC Bank',
    accountNumber: '',
    ifscCode: '',
    accountHolder: merchant.contactName || '',
    upiId: ''
  });

  const transactionData = [
    { id: 1, date: 'Jan 25, 2026', transaction: 'Order #428356 - Commission', debit: '', credit: '\u20B9510.80', balance: '\u20B945,230.50' },
    { id: 2, date: 'Jan 24, 2026', transaction: 'Order #428125 - Commission', debit: '', credit: '\u20B9510.80', balance: '\u20B944,719.70' },
    { id: 3, date: 'Jan 23, 2026', transaction: 'Withdrawal Request', debit: '\u20B910,000.00', credit: '', balance: '\u20B944,208.90' },
    { id: 4, date: 'Jan 22, 2026', transaction: 'Order #426087 - Commission', debit: '', credit: '\u20B93,558.30', balance: '\u20B954,208.90' },
    { id: 5, date: 'Jan 21, 2026', transaction: 'Order #420635 - Commission', debit: '', credit: '\u20B9612.50', balance: '\u20B950,650.60' },
  ];

  const payoutData = [
    { id: 1, amount: '\u20B910,000.00', transaction: 'Bank Transfer - HDFC ****1234', dateProcessed: 'Jan 23, 2026' },
    { id: 2, amount: '\u20B915,000.00', transaction: 'Bank Transfer - HDFC ****1234', dateProcessed: 'Jan 15, 2026' },
    { id: 3, amount: '\u20B98,500.00', transaction: 'UPI - merchant@upi', dateProcessed: 'Jan 08, 2026' },
  ];

  const handleExportExcel = (data: any[], title: string) => {
    const headers = Object.keys(data[0] || {}).filter(k => k !== 'id');
    const rows = data.map(item => headers.map(h => item[h] || ''));
    const content = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    const blob = new Blob([content], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'Export Complete', description: 'Data exported as Excel' });
  };

  const handleExportCSV = (data: any[], title: string) => {
    const headers = Object.keys(data[0] || {}).filter(k => k !== 'id');
    const rows = data.map(item => headers.map(h => `"${item[h] || ''}"`));
    const content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'Export Complete', description: 'Data exported as CSV' });
  };

  const handleExportPDF = (data: any[], title: string) => {
    const headers = Object.keys(data[0] || {}).filter(k => k !== 'id');
    const printContent = `
      <html><head><title>${title}</title>
      <style>body{font-family:Arial,sans-serif;padding:20px}h1{color:#333}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:10px;text-align:left}th{background:#4CAF50;color:white}</style></head>
      <body><h1>${title}</h1><p>Generated: ${new Date().toLocaleString()}</p>
      <table><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
      ${data.map(item => `<tr>${headers.map(h => `<td>${item[h] || ''}</td>`).join('')}</tr>`).join('')}
      </table></body></html>`;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.document.close();
      win.print();
    }
    toast({ title: 'Export Complete', description: 'PDF generated for printing' });
  };

  const handlePrint = (data: any[], title: string) => {
    handleExportPDF(data, title);
  };

  const handleRequestPayout = () => {
    if (!payoutAmount || parseFloat(payoutAmount) <= 0) {
      toast({ title: 'Error', description: 'Please enter a valid amount', variant: 'destructive' });
      return;
    }
    if (parseFloat(payoutAmount) > 45230.50) {
      toast({ title: 'Error', description: 'Amount exceeds available balance', variant: 'destructive' });
      return;
    }
    toast({ title: 'Payout Requested', description: `Payout of \u20B9${payoutAmount} has been requested. Processing within 2-3 business days.` });
    setShowPayoutDialog(false);
    setPayoutAmount('');
  };

  const handleSaveAccount = () => {
    if (!accountDetails.accountNumber && !accountDetails.upiId) {
      toast({ title: 'Error', description: 'Please enter account number or UPI ID', variant: 'destructive' });
      return;
    }
    toast({ title: 'Account Updated', description: 'Your payout account details have been saved successfully.' });
    setShowAccountDialog(false);
  };

  const ExportButtons = ({ data, title }: { data: any[], title: string }) => (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => handleExportExcel(data, title)}>Excel</Button>
      <Button variant="outline" size="sm" className="text-blue-600 border-blue-600 hover:bg-blue-50" onClick={() => handleExportCSV(data, title)}>CSV</Button>
      <Button variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-50" onClick={() => handleExportPDF(data, title)}>PDF</Button>
      <Button variant="outline" size="sm" className="text-purple-600 border-purple-600 hover:bg-purple-50" onClick={() => handlePrint(data, title)}>Print</Button>
    </div>
  );

  if (isWithdrawals) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Payout History</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Available Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{'\u20B9'}45,230.50</p>
              <Button className="mt-4 bg-green-500 hover:bg-green-600 w-full" onClick={() => setShowPayoutDialog(true)}>Request Payout</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Payout Account</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-2">HDFC Bank - ****1234</p>
              <p className="text-sm text-gray-500">Account Holder: {merchant.contactName}</p>
              <Button variant="outline" className="mt-4 w-full" onClick={() => setShowAccountDialog(true)}>Set Account</Button>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Input type="date" className="w-40" defaultValue="2026-01-01" />
                  <span className="text-gray-500">to</span>
                  <Input type="date" className="w-40" defaultValue="2026-01-28" />
                </div>
              </div>
              <ExportButtons data={payoutData} title="Payout_History" />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Date Processed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payoutData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-green-600">{item.amount}</TableCell>
                    <TableCell>{item.transaction}</TableCell>
                    <TableCell>{item.dateProcessed}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Payout</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-2">Available Balance: <span className="font-bold text-green-600">{'\u20B9'}45,230.50</span></p>
              </div>
              <div>
                <label className="text-sm font-medium">Amount ({'\u20B9'})</label>
                <Input 
                  type="number" 
                  placeholder="Enter amount" 
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <p className="text-sm text-gray-500">Payout will be processed to: HDFC Bank - ****1234</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPayoutDialog(false)}>Cancel</Button>
              <Button className="bg-green-500 hover:bg-green-600" onClick={handleRequestPayout}>Request Payout</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Payout Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Bank Name</label>
                <Input 
                  placeholder="e.g., HDFC Bank" 
                  value={accountDetails.bankName}
                  onChange={(e) => setAccountDetails({...accountDetails, bankName: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Account Number</label>
                <Input 
                  placeholder="Enter account number" 
                  value={accountDetails.accountNumber}
                  onChange={(e) => setAccountDetails({...accountDetails, accountNumber: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">IFSC Code</label>
                <Input 
                  placeholder="e.g., HDFC0001234" 
                  value={accountDetails.ifscCode}
                  onChange={(e) => setAccountDetails({...accountDetails, ifscCode: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Account Holder Name</label>
                <Input 
                  placeholder="Enter name as per bank records" 
                  value={accountDetails.accountHolder}
                  onChange={(e) => setAccountDetails({...accountDetails, accountHolder: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-2">Or use UPI for faster payouts</p>
                <label className="text-sm font-medium">UPI ID</label>
                <Input 
                  placeholder="e.g., merchant@upi" 
                  value={accountDetails.upiId}
                  onChange={(e) => setAccountDetails({...accountDetails, upiId: e.target.value})}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAccountDialog(false)}>Cancel</Button>
              <Button className="bg-green-500 hover:bg-green-600" onClick={handleSaveAccount}>Save Account</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Transaction History</h2>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Earnings</CardTitle>
              <p className="text-sm text-gray-500">Available Balance</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-green-600">₹45,230.50</p>
              <Button size="sm" className="mt-2 bg-green-500 hover:bg-green-600">Create a Transaction</Button>
            </div>
          </div>
        </CardHeader>
      </Card>
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Input type="date" className="w-40" defaultValue="2026-01-01" />
                <span className="text-gray-500">to</span>
                <Input type="date" className="w-40" defaultValue="2026-01-28" />
              </div>
              <Select value={transactionType} onValueChange={setTransactionType}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Transaction Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="debit">Debit</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show</span>
                <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem></SelectContent>
                </Select>
                <span className="text-sm text-gray-600">entries</span>
              </div>
            </div>
            <ExportButtons data={transactionData} title="Transaction_History" />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Transaction</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Running Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactionData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.date}</TableCell>
                  <TableCell>{item.transaction}</TableCell>
                  <TableCell className="text-right text-red-600">{item.debit}</TableCell>
                  <TableCell className="text-right text-green-600">{item.credit}</TableCell>
                  <TableCell className="text-right font-medium">{item.balance}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">Showing 1 to {transactionData.length} of {transactionData.length} entries</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>Previous</Button>
              <Button variant="outline" size="sm" className="bg-green-500 text-white hover:bg-green-600">1</Button>
              <Button variant="outline" size="sm" disabled>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Convert number to words for Indian currency
function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  if (num === 0) return 'Zero';
  
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const hundred = Math.floor((num % 1000) / 100);
  const remainder = num % 100;
  
  let words = '';
  
  const twoDigit = (n: number) => {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  };
  
  if (crore > 0) words += twoDigit(crore) + ' Crore ';
  if (lakh > 0) words += twoDigit(lakh) + ' Lakh ';
  if (thousand > 0) words += twoDigit(thousand) + ' Thousand ';
  if (hundred > 0) words += ones[hundred] + ' Hundred ';
  if (remainder > 0) words += twoDigit(remainder);
  
  return words.trim();
}

function amountInWords(amount: number): string {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  
  let result = 'INR ' + numberToWords(rupees);
  if (paise > 0) {
    result += ' and ' + numberToWords(paise) + ' Paise';
  }
  result += ' Only';
  return result;
}

// B2B Tax Invoice Component
function B2BTaxInvoice({ invoice, onClose }: { invoice: any; onClose: () => void }) {
  const printInvoice = () => {
    window.print();
  };

  const generateIRN = () => {
    return Array.from({ length: 64 }, () => Math.random().toString(36).charAt(2)).join('').toUpperCase().slice(0, 64);
  };

  const irn = invoice.irn || generateIRN();
  const ackNo = invoice.ackNo || Math.floor(Math.random() * 9999999999999999).toString().padStart(16, '0');
  const ackDate = invoice.ackDate || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-auto">
      <div className="bg-white max-w-4xl w-full max-h-[95vh] overflow-auto rounded-lg shadow-xl print:shadow-none print:max-h-none">
        <div className="p-4 border-b flex items-center justify-between print:hidden">
          <h2 className="text-lg font-bold">B2B Tax Invoice</h2>
          <div className="flex gap-2">
            <Button onClick={printInvoice} className="bg-blue-600 hover:bg-blue-700">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
        
        <div className="p-6 text-sm" id="invoice-content">
          {/* Header */}
          <div className="flex justify-between items-start border-b pb-4 mb-4">
            <h1 className="text-2xl font-bold">Tax Invoice</h1>
            <div className="text-right">
              <p className="text-lg font-semibold text-blue-600">e-Invoice</p>
            </div>
          </div>

          {/* IRN and QR Code */}
          <div className="flex justify-between items-start border border-gray-300 p-3 mb-4">
            <div className="flex-1">
              <p className="text-xs text-gray-600">IRN</p>
              <p className="text-xs font-mono break-all">{irn}</p>
              <div className="mt-2">
                <p className="text-xs"><span className="text-gray-600">Ack No:</span> {ackNo}</p>
                <p className="text-xs"><span className="text-gray-600">Ack Date:</span> {ackDate}</p>
              </div>
            </div>
            <div className="w-24 h-24 border border-gray-400 flex items-center justify-center bg-gray-100">
              <div className="text-center text-xs text-gray-500">
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-0.5 p-1">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div key={i} className={`w-2 h-2 ${Math.random() > 0.5 ? 'bg-black' : 'bg-white'}`}></div>
                  ))}
                </div>
                <p className="mt-1">QR Code</p>
              </div>
            </div>
          </div>

          {/* Seller & Buyer Details */}
          <div className="grid grid-cols-2 gap-0 border border-gray-300 mb-4">
            {/* Seller Details */}
            <div className="border-r border-gray-300 p-3">
              <p className="font-bold text-blue-700">{invoice.seller?.name || 'The Salem Dt Co-Op Milk Producers Union Ltd'}</p>
              <p className="text-xs">{invoice.seller?.address || 'Sithanur, Dhalaivaipatty Post,'}</p>
              <p className="text-xs">{invoice.seller?.city || 'Salem'}</p>
              <p className="text-xs">FSSAI/Licence No: {invoice.seller?.fssai || '10012042000374'}</p>
              <p className="text-xs">GSTIN/UIN: {invoice.seller?.gstin || '33AAAAT3146P1ZA'}</p>
              <p className="text-xs">State Name: {invoice.seller?.state || 'Tamil Nadu'}, Code: {invoice.seller?.stateCode || '33'}</p>
              
              <div className="mt-3 pt-2 border-t">
                <p className="text-xs font-semibold">Consignee (Ship to)</p>
                <p className="font-bold text-xs">{invoice.shipTo?.name || 'M/s. Nagaras Retail Private Limited'}</p>
                <p className="text-xs">{invoice.shipTo?.address || '6/1, Chennakrishnapuram,'}</p>
                <p className="text-xs">{invoice.shipTo?.city || 'Salem - 636007'}</p>
                <p className="text-xs">GSTIN/UIN: {invoice.shipTo?.gstin || '33AAGCN5126M1ZC'}</p>
                <p className="text-xs">State Name: {invoice.shipTo?.state || 'Tamil Nadu'}, Code: {invoice.shipTo?.stateCode || '33'}</p>
              </div>

              <div className="mt-3 pt-2 border-t">
                <p className="text-xs font-semibold">Buyer (Bill to)</p>
                <p className="font-bold text-xs">{invoice.billTo?.name || 'M/s. Nagaras Retail Private Limited'}</p>
                <p className="text-xs">{invoice.billTo?.address || '6/1, Chennakrishnapuram,'}</p>
                <p className="text-xs">{invoice.billTo?.city || 'Salem - 636007'}</p>
                <p className="text-xs">GSTIN/UIN: {invoice.billTo?.gstin || '33AAGCN5126M1ZC'}</p>
                <p className="text-xs">State Name: {invoice.billTo?.state || 'Tamil Nadu'}, Code: {invoice.billTo?.stateCode || '33'}</p>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="p-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-gray-600">Invoice No.</p>
                  <p className="font-semibold">{invoice.invoiceNo || 'HO/WSD/569'}</p>
                </div>
                <div>
                  <p className="text-gray-600">e-Way Bill No.</p>
                  <p className="font-semibold">{invoice.ewayBillNo || '561687580024'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Dated</p>
                  <p className="font-semibold">{invoice.date || '30-Sep-25'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Mode/Terms of Payment</p>
                  <p className="font-semibold">{invoice.paymentTerms || 'Credit'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Delivery Note</p>
                  <p className="font-semibold">{invoice.deliveryNote || '024749'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Other References</p>
                  <p className="font-semibold">{invoice.otherRef || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Buyer's Order No.</p>
                  <p className="font-semibold">{invoice.buyerOrderNo || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Dated</p>
                  <p className="font-semibold">{invoice.buyerOrderDate || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Dispatch Doc No.</p>
                  <p className="font-semibold">{invoice.dispatchDocNo || '252414'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Delivery Note Date</p>
                  <p className="font-semibold">{invoice.deliveryNoteDate || '30-Sep-25'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Dispatched through</p>
                  <p className="font-semibold">{invoice.dispatchedThrough || 'Own Vehicle'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Destination</p>
                  <p className="font-semibold">{invoice.destination || 'Salem'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Vessel/Flight No.</p>
                  <p className="font-semibold">{invoice.vehicleNo || 'TN30BJ5323'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Place of receipt by shipper</p>
                  <p className="font-semibold">{invoice.receiptPlace || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-600">City/Port of Loading</p>
                  <p className="font-semibold">{invoice.portOfLoading || 'Salem'}</p>
                </div>
                <div>
                  <p className="text-gray-600">City/Port of Discharge</p>
                  <p className="font-semibold">{invoice.portOfDischarge || 'Salem'}</p>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-gray-600 text-xs">Terms of Delivery</p>
                <p className="font-semibold text-xs">{invoice.termsOfDelivery || 'Door Delivery'}</p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full border border-gray-300 mb-4 text-xs">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 p-2 text-left">Sl No.</th>
                <th className="border border-gray-300 p-2 text-left">Description of Goods</th>
                <th className="border border-gray-300 p-2 text-center">HSN/SAC</th>
                <th className="border border-gray-300 p-2 text-center">GST Rate</th>
                <th className="border border-gray-300 p-2 text-center">Quantity</th>
                <th className="border border-gray-300 p-2 text-right">Rate</th>
                <th className="border border-gray-300 p-2 text-center">per</th>
                <th className="border border-gray-300 p-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.items || [
                { sl: 1, description: 'Ghee - 5 LTR Jar', hsn: '040590', gstRate: 5, qty: 60, unit: 'Nos', rate: 2755.74, amount: 165344.40 }
              ]).map((item: any, index: number) => (
                <tr key={index}>
                  <td className="border border-gray-300 p-2">{item.sl || index + 1}</td>
                  <td className="border border-gray-300 p-2 font-medium">{item.description}</td>
                  <td className="border border-gray-300 p-2 text-center">{item.hsn}</td>
                  <td className="border border-gray-300 p-2 text-center">{item.gstRate}%</td>
                  <td className="border border-gray-300 p-2 text-center">{item.qty} {item.unit}</td>
                  <td className="border border-gray-300 p-2 text-right">₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="border border-gray-300 p-2 text-center">{item.unit}</td>
                  <td className="border border-gray-300 p-2 text-right">₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
              {/* GST Breakdown */}
              <tr>
                <td className="border border-gray-300 p-2" colSpan={7}>
                  <div className="text-right space-y-1">
                    <p className="text-green-700 italic">Output CGST</p>
                    <p className="text-green-700 italic">Output SGST</p>
                    <p className="text-green-700 italic">Rounding Off</p>
                  </div>
                </td>
                <td className="border border-gray-300 p-2 text-right">
                  <div className="space-y-1">
                    <p>₹{((invoice.taxableValue || 165344.40) * 0.025).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    <p>₹{((invoice.taxableValue || 165344.40) * 0.025).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    <p>₹{(invoice.roundingOff || 0.38).toFixed(2)}</p>
                  </div>
                </td>
              </tr>
              {/* Total */}
              <tr className="bg-gray-100 font-bold">
                <td className="border border-gray-300 p-2" colSpan={4}>Total</td>
                <td className="border border-gray-300 p-2 text-center">{invoice.totalQty || 60} {invoice.unit || 'Nos'}</td>
                <td className="border border-gray-300 p-2" colSpan={2}></td>
                <td className="border border-gray-300 p-2 text-right text-lg">₹{(invoice.grandTotal || 173612.00).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>

          {/* Amount in Words */}
          <div className="border border-gray-300 p-3 mb-4">
            <p className="text-xs text-gray-600">Amount Chargeable (in words)</p>
            <p className="font-bold text-sm">{amountInWords(invoice.grandTotal || 173612)}</p>
          </div>

          {/* Tax Breakdown Table */}
          <div className="border border-gray-300 mb-4">
            <table className="w-full text-xs">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border-r border-gray-300 p-2 text-left" rowSpan={2}>Taxable Value</th>
                  <th className="border-r border-gray-300 p-2 text-center" colSpan={2}>CGST</th>
                  <th className="border-r border-gray-300 p-2 text-center" colSpan={2}>SGST/UTGST</th>
                  <th className="p-2 text-center" rowSpan={2}>Total Tax Amount</th>
                </tr>
                <tr>
                  <th className="border-r border-t border-gray-300 p-1 text-center">Rate</th>
                  <th className="border-r border-t border-gray-300 p-1 text-center">Amount</th>
                  <th className="border-r border-t border-gray-300 p-1 text-center">Rate</th>
                  <th className="border-t border-gray-300 p-1 text-center">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-r border-t border-gray-300 p-2 text-right">₹{(invoice.taxableValue || 165344.40).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="border-r border-t border-gray-300 p-2 text-center">2.5%</td>
                  <td className="border-r border-t border-gray-300 p-2 text-right">₹{((invoice.taxableValue || 165344.40) * 0.025).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="border-r border-t border-gray-300 p-2 text-center">2.5%</td>
                  <td className="border-r border-t border-gray-300 p-2 text-right">₹{((invoice.taxableValue || 165344.40) * 0.025).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="border-t border-gray-300 p-2 text-right">₹{((invoice.taxableValue || 165344.40) * 0.05).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr className="font-bold bg-gray-50">
                  <td className="border-r border-t border-gray-300 p-2 text-right">Total: ₹{(invoice.taxableValue || 165344.40).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="border-r border-t border-gray-300 p-2"></td>
                  <td className="border-r border-t border-gray-300 p-2 text-right">₹{((invoice.taxableValue || 165344.40) * 0.025).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="border-r border-t border-gray-300 p-2"></td>
                  <td className="border-r border-t border-gray-300 p-2 text-right">₹{((invoice.taxableValue || 165344.40) * 0.025).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="border-t border-gray-300 p-2 text-right">₹{((invoice.taxableValue || 165344.40) * 0.05).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tax Amount in Words */}
          <div className="border border-gray-300 p-3 mb-4">
            <p className="text-xs text-gray-600">Tax Amount (in words):</p>
            <p className="font-bold text-sm">{amountInWords((invoice.taxableValue || 165344.40) * 0.05)}</p>
          </div>

          {/* Footer */}
          <div className="grid grid-cols-2 gap-4 border border-gray-300 p-3">
            <div>
              <p className="text-xs font-semibold">Declaration</p>
              <p className="text-xs text-gray-600 mt-1">We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold">for {invoice.seller?.name || 'The Salem Dt Co-Op Milk Producers Union Ltd'}</p>
              <div className="h-12 mt-2 border-b border-dashed border-gray-400"></div>
              <p className="text-xs mt-1">Authorised Signatory</p>
            </div>
          </div>

          <p className="text-center text-xs text-gray-500 mt-4">This is a Computer Generated Invoice</p>
        </div>
      </div>
    </div>
  );
}

function InvoiceSection({ type }: { type?: string }) {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState('10');
  const [showB2BInvoice, setShowB2BInvoice] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);

  const invoices = [
    { id: 'INV-001', invoiceNo: 'HO/WSD/569', date: '2026-01-25', description: 'B2B Invoice - Ghee 5 LTR Jar x 60', status: 'paid', dueDate: '2026-01-31', amount: 173612.00, type: 'b2b' },
    { id: 'INV-002', invoiceNo: 'HO/WSD/568', date: '2026-01-24', description: 'B2B Invoice - Fresh Milk x 500L', status: 'paid', dueDate: '2026-01-24', amount: 25000.00, type: 'b2b' },
    { id: 'INV-003', invoiceNo: 'HO/WSD/567', date: '2025-12-13', description: 'B2B Invoice - Butter 500g x 100', status: 'pending', dueDate: '2025-12-15', amount: 45000.00, type: 'b2b' },
  ];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleExportExcel = () => {
    const headers = ['Date', 'Description', 'Status', 'Due Date', 'Amount'];
    const rows = invoices.map(inv => [formatDate(inv.date), inv.description, inv.status, formatDate(inv.dueDate), `₹${inv.amount.toFixed(2)}`]);
    const csv = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    const blob = new Blob([csv], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'invoices.xls';
    a.click();
    toast({ title: 'Export Complete', description: 'Invoices exported to Excel' });
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Description', 'Status', 'Due Date', 'Amount'];
    const rows = invoices.map(inv => [formatDate(inv.date), inv.description, inv.status, formatDate(inv.dueDate), `₹${inv.amount.toFixed(2)}`]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'invoices.csv';
    a.click();
    toast({ title: 'Export Complete', description: 'Invoices exported to CSV' });
  };

  const handleExportPDF = () => {
    const printContent = `
      <html><head><title>Invoice Report</title>
      <style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}</style></head>
      <body><h1>Invoice Report</h1><table><tr><th>Date</th><th>Description</th><th>Status</th><th>Due Date</th><th>Amount</th></tr>
      ${invoices.map(inv => `<tr><td>${formatDate(inv.date)}</td><td>${inv.description}</td><td>${inv.status}</td><td>${formatDate(inv.dueDate)}</td><td>₹${inv.amount.toFixed(2)}</td></tr>`).join('')}
      </table></body></html>`;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.document.close();
      win.print();
    }
    toast({ title: 'Print', description: 'Invoice report sent to printer' });
  };

  const openB2BInvoice = (invoice: any) => {
    setSelectedInvoice(invoice);
    setShowB2BInvoice(true);
  };

  return (
    <div className="space-y-6">
      {showB2BInvoice && selectedInvoice && (
        <B2BTaxInvoice invoice={selectedInvoice} onClose={() => setShowB2BInvoice(false)} />
      )}
      
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">B2B Tax Invoices</h2>
        <Button className="bg-green-600 hover:bg-green-700" onClick={() => openB2BInvoice({})}>
          <Plus className="h-4 w-4 mr-2" />
          Create B2B Invoice
        </Button>
      </div>
      
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                className="w-40"
                placeholder="Start date"
              />
              <span className="text-gray-500">-</span>
              <Input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                className="w-40"
                placeholder="End date"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Show</span>
              <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-600">entries</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportExcel}>Excel</Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>CSV</Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>PDF</Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>Print</Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>{formatDate(invoice.date)}</TableCell>
                  <TableCell>
                    <div>
                      <p>{invoice.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <Badge className={invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {invoice.status}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">Due {formatDate(invoice.dueDate)}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">{'\u20B9'}{invoice.amount.toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-blue-600 hover:bg-blue-100" 
                        onClick={() => openB2BInvoice(invoice)}
                        title="View B2B Invoice"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-green-600 hover:bg-green-100" 
                        onClick={() => openB2BInvoice(invoice)}
                        title="Download Invoice"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-purple-600 hover:bg-purple-100" 
                        onClick={() => openB2BInvoice(invoice)}
                        title="Print Invoice"
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Showing 1 to {invoices.length} of {invoices.length} entries</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>Previous</Button>
              <Button variant="outline" size="sm" className="bg-green-500 text-white">1</Button>
              <Button variant="outline" size="sm" disabled>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SubUsersSection({ merchantId, type }: { merchantId: string; type?: string }) {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    username: "",
    password: "",
    permissions: [] as string[],
  });

  const { data: subUsers = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['/api/merchant', merchantId, 'sub-users'],
    queryFn: async () => {
      const response = await fetch(`/api/merchant/${merchantId}/sub-users`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!merchantId,
  });

  const resetForm = () => {
    setFormData({ name: "", email: "", phone: "", username: "", password: "", permissions: [] });
    setShowPassword(false);
  };

  const handlePermissionToggle = (permKey: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permKey)
        ? prev.permissions.filter(p => p !== permKey)
        : [...prev.permissions, permKey],
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.username) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    if (!editingUser && !formData.password) {
      toast({ title: "Error", description: "Password is required for new users", variant: "destructive" });
      return;
    }

    try {
      const url = editingUser 
        ? `/api/merchant/${merchantId}/sub-users/${editingUser.id}`
        : `/api/merchant/${merchantId}/sub-users`;
      const method = editingUser ? 'PUT' : 'POST';
      
      const body: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        permissions: formData.permissions,
      };
      if (!editingUser) {
        body.username = formData.username;
        body.password = formData.password;
      }
      if (formData.password && editingUser) {
        body.password = formData.password;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast({ title: "Success", description: editingUser ? "Sub-user updated" : "Sub-user created" });
        setIsCreateOpen(false);
        setEditingUser(null);
        resetForm();
        refetch();
      } else {
        const error = await response.json();
        toast({ title: "Error", description: error.error || "Failed to save", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save sub-user", variant: "destructive" });
    }
  };

  const handleToggleActive = async (user: any) => {
    try {
      const response = await fetch(`/api/merchant/${merchantId}/sub-users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (response.ok) {
        toast({ title: "Updated", description: `Sub-user ${!user.isActive ? 'enabled' : 'disabled'}` });
        refetch();
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this sub-user?")) return;
    try {
      const response = await fetch(`/api/merchant/${merchantId}/sub-users/${userId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        toast({ title: "Deleted", description: "Sub-user removed" });
        refetch();
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      username: user.username,
      password: "",
      permissions: user.permissions || [],
    });
  };

  if (type === 'sub-users-permissions') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Permission Settings</h2>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Available Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {MERCHANT_PERMISSIONS.map((perm) => (
                <div key={perm.key} className="p-4 border rounded-lg">
                  <h3 className="font-medium">{perm.label}</h3>
                  <p className="text-sm text-gray-500">{perm.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sub-Users Management</h2>
          <p className="text-gray-500 mt-1">Create and manage delegated accounts with customizable permissions</p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700" onClick={() => { resetForm(); setIsCreateOpen(true); }}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Sub-User
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading sub-users...</p>
            </div>
          ) : subUsers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No sub-users yet. Create your first delegated account!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subUsers.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(user.permissions || []).slice(0, 3).map((p: string) => (
                          <Badge key={p} variant="secondary" className="text-xs">
                            {MERCHANT_PERMISSIONS.find(mp => mp.key === p)?.label || p}
                          </Badge>
                        ))}
                        {(user.permissions || []).length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{user.permissions.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={user.isActive}
                        onCheckedChange={() => handleToggleActive(user)}
                        className="data-[state=checked]:bg-green-500"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen || !!editingUser} onOpenChange={(open) => { if (!open) { setIsCreateOpen(false); setEditingUser(null); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? `Edit Sub-User: ${editingUser.name}` : 'Create New Sub-User'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter full name"
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="9843777277"
                />
              </div>
              {!editingUser && (
                <div className="space-y-2">
                  <Label>Username *</Label>
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Enter username"
                  />
                </div>
              )}
              <div className="space-y-2 col-span-2">
                <Label>{editingUser ? 'New Password (leave blank to keep current)' : 'Password *'}</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder={editingUser ? "Enter new password" : "Enter password"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <XCircle className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Permissions
              </Label>
              <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg">
                {MERCHANT_PERMISSIONS.map((perm) => (
                  <div key={perm.key} className="flex items-start space-x-3">
                    <Checkbox
                      id={`perm-${perm.key}`}
                      checked={formData.permissions.includes(perm.key)}
                      onCheckedChange={() => handlePermissionToggle(perm.key)}
                    />
                    <div className="grid gap-0.5 leading-none">
                      <label htmlFor={`perm-${perm.key}`} className="text-sm font-medium cursor-pointer">
                        {perm.label}
                      </label>
                      <p className="text-xs text-gray-500">{perm.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => { setIsCreateOpen(false); setEditingUser(null); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {editingUser ? "Save Changes" : "Create Sub-User"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BuyersSection({ type }: { type?: string }) {
  const [entriesPerPage, setEntriesPerPage] = useState('10');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const customerData = [
    { id: 1, name: 'David Smith', email: 'david@example.com', phone: '+91 9843777277', memberSince: 'Jan 2024', avatar: 'DS' },
    { id: 2, name: 'John Doe', email: 'john@example.com', phone: '+91 87654 32109', memberSince: 'Mar 2024', avatar: 'JD' },
    { id: 3, name: 'Monica R.', email: 'monica@example.com', phone: '+91 76543 21098', memberSince: 'Jun 2024', avatar: 'MR' },
    { id: 4, name: 'David Hall', email: 'dhall@example.com', phone: '+91 65432 10987', memberSince: 'Aug 2024', avatar: 'DH' },
    { id: 5, name: 'Chris Jones', email: 'chris@example.com', phone: '+91 54321 09876', memberSince: 'Oct 2024', avatar: 'CJ' },
  ];

  const reviewData = [
    { id: 1, name: 'David Smith', status: 'publish', dateCreated: 'Jan 20, 2026', comments: 2, rating: 5, review: 'Excellent food and fast delivery!' },
    { id: 2, name: 'John Doe', status: 'publish', dateCreated: 'Jan 18, 2026', comments: 1, rating: 4, review: 'Good taste, slightly delayed delivery.' },
    { id: 3, name: 'Monica R.', status: 'pending', dateCreated: 'Jan 15, 2026', comments: 0, rating: 5, review: 'Best union in town!' },
    { id: 4, name: 'Sarah Wilson', status: 'publish', dateCreated: 'Jan 12, 2026', comments: 3, rating: 3, review: 'Average experience, food was cold.' },
  ];

  const subscriberData = [
    { id: 1, email: 'subscriber1@example.com' },
    { id: 2, email: 'subscriber2@example.com' },
    { id: 3, email: 'john.doe@gmail.com' },
    { id: 4, email: 'sarah.wilson@yahoo.com' },
    { id: 5, email: 'newsletter@company.com' },
  ];

  const handleExport = (format: string) => {
    toast({ title: 'Export Complete', description: `Data exported as ${format}` });
  };

  const ExportButtons = () => (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => handleExport('Excel')}>Excel</Button>
      <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => handleExport('CSV')}>CSV</Button>
      <Button variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-50" onClick={() => handleExport('PDF')}>PDF</Button>
      <Button variant="outline" size="sm" className="text-blue-600 border-blue-600 hover:bg-blue-50" onClick={() => handleExport('Print')}>Print</Button>
    </div>
  );

  if (type === 'customer-list') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Customer list</h2>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show</span>
                <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem></SelectContent>
                </Select>
                <span className="text-sm text-gray-600">entries</span>
              </div>
              <ExportButtons />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerData.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <Avatar><AvatarFallback className="bg-orange-100 text-orange-600">{customer.avatar}</AvatarFallback></Avatar>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-gray-500">{customer.email}</p>
                        <p className="text-sm text-gray-500">{customer.phone}</p>
                        <p className="text-xs text-gray-400">Member since: {customer.memberSince}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4 text-blue-600" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4 text-green-600" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">Showing 1 to {customerData.length} of {customerData.length} entries</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>Previous</Button>
                <Button variant="outline" size="sm" className="bg-green-500 text-white hover:bg-green-600">1</Button>
                <Button variant="outline" size="sm" disabled>Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (type === 'review-list') {
    const filteredReviews = reviewData.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Customer reviews</h2>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-end mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 w-64" />
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Reviews</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell>{review.id}</TableCell>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{review.name}</span>
                          <Badge className={review.status === 'publish' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>{review.status === 'publish' ? 'Publish' : 'Pending'}</Badge>
                        </div>
                        <p className="text-sm text-gray-500">Date Created: {review.dateCreated}</p>
                        <p className="text-sm text-blue-600 cursor-pointer hover:underline">{review.comments} Comments</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 mb-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                        ))}
                      </div>
                      <p className="text-sm text-gray-600">{review.review}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4 text-blue-600" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4 text-red-600" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (type === 'email-subscribers') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Email Subscribers</h2>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show</span>
                <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem></SelectContent>
                </Select>
                <span className="text-sm text-gray-600">entries</span>
              </div>
              <ExportButtons />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Email address</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriberData.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>{sub.id}</TableCell>
                    <TableCell><Mail className="inline h-4 w-4 mr-2 text-gray-400" />{sub.email}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4 text-red-600" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">Showing 1 to {subscriberData.length} of {subscriberData.length} entries</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>Previous</Button>
                <Button variant="outline" size="sm" className="bg-green-500 text-white hover:bg-green-600">1</Button>
                <Button variant="outline" size="sm" disabled>Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Buyers</h2>
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-500">Select a submenu to view buyer information.</p>
        </CardContent>
      </Card>
    </div>
  );
}

const PEOPLE_ROLE_LABELS: Record<string, string> = {
  dealer: 'Dealer', wholesale_dealer: 'WSD', wsd: 'WSD',
  retailer: 'Retailer', inter_union: 'Inter Union', federation: 'Federation',
  agent: 'Agent', fmd: 'Fresh Milk Dealer',
};

const PEOPLE_TIER_LABELS: Record<string, string> = {
  DEALER: 'DLR', WHOLESALE_DEALER: 'WSD', RETAILER: 'RTL',
  FEDERATION: 'FED', INTER_UNION: 'INT', MRP: 'MRP',
};

const UNION_ROLE_LABELS: Record<string, string> = {
  dealer: 'Dealer', wholesale_dealer: 'Wholesale Dealer (WSD)', wsd: 'Wholesale Dealer (WSD)',
  retailer: 'Retailer', inter_union: 'Inter Union', federation: 'Federation',
  agent: 'Agent', fmd: 'Fresh Milk Dealer', customer: 'Consumer', consumer: 'Consumer',
};

const UNION_TIER_LABELS: Record<string, string> = {
  DLR: 'Dealer', WSD: 'Wholesale Dealer', RTL: 'Retailer', FED: 'Federation', INT: 'Inter-Union', MRP: 'MRP', X: 'No Access',
  DEALER: 'Dealer', WHOLESALE_DEALER: 'Wholesale Dealer', RETAILER: 'Retailer', FEDERATION: 'Federation', INTER_UNION: 'Inter-Union',
};

function UnionUsersSection({ type, merchantId }: { type?: string; merchantId?: string | null }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [approvalAction, setApprovalAction] = useState<{ userId: string; action: string } | null>(null);
  const { toast } = useToast();

  const queryType = type === 'users-b2c' ? 'b2c' : type === 'users-b2b' ? 'b2b' : undefined;
  const isRegistrations = type === 'users-b2b-registrations';

  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/merchant', merchantId, 'users', queryType || 'all'],
    queryFn: async () => {
      if (!merchantId) return [];
      const url = queryType
        ? `/api/merchant/${merchantId}/users?type=${queryType}`
        : `/api/merchant/${merchantId}/users`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    enabled: !!merchantId,
  });

  const invalidateUsers = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/merchant', merchantId, 'users'] });
  };

  const displayUsers = isRegistrations
    ? users.filter(u => u.status === 'pending')
    : users;

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; label: string }> = {
      active: { className: 'bg-green-100 text-green-800', label: 'Active' },
      inactive: { className: 'bg-gray-100 text-gray-800', label: 'Inactive' },
      pending: { className: 'bg-yellow-100 text-yellow-800', label: 'Pending Approval' },
      rejected: { className: 'bg-red-100 text-red-800', label: 'Rejected' },
    };
    const c = config[status] || { className: 'bg-gray-100 text-gray-800', label: status };
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      federation: 'bg-purple-100 text-purple-800', inter_union: 'bg-blue-100 text-blue-800',
      wholesale_dealer: 'bg-indigo-100 text-indigo-800', wsd: 'bg-indigo-100 text-indigo-800',
      dealer: 'bg-orange-100 text-orange-800', retailer: 'bg-teal-100 text-teal-800',
      agent: 'bg-amber-100 text-amber-800', fmd: 'bg-cyan-100 text-cyan-800',
      customer: 'bg-green-100 text-green-800', consumer: 'bg-green-100 text-green-800',
    };
    return <Badge className={colors[role] || 'bg-gray-100 text-gray-800'}>{UNION_ROLE_LABELS[role] || role}</Badge>;
  };

  const getTierBadge = (tier: string) => {
    if (!tier || tier === 'X' || tier === '') return <span className="text-gray-400 text-xs">—</span>;
    const colors: Record<string, string> = {
      DLR: 'bg-orange-50 text-orange-700 border-orange-200', WSD: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      RTL: 'bg-teal-50 text-teal-700 border-teal-200', FED: 'bg-purple-50 text-purple-700 border-purple-200',
      INT: 'bg-blue-50 text-blue-700 border-blue-200', MRP: 'bg-gray-50 text-gray-700 border-gray-200',
      DEALER: 'bg-orange-50 text-orange-700 border-orange-200', WHOLESALE_DEALER: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      RETAILER: 'bg-teal-50 text-teal-700 border-teal-200', FEDERATION: 'bg-purple-50 text-purple-700 border-purple-200',
      INTER_UNION: 'bg-blue-50 text-blue-700 border-blue-200',
    };
    return <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${colors[tier] || ''}`}>{UNION_TIER_LABELS[tier] || tier}</Badge>;
  };

  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const b2bRoles = ['dealer', 'wholesale_dealer', 'wsd', 'retailer', 'inter_union', 'federation', 'agent', 'fmd'];

  const filteredUsers = displayUsers.filter(user => {
    const matchesSearch = !searchQuery || user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone?.includes(searchQuery) ||
      user.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.businessCode?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter ||
      (roleFilter === 'wsd' && user.role === 'wholesale_dealer');
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const uniqueRoles = [...new Set(displayUsers.map((u: any) => u.role))];

  const handleApproval = async (userId: string, action: string) => {
    try {
      const res = await fetch(`/api/merchant/${merchantId}/users/${userId}/approve`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }), credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed');
      toast({ title: action === 'approve' ? 'User Approved' : 'User Rejected', description: `User has been ${action === 'approve' ? 'approved and activated' : 'rejected'}.` });
      invalidateUsers();
      setApprovalAction(null);
    } catch {
      toast({ title: 'Error', description: `Failed to ${action} user`, variant: 'destructive' });
    }
  };

  const handleStatusUpdate = async (userId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/merchant/${merchantId}/users/${userId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }), credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed');
      toast({ title: 'Status Updated', description: `User status changed to ${newStatus}` });
      invalidateUsers();
    } catch {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  };

  const sectionConfig: Record<string, { title: string; description: string }> = {
    'users-all': { title: 'All Users', description: 'All users registered under this union' },
    'users-b2c': { title: 'B2C Users', description: 'Retail consumers who buy at MRP' },
    'users-b2b': { title: 'B2B Users', description: 'Business partners — WSD, Dealers, Retailers' },
    'users-b2b-registrations': { title: 'B2B Registrations', description: 'Pending B2B registration requests awaiting approval' },
  };
  const config = sectionConfig[type || 'users-all'] || sectionConfig['users-all'];

  const b2bStats = type === 'users-b2b' || type === 'users-all' ? {
    federation: displayUsers.filter(u => u.role === 'federation').length,
    inter_union: displayUsers.filter(u => u.role === 'inter_union').length,
    wsd: displayUsers.filter(u => u.role === 'wsd' || u.role === 'wholesale_dealer').length,
    dealer: displayUsers.filter(u => u.role === 'dealer').length,
    retailer: displayUsers.filter(u => u.role === 'retailer').length,
  } : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-8 w-8 animate-spin text-purple-500" />
        <span className="ml-3 text-gray-500 text-lg">Loading users...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{config.title}</h2>
          <p className="text-sm text-gray-500 mt-1">{config.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-100 text-blue-700">{filteredUsers.length} users</Badge>
          {isRegistrations && <Badge className="bg-yellow-100 text-yellow-700">{displayUsers.length} pending</Badge>}
        </div>
      </div>

      {b2bStats && (type === 'users-b2b' || type === 'users-all') && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Object.entries(b2bStats).map(([role, count]) => (
            <Card key={role} className={`cursor-pointer hover:shadow-md transition-shadow ${roleFilter === role ? 'ring-2 ring-purple-400' : ''}`}
              onClick={() => setRoleFilter(roleFilter === role ? 'all' : role)}>
              <CardContent className="p-3 text-center">
                <div className="text-xl font-bold text-gray-900">{count}</div>
                <div className="text-xs text-gray-500 mt-1">{UNION_ROLE_LABELS[role] || role}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search by name, email, phone, business..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {uniqueRoles.map(role => (
                  <SelectItem key={role} value={role}>{UNION_ROLE_LABELS[role] || role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No users found</p>
              <p className="text-sm">{isRegistrations ? 'No pending registrations' : 'Users will appear here once they register'}</p>
            </div>
          ) : (
            <>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    {(type === 'users-b2b' || type === 'users-all' || isRegistrations) && <TableHead>Business</TableHead>}
                    {(type === 'users-b2b' || type === 'users-all' || isRegistrations) && <TableHead>Route / Office</TableHead>}
                    {(type === 'users-b2b' || type === 'users-all' || isRegistrations) && <TableHead>Code</TableHead>}
                    {(type === 'users-b2b' || type === 'users-all' || isRegistrations) && <TableHead>Compliance</TableHead>}
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className={`text-xs ${b2bRoles.includes(user.role) ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                              {getInitials(user.name || 'U')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium">{user.name}</span>
                            <p className="text-xs text-gray-500">{user.phone || user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      {(type === 'users-b2b' || type === 'users-all' || isRegistrations) && (
                        <TableCell>
                          <div>
                            <span className="font-medium text-sm">{user.businessName || '-'}</span>
                            {user.businessType && <p className="text-xs text-gray-500">{user.businessType}</p>}
                          </div>
                        </TableCell>
                      )}
                      {(type === 'users-b2b' || type === 'users-all' || isRegistrations) && (
                        <TableCell>
                          <div className="text-sm">
                            <span>{user.businessRoute || '-'}</span>
                            {user.office && <p className="text-xs text-gray-400">Office: {user.office}</p>}
                          </div>
                        </TableCell>
                      )}
                      {(type === 'users-b2b' || type === 'users-all' || isRegistrations) && (
                        <TableCell>
                          {user.businessCode ? <Badge variant="outline" className="font-mono text-xs">{user.businessCode}</Badge> : '-'}
                        </TableCell>
                      )}
                      {(type === 'users-b2b' || type === 'users-all' || isRegistrations) && (
                        <TableCell>
                          <div className="text-xs space-y-0.5">
                            {user.panNumber && <div><span className="text-gray-400">PAN:</span> {user.panNumber}</div>}
                            {user.aadhaarNumber && <div><span className="text-gray-400">Aadhaar:</span> {user.aadhaarNumber}</div>}
                            {user.gstNumber && <div><span className="text-gray-400">GST:</span> {user.gstNumber}</div>}
                            {!user.panNumber && !user.aadhaarNumber && !user.gstNumber && <span className="text-gray-400">-</span>}
                          </div>
                        </TableCell>
                      )}
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="sm" onClick={() => setSelectedUser(user)}>
                            <Eye className="h-3 w-3" />
                          </Button>
                          {user.status === 'pending' && (
                            <>
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white h-7 px-2"
                                onClick={() => handleApproval(user.id, 'approve')}>
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="destructive" className="h-7 px-2"
                                onClick={() => handleApproval(user.id, 'reject')}>
                                <XCircle className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          {user.status === 'active' && (
                            <Button size="sm" variant="outline" className="h-7 px-2 text-red-600"
                              onClick={() => handleStatusUpdate(user.id, 'inactive')}>
                              <XCircle className="h-3 w-3" />
                            </Button>
                          )}
                          {user.status === 'inactive' && (
                            <Button size="sm" variant="outline" className="h-7 px-2 text-green-600"
                              onClick={() => handleStatusUpdate(user.id, 'active')}>
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3 md:hidden">
              {filteredUsers.map((user: any) => (
                <div key={user.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className={`text-xs ${b2bRoles.includes(user.role) ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                        {getInitials(user.name || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.phone || user.email}</p>
                    </div>
                    {user.businessCode && <Badge variant="outline" className="font-mono text-xs shrink-0">{user.businessCode}</Badge>}
                  </div>
                  {user.businessName && (
                    <div className="bg-gray-50 rounded-md px-3 py-2">
                      <p className="text-sm font-medium">{user.businessName}</p>
                      {user.businessType && <p className="text-xs text-gray-500">{user.businessType}</p>}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-400">Role:</span> {getRoleBadge(user.role)}</div>
                    <div><span className="text-gray-400">Status:</span> {getStatusBadge(user.status)}</div>
                    {user.businessRoute && <div><span className="text-gray-400">Route:</span> {user.businessRoute}</div>}
                    {user.office && <div><span className="text-gray-400">Office:</span> {user.office}</div>}
                  </div>
                  {(user.panNumber || user.aadhaarNumber || user.gstNumber) && (
                    <div className="bg-blue-50 rounded-md px-3 py-2 text-xs space-y-1">
                      <p className="font-medium text-blue-800">Compliance</p>
                      {user.panNumber && <div><span className="text-gray-500">PAN:</span> {user.panNumber}</div>}
                      {user.aadhaarNumber && <div><span className="text-gray-500">Aadhaar:</span> {user.aadhaarNumber}</div>}
                      {user.gstNumber && <div><span className="text-gray-500">GST:</span> {user.gstNumber}</div>}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelectedUser(user)}>
                      <Eye className="h-3 w-3 mr-1" /> View
                    </Button>
                    {user.status === 'pending' && (
                      <>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white flex-1"
                          onClick={() => handleApproval(user.id, 'approve')}>Approve</Button>
                        <Button size="sm" variant="destructive" className="flex-1"
                          onClick={() => handleApproval(user.id, 'reject')}>Reject</Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            </>
          )}

          <div className="mt-4 text-sm text-gray-500">
            Showing {filteredUsers.length} of {displayUsers.length} users
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className={`${b2bRoles.includes(selectedUser.role) ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                    {getInitials(selectedUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedUser.name}</h3>
                  <p className="text-sm text-gray-500">{selectedUser.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500 font-medium">Phone:</span><br />{selectedUser.phone || '-'}</div>
                <div><span className="text-gray-500 font-medium">Role:</span><br />{getRoleBadge(selectedUser.role)}</div>
                <div><span className="text-gray-500 font-medium">Status:</span><br />{getStatusBadge(selectedUser.status)}</div>
                <div><span className="text-gray-500 font-medium">Union:</span><br />{selectedUser.districtUnion || '-'}</div>
              </div>
              {selectedUser.businessName && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold text-sm">Business Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">Business:</span> {selectedUser.businessName}</div>
                    <div><span className="text-gray-500">Type:</span> {selectedUser.businessType || '-'}</div>
                    <div><span className="text-gray-500">Code:</span> {selectedUser.businessCode || '-'}</div>
                    <div><span className="text-gray-500">Route:</span> {selectedUser.businessRoute || '-'}</div>
                    <div><span className="text-gray-500">Point:</span> {selectedUser.businessPoint || '-'}</div>
                    <div><span className="text-gray-500">Office:</span> {selectedUser.office || '-'}</div>
                  </div>
                  {selectedUser.businessAddress && (
                    <div><span className="text-gray-500 text-sm">Address:</span><br /><span className="text-sm">{selectedUser.businessAddress}</span></div>
                  )}
                </div>
              )}
              {(selectedUser.panNumber || selectedUser.aadhaarNumber || selectedUser.gstNumber || selectedUser.msmeNumber || selectedUser.securityDeposit) && (
                <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold text-sm text-blue-800">Compliance & Deposits</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {selectedUser.panNumber && <div><span className="text-gray-500">PAN:</span> {selectedUser.panNumber}</div>}
                    {selectedUser.aadhaarNumber && <div><span className="text-gray-500">Aadhaar:</span> {selectedUser.aadhaarNumber}</div>}
                    {selectedUser.gstNumber && <div><span className="text-gray-500">GSTIN:</span> {selectedUser.gstNumber}</div>}
                    {selectedUser.msmeNumber && <div><span className="text-gray-500">MSME:</span> {selectedUser.msmeNumber}</div>}
                    {selectedUser.securityDeposit && <div><span className="text-gray-500">Security Deposit:</span> <span className="font-medium text-green-700">₹{Number(selectedUser.securityDeposit).toLocaleString('en-IN')}</span></div>}
                  </div>
                </div>
              )}
              {selectedUser.freshMilkPricingRole && (
                <div className="bg-purple-50 rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold text-sm text-purple-800">Pricing Tiers</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                    <div><span className="text-gray-500">Fresh Milk:</span><br />{getTierBadge(selectedUser.freshMilkPricingRole)}</div>
                    <div><span className="text-gray-500">Products:</span><br />{getTierBadge(selectedUser.productsPricingRole)}</div>
                    <div><span className="text-gray-500">Ice Cream:</span><br />{getTierBadge(selectedUser.iceCreamPricingRole)}</div>
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                {selectedUser.status === 'pending' && (
                  <>
                    <Button className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => { handleApproval(selectedUser.id, 'approve'); setSelectedUser(null); }}>
                      <CheckCircle className="h-4 w-4 mr-2" /> Approve
                    </Button>
                    <Button variant="destructive" className="flex-1"
                      onClick={() => { handleApproval(selectedUser.id, 'reject'); setSelectedUser(null); }}>
                      <XCircle className="h-4 w-4 mr-2" /> Reject
                    </Button>
                  </>
                )}
                {selectedUser.status === 'active' && (
                  <Button variant="outline" className="flex-1 text-red-600"
                    onClick={() => { handleStatusUpdate(selectedUser.id, 'inactive'); setSelectedUser(null); }}>
                    <XCircle className="h-4 w-4 mr-2" /> Deactivate
                  </Button>
                )}
                {selectedUser.status === 'inactive' && (
                  <Button variant="outline" className="flex-1 text-green-600"
                    onClick={() => { handleStatusUpdate(selectedUser.id, 'active'); setSelectedUser(null); }}>
                    <CheckCircle className="h-4 w-4 mr-2" /> Activate
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PeopleSection({ type, merchantId }: { type?: string; merchantId?: string | null }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [routeFilter, setRouteFilter] = useState('all');
  const [entriesPerPage, setEntriesPerPage] = useState('25');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const { toast } = useToast();

  const { data: people = [], isLoading } = useQuery({
    queryKey: ['/api/merchant', merchantId, 'people'],
    queryFn: async () => {
      if (!merchantId) return [];
      const res = await fetch(`/api/merchant/${merchantId}/people`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    enabled: !!merchantId,
  });

  const typeFilterMap: Record<string, (p: any) => boolean> = {
    'people-all': () => true,
    'people-wsd': (p) => p.role === 'wsd' || p.role === 'wholesale_dealer',
    'people-dealers': (p) => p.role === 'dealer' && !['PRIVATE PARLOUR', 'UNION PARLOUR', 'INSTUTION', 'INSTITUTION', 'HOTELS', 'HOTEL'].includes((p.businessType || '').toUpperCase()),
    'people-parlours': (p) => ['PRIVATE PARLOUR', 'UNION PARLOUR'].includes((p.businessType || '').toUpperCase()),
    'people-institutions': (p) => ['INSTUTION', 'INSTITUTION', 'HOTELS', 'HOTEL'].includes((p.businessType || '').toUpperCase()),
  };

  const typeFn = typeFilterMap[type || 'people-all'] || (() => true);

  const routes = [...new Set(people.map((p: any) => p.businessRoute).filter(Boolean))].sort();

  const filtered = people.filter((p: any) => {
    if (!typeFn(p)) return false;
    if (routeFilter !== 'all' && p.businessRoute !== routeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (p.businessName || '').toLowerCase().includes(q) ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.phone || '').includes(q) ||
        (p.businessCode || '').toLowerCase().includes(q) ||
        (p.businessPoint || '').toLowerCase().includes(q);
    }
    return true;
  });

  const perPage = parseInt(entriesPerPage);
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const stats = {
    total: people.length,
    wsd: people.filter((p: any) => p.role === 'wsd' || p.role === 'wholesale_dealer').length,
    dealers: people.filter((p: any) => p.role === 'dealer').length,
    withPhone: people.filter((p: any) => p.phone).length,
    incomplete: people.filter((p: any) => !p.profileComplete).length,
  };

  const formatDeposit = (val: any) => {
    if (!val) return '-';
    const n = parseFloat(String(val).replace(/[^0-9.]/g, ''));
    if (isNaN(n)) return val;
    return '₹' + n.toLocaleString('en-IN');
  };

  const sectionTitle = type === 'people-wsd' ? 'Wholesale Dealers' :
    type === 'people-dealers' ? 'Dealers' :
    type === 'people-parlours' ? 'Parlours' :
    type === 'people-institutions' ? 'Institutions & Hotels' : 'All People';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-8 w-8 animate-spin text-purple-500" />
        <span className="ml-3 text-gray-500 text-lg">Loading people...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{sectionTitle}</h2>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} of {stats.total} people</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-100 text-blue-700">{stats.wsd} WSD</Badge>
          <Badge className="bg-green-100 text-green-700">{stats.dealers} Dealers</Badge>
          <Badge className="bg-orange-100 text-orange-700">{stats.incomplete} Incomplete</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{stats.total}</p><p className="text-sm text-gray-500">Total People</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{stats.withPhone}</p><p className="text-sm text-gray-500">With Phone</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-purple-600">{stats.wsd}</p><p className="text-sm text-gray-500">Wholesale Dealers</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-orange-600">{stats.incomplete}</p><p className="text-sm text-gray-500">Incomplete Profiles</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search name, code, phone..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pl-10" />
              </div>
              <Select value={routeFilter} onValueChange={(v) => { setRouteFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Filter by route" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Routes</SelectItem>
                  {routes.map((r: string) => <SelectItem key={r} value={r}>{r.trim()}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Show</span>
              <Select value={entriesPerPage} onValueChange={(v) => { setEntriesPerPage(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Code</TableHead>
                  <TableHead>Business Name</TableHead>
                  <TableHead>Route / Point</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Pricing Tiers</TableHead>
                  <TableHead>Compliance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((person: any) => (
                  <TableRow key={person.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelectedPerson(person)}>
                    <TableCell className="font-mono text-xs font-medium">{person.businessCode || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                            {(person.businessName || person.name || '?').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm truncate max-w-[200px]">{person.businessName || person.name}</p>
                          {person.businessAddress && <p className="text-xs text-gray-500 truncate max-w-[200px]">{person.businessAddress}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium">{person.businessRoute || '-'}</p>
                        <p className="text-gray-500 text-xs">{person.businessPoint || ''}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{person.phone || <span className="text-orange-500 text-xs">Missing</span>}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {person.businessType || PEOPLE_ROLE_LABELS[person.role] || person.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {person.freshMilkPricingRole && <Badge className="bg-blue-50 text-blue-700 text-xs">FM:{PEOPLE_TIER_LABELS[person.freshMilkPricingRole] || person.freshMilkPricingRole}</Badge>}
                        {person.productsPricingRole && <Badge className="bg-green-50 text-green-700 text-xs">PR:{PEOPLE_TIER_LABELS[person.productsPricingRole] || person.productsPricingRole}</Badge>}
                        {person.iceCreamPricingRole && <Badge className="bg-pink-50 text-pink-700 text-xs">IC:{PEOPLE_TIER_LABELS[person.iceCreamPricingRole] || person.iceCreamPricingRole}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {person.gstNumber && <Badge className="bg-emerald-50 text-emerald-700 text-xs">GST</Badge>}
                        {person.panNumber && <Badge className="bg-amber-50 text-amber-700 text-xs">PAN</Badge>}
                        {!person.gstNumber && !person.panNumber && <span className="text-xs text-gray-400">-</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {person.profileComplete ? (
                        <Badge className="bg-green-100 text-green-700 text-xs">Complete</Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-700 text-xs">Incomplete</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {paginated.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-gray-500">No people found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {paginated.map((person: any) => (
              <div key={person.id} className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50" onClick={() => setSelectedPerson(person)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                        {(person.businessName || person.name || '?').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{person.businessName || person.name}</p>
                      <p className="text-xs text-gray-500">{person.businessCode || ''} • {person.businessType || person.role}</p>
                    </div>
                  </div>
                  {person.profileComplete ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div><span className="font-medium">Route:</span> {person.businessRoute || '-'}</div>
                  <div><span className="font-medium">Point:</span> {person.businessPoint || '-'}</div>
                  <div><span className="font-medium">Phone:</span> {person.phone || <span className="text-orange-500">Missing</span>}</div>
                  <div className="flex gap-1">
                    {person.freshMilkPricingRole && <Badge className="bg-blue-50 text-blue-700 text-[10px] px-1">FM:{PEOPLE_TIER_LABELS[person.freshMilkPricingRole] || '?'}</Badge>}
                    {person.productsPricingRole && <Badge className="bg-green-50 text-green-700 text-[10px] px-1">PR:{PEOPLE_TIER_LABELS[person.productsPricingRole] || '?'}</Badge>}
                  </div>
                </div>
              </div>
            ))}
            {paginated.length === 0 && (
              <div className="text-center py-8 text-gray-500">No people found</div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">Page {currentPage} of {totalPages} ({filtered.length} total)</p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</Button>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Person Detail Dialog */}
      <Dialog open={!!selectedPerson} onOpenChange={() => setSelectedPerson(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  {(selectedPerson?.businessName || '?').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p>{selectedPerson?.businessName || selectedPerson?.name}</p>
                <p className="text-sm font-normal text-gray-500">{selectedPerson?.businessCode} • {selectedPerson?.businessType || selectedPerson?.role}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          {selectedPerson && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Phone</Label>
                  <p className="font-medium">{selectedPerson.phone || <span className="text-orange-500">Not provided</span>}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Email</Label>
                  <p className="font-medium text-sm truncate">{selectedPerson.email || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Route</Label>
                  <p className="font-medium">{selectedPerson.businessRoute || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Point</Label>
                  <p className="font-medium">{selectedPerson.businessPoint || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">District</Label>
                  <p className="font-medium">{selectedPerson.district || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Office</Label>
                  <p className="font-medium">{selectedPerson.office || '-'}</p>
                </div>
              </div>

              {selectedPerson.businessAddress && (
                <div>
                  <Label className="text-xs text-gray-500">Address</Label>
                  <p className="font-medium">{selectedPerson.businessAddress}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <Label className="text-xs text-gray-500 mb-2 block">Pricing Tiers</Label>
                <div className="flex gap-2 flex-wrap">
                  <Badge className="bg-blue-100 text-blue-700">Fresh Milk: {PEOPLE_TIER_LABELS[selectedPerson.freshMilkPricingRole] || 'N/A'}</Badge>
                  <Badge className="bg-green-100 text-green-700">Products: {PEOPLE_TIER_LABELS[selectedPerson.productsPricingRole] || 'N/A'}</Badge>
                  <Badge className="bg-pink-100 text-pink-700">Ice Cream: {PEOPLE_TIER_LABELS[selectedPerson.iceCreamPricingRole] || 'N/A'}</Badge>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-xs text-gray-500 mb-2 block">Compliance Documents</Label>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">GSTIN:</span> <span className="font-mono">{selectedPerson.gstNumber || '-'}</span></div>
                  <div><span className="text-gray-500">PAN:</span> <span className="font-mono">{selectedPerson.panNumber || '-'}</span></div>
                  <div><span className="text-gray-500">Aadhaar:</span> <span className="font-mono">{selectedPerson.aadhaarNumber || '-'}</span></div>
                  <div><span className="text-gray-500">MSME:</span> <span className="font-mono">{selectedPerson.msmeNumber || '-'}</span></div>
                  <div><span className="text-gray-500">Deposit:</span> <span className="font-medium">{formatDeposit(selectedPerson.securityDeposit)}</span></div>
                </div>
              </div>

              <div className="border-t pt-4 flex justify-between items-center">
                <Badge className={selectedPerson.profileComplete ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}>
                  {selectedPerson.profileComplete ? 'Profile Complete' : 'Profile Incomplete'}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => setSelectedPerson(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UsersSection({ type, merchantId }: { type?: string; merchantId?: string | null }) {
  const [entriesPerPage, setEntriesPerPage] = useState('10');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [deletingItem, setDeletingItem] = useState<{type: 'user' | 'role', item: any} | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userMobile, setUserMobile] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userStatus, setUserStatus] = useState('active');
  const [roleName, setRoleName] = useState('');
  const [rolePermissions, setRolePermissions] = useState('');
  const [activeTab, setActiveTab] = useState('agents');
  const { toast } = useToast();

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['/api/merchant', merchantId, 'agents'],
    queryFn: async () => {
      if (!merchantId) return [];
      const response = await fetch(`/api/merchant/${merchantId}/agents`);
      if (!response.ok) throw new Error('Failed to fetch agents');
      return response.json();
    },
    enabled: !!merchantId,
  });

  const [userData, setUserData] = useState([
    { id: 1, name: 'Admin User', email: 'admin@union.com', mobile: '+91 9843777277', status: 'active', role: 'Administrator', permissions: 45, avatar: 'AU' },
    { id: 2, name: 'Manager John', email: 'john.manager@union.com', mobile: '+91 87654 32109', status: 'active', role: 'Manager', permissions: 32, avatar: 'MJ' },
    { id: 3, name: 'Kitchen Staff', email: 'kitchen@union.com', mobile: '+91 76543 21098', status: 'active', role: 'Kitchen', permissions: 12, avatar: 'KS' },
    { id: 4, name: 'Cashier Mary', email: 'mary@union.com', mobile: '+91 65432 10987', status: 'inactive', role: 'Cashier', permissions: 8, avatar: 'CM' },
  ]);

  const [rolesData, setRolesData] = useState([
    { id: 1, name: 'Administrator', permissions: 45 },
    { id: 2, name: 'Manager', permissions: 32 },
    { id: 3, name: 'Kitchen', permissions: 12 },
    { id: 4, name: 'Cashier', permissions: 8 },
    { id: 5, name: 'Delivery', permissions: 6 },
  ]);

  const openAddUser = () => {
    setEditingUser(null);
    setUserName('');
    setUserEmail('');
    setUserMobile('');
    setUserRole('Administrator');
    setUserStatus('active');
    setShowUserDialog(true);
  };

  const openEditUser = (user: any) => {
    setEditingUser(user);
    setUserName(user.name);
    setUserEmail(user.email);
    setUserMobile(user.mobile);
    setUserRole(user.role);
    setUserStatus(user.status);
    setShowUserDialog(true);
  };

  const saveUser = () => {
    if (!userName || !userEmail) {
      toast({ title: "Error", description: "Name and email are required", variant: "destructive" });
      return;
    }
    if (editingUser) {
      setUserData(prev => prev.map(u => u.id === editingUser.id ? { ...u, name: userName, email: userEmail, mobile: userMobile, role: userRole, status: userStatus, avatar: userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) } : u));
      toast({ title: "User Updated", description: `${userName} has been updated` });
    } else {
      const newUser = { id: Date.now(), name: userName, email: userEmail, mobile: userMobile, role: userRole, status: userStatus, permissions: 10, avatar: userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) };
      setUserData(prev => [...prev, newUser]);
      toast({ title: "User Added", description: `${userName} has been added` });
    }
    setShowUserDialog(false);
  };

  const openAddRole = () => {
    setEditingRole(null);
    setRoleName('');
    setRolePermissions('10');
    setShowRoleDialog(true);
  };

  const openEditRole = (role: any) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRolePermissions(role.permissions.toString());
    setShowRoleDialog(true);
  };

  const saveRole = () => {
    if (!roleName) {
      toast({ title: "Error", description: "Role name is required", variant: "destructive" });
      return;
    }
    if (editingRole) {
      setRolesData(prev => prev.map(r => r.id === editingRole.id ? { ...r, name: roleName, permissions: parseInt(rolePermissions) || 0 } : r));
      toast({ title: "Role Updated", description: `${roleName} has been updated` });
    } else {
      const newRole = { id: Date.now(), name: roleName, permissions: parseInt(rolePermissions) || 0 };
      setRolesData(prev => [...prev, newRole]);
      toast({ title: "Role Added", description: `${roleName} has been added` });
    }
    setShowRoleDialog(false);
  };

  const confirmDelete = () => {
    if (!deletingItem) return;
    if (deletingItem.type === 'user') {
      setUserData(prev => prev.filter(u => u.id !== deletingItem.item.id));
      toast({ title: "User Deleted", description: `${deletingItem.item.name} has been removed` });
    } else {
      setRolesData(prev => prev.filter(r => r.id !== deletingItem.item.id));
      toast({ title: "Role Deleted", description: `${deletingItem.item.name} has been removed` });
    }
    setShowDeleteDialog(false);
    setDeletingItem(null);
  };

  const handleExport = (format: string) => {
    toast({ title: 'Export Complete', description: `Data exported as ${format}` });
  };

  const ExportButtons = () => (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => handleExport('Excel')}>Excel</Button>
      <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => handleExport('CSV')}>CSV</Button>
      <Button variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-50" onClick={() => handleExport('PDF')}>PDF</Button>
      <Button variant="outline" size="sm" className="text-blue-600 border-blue-600 hover:bg-blue-50" onClick={() => handleExport('Print')}>Print</Button>
    </div>
  );

  const renderDialogs = () => (
    <>
      {/* User Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Enter name" /></div>
            <div><Label>Email</Label><Input value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="Enter email" type="email" /></div>
            <div><Label>Mobile</Label><Input value={userMobile} onChange={(e) => setUserMobile(e.target.value)} placeholder="Enter mobile" /></div>
            <div><Label>Role</Label>
              <Select value={userRole} onValueChange={setUserRole}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {rolesData.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={userStatus} onValueChange={setUserStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowUserDialog(false)}>Cancel</Button>
              <Button className="bg-green-500 hover:bg-green-600" onClick={saveUser}>{editingUser ? 'Update' : 'Add'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Role' : 'Add New Role'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Role Name</Label><Input value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="Enter role name" /></div>
            <div><Label>Permissions Count</Label><Input value={rolePermissions} onChange={(e) => setRolePermissions(e.target.value)} placeholder="Enter permissions count" type="number" /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRoleDialog(false)}>Cancel</Button>
              <Button className="bg-green-500 hover:bg-green-600" onClick={saveRole}>{editingRole ? 'Update' : 'Add'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shared Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete {deletingItem?.item?.name}? This action cannot be undone.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button className="bg-red-500 hover:bg-red-600" onClick={confirmDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );

  if (type === 'all-user') {
    const filteredUsers = userData.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredAgents = agents.filter((a: any) => 
      a.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      a.agentCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.routeName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const displayedAgents = filteredAgents.slice(0, parseInt(entriesPerPage));
    
    return (
      <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">User List</h2>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-100 text-blue-700">{agents.length} Agents</Badge>
            <Button className="bg-green-500 hover:bg-green-600" onClick={openAddUser}><Plus className="h-4 w-4 mr-2" />Add Staff</Button>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="agents">Agents ({agents.length})</TabsTrigger>
            <TabsTrigger value="staff">Staff ({userData.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="agents">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Show</span>
                      <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                        <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                          <SelectItem value="500">500</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-gray-600">entries</span>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input placeholder="Search agents..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 w-64" />
                    </div>
                  </div>
                  <ExportButtons />
                </div>
                {agentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-500">Loading agents...</span>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedAgents.map((agent: any) => (
                        <TableRow key={agent.id}>
                          <TableCell className="font-mono text-sm font-medium">{agent.agentCode}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                                  {agent.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'AG'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{agent.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {agent.agentType?.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="font-medium">{agent.routeName || '-'}</p>
                              <p className="text-gray-500 text-xs">{agent.agentPoint || ''}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{agent.phone || '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Badge className="bg-blue-100 text-blue-700 text-xs">{agent.freshMilkTier}</Badge>
                              <Badge className="bg-green-100 text-green-700 text-xs">{agent.productTier}</Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={agent.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                              {agent.status === 'active' ? 'Active' : agent.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-500">Showing {displayedAgents.length} of {filteredAgents.length} agents</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="staff">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Show</span>
                      <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                        <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem></SelectContent>
                      </Select>
                      <span className="text-sm text-gray-600">entries</span>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input placeholder="Search staff..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 w-64" />
                    </div>
                  </div>
                  <ExportButtons />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16"></TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="w-32 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell><Avatar><AvatarFallback className="bg-blue-100 text-blue-600">{user.avatar}</AvatarFallback></Avatar></TableCell>
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{user.name}</span>
                              <Badge className={user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>{user.status === 'active' ? 'Active' : 'Inactive'}</Badge>
                            </div>
                            <p className="text-sm text-gray-500">{user.email}</p>
                            <p className="text-sm text-gray-500">{user.mobile}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.role}</p>
                            <p className="text-sm text-gray-500">{user.permissions} permissions</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditUser(user)}><Edit className="h-4 w-4 text-blue-600" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDeletingItem({type: 'user', item: user}); setShowDeleteDialog(true); }}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-500">Showing 1 to {filteredUsers.length} of {filteredUsers.length} entries</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      {renderDialogs()}
      </>
    );
  }

  if (type === 'all-roles') {
    const filteredRoles = rolesData.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return (
      <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">All Roles</h2>
          <Button className="bg-green-500 hover:bg-green-600" onClick={openAddRole}><Plus className="h-4 w-4 mr-2" />Add new</Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Show</span>
                  <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                    <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem></SelectContent>
                  </Select>
                  <span className="text-sm text-gray-600">entries</span>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 w-64" />
                </div>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoles.map((role, index) => (
                  <TableRow key={role.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell><Badge variant="outline">{role.permissions} permissions</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditRole(role)}><Edit className="h-4 w-4 text-blue-600" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDeletingItem({type: 'role', item: role}); setShowDeleteDialog(true); }}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      {renderDialogs()}
      </>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Users</h2>
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-500">Select a submenu to manage users.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function ReportsSection({ type, merchantId }: { type?: string; merchantId?: string }) {
  const [entriesPerPage, setEntriesPerPage] = useState('10');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [activeTab, setActiveTab] = useState('summary');
  const { toast } = useToast();

  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const formatDateInput = (d: Date) => d.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(formatDateInput(thirtyDaysAgo));
  const [endDate, setEndDate] = useState(formatDateInput(today));
  const [dailyDate, setDailyDate] = useState(formatDateInput(today));

  const { data: allOrders = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/orders', merchantId, 'reports'],
    queryFn: async () => {
      if (!merchantId) return [];
      const response = await fetch(`/api/orders?merchantId=${merchantId}`, { credentials: 'include' });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!merchantId,
    staleTime: 30000,
  });

  const filterByDateRange = (orders: any[], start: string, end: string) => {
    const startMs = new Date(start).getTime();
    const endMs = new Date(end + 'T23:59:59').getTime();
    return orders.filter((o: any) => {
      const orderDate = new Date(o.createdAt || o.created_at || 0).getTime();
      return orderDate >= startMs && orderDate <= endMs;
    });
  };

  const filterByDay = (orders: any[], day: string) => {
    return orders.filter((o: any) => {
      const d = new Date(o.createdAt || o.created_at || 0);
      return formatDateInput(d) === day;
    });
  };

  const filteredOrders = filterByDateRange(allOrders, startDate, endDate);
  const dailyOrders = filterByDay(allOrders, dailyDate);

  const totalOrders = filteredOrders.length;
  const cancelledOrders = filteredOrders.filter((o: any) => o.status === 'cancelled').length;
  const refundAmount = filteredOrders
    .filter((o: any) => o.status === 'cancelled' || o.status === 'refunded')
    .reduce((sum: number, o: any) => sum + (parseFloat(o.total) || 0), 0);
  const totalValue = filteredOrders.reduce((sum: number, o: any) => sum + (parseFloat(o.total) || 0), 0);

  const dailyTotalSales = dailyOrders.reduce((sum: number, o: any) => sum + (parseFloat(o.total) || 0), 0);
  const dailyDeliveryFee = dailyOrders.reduce((sum: number, o: any) => sum + (parseFloat(o.deliveryFee || o.delivery_fee) || 0), 0);
  const dailyTax = dailyOrders.reduce((sum: number, o: any) => sum + (parseFloat(o.tax) || 0), 0);
  const dailyTips = dailyOrders.reduce((sum: number, o: any) => sum + (parseFloat(o.tip) || 0), 0);
  const dailyTotal = dailyTotalSales + dailyDeliveryFee + dailyTax + dailyTips;

  const productSummary = (() => {
    const map: Record<string, { name: string; qty: number; total: number }> = {};
    filteredOrders.forEach((order: any) => {
      const items = order.items || order.orderItems || [];
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          const name = item.name || item.itemName || 'Unknown Item';
          const qty = parseInt(item.quantity) || 1;
          const price = parseFloat(item.price) || 0;
          if (!map[name]) map[name] = { name, qty: 0, total: 0 };
          map[name].qty += qty;
          map[name].total += price * qty;
        });
      }
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  })();

  const refundOrders = filteredOrders.filter((o: any) => o.status === 'cancelled' || o.status === 'refunded');

  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  const getOrderAvatar = (order: any) => {
    const name = order.customerName || order.customer_name || 'WC';
    return name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const getItemsSummary = (order: any) => {
    const items = order.items || order.orderItems || [];
    if (!Array.isArray(items) || items.length === 0) return 'N/A';
    return items.map((i: any) => `${i.name || i.itemName || 'Item'} x${i.quantity || 1}`).join(', ');
  };

  const entriesLimit = parseInt(entriesPerPage);

  const handleExport = (format: string) => {
    toast({ title: 'Export Complete', description: `Data exported as ${format}` });
  };

  const ExportButtons = () => (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => handleExport('Excel')}>Excel</Button>
      <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => handleExport('CSV')}>CSV</Button>
      <Button variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-50" onClick={() => handleExport('PDF')}>PDF</Button>
      <Button variant="outline" size="sm" className="text-blue-600 border-blue-600 hover:bg-blue-50" onClick={() => handleExport('Print')}>Print</Button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Loading Reports...</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <Card key={i}><CardContent className="p-4 text-center"><div className="h-8 bg-gray-200 animate-pulse rounded mb-2" /><div className="h-4 bg-gray-100 animate-pulse rounded w-20 mx-auto" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'sales-report') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Sales Report</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{totalOrders}</p><p className="text-sm text-gray-500">Orders</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-600">{cancelledOrders}</p><p className="text-sm text-gray-500">Cancel</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-orange-600">{formatCurrency(refundAmount)}</p><p className="text-sm text-gray-500">Total refund</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{formatCurrency(totalValue)}</p><p className="text-sm text-gray-500">Total Orders</p></CardContent></Card>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Input type="date" className="w-40" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  <span className="text-gray-500">to</span>
                  <Input type="date" className="w-40" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Show</span>
                  <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                    <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem></SelectContent>
                  </Select>
                  <span className="text-sm text-gray-600">entries</span>
                </div>
              </div>
              <ExportButtons />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16"></TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Order Type</TableHead>
                  <TableHead>Payment Type</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-gray-500 py-8">No orders found for the selected date range</TableCell></TableRow>
                ) : filteredOrders.slice(0, entriesLimit).map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell><Avatar><AvatarFallback className="bg-orange-100 text-orange-600">{getOrderAvatar(order)}</AvatarFallback></Avatar></TableCell>
                    <TableCell className="font-medium text-blue-600">{formatOrderId(order)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{getItemsSummary(order)}</TableCell>
                    <TableCell><Badge variant="outline">{order.orderType || order.order_type || 'Retail'}</Badge></TableCell>
                    <TableCell>{order.paymentMethod || order.payment_method || order.paymentType || 'N/A'}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(parseFloat(order.total) || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredOrders.length > 0 && (
              <p className="text-sm text-gray-500 mt-4">Showing {Math.min(entriesLimit, filteredOrders.length)} of {filteredOrders.length} entries</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (type === 'daily-sales-report') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Daily Sales Report</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card><CardContent className="p-4 text-center"><p className="text-xl font-bold text-green-600">{formatCurrency(dailyTotalSales)}</p><p className="text-sm text-gray-500">Total Sales</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-xl font-bold text-blue-600">{formatCurrency(dailyDeliveryFee)}</p><p className="text-sm text-gray-500">Delivery Fee</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-xl font-bold text-orange-600">{formatCurrency(dailyTax)}</p><p className="text-sm text-gray-500">Total Tax</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-xl font-bold text-purple-600">{formatCurrency(dailyTips)}</p><p className="text-sm text-gray-500">Total Tips</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-xl font-bold text-green-700">{formatCurrency(dailyTotal)}</p><p className="text-sm text-gray-500">Total</p></CardContent></Card>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Input type="date" className="w-40" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Show</span>
                  <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                    <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem></SelectContent>
                  </Select>
                  <span className="text-sm text-gray-600">entries</span>
                </div>
              </div>
              <ExportButtons />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Payment Type</TableHead>
                  <TableHead>Total Sales</TableHead>
                  <TableHead>Delivery Fee</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyOrders.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-gray-500 py-8">No orders found for the selected date</TableCell></TableRow>
                ) : dailyOrders.slice(0, entriesLimit).map((order: any) => {
                  const orderTotal = parseFloat(order.total) || 0;
                  const delivFee = parseFloat(order.deliveryFee || order.delivery_fee) || 0;
                  const tax = parseFloat(order.tax) || 0;
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium text-blue-600">{formatOrderId(order)}</TableCell>
                      <TableCell>{order.status === 'cancelled' ? 'Refund' : 'Sale'}</TableCell>
                      <TableCell>{order.paymentMethod || order.payment_method || order.paymentType || 'N/A'}</TableCell>
                      <TableCell>{formatCurrency(orderTotal)}</TableCell>
                      <TableCell>{formatCurrency(delivFee)}</TableCell>
                      <TableCell>{formatCurrency(tax)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(orderTotal + delivFee + tax)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {dailyOrders.length > 0 && (
              <p className="text-sm text-gray-500 mt-4">Showing {Math.min(entriesLimit, dailyOrders.length)} of {dailyOrders.length} entries</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (type === 'sales-summary') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Sales Summary</h2>
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-2 mb-6">
              <Button onClick={() => setActiveTab('summary')} className={activeTab === 'summary' ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}>Sales Summary</Button>
              <Button onClick={() => setActiveTab('chart')} variant={activeTab === 'chart' ? 'default' : 'outline'}>Sales chart</Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Input type="date" className="w-40" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  <span className="text-gray-500">to</span>
                  <Input type="date" className="w-40" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Show</span>
                  <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                    <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem></SelectContent>
                  </Select>
                  <span className="text-sm text-gray-600">entries</span>
                </div>
              </div>
              <ExportButtons />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Items</TableHead>
                  <TableHead>Average price</TableHead>
                  <TableHead>Total qty sold</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productSummary.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-gray-500 py-8">No product data found for the selected date range</TableCell></TableRow>
                ) : productSummary.slice(0, entriesLimit).map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{formatCurrency(item.qty > 0 ? item.total / item.qty : 0)}</TableCell>
                    <TableCell>{item.qty}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">{formatCurrency(item.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {productSummary.length > 0 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-500">Showing {Math.min(entriesLimit, productSummary.length)} of {productSummary.length} items</p>
                <p className="text-sm font-medium">Grand Total: <span className="text-green-600">{formatCurrency(productSummary.reduce((s, i) => s + i.total, 0))}</span></p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (type === 'refund-report') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Refund Report</h2>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Input type="date" className="w-40" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  <span className="text-gray-500">to</span>
                  <Input type="date" className="w-40" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Payment Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Show</span>
                  <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                    <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem></SelectContent>
                  </Select>
                  <span className="text-sm text-gray-600">entries</span>
                </div>
              </div>
              <ExportButtons />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16"></TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Payment Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {refundOrders.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-gray-500 py-8">No refund orders found for the selected date range</TableCell></TableRow>
                ) : refundOrders.slice(0, entriesLimit).map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell><Avatar><AvatarFallback className="bg-orange-100 text-orange-600">{getOrderAvatar(order)}</AvatarFallback></Avatar></TableCell>
                    <TableCell className="font-medium text-blue-600">{formatOrderId(order)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <span>{order.status === 'refunded' ? 'Full Refund' : 'Cancelled'}</span>
                          <Badge className="bg-green-100 text-green-700">{order.status}</Badge>
                        </div>
                        <p className="text-sm text-gray-500">{new Date(order.createdAt || order.created_at || 0).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                    </TableCell>
                    <TableCell>{order.paymentMethod || order.payment_method || order.paymentType || 'N/A'}</TableCell>
                    <TableCell className="text-right font-medium text-red-600">{formatCurrency(parseFloat(order.total) || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {refundOrders.length > 0 && (
              <p className="text-sm text-gray-500 mt-4">Showing {Math.min(entriesLimit, refundOrders.length)} of {refundOrders.length} entries</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Reports</h2>
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-500">Select a report type from the sidebar.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function PrintersSection({ type }: { type?: string }) {
  const [entriesPerPage, setEntriesPerPage] = useState('10');
  const [searchQuery, setSearchQuery] = useState('');

  const printerData = [
    { id: 1, name: 'Kitchen Printer', wifiInfo: 'IP: 192.168.1.101', status: 'online' },
    { id: 2, name: 'Receipt Printer', wifiInfo: 'IP: 192.168.1.102', status: 'online' },
    { id: 3, name: 'Bar Printer', wifiInfo: 'IP: 192.168.1.103', status: 'offline' },
  ];

  const printerLogsData = [
    { id: 1, date: 'Jan 28, 2026 10:30 AM', printerName: 'Kitchen Printer', status: 'success' },
    { id: 2, date: 'Jan 28, 2026 10:25 AM', printerName: 'Receipt Printer', status: 'success' },
    { id: 3, date: 'Jan 28, 2026 10:20 AM', printerName: 'Kitchen Printer', status: 'success' },
    { id: 4, date: 'Jan 28, 2026 10:15 AM', printerName: 'Bar Printer', status: 'failed' },
    { id: 5, date: 'Jan 28, 2026 10:10 AM', printerName: 'Receipt Printer', status: 'success' },
  ];

  if (type === 'all-printers') {
    const filteredPrinters = printerData.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Printer List</h2>
          <Button className="bg-green-500 hover:bg-green-600"><Plus className="h-4 w-4 mr-2" />Add new</Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Show</span>
                  <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                    <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem></SelectContent>
                  </Select>
                  <span className="text-sm text-gray-600">entries</span>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 w-64" />
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPrinters.map((printer) => (
                  <TableRow key={printer.id}>
                    <TableCell>{printer.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Printer className="h-5 w-5 text-gray-500" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{printer.name}</span>
                            <Badge className={printer.status === 'online' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>{printer.status}</Badge>
                          </div>
                          <p className="text-sm text-gray-500 flex items-center gap-1"><Wifi className="h-3 w-3" />{printer.wifiInfo}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4 text-blue-600" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4 text-red-600" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (type === 'printer-logs') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Printer logs</h2>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-gray-600">Show</span>
              <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem></SelectContent>
              </Select>
              <span className="text-sm text-gray-600">entries</span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Printer Name</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {printerLogsData.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.date}</TableCell>
                    <TableCell className="font-medium">{log.printerName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {log.status === 'success' ? (
                          <><CheckCircle className="h-4 w-4 text-green-600" /><span className="text-green-600">Success</span></>
                        ) : (
                          <><XCircle className="h-4 w-4 text-red-600" /><span className="text-red-600">Failed</span></>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">Showing 1 to {printerLogsData.length} of {printerLogsData.length} entries</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>Previous</Button>
                <Button variant="outline" size="sm" className="bg-green-500 text-white hover:bg-green-600">1</Button>
                <Button variant="outline" size="sm" disabled>Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Printers</h2>
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-500">Select a submenu to manage printers.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function SupplierSection() {
  const [entriesPerPage, setEntriesPerPage] = useState('10');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const supplierData = [
    { id: 1, name: 'Fresh Foods Ltd', contact: '+91 9843777277', email: 'contact@freshfoods.com' },
    { id: 2, name: 'Spice World', contact: '+91 87654 32109', email: 'orders@spiceworld.in' },
    { id: 3, name: 'Dairy Direct', contact: '+91 76543 21098', email: 'supply@dairydirect.com' },
    { id: 4, name: 'Vegetable Mart', contact: '+91 65432 10987', email: 'vegmart@gmail.com' },
    { id: 5, name: 'Meat Masters', contact: '+91 54321 09876', email: 'orders@meatmasters.in' },
  ];

  const handleExport = (format: string) => {
    toast({ title: 'Export Complete', description: `Data exported as ${format}` });
  };

  const ExportButtons = () => (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => handleExport('Excel')}>Excel</Button>
      <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => handleExport('CSV')}>CSV</Button>
      <Button variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-50" onClick={() => handleExport('PDF')}>PDF</Button>
      <Button variant="outline" size="sm" className="text-blue-600 border-blue-600 hover:bg-blue-50" onClick={() => handleExport('Print')}>Print</Button>
    </div>
  );

  const filteredSuppliers = supplierData.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Supplier List</h2>
        <Button className="bg-green-500 hover:bg-green-600"><Plus className="h-4 w-4 mr-2" />Add new</Button>
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show</span>
                <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem></SelectContent>
                </Select>
                <span className="text-sm text-gray-600">entries</span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 w-64" />
              </div>
            </div>
            <ExportButtons />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell>{supplier.id}</TableCell>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>{supplier.contact}</TableCell>
                  <TableCell>{supplier.email}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4 text-blue-600" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4 text-red-600" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">Showing 1 to {filteredSuppliers.length} of {filteredSuppliers.length} entries</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>Previous</Button>
              <Button variant="outline" size="sm" className="bg-green-500 text-white hover:bg-green-600">1</Button>
              <Button variant="outline" size="sm" disabled>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const LazyDMSInventory = lazy(() => import("@/pages/admin/dms-inventory"));
const LazyDMSGrn = lazy(() => import("@/pages/admin/dms-grn"));
const LazyBulkInvoices = lazy(() => import("@/pages/admin/bulk-invoices"));

function MerchantInventorySection() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>}>
      <LazyDMSInventory />
    </Suspense>
  );
}

function MerchantGrnSection() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>}>
      <LazyDMSGrn />
    </Suspense>
  );
}

function MerchantBulkInvoicesSection() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>}>
      <LazyBulkInvoices />
    </Suspense>
  );
}
