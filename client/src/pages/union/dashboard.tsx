import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useSearch, Link } from 'wouter';
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { NotificationBell } from '@/components/notification-bell';
import { notifyInvoiceCreated, notifyPaymentReceived } from '@/lib/notifications';
import { formatTimestamp } from '@/lib/format-timestamp';
import { UNION_PERMISSIONS, UNION_STAFF_DESIGNATIONS, UNION_STAFF_ACCESS_TIERS, STAFF_FEATURE_PERMISSIONS, PERMISSION_CATEGORIES, getDesignationById, MODULE_ACCESS_LABELS, MMO_OFFICES } from '@shared/schema';
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
  ClipboardList,
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
  LogIn,
  Check,
  X,
  Loader2,
  Key,
  CreditCard,
  Pencil,
  Menu,
  Milk,
  ChefHat,
  Clock,
  IndianRupee,
  History,
  DollarSign,
  TrendingUp,
  Building,
  Building2,
  Gift,
  ScrollText,
  Hotel,
  GraduationCap,
  Warehouse,
  Database,
  MapPin,
  Tag,
  Navigation,
  ArrowRightLeft
} from 'lucide-react';

const DMSInventory = lazy(() => import("@/pages/admin/dms-inventory"));
const DmsGrn = lazy(() => import("@/pages/admin/dms-grn"));
const DmsSalesReturns = lazy(() => import("@/pages/admin/dms-sales-returns"));
const DmsCollections = lazy(() => import("@/pages/admin/dms-collections"));
const DMSSchemes = lazy(() => import("@/pages/admin/dms-schemes"));
const DmsSfa = lazy(() => import("@/pages/admin/dms-sfa"));
const DmsVehicles = lazy(() => import("@/pages/admin/dms-vehicles"));
const DmsTransport = lazy(() => import("@/pages/admin/dms-transport"));
const DmsTally = lazy(() => import("@/pages/admin/dms-tally"));
const DmsGstr = lazy(() => import("@/pages/admin/dms-gstr"));

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

interface SidebarSubItem {
  id: string;
  label: string;
  count?: number;
  countColor?: string;
}

interface SidebarItem {
  id: string;
  label: string;
  icon: any;
  subItems?: SidebarSubItem[];
}

interface SidebarSection {
  id: string;
  label: string;
  icon: any;
  isSection: true;
  children: SidebarItem[];
}

type SidebarEntry = SidebarItem | SidebarSection;

const sidebarEntries: SidebarEntry[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },

  {
    id: 'section-union',
    label: 'District Union',
    icon: Building,
    isSection: true,
    children: [
      { id: 'merchant', label: 'Union Information', icon: Store, subItems: [
        { id: 'merchant-info', label: 'District Union Information' },
        { id: 'merchant-settings', label: 'Settings' },
        { id: 'order-limit', label: 'Order limit' },
        { id: 'banner', label: 'Banner' },
        { id: 'pages', label: 'Pages' },
        { id: 'menu', label: 'Menu' },
      ]},
      { id: 'supplier', label: 'Supplier', icon: Truck },
    ],
  },

  {
    id: 'section-catalog',
    label: 'Product Catalog',
    icon: Package,
    isSection: true,
    children: [
      { id: 'my-products', label: 'My Products', icon: Package },
      { id: 'browse-catalog', label: 'Add from Catalog', icon: Plus },
    ],
  },

  {
    id: 'section-orders',
    label: 'Orders & Sales',
    icon: ShoppingBag,
    isSection: true,
    children: [
      { id: 'orders', label: 'Orders', icon: ShoppingBag, subItems: [
        { id: 'new-orders', label: 'New Orders', count: 0, countColor: 'green' },
        { id: 'orders-processing', label: 'Orders Processing', count: 0, countColor: 'yellow' },
        { id: 'orders-ready', label: 'Orders Ready', count: 0, countColor: 'blue' },
        { id: 'completed-orders', label: 'Completed', count: 0, countColor: 'green' },
        { id: 'scheduled', label: 'Scheduled', count: 0, countColor: 'green' },
        { id: 'all-orders', label: 'All Orders', count: 217, countColor: 'teal' },
      ]},
      { id: 'pos', label: 'POS', icon: Monitor, subItems: [
        { id: 'pos-create-order', label: 'Create Order' },
        { id: 'pos-order-history', label: 'Order History' },
      ]},
      { id: 'daily-indent', label: 'Daily Indent', icon: ClipboardList, subItems: [
        { id: 'indent-orders', label: 'Indent Orders' },
        { id: 'indent-approvals', label: 'Approvals' },
        { id: 'indent-history', label: 'History' },
      ]},
      { id: 'order-type', label: 'Order Type', icon: FileText, subItems: [
        { id: 'order-type-pickup', label: 'Pickup' },
        { id: 'order-type-dinein', label: 'Dinein' },
        { id: 'order-type-delivery', label: 'Delivery' },
      ]},
      { id: 'table-booking', label: 'Table Booking', icon: CalendarDays, subItems: [
        { id: 'table-booking-list', label: 'List' },
        { id: 'table-booking-settings', label: 'Settings' },
        { id: 'table-shifts', label: 'Shifts' },
        { id: 'table-room', label: 'Room' },
        { id: 'table-tables', label: 'Tables' },
      ]},
    ],
  },

  {
    id: 'section-finance',
    label: 'Finance & Compliance',
    icon: DollarSign,
    isSection: true,
    children: [
      { id: 'invoice', label: 'Invoice', icon: FileText, subItems: [
        { id: 'invoice-list', label: 'List' },
      ]},
      { id: 'ewaybill', label: 'E-way Bill', icon: ScrollText, subItems: [
        { id: 'ewaybill-active', label: 'Active Bills' },
        { id: 'ewaybill-generate', label: 'Generate Bill' },
        { id: 'ewaybill-history', label: 'Bill History' },
      ]},
      { id: 'gst', label: 'GST', icon: FileText, subItems: [
        { id: 'gst-returns', label: 'GST Returns' },
        { id: 'gst-settings', label: 'GST Settings' },
      ]},
      { id: 'account', label: 'Account', icon: Wallet, subItems: [
        { id: 'account-statement', label: 'Statement' },
        { id: 'account-withdrawals', label: 'Withdrawals' },
      ]},
    ],
  },

  {
    id: 'section-people',
    label: 'People',
    icon: Users,
    isSection: true,
    children: [
      { id: 'users', label: 'Users', icon: User, subItems: [
        { id: 'users-all', label: 'All Users' },
        { id: 'users-b2c', label: 'B2C Users' },
        { id: 'users-b2b', label: 'B2B Users' },
        { id: 'users-b2b-registrations', label: 'B2B Registrations' },
        { id: 'all-roles', label: 'All Roles' },
      ]},
      { id: 'staff', label: 'Staff Management', icon: Shield, subItems: [
        { id: 'staff-approvals', label: 'Pending Approvals', count: 0, countColor: 'orange' },
        { id: 'staff-all', label: 'All Staff' },
        { id: 'staff-hierarchy', label: 'Organization Hierarchy' },
      ]},
      { id: 'sub-users', label: 'Sub-Users', icon: UserPlus, subItems: [
        { id: 'sub-users-list', label: 'Manage Sub-Users' },
        { id: 'sub-users-permissions', label: 'Permissions' },
      ]},
      { id: 'designation-guide', label: 'Designation Guide', icon: Users, subItems: [
        { id: 'designation-table', label: 'Roles & Responsibilities' },
      ]},
    ],
  },

  {
    id: 'section-marketing',
    label: 'Marketing & Promo',
    icon: Megaphone,
    isSection: true,
    children: [
      { id: 'campaigns', label: 'Campaigns', icon: Megaphone, subItems: [
        { id: 'active-campaigns', label: 'Active Campaigns' },
        { id: 'create-campaign', label: 'Create Campaign' },
      ]},
      { id: 'communication', label: 'Communication', icon: MessageSquare, subItems: [
        { id: 'chats', label: 'Chats' },
      ]},
      { id: 'promo', label: 'Promo', icon: Tags, subItems: [
        { id: 'promo-coupon', label: 'Coupon' },
        { id: 'promo-offers', label: 'Offers' },
      ]},
    ],
  },

  {
    id: 'section-reports',
    label: 'Reports & Media',
    icon: BarChart3,
    isSection: true,
    children: [
      { id: 'reports', label: 'Reports', icon: BarChart3, subItems: [
        { id: 'sales-report', label: 'Sales Report' },
        { id: 'daily-sales-report', label: 'Daily Sales Report' },
        { id: 'sales-summary', label: 'Sales Summary' },
        { id: 'refund-report', label: 'Refund Report' },
        { id: 'credit-report', label: 'Credit Report' },
      ]},
      { id: 'images', label: 'Images', icon: Image, subItems: [
        { id: 'gallery', label: 'Gallery' },
        { id: 'media-library', label: 'Media Library' },
        { id: 'bulk-upload', label: 'Bulk Upload' },
      ]},
      { id: 'printers', label: 'Printers', icon: Printer, subItems: [
        { id: 'all-printers', label: 'All printers' },
        { id: 'printer-logs', label: 'Printer logs' },
      ]},
    ],
  },

  {
    id: 'section-dms',
    label: 'DMS',
    icon: Database,
    isSection: true,
    children: [
      { id: 'dms-inventory', label: 'Inventory & Batches', icon: Package },
      { id: 'dms-grn', label: 'Goods Receipt Notes', icon: FileText },
      { id: 'dms-sales-returns', label: 'Sales Returns', icon: RefreshCw },
      { id: 'dms-collections', label: 'Collections & Outstanding', icon: Wallet },
      { id: 'dms-schemes', label: 'Schemes & Promotions', icon: Tag },
      { id: 'dms-sfa', label: 'Sales Force Automation', icon: MapPin },
      { id: 'dms-vehicles', label: 'Vehicles & Logistics', icon: Truck },
      { id: 'dms-transport', label: 'Transport Management', icon: Navigation },
      { id: 'dms-tally', label: 'Tally Integration', icon: Database },
      { id: 'dms-gstr', label: 'GSTR Returns', icon: ScrollText },
    ],
  },
];

const flatSidebarItems: SidebarItem[] = sidebarEntries.flatMap(entry =>
  'isSection' in entry && entry.isSection ? entry.children : [entry as SidebarItem]
);

// Map permissions to allowed menu items
const permissionToMenuMap: Record<string, string[]> = {
  dashboard: ['dashboard'],
  orders_view: ['orders', 'new-orders', 'orders-processing', 'orders-ready', 'completed-orders', 'scheduled', 'all-orders'],
  orders_manage: ['orders', 'new-orders', 'orders-processing', 'orders-ready', 'completed-orders', 'scheduled', 'all-orders'],
  products_view: ['fresh-milk', 'fresh-milk-list', 'fresh-milk-categories', 'fresh-milk-inventory', 'products', 'products-list', 'products-categories', 'products-inventory', 'icecream', 'icecream-list', 'icecream-categories', 'icecream-inventory'],
  products_manage: ['fresh-milk', 'fresh-milk-list', 'fresh-milk-categories', 'fresh-milk-inventory', 'products', 'products-list', 'products-categories', 'products-inventory', 'icecream', 'icecream-list', 'icecream-categories', 'icecream-inventory'],
  inventory_view: ['fresh-milk-inventory', 'products-inventory', 'icecream-inventory'],
  inventory_manage: ['fresh-milk-inventory', 'products-inventory', 'icecream-inventory'],
  customers_view: ['users', 'users-all', 'users-b2c', 'users-b2b', 'users-b2b-registrations', 'all-roles'],
  customers_manage: ['users', 'users-all', 'users-b2c', 'users-b2b', 'users-b2b-registrations', 'all-roles'],
  reports_view: ['reports', 'sales-report', 'daily-sales-report', 'sales-summary', 'refund-report', 'credit-report'],
  pos_access: ['pos', 'pos-create-order', 'pos-order-history'],
  pos_counter_sale: ['pos', 'pos-create-order'],
  pos_tier_federation: ['pos', 'pos-create-order'],
  pos_tier_inter_union: ['pos', 'pos-create-order'],
  pos_tier_wholesale: ['pos', 'pos-create-order'],
  pos_tier_dealer: ['pos', 'pos-create-order'],
  pos_tier_retailer: ['pos', 'pos-create-order'],
  pos_credit_sales: ['pos', 'pos-create-order'],
  settings_view: ['merchant', 'merchant-info', 'merchant-settings'],
  settings_manage: ['merchant', 'merchant-info', 'merchant-settings', 'order-limit', 'banner', 'pages', 'menu'],
  subusers_manage: ['sub-users', 'sub-users-list', 'sub-users-permissions'],
  ewaybill_access: ['ewaybill', 'ewaybill-active', 'ewaybill-generate', 'ewaybill-history'],
  gst_access: ['gst', 'gst-returns', 'gst-settings'],
  gst_returns_view: ['gst', 'gst-returns'],
  indent_orders_view: ['daily-indent', 'indent-orders', 'indent-history'],
  indent_approvals: ['daily-indent', 'indent-orders', 'indent-approvals', 'indent-history'],
};

interface SubUserSession {
  id: string;
  name: string;
  email: string;
  permissions: string[];
  isSubUser: boolean;
}

export default function UnionDashboard() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const autoLoginId = params.get('auto_login');
  const idFromUrl = params.get('id');
  const { user } = useAuth();
  
  // Allow access via: auto_login param, id param (for admin access), or merchant_token cookie
  const [merchantId, setMerchantId] = useState<string | null>(autoLoginId || idFromUrl);
  const [cookieAuthLoading, setCookieAuthLoading] = useState(!autoLoginId && !idFromUrl);
  const isAdminViewing = !!idFromUrl && user?.role === 'admin';
  const [acceptingOrders, setAcceptingOrders] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [initialAgentCategory, setInitialAgentCategory] = useState<string>('all');
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [collapsedMenus, setCollapsedMenus] = useState<string[]>([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Get sub-user session from sessionStorage
  const [subUserSession, setSubUserSession] = useState<SubUserSession | null>(null);
  
  // Get staff session from sessionStorage (for staff auto-login)
  const [staffSession, setStaffSession] = useState<{
    isStaff: boolean;
    isDirectLogin?: boolean;
    staffId: string;
    name: string;
    username: string;
    permissions: string[];
    accessTier: string;
    unionId: string;
    designation?: string;
    designationId?: string;
    salesSegment?: string;
    assignedOffice?: string;
    assignedSegments?: string[];
  } | null>(null);
  
  // Auto-login: Call API to set merchant_token cookie when auto_login param is present
  const [autoLoginComplete, setAutoLoginComplete] = useState(false);
  useEffect(() => {
    if (autoLoginId && !autoLoginComplete) {
      fetch('/api/merchant/auto-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ merchantId: autoLoginId })
      })
        .then(res => res.json())
        .then(() => setAutoLoginComplete(true))
        .catch(err => console.error('Auto-login failed:', err));
    }
  }, [autoLoginId, autoLoginComplete]);

  useEffect(() => {
    if (!autoLoginId && !idFromUrl && cookieAuthLoading) {
      fetch('/api/merchant/me', { credentials: 'include' })
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Not authenticated');
        })
        .then(data => {
          if (data?.id) {
            setMerchantId(String(data.id));
          }
          setCookieAuthLoading(false);
        })
        .catch(() => {
          setCookieAuthLoading(false);
        });
    }
  }, [autoLoginId, idFromUrl, cookieAuthLoading]);

  useEffect(() => {
    const storedSubUser = sessionStorage.getItem('unionSubUser');
    if (storedSubUser) {
      try {
        setSubUserSession(JSON.parse(storedSubUser));
      } catch (e) {
        console.error('Failed to parse sub-user session:', e);
      }
    }
    
    // Check for staff session (auto-login)
    const storedStaff = sessionStorage.getItem('staffSession');
    if (storedStaff) {
      try {
        setStaffSession(JSON.parse(storedStaff));
      } catch (e) {
        console.error('Failed to parse staff session:', e);
      }
    }
  }, []);
  
  // Get display name - show sub-user name or staff name if logged in as sub-user/staff
  const displayName = staffSession?.isStaff ? staffSession.name : (subUserSession?.isSubUser ? subUserSession.name : null);

  const { data: merchant, isLoading, error } = useQuery<Merchant>({
    queryKey: ['/api/merchant', merchantId],
    queryFn: async () => {
      if (!merchantId) throw new Error('No merchant ID');
      const response = await fetch(`/api/union/${merchantId}`);
      if (!response.ok) throw new Error('Failed to fetch merchant');
      return response.json();
    },
    enabled: !!merchantId,
    staleTime: 60000, // Cache merchant data for 1 minute
    retry: 2,
  });

  const buildStaffFilterParams = () => {
    const params = new URLSearchParams();
    if (staffSession?.assignedOffice) {
      params.set('staffOffice', staffSession.assignedOffice);
    }
    if (staffSession?.assignedSegments && staffSession.assignedSegments.length > 0) {
      params.set('staffSegments', staffSession.assignedSegments.join(','));
    }
    return params.toString() ? `?${params.toString()}` : '';
  };

  // Fetch order counts for sidebar badges
  const { data: ordersData = [] } = useQuery<any[]>({
    queryKey: ['/api/union', merchantId, 'orders', staffSession?.assignedOffice, staffSession?.assignedSegments],
    queryFn: async () => {
      if (!merchantId) return [];
      const response = await fetch(`/api/union/${merchantId}/orders${buildStaffFilterParams()}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!merchantId && !!merchant,
    staleTime: 10000,
    refetchInterval: 15000,
  });

  const prevPendingCountRef = useRef<number | null>(null);
  useEffect(() => {
    if (ordersData.length > 0) {
      const pendingCount = ordersData.filter((o: any) => o.status === 'pending').length;
      if (prevPendingCountRef.current !== null && pendingCount > prevPendingCountRef.current) {
        const newCount = pendingCount - prevPendingCountRef.current;
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const playTone = (freq: number, start: number, dur: number) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.value = freq;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.3, audioCtx.currentTime + start);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + start + dur);
            osc.start(audioCtx.currentTime + start);
            osc.stop(audioCtx.currentTime + start + dur);
          };
          playTone(880, 0, 0.15);
          playTone(1100, 0.15, 0.15);
          playTone(1320, 0.3, 0.25);
        } catch (e) {}
        toast({
          title: `🔔 ${newCount} New Order${newCount > 1 ? 's' : ''} Received!`,
          description: `You have ${pendingCount} pending order${pendingCount > 1 ? 's' : ''} to review.`,
        });
      }
      prevPendingCountRef.current = pendingCount;
    }
  }, [ordersData, toast]);

  // Calculate order counts by status
  const orderCounts = {
    newOrders: ordersData.filter((o: any) => o.status === 'pending').length,
    processing: ordersData.filter((o: any) => o.status === 'accepted').length,
    ready: ordersData.filter((o: any) => o.status === 'ready').length,
    completed: ordersData.filter((o: any) => o.status === 'completed').length,
    scheduled: ordersData.filter((o: any) => o.status === 'scheduled').length,
    all: ordersData.length,
  };

  // Map staff feature permissions to menu items
  const staffPermissionToMenuMap: Record<string, string[]> = {
    // Dashboard
    dashboard: ['dashboard'],
    dashboard_view: ['dashboard'],
    
    // Orders
    orders_view: ['orders', 'new-orders', 'orders-processing', 'orders-ready', 'completed-orders', 'scheduled', 'all-orders'],
    orders_manage: ['orders', 'new-orders', 'orders-processing', 'orders-ready', 'completed-orders', 'scheduled', 'all-orders'],
    
    inventory_view: ['fresh-milk-inventory', 'products-inventory', 'icecream-inventory'],
    inventory_manage: ['fresh-milk-inventory', 'products-inventory', 'icecream-inventory'],
    
    // Reports
    reports_view: ['reports', 'sales-report', 'daily-sales-report', 'sales-summary', 'refund-report', 'credit-report'],
    
    // POS
    pos_access: ['pos', 'pos-create-order', 'pos-order-history'],
    pos_counter_sale: ['pos', 'pos-create-order'],
    pos_tier_federation: ['pos', 'pos-create-order'],
    pos_tier_inter_union: ['pos', 'pos-create-order'],
    pos_tier_wholesale: ['pos', 'pos-create-order'],
    pos_tier_dealer: ['pos', 'pos-create-order'],
    pos_tier_retailer: ['pos', 'pos-create-order'],
    pos_credit_sales: ['pos', 'pos-create-order'],
    
    // B2B Invoice
    b2b_invoice: ['invoice', 'invoice-list'],
    b2b_invoice_federation: ['invoice', 'invoice-list'],
    b2b_invoice_inter_union: ['invoice', 'invoice-list'],
    b2b_invoice_wholesale: ['invoice', 'invoice-list'],
    b2b_invoice_dealer: ['invoice', 'invoice-list'],
    
    // E-way Bill (note: database uses eway_bill_* not ewaybill_*)
    eway_bill_access: ['ewaybill', 'ewaybill-active', 'ewaybill-generate', 'ewaybill-history'],
    eway_bill_generate: ['ewaybill', 'ewaybill-generate'],
    eway_bill_cancel: ['ewaybill'],
    eway_bill_extend: ['ewaybill'],
    ewaybill_access: ['ewaybill', 'ewaybill-active', 'ewaybill-generate', 'ewaybill-history'],
    
    // GST
    gst_details: ['gst', 'gst-returns', 'gst-settings'],
    gst_returns_view: ['gst', 'gst-returns'],
    gst_access: ['gst', 'gst-returns', 'gst-settings'],
    
    // Daily Indent
    indent_orders_view: ['daily-indent', 'indent-orders', 'indent-history'],
    indent_approvals: ['daily-indent', 'indent-orders', 'indent-approvals', 'indent-history'],
    indent_credit_manage: ['daily-indent', 'indent-orders', 'indent-approvals', 'indent-history'],
    
    // Fresh Milk
    products_view: ['fresh-milk', 'fresh-milk-list', 'fresh-milk-categories', 'fresh-milk-inventory', 'products', 'products-list', 'products-categories', 'products-inventory', 'food', 'food-category', 'addon-category', 'addon-items', 'food-items', 'items-availability'],
    products_manage: ['fresh-milk', 'fresh-milk-list', 'fresh-milk-categories', 'fresh-milk-inventory', 'products', 'products-list', 'products-categories', 'products-inventory', 'food', 'food-category', 'addon-category', 'addon-items', 'food-items', 'items-availability'],
    
    // Designation Guide (accessible to managers and above)
    staff_approvals: ['staff', 'staff-approvals', 'staff-all', 'staff-hierarchy', 'designation-guide', 'designation-table'],
    staff_manage: ['staff', 'staff-approvals', 'staff-all', 'staff-hierarchy', 'designation-guide', 'designation-table'],
    
    // DMS
    dms_access: ['dms-inventory', 'dms-grn', 'dms-sales-returns', 'dms-collections', 'dms-schemes', 'dms-sfa', 'dms-vehicles', 'dms-tally', 'dms-gstr'],
    dms_inventory: ['dms-inventory'],
    dms_grn: ['dms-grn'],
    dms_sales_returns: ['dms-sales-returns'],
    dms_collections: ['dms-collections'],
    dms_schemes: ['dms-schemes'],
    dms_sfa: ['dms-sfa'],
    
    // Transport Management
    transport_access: ['dms-transport', 'dms-vehicles'],
    transport_dashboard: ['dms-transport'],
    transport_hubs: ['dms-transport'],
    transport_trips: ['dms-transport'],
    transport_vehicles: ['dms-vehicles', 'dms-transport'],
    transport_route_optimization: ['dms-transport'],
    transport_live_tracking: ['dms-transport'],
    transport_driver_management: ['dms-transport'],
  };
  
  // SalesSegment-based menu filtering for Marketing EOs
  // Only staff with specific sales segments get filtered; all_access means no filtering
  const salesSegmentMenuMap: Record<string, string[]> = {
    'federation_interunion': [
      'dashboard', 
      // Orders
      'orders', 'all-orders', 'new-orders', 'orders-processing', 'orders-ready', 'completed-orders', 'scheduled',
      // Invoice
      'invoice', 'invoice-list',
      // Reports - all report types
      'reports', 'sales-report', 'daily-sales-report', 'sales-summary', 'refund-report', 'credit-report',
      // Users
      'users', 'users-all', 'users-b2c', 'users-b2b', 'users-b2b-registrations', 'all-roles',
      // E-way Bill (Federation/Inter-Union deals with logistics)
      'ewaybill', 'ewaybill-active', 'ewaybill-generate', 'ewaybill-history',
      // GST (Federation/Inter-Union needs GST compliance)
      'gst', 'gst-returns', 'gst-settings'
    ],
    'wsd_dealer': [
      'dashboard',
      // Orders
      'orders', 'all-orders', 'new-orders', 'orders-processing', 'orders-ready', 'completed-orders', 'scheduled',
      // Invoice
      'invoice', 'invoice-list',
      // Reports
      'reports', 'sales-report', 'daily-sales-report', 'sales-summary', 'refund-report', 'credit-report',
      // Users
      'users', 'users-all', 'users-b2c', 'users-b2b', 'users-b2b-registrations', 'all-roles',
      // POS (WSD/Dealer uses POS for sales)
      'pos', 'pos-create-order', 'pos-order-history'
    ],
    'retail_parlour': [
      'dashboard',
      // Orders
      'orders', 'all-orders', 'new-orders', 'orders-processing', 'orders-ready', 'completed-orders', 'scheduled',
      // Invoice
      'invoice', 'invoice-list',
      // Reports
      'reports', 'sales-report', 'daily-sales-report', 'sales-summary', 'refund-report', 'credit-report',
      // Users
      'users', 'users-all', 'users-b2c', 'users-b2b', 'users-b2b-registrations', 'all-roles',
      // POS (Retail/Parlour uses POS heavily)
      'pos', 'pos-create-order', 'pos-order-history'
    ],
    'all_access': [] // Empty means no segment-based restriction (will use permission-based filtering only)
  };
  
  // Get allowed menu items based on sub-user or staff permissions
  const getAllowedMenuItems = (): Set<string> => {
    // Check for staff session first (from auto-login)
    if (staffSession?.isStaff && staffSession.permissions) {
      const allowed = new Set<string>();
      // Only allow dashboard - no settings or merchant info access for staff
      allowed.add('dashboard');
      
      staffSession.permissions.forEach(permission => {
        const menuItems = staffPermissionToMenuMap[permission];
        if (menuItems) {
          menuItems.forEach(item => allowed.add(item));
        }
      });
      
      // Note: salesSegment is stored for reference but does NOT hide any menu items
      // All staff see menus based on their permissions only - nothing is hidden by segment
      return allowed;
    }
    
    // Check for sub-user session
    if (!subUserSession?.isSubUser || !subUserSession.permissions) {
      // If not a sub-user or staff, allow all items (merchant has full access)
      return new Set(flatSidebarItems.flatMap(item => [item.id, ...(item.subItems?.map(sub => sub.id) || [])]));
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

  const applyOrderCounts = (item: SidebarItem): SidebarItem => {
    if (item.id === 'orders' && item.subItems) {
      return {
        ...item,
        subItems: item.subItems.map((subItem) => {
          switch (subItem.id) {
            case 'new-orders': return { ...subItem, count: orderCounts.newOrders };
            case 'orders-processing': return { ...subItem, count: orderCounts.processing };
            case 'orders-ready': return { ...subItem, count: orderCounts.ready };
            case 'completed-orders': return { ...subItem, count: orderCounts.completed };
            case 'scheduled': return { ...subItem, count: orderCounts.scheduled };
            case 'all-orders': return { ...subItem, count: orderCounts.all };
            default: return subItem;
          }
        }),
      };
    }
    return item;
  };

  const filterItem = (item: SidebarItem): SidebarItem | null => {
    if (!allowedMenuItems.has(item.id)) return null;
    const filteredSubItems = item.subItems?.filter(sub => allowedMenuItems.has(sub.id));
    return applyOrderCounts({ ...item, subItems: filteredSubItems });
  };

  const dynamicSidebarEntries: SidebarEntry[] = sidebarEntries
    .map(entry => {
      if ('isSection' in entry && entry.isSection) {
        const filteredChildren = entry.children
          .map(child => filterItem(child))
          .filter((c): c is SidebarItem => c !== null);
        if (filteredChildren.length === 0) return null;
        return { ...entry, children: filteredChildren };
      }
      return filterItem(entry as SidebarItem);
    })
    .filter((e): e is SidebarEntry => e !== null);

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev => 
      prev.includes(menuId) 
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
    setCollapsedMenus(prev =>
      prev.includes(menuId)
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  if (cookieAuthLoading) {
    return (
      <div className="min-h-screen bg-purple-900 flex flex-col items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full mb-4"></div>
        <p className="text-white text-lg">Loading Dashboard...</p>
      </div>
    );
  }

  if (!merchantId) {
    if (user?.role === 'admin') {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>District Union Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Please select a District Union to view from the admin panel.</p>
              <Link href="/admin/merchant">
                <Button className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go to Union Management
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    window.location.href = '/admin/login?tab=union';
    return null;
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
    // Block staff from accessing settings-related sections
    const restrictedSections = ['merchant-info', 'merchant-settings', 'order-limit', 'banner', 'pages', 'menu'];
    if ((staffSession?.isStaff || subUserSession?.isSubUser) && restrictedSections.includes(activeSection)) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <Shield className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Access Restricted</h3>
          <p className="text-gray-500 mt-2">You don't have permission to access this section.</p>
          <Button className="mt-4" onClick={() => setActiveSection('dashboard')}>Go to Dashboard</Button>
        </div>
      );
    }
    
    switch (activeSection) {
      case 'merchant-info':
        return <UnionInfoSection merchant={merchant} />;
      case 'merchant-settings':
        return <UnionSettingsSection />;
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
        return <OrdersSection type={activeSection} merchantId={merchantId} />;
      case 'table-booking-list':
      case 'table-booking-settings':
      case 'table-shifts':
      case 'table-room':
      case 'table-tables':
        return <TableBookingSection type={activeSection} />;
      case 'pos-create-order':
      case 'pos-order-history':
        return <POSSection type={activeSection} merchantId={merchantId} />;
      case 'campaigns':
      case 'active-campaigns':
      case 'create-campaign':
        return <CampaignsSection type={activeSection} />;
      case 'chats':
        return <CommunicationSection type={activeSection} />;
      case 'my-products':
        return <UnionProductsSection merchantId={merchantId} />;
      case 'browse-catalog':
        return <BrowseMasterCatalogSection merchantId={merchantId} onProductAdded={() => setActiveSection('my-products')} />;
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
        return <ImagesSection type={activeSection} merchantId={merchantId} />;
      case 'bulk-upload':
        return <BulkUploadSection merchantId={merchantId} />;
      case 'promo-coupon':
      case 'promo-offers':
        return <PromoSection type={activeSection} />;
      case 'account-statement':
      case 'account-withdrawals':
        return <AccountSection merchant={merchant} type={activeSection} />;
      case 'invoice-list':
        return <InvoiceSection type={activeSection} merchantId={merchantId} merchantData={merchant} />;
      case 'sub-users-list':
      case 'sub-users-permissions':
        return <SubUsersSection merchantId={merchantId} type={activeSection} />;
      case 'staff-approvals':
      case 'staff-all':
      case 'staff-hierarchy':
        return <StaffManagementSection merchantId={merchantId} type={activeSection} />;
      case 'designation-table':
        return <StaffDesignationTable />;
      case 'users-all':
      case 'users-b2c':
      case 'users-b2b':
      case 'users-b2b-registrations':
        return <UnionUsersSection type={activeSection} merchantId={merchantId} />;
      case 'all-roles':
        return <UsersSection type={activeSection} merchantId={merchantId} />;
      case 'sales-report':
      case 'daily-sales-report':
      case 'sales-summary':
      case 'refund-report':
        return <ReportsSection type={activeSection} />;
      case 'credit-report':
        return <CreditReportsSection />;
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
        // Show simplified profile for staff, full account for admins
        if (staffSession?.isStaff) {
          const designationDetails = staffSession.designationId ? getDesignationById(staffSession.designationId) : null;
          return (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">My Profile</h2>
              <Card>
                <CardHeader>
                  <CardTitle>Staff Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="font-medium">{staffSession.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Username</p>
                      <p className="font-medium">{staffSession.username}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Designation</p>
                      <p className="font-medium">{designationDetails?.name || staffSession.designation || 'Staff'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Access Level</p>
                      <Badge variant="outline">{staffSession.accessTier?.replace('_', ' ')}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Permissions</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(staffSession.permissions || []).slice(0, 5).map((p: string) => (
                          <Badge key={p} variant="secondary" className="text-xs">{p.replace('_', ' ')}</Badge>
                        ))}
                        {(staffSession.permissions || []).length > 5 && (
                          <Badge variant="secondary" className="text-xs">+{staffSession.permissions.length - 5} more</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Collapsible Roles & Responsibilities Section */}
              {designationDetails && (designationDetails.responsibilities || designationDetails.moduleAccess) && (
                <Card>
                  <CardHeader className="cursor-pointer" onClick={(e) => {
                    const content = (e.currentTarget.nextElementSibling as HTMLElement);
                    if (content) {
                      content.style.display = content.style.display === 'none' ? 'block' : 'none';
                    }
                  }}>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-500" />
                        My Roles & Responsibilities
                      </span>
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    </CardTitle>
                    <CardDescription>Click to view your duties and module access</CardDescription>
                  </CardHeader>
                  <CardContent style={{ display: 'none' }}>
                    {designationDetails.responsibilities && designationDetails.responsibilities.length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-700 mb-3">Key Responsibilities</h4>
                        <ul className="space-y-2">
                          {designationDetails.responsibilities.map((resp, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <span className="text-green-500 mt-0.5">•</span>
                              <span>{resp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {designationDetails.moduleAccess && (
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-3">Module Access</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm font-medium text-blue-700">Orders</p>
                            <p className="text-xs text-blue-600">{(MODULE_ACCESS_LABELS.orders as Record<string, string>)[designationDetails.moduleAccess.orders] || designationDetails.moduleAccess.orders}</p>
                          </div>
                          <div className="p-3 bg-green-50 rounded-lg">
                            <p className="text-sm font-medium text-green-700">Reports</p>
                            <p className="text-xs text-green-600">{(MODULE_ACCESS_LABELS.reports as Record<string, string>)[designationDetails.moduleAccess.reports] || designationDetails.moduleAccess.reports}</p>
                          </div>
                          <div className="p-3 bg-yellow-50 rounded-lg">
                            <p className="text-sm font-medium text-yellow-700">Payments</p>
                            <p className="text-xs text-yellow-600">{(MODULE_ACCESS_LABELS.payments as Record<string, string>)[designationDetails.moduleAccess.payments] || designationDetails.moduleAccess.payments}</p>
                          </div>
                          <div className="p-3 bg-purple-50 rounded-lg">
                            <p className="text-sm font-medium text-purple-700">Users/Staff</p>
                            <p className="text-xs text-purple-600">{(MODULE_ACCESS_LABELS.users as Record<string, string>)[designationDetails.moduleAccess.users] || designationDetails.moduleAccess.users}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          );
        }
        return <AccountSection merchant={merchant} type="statement" />;
      case 'invoice':
        return <InvoiceSection type="invoice-list" merchantId={merchantId} merchantData={merchant} />;
      case 'users':
        return <UnionUsersSection type="users-all" merchantId={merchantId} />;
      case 'reports':
        return <ReportsSection type="sales-report" />;
      case 'printers':
        return <PrintersSection type="all-printers" />;
      case 'inventory':
        return <InventorySection />;
      case 'food':
        return <FoodSection type="category" merchantId={merchantId} />;
      case 'promo':
        return <PromoSection type="coupon" />;
      // E-way Bill sections
      case 'ewaybill':
      case 'ewaybill-active':
      case 'ewaybill-generate':
      case 'ewaybill-history':
        return <EwayBillSection type={activeSection} merchantId={merchantId} />;
      // GST sections
      case 'gst':
      case 'gst-returns':
      case 'gst-settings':
        return <GSTSection type={activeSection} merchantId={merchantId} />;
      // Daily Indent sections
      case 'daily-indent':
      case 'indent-orders':
      case 'indent-approvals':
      case 'indent-history':
        return <DailyIndentSection type={activeSection} merchantId={merchantId} />;
      case 'dms-inventory':
        return <Suspense fallback={<div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>}><DMSInventory /></Suspense>;
      case 'dms-grn':
        return <Suspense fallback={<div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>}><DmsGrn /></Suspense>;
      case 'dms-sales-returns':
        return <Suspense fallback={<div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>}><DmsSalesReturns /></Suspense>;
      case 'dms-collections':
        return <Suspense fallback={<div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>}><DmsCollections /></Suspense>;
      case 'dms-schemes':
        return <Suspense fallback={<div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>}><DMSSchemes /></Suspense>;
      case 'dms-sfa':
        return <Suspense fallback={<div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>}><DmsSfa /></Suspense>;
      case 'dms-vehicles':
        return <Suspense fallback={<div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>}><DmsVehicles /></Suspense>;
      case 'dms-transport':
        return <Suspense fallback={<div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>}><DmsTransport /></Suspense>;
      case 'dms-tally':
        return <Suspense fallback={<div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>}><DmsTally /></Suspense>;
      case 'dms-gstr':
        return <Suspense fallback={<div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>}><DmsGstr /></Suspense>;
      default:
        return <DashboardSection merchantId={merchantId} staffSalesSegment={staffSession?.salesSegment} ordersData={ordersData} isStaffLogin={!!staffSession?.isStaff} onNavigate={(section, category) => {
          if (category) setInitialAgentCategory(category);
          setActiveSection(section);
        }} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Admin Viewing Banner */}
      {isAdminViewing && (
        <div className="bg-orange-500 text-white px-4 py-2 flex items-center justify-between">
          <span className="text-sm font-medium">
            Admin View: Viewing {merchant.restaurantName}'s dashboard
          </span>
          <Link href="/admin/merchant">
            <Button size="sm" variant="outline" className="bg-white text-orange-600 hover:bg-orange-50 border-white">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Admin Panel
            </Button>
          </Link>
        </div>
      )}
      
      <div className="flex flex-1">
      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      
      {/* Left Sidebar - Hidden on mobile, shown on md+ */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-50
        w-64 bg-[#2d3748] min-h-screen flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Mobile Close Button */}
        <button 
          className="md:hidden absolute top-4 right-4 text-white p-1"
          onClick={() => setMobileSidebarOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
        
        <div className="p-3 sm:p-4 border-b border-gray-700">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm sm:text-lg shrink-0">
              {(displayName || merchant.restaurantName)?.charAt(0)?.toUpperCase() || 'M'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate text-sm sm:text-base">{displayName || merchant.restaurantName}</p>
              <p className="text-gray-400 text-xs truncate">
                {subUserSession?.isSubUser ? `${merchant.restaurantName}` : merchant.contactEmail}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {dynamicSidebarEntries.map((entry) => {
            if ('isSection' in entry && entry.isSection) {
              const sectionHasActive = entry.children.some(child =>
                activeSection === child.id || child.subItems?.some(sub => sub.id === activeSection)
              );
              const sectionExpanded = collapsedMenus.includes(entry.id) ? expandedMenus.includes(entry.id) : (expandedMenus.includes(entry.id) || sectionHasActive);

              return (
                <div key={entry.id} className="mt-1">
                  <button
                    onClick={() => toggleMenu(entry.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium cursor-pointer rounded-lg transition-colors hover:bg-gray-700 ${
                      sectionHasActive ? 'text-white' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    <entry.icon className="h-5 w-5" />
                    <span className="flex-1 text-left">{entry.label}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 text-gray-400 ${
                      !sectionExpanded ? '-rotate-90' : ''
                    }`} />
                  </button>
                  {sectionExpanded && (
                    <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-600 pl-2">
                      {entry.children.map((item) => {
                        const itemActive = activeSection === item.id || item.subItems?.some(sub => sub.id === activeSection);
                        const itemExpanded = collapsedMenus.includes(item.id) ? expandedMenus.includes(item.id) : (expandedMenus.includes(item.id) || (itemActive && !!item.subItems));

                        if (item.subItems) {
                          return (
                            <div key={item.id}>
                              <button
                                onClick={() => toggleMenu(item.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors cursor-pointer rounded-lg hover:bg-gray-700 ${
                                  itemActive ? 'text-green-400 font-medium' : 'text-gray-300 hover:text-white'
                                }`}
                              >
                                <item.icon className="h-4 w-4" />
                                <span className="flex-1 text-left">{item.label}</span>
                                <ChevronDown className={`h-4 w-4 transition-transform duration-200 text-gray-400 ${
                                  !itemExpanded ? '-rotate-90' : ''
                                }`} />
                              </button>
                              {itemExpanded && (
                                <div className="ml-3 mt-0.5 space-y-0.5 border-l border-gray-600 pl-3">
                                  {item.subItems.map((subItem) => (
                                    <button
                                      key={subItem.id}
                                      onClick={() => {
                                        setActiveSection(subItem.id);
                                        setMobileSidebarOpen(false);
                                      }}
                                      className={`w-full flex items-center justify-between px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                        activeSection === subItem.id
                                          ? 'text-green-400 bg-gray-700 font-semibold'
                                          : 'text-gray-300 hover:text-white hover:bg-gray-700'
                                      }`}
                                    >
                                      <span>{subItem.label}</span>
                                      {subItem.count !== undefined && (
                                        <span className={`flex items-center justify-center min-w-[24px] h-5 px-1.5 rounded-full text-xs font-medium ${
                                          subItem.countColor === 'green' ? 'bg-green-500/20 text-green-400' :
                                          subItem.countColor === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
                                          subItem.countColor === 'blue' ? 'bg-blue-500/20 text-blue-400' :
                                          subItem.countColor === 'orange' ? 'bg-orange-500/20 text-orange-400' :
                                          subItem.countColor === 'teal' ? 'bg-teal-500/20 text-teal-400' :
                                          'bg-gray-500/20 text-gray-400'
                                        }`}>
                                          {subItem.count}
                                        </span>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        }

                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActiveSection(item.id);
                              setMobileSidebarOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                              activeSection === item.id
                                ? 'text-green-400 bg-gray-700 font-semibold'
                                : 'text-gray-300 hover:text-white hover:bg-gray-700'
                            }`}
                          >
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const item = entry as SidebarItem;
            const itemActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors hover:bg-gray-700 ${
                  itemActive ? 'text-green-400 bg-gray-700 font-semibold' : 'text-gray-300 hover:text-white'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Staff Banner - different for impersonated vs direct login */}
        {staffSession?.isStaff && (
          <div className={`${staffSession.isDirectLogin ? 'bg-blue-100 border-b border-blue-200' : 'bg-orange-100 border-b border-orange-200'} px-6 py-2 flex items-center justify-between`}>
            <div className="flex items-center space-x-2">
              <Shield className={`h-4 w-4 ${staffSession.isDirectLogin ? 'text-blue-600' : 'text-orange-600'}`} />
              <span className={`text-sm ${staffSession.isDirectLogin ? 'text-blue-800' : 'text-orange-800'}`}>
                {staffSession.isDirectLogin ? (
                  <><strong>Staff Dashboard:</strong> Logged in as {staffSession.name} ({staffSession.accessTier?.replace('_', ' ')})</>
                ) : (
                  <><strong>Staff View Mode:</strong> Viewing as {staffSession.name} ({staffSession.accessTier?.replace('_', ' ')})</>
                )}
                {staffSession.assignedOffice && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    {staffSession.assignedOffice}
                  </span>
                )}
                {staffSession.assignedSegments && staffSession.assignedSegments.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    {staffSession.assignedSegments.join(', ')}
                  </span>
                )}
                {staffSession.salesSegment && staffSession.salesSegment !== 'all_access' && (
                  <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                    {staffSession.salesSegment === 'products_wsd' ? 'Products - WSD Only'
                      : staffSession.salesSegment === 'products_dlr' ? 'Products - Dealer Only'
                      : staffSession.salesSegment === 'fresh_milk_wsd' ? 'Fresh Milk - WSD Only'
                      : staffSession.salesSegment === 'fresh_milk_dlr' ? 'Fresh Milk - Dealer Only'
                      : staffSession.salesSegment === 'icecream_wsd' ? 'Ice Cream - WSD Only'
                      : staffSession.salesSegment === 'icecream_dlr' ? 'Ice Cream - Dealer Only'
                      : staffSession.salesSegment === 'icecream_retail' ? 'Ice Cream - Retail Only'
                      : staffSession.salesSegment === 'icecream_all' ? 'Ice Cream - All Tiers'
                      : staffSession.salesSegment.replace(/_/g, ' ')}
                  </span>
                )}
              </span>
            </div>
            {staffSession.isDirectLogin ? (
              <Button 
                variant="outline" 
                size="sm" 
                className="text-red-700 border-red-300 hover:bg-red-100"
                onClick={() => {
                  sessionStorage.removeItem('staffSession');
                  window.location.href = '/union-staff-login';
                }}
              >
                Logout
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                className="text-orange-700 border-orange-300 hover:bg-orange-200"
                onClick={() => {
                  sessionStorage.removeItem('staffSession');
                  window.location.reload();
                }}
              >
                Exit Staff View
              </Button>
            )}
          </div>
        )}
        <header className="bg-white border-b h-14 flex items-center justify-between px-3 md:px-6">
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Mobile Menu Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden text-gray-600"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            {!staffSession?.isStaff && (
            <div className="flex items-center space-x-2">
              <Switch 
                checked={acceptingOrders}
                onCheckedChange={setAcceptingOrders}
                className="data-[state=checked]:bg-green-500"
              />
              <span className={`text-xs md:text-sm font-medium ${acceptingOrders ? 'text-green-600' : 'text-gray-500'}`}>
                {acceptingOrders ? 'Accepting' : 'Not Accepting'}
              </span>
            </div>
            )}
            {!staffSession?.isStaff && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-gray-600 hidden sm:flex"
              onClick={() => setActiveSection('all-printers')}
              title="Manage Printers"
            >
              <Printer className="h-5 w-5" />
            </Button>
            )}
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            <NotificationBell />
            {/* Hide storefront/pages options for staff and sub-users */}
            {!staffSession?.isStaff && !subUserSession?.isSubUser && (
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
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-1 md:space-x-2 hover:bg-gray-100 px-2 md:px-4">
                  <Avatar className="h-7 w-7 md:h-8 md:w-8">
                    <AvatarFallback className="bg-orange-500 text-white text-xs">
                      {(displayName || merchant.contactName)?.charAt(0) || 'M'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline text-sm text-gray-700">{displayName || merchant.contactName}</span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {staffSession?.isStaff && (
                  <div className={`px-2 py-1.5 text-xs border-b ${staffSession.isDirectLogin ? 'text-blue-600 bg-blue-50' : 'text-orange-600 bg-orange-50'}`}>
                    <strong>{staffSession.isDirectLogin ? 'Staff:' : 'Staff View:'}</strong> {staffSession.name}
                  </div>
                )}
                {subUserSession?.isSubUser && !staffSession?.isStaff && (
                  <div className="px-2 py-1.5 text-xs text-gray-500 border-b">
                    Sub-user of {merchant.restaurantName}
                  </div>
                )}
                <DropdownMenuItem onClick={() => setActiveSection('account')}>
                  <User className="h-4 w-4 mr-2" />
                  My Account
                </DropdownMenuItem>
                {!subUserSession?.isSubUser && !staffSession?.isStaff && (
                  <DropdownMenuItem onClick={() => setActiveSection('merchant-settings')}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600 focus:text-red-600" 
                  onClick={() => {
                    // Clear sub-user and staff session on logout
                    sessionStorage.removeItem('unionSubUser');
                    sessionStorage.removeItem('staffSession');
                    window.location.href = '/union/login';
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Hide settings gear for staff and sub-users */}
            {!staffSession?.isStaff && !subUserSession?.isSubUser && (
              <Button variant="ghost" size="icon" onClick={() => setActiveSection('merchant-settings')}>
                <Settings className="h-5 w-5 text-gray-600" />
              </Button>
            )}
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto pb-20 sm:pb-6">
          {renderContent()}
        </main>
      </div>
      </div>
    </div>
  );
}

function DashboardSection({ merchantId, staffSalesSegment, onNavigate, ordersData = [], isStaffLogin = false }: { merchantId?: string | null; staffSalesSegment?: string; onNavigate?: (section: string, category?: string) => void; ordersData?: any[]; isStaffLogin?: boolean }) {
  const { data: dashStats } = useQuery<any>({
    queryKey: ['/api/union', merchantId, 'dashboard-stats'],
    queryFn: async () => {
      if (!merchantId) return null;
      const res = await fetch(`/api/union/${merchantId}/dashboard-stats`, { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!merchantId,
    refetchInterval: 30000,
  });

  const { data: allProducts = [], isLoading: productsLoading } = useQuery<any[]>({
    queryKey: ['/api/union', merchantId, 'my-products'],
    queryFn: async () => {
      if (!merchantId) return [];
      const res = await fetch(`/api/union/${merchantId}/my-products`);
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!merchantId,
  });

  const freshMilkProducts = allProducts.filter((item: any) => item.masterProduct?.segment === 'Fresh Milk');
  const productsSegment = allProducts.filter((item: any) => item.masterProduct?.segment === 'Products');
  const iceCreamProducts = allProducts.filter((item: any) => item.masterProduct?.segment === 'Ice Cream');
  const freshMilkCategories = [...new Set(freshMilkProducts.map((p: any) => p.masterProduct?.category || 'Uncategorized'))];
  const productsCategories = [...new Set(productsSegment.map((p: any) => p.masterProduct?.category || 'Uncategorized'))];
  const iceCreamCategories = [...new Set(iceCreamProducts.map((p: any) => p.masterProduct?.category || 'Uncategorized'))];

  const { data: agents = [] } = useQuery<any[]>({
    queryKey: ['/api/merchant', merchantId, 'agents'],
    queryFn: async () => {
      if (!merchantId) return [];
      const res = await fetch(`/api/merchant/${merchantId}/agents`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!merchantId,
  });

  const { data: b2bUsers = [] } = useQuery<any[]>({
    queryKey: ['/api/merchant', merchantId, 'users', 'b2b'],
    queryFn: async () => {
      if (!merchantId) return [];
      const res = await fetch(`/api/merchant/${merchantId}/users?type=b2b`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!merchantId,
  });

  const userRoleCounts = b2bUsers.reduce((acc: Record<string, number>, u: any) => {
    const bt = (u.businessType || '').toUpperCase();
    let key = 'general_shop';
    if (bt === 'WSD') key = 'wsd';
    else if (bt === 'DLR' || bt === 'DEALER') key = 'dealer';
    else if (bt === 'MPCS') key = 'mpcs';
    else if (bt === 'HOTELS' || bt === 'HOTEL') key = 'hotel';
    else if (bt === 'INSTUTION' || bt === 'INSTITUTION') key = 'institution';
    else if (bt === 'PRIVATE PARLOUR') key = 'private_parlour';
    else if (bt === 'UNION PARLOUR') key = 'union_parlour';
    else if (bt === 'GENERAL SHOP' || bt === 'RETAIL') key = 'general_shop';
    else if (bt === 'RETAILER' || bt === 'RTL') key = 'retailer';
    else {
      const role = u.role || '';
      if (role === 'wholesale_dealer' || role === 'wsd') key = 'wsd';
      else if (role === 'dealer') key = 'dealer';
      else if (role === 'retailer') key = 'retailer';
      else if (role === 'mpcs') key = 'mpcs';
      else if (role === 'hotel') key = 'hotel';
      else if (role === 'institution') key = 'institution';
      else if (role === 'private_parlour') key = 'private_parlour';
      else if (role === 'union_parlour') key = 'union_parlour';
      else key = 'general_shop';
    }
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryCounts = agents.reduce((acc: Record<string, number>, agent: any) => {
    const cat = agent.agentType || agent.agent_type || 'AGENT';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const freshMilkTierCounts = agents.reduce((acc: Record<string, number>, agent: any) => {
    const tier = agent.freshMilkTier;
    if (tier) acc[tier] = (acc[tier] || 0) + 1;
    return acc;
  }, {});

  const productsTierCounts = agents.reduce((acc: Record<string, number>, agent: any) => {
    const tier = agent.productTier;
    if (tier) acc[tier] = (acc[tier] || 0) + 1;
    return acc;
  }, {});

  const iceCreamTierCounts = agents.reduce((acc: Record<string, number>, agent: any) => {
    const tier = agent.iceCreamTier;
    if (tier) acc[tier] = (acc[tier] || 0) + 1;
    return acc;
  }, {});

  const freshMilkBuyerTotal = Object.values(freshMilkTierCounts).reduce((a: number, b: number) => a + b, 0);
  const productsBuyerTotal = Object.values(productsTierCounts).reduce((a: number, b: number) => a + b, 0);
  const iceCreamBuyerTotal = Object.values(iceCreamTierCounts).reduce((a: number, b: number) => a + b, 0);

  const isSegmentRestricted = staffSalesSegment && staffSalesSegment !== 'all_access';
  const showFreshMilk = !isSegmentRestricted || staffSalesSegment?.startsWith('fresh_milk');
  const showProducts = !isSegmentRestricted || staffSalesSegment?.startsWith('products');
  const showIceCream = !isSegmentRestricted || staffSalesSegment?.startsWith('icecream');
  const segmentTierFilter = isSegmentRestricted ? staffSalesSegment?.split('_').pop()?.toUpperCase() : null;

  const filteredAgents = isSegmentRestricted
    ? agents.filter((agent: any) => {
        if (showProducts && !showFreshMilk && !showIceCream) {
          return segmentTierFilter ? agent.productTier === segmentTierFilter : true;
        }
        if (showFreshMilk && !showProducts && !showIceCream) {
          return segmentTierFilter ? agent.freshMilkTier === segmentTierFilter : true;
        }
        if (showIceCream && !showProducts && !showFreshMilk) {
          return segmentTierFilter && segmentTierFilter !== 'ALL' ? agent.iceCreamTier === segmentTierFilter : true;
        }
        return true;
      })
    : agents;

  const filteredCategoryCounts = filteredAgents.reduce((acc: Record<string, number>, agent: any) => {
    const cat = agent.agentType || agent.agent_type || 'AGENT';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const categoryCards = [
    { key: 'all', label: 'All Buyers', count: filteredAgents.length, color: 'bg-blue-500 text-white', icon: '👥' },
    { key: 'AGENT', label: 'Agents/Dealers', count: filteredCategoryCounts['AGENT'] || 0, color: 'bg-blue-100 text-blue-700', icon: '🏪' },
    { key: 'PRIVATE_PARLOUR', label: 'Private Parlours', count: filteredCategoryCounts['PRIVATE_PARLOUR'] || 0, color: 'bg-purple-100 text-purple-700', icon: '🏬' },
    { key: 'INSTUTION', label: 'Institutions', count: filteredCategoryCounts['INSTUTION'] || 0, color: 'bg-amber-100 text-amber-700', icon: '🏛️' },
    { key: 'WSD', label: 'Wholesale Dealers', count: filteredCategoryCounts['WSD'] || 0, color: 'bg-green-100 text-green-700', icon: '📦' },
    { key: 'HOTELS', label: 'Hotels', count: filteredCategoryCounts['HOTELS'] || 0, color: 'bg-orange-100 text-orange-700', icon: '🏨' },
    { key: 'UNION_PARLOUR', label: 'Union Parlours', count: filteredCategoryCounts['UNION_PARLOUR'] || 0, color: 'bg-indigo-100 text-indigo-700', icon: '🏢' },
  ].filter(cat => !isSegmentRestricted || cat.count > 0 || cat.key === 'all');

  const segmentLabel = isSegmentRestricted
    ? staffSalesSegment === 'products_wsd' ? 'Products - WSD Only'
      : staffSalesSegment === 'products_dlr' ? 'Products - Dealer Only'
      : staffSalesSegment === 'fresh_milk_wsd' ? 'Fresh Milk - WSD Only'
      : staffSalesSegment === 'fresh_milk_dlr' ? 'Fresh Milk - Dealer Only'
      : staffSalesSegment === 'icecream_wsd' ? 'Ice Cream - WSD Only'
      : staffSalesSegment === 'icecream_dlr' ? 'Ice Cream - Dealer Only'
      : staffSalesSegment === 'icecream_retail' ? 'Ice Cream - Retail Only'
      : staffSalesSegment === 'icecream_all' ? 'Ice Cream - All Tiers'
      : staffSalesSegment?.replace(/_/g, ' ')
    : null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOrders = ordersData.filter((o: any) => {
    const d = o.createdAt ? new Date(o.createdAt) : null;
    return d && d >= today;
  });
  const todayReceived = todayOrders.length;
  const todayDelivered = todayOrders.filter((o: any) => o.status === 'completed' || o.status === 'delivered').length;
  const todaySales = todayOrders.filter((o: any) => o.status === 'completed' || o.status === 'delivered').reduce((sum: number, o: any) => sum + (parseFloat(o.total) || 0), 0);
  const todayRefund = todayOrders.filter((o: any) => o.status === 'cancelled').reduce((sum: number, o: any) => sum + (parseFloat(o.total) || 0), 0);
  const todayPending = todayOrders.filter((o: any) => o.status === 'pending').length;

  const pendingOrders = ordersData.filter((o: any) => o.status === 'pending');
  const recentPendingOrders = pendingOrders.slice(0, 10);

  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);
  const monthOrders = ordersData.filter((o: any) => {
    const d = o.createdAt ? new Date(o.createdAt) : null;
    return d && d >= thisMonth && (o.status === 'completed' || o.status === 'delivered');
  });
  const itemSoldCounts: Record<string, { name: string; count: number; segment: string }> = {};
  monthOrders.forEach((o: any) => {
    const items = o.items || [];
    if (typeof items === 'string') {
      try {
        const parsed = JSON.parse(items);
        parsed.forEach((item: any) => {
          const name = item.name || item.productName || 'Unknown';
          if (!itemSoldCounts[name]) itemSoldCounts[name] = { name, count: 0, segment: item.segment || '' };
          itemSoldCounts[name].count += (item.quantity || 1);
        });
      } catch {}
    } else if (Array.isArray(items)) {
      items.forEach((item: any) => {
        const name = item.name || item.productName || 'Unknown';
        if (!itemSoldCounts[name]) itemSoldCounts[name] = { name, count: 0, segment: item.segment || '' };
        itemSoldCounts[name].count += (item.quantity || 1);
      });
    }
  });
  const topItemsSold = Object.values(itemSoldCounts).sort((a, b) => b.count - a.count).slice(0, 3);

  const processingCount = ordersData.filter((o: any) => o.status === 'accepted' || o.status === 'processing').length;
  const completedCount = ordersData.filter((o: any) => o.status === 'completed' || o.status === 'delivered').length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {isSegmentRestricted && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-center gap-2">
          <Package className="h-4 w-4 text-purple-600 flex-shrink-0" />
          <span className="text-sm text-purple-800">
            Showing <strong>{segmentLabel}</strong> data only ({filteredAgents.length} buyers)
          </span>
        </div>
      )}
      {!isStaffLogin && (
      <Card className="border border-gray-100 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                <Users className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">B2B Users by Business Type</CardTitle>
                <CardDescription className="text-xs">Registered users under this union</CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="font-mono text-xs">{b2bUsers.length} total</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
            {[
              { key: 'wsd', label: 'WSD', icon: <Truck className="h-3.5 w-3.5" />, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
              { key: 'dealer', label: 'Dealer', icon: <ShoppingBag className="h-3.5 w-3.5" />, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
              { key: 'retailer', label: 'Retailer', icon: <Store className="h-3.5 w-3.5" />, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100' },
              { key: 'mpcs', label: 'MPCS', icon: <Warehouse className="h-3.5 w-3.5" />, color: 'text-lime-600', bg: 'bg-lime-50', border: 'border-lime-100' },
              { key: 'hotel', label: 'Hotel', icon: <Hotel className="h-3.5 w-3.5" />, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
              { key: 'institution', label: 'Institution', icon: <GraduationCap className="h-3.5 w-3.5" />, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
              { key: 'private_parlour', label: 'Pvt Parlour', icon: <Store className="h-3.5 w-3.5" />, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-100' },
              { key: 'union_parlour', label: 'Union Parlour', icon: <Building2 className="h-3.5 w-3.5" />, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-100' },
              { key: 'general_shop', label: 'Gen Shop/MRP', icon: <ShoppingBag className="h-3.5 w-3.5" />, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
            ].map(item => (
              <div key={item.key} className={`${item.bg} ${item.border} border rounded-xl p-2.5 text-center transition-all hover:shadow-md`}>
                <div className={`${item.color} flex justify-center mb-1`}>{item.icon}</div>
                <div className="text-lg font-bold text-gray-900">{userRoleCounts[item.key] || 0}</div>
                <div className="text-[9px] text-gray-500 mt-0.5 leading-tight">{item.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      )}
      <div className={`grid grid-cols-1 ${[showFreshMilk, showProducts, showIceCream].filter(Boolean).length >= 3 ? 'md:grid-cols-3' : [showFreshMilk, showProducts, showIceCream].filter(Boolean).length === 2 ? 'md:grid-cols-2' : ''} gap-3 sm:gap-4`}>
        {showFreshMilk && (
        <Card className="border-l-4 border-l-cyan-500 hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate?.('my-products')}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                  <Milk className="h-5 w-5 text-cyan-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900">Fresh Milk</h3>
                  <p className="text-[10px] sm:text-xs text-gray-500">HSN 0401 | 0% GST</p>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-bold text-cyan-600">{productsLoading ? '—' : freshMilkProducts.length}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500">Products</p>
                </div>
                <div className="w-px h-8 bg-gray-200"></div>
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-bold text-cyan-600">{freshMilkBuyerTotal}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500">Buyers</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {freshMilkCategories.map((cat: string) => (
                <span key={cat} className="px-2 py-0.5 bg-cyan-50 text-cyan-700 text-[10px] sm:text-xs rounded-full border border-cyan-200">
                  {cat}
                </span>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-gray-100">
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {[
                  { key: 'WSD', label: 'WSD' },
                  { key: 'DLR', label: 'Dealer' },
                  { key: 'MRP', label: 'MRP' },
                ].map(item => (
                  <span key={item.key} className="text-[10px] sm:text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">{freshMilkTierCounts[item.key] || 0}</span> {item.label}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {showProducts && (
        <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate?.('my-products')}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Package className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900">Products</h3>
                  <p className="text-[10px] sm:text-xs text-gray-500">Dairy Products | Various GST</p>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-bold text-green-600">{productsLoading ? '—' : productsSegment.length}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500">Products</p>
                </div>
                <div className="w-px h-8 bg-gray-200"></div>
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-bold text-green-600">{productsBuyerTotal}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500">Buyers</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {productsCategories.slice(0, 6).map((cat: string) => (
                <span key={cat} className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] sm:text-xs rounded-full border border-green-200">
                  {cat}
                </span>
              ))}
              {productsCategories.length > 6 && (
                <span className="px-2 py-0.5 bg-gray-50 text-gray-600 text-[10px] sm:text-xs rounded-full border border-gray-200">
                  +{productsCategories.length - 6} more
                </span>
              )}
            </div>
            <div className="mt-2 pt-2 border-t border-gray-100">
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {[
                  { key: 'WSD', label: 'WSD' },
                  { key: 'DLR', label: 'Dealer' },
                  { key: 'MRP', label: 'MRP' },
                ].map(item => (
                  <span key={item.key} className="text-[10px] sm:text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">{productsTierCounts[item.key] || 0}</span> {item.label}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {showIceCream && (
        <Card className="border-l-4 border-l-pink-500 hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate?.('my-products')}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                  <span className="text-lg">🍦</span>
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900">Ice Cream</h3>
                  <p className="text-[10px] sm:text-xs text-gray-500">Frozen Desserts | Various GST</p>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-bold text-pink-600">{productsLoading ? '—' : iceCreamProducts.length}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500">Products</p>
                </div>
                <div className="w-px h-8 bg-gray-200"></div>
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-bold text-pink-600">{iceCreamBuyerTotal}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500">Buyers</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {iceCreamCategories.map((cat: string) => (
                <span key={cat} className="px-2 py-0.5 bg-pink-50 text-pink-700 text-[10px] sm:text-xs rounded-full border border-pink-200">
                  {cat}
                </span>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-gray-100">
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {[
                  { key: 'WSD', label: 'WSD' },
                  { key: 'DLR', label: 'Dealer' },
                  { key: 'MRP', label: 'MRP' },
                ].map(item => (
                  <span key={item.key} className="text-[10px] sm:text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">{iceCreamTierCounts[item.key] || 0}</span> {item.label}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        )}
      </div>


    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 md:gap-6">
      <div className="lg:col-span-8 space-y-3 sm:space-y-4 md:space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          <Card className="bg-white">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center space-x-2 mb-1 sm:mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-500 text-xl sm:text-2xl font-bold">{todayReceived}</span>
              </div>
              <p className="text-gray-500 text-xs sm:text-sm">Orders Received Today</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center space-x-2 mb-1 sm:mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-500 text-xl sm:text-2xl font-bold">{todayDelivered}</span>
              </div>
              <p className="text-gray-500 text-xs sm:text-sm">Delivered Today</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center space-x-2 mb-1 sm:mb-2">
                <div className={`w-2 h-2 ${todaySales > 0 ? 'bg-green-500' : 'bg-gray-400'} rounded-full`}></div>
                <span className={`${todaySales > 0 ? 'text-green-600' : 'text-gray-700'} text-lg sm:text-2xl font-bold`}>₹{todaySales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <p className="text-gray-500 text-xs sm:text-sm">Today's Sales</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center space-x-2 mb-1 sm:mb-2">
                <div className={`w-2 h-2 ${todayRefund > 0 ? 'bg-red-500' : 'bg-green-500'} rounded-full`}></div>
                <span className={`${todayRefund > 0 ? 'text-red-500' : 'text-green-500'} text-xl sm:text-2xl font-bold`}>₹{todayRefund.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <p className="text-gray-500 text-xs sm:text-sm">Today's Refunds</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{isStaffLogin ? 'Pending Orders Today' : 'Last Orders'}</CardTitle>
                <p className="text-sm text-gray-500">{isStaffLogin ? `${pendingOrders.length} pending orders` : 'Quick management of recent orders'}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200">{pendingOrders.length}</Badge>
                <span className="text-sm text-gray-500">Pending</span>
                <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">{processingCount}</Badge>
                <span className="text-sm text-gray-500">Processing</span>
                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">{completedCount}</Badge>
                <span className="text-sm text-gray-500">Completed</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(isStaffLogin ? recentPendingOrders : ordersData.slice(0, 5)).map((order: any) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="font-medium text-sm text-blue-600">#{order.orderNumber || order.id?.toString().slice(-6)}</p>
                      <p className="text-xs text-gray-500">{order.customerName || order.customer_name || 'Customer'}</p>
                      <p className="text-xs text-gray-400">{order.orderType || order.order_type || 'Delivery'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₹{parseFloat(order.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-gray-500">{order.paymentMethod || order.payment_method || 'COD'}</p>
                  </div>
                  <Badge 
                    variant="outline"
                    className={
                      order.status === 'pending' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                      order.status === 'accepted' || order.status === 'processing' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                      order.status === 'ready' ? 'bg-purple-100 text-purple-700 border-purple-200' :
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
                      title="View Order"
                      onClick={() => onNavigate?.('all-orders')}
                    >
                      <Eye className="h-4 w-4 text-blue-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Top Items Sold This Month</CardTitle>
              <span className="text-sm text-gray-500">{monthOrders.length} completed orders</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topItemsSold.length > 0 ? topItemsSold.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-xl font-bold text-purple-600">
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.segment || 'Products'}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    {item.count} sold
                  </Badge>
                </div>
              )) : (
                <p className="text-sm text-gray-400 text-center py-4">No completed orders this month</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="col-span-12 lg:col-span-4 space-y-4">
        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Users className="h-4 w-4" /> Active Users & Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/15 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{dashStats?.signedInUsers ?? 0}</p>
                <p className="text-xs text-indigo-100">Signed-in Users</p>
              </div>
              <div className="bg-white/15 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{dashStats?.signedInStaff ?? 0}</p>
                <p className="text-xs text-indigo-100">Active Staff</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" /> Revenue Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
              <span className="text-sm text-gray-700">Today's Sales</span>
              <span className="font-bold text-green-600">₹{(dashStats?.today?.sales ?? todaySales).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-700">Yesterday</span>
              <span className="font-bold text-gray-600">₹{(dashStats?.yesterday?.sales ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
              <span className="text-sm text-gray-700">Avg Order Value</span>
              <span className="font-bold text-blue-600">₹{(dashStats?.avgOrderValue ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
              <span className="text-sm text-gray-700">All-Time Revenue</span>
              <span className="font-bold text-purple-600">₹{(dashStats?.totalRevenue ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" /> Order Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { key: 'pending', label: 'Pending', color: 'bg-yellow-500', bg: 'bg-yellow-50' },
              { key: 'marketing_approved', label: 'Approved', color: 'bg-blue-500', bg: 'bg-blue-50' },
              { key: 'assigned_to_delivery', label: 'Assigned to Delivery', color: 'bg-indigo-500', bg: 'bg-indigo-50' },
              { key: 'out_for_delivery', label: 'Out for Delivery', color: 'bg-orange-500', bg: 'bg-orange-50' },
              { key: 'delivered', label: 'Delivered', color: 'bg-green-500', bg: 'bg-green-50' },
            ].map(stage => {
              const count = dashStats?.workflowPipeline?.[stage.key] ?? (dashStats?.ordersByStatus?.[stage.key] ?? 0);
              const total = dashStats?.totalOrders || ordersData.length || 1;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={stage.key} className={`flex items-center justify-between p-2 ${stage.bg} rounded-lg`}>
                  <div className="flex items-center gap-2 flex-1">
                    <div className={`w-2 h-2 rounded-full ${stage.color}`}></div>
                    <span className="text-sm text-gray-700">{stage.label}</span>
                    <div className="flex-1 mx-2">
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full ${stage.color} rounded-full transition-all`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">{count}</Badge>
                </div>
              );
            })}
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border-t mt-1">
              <span className="text-sm font-medium text-gray-700">Delivery Rate</span>
              <span className="font-bold text-green-600">{dashStats?.deliveryRate ?? 0}%</span>
            </div>
          </CardContent>
        </Card>

        {dashStats?.topCustomers && dashStats.topCustomers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Store className="h-4 w-4 text-amber-600" /> Top Customers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dashStats.topCustomers.slice(0, 5).map((c: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-800 truncate max-w-[140px]">{c.name}</p>
                    <p className="text-[10px] text-gray-500">{c.orders} orders</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-green-600">₹{c.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        )}

        {dashStats?.segmentBreakdown && Object.keys(dashStats.segmentBreakdown).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-600" /> Today by Segment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(dashStats.segmentBreakdown).map(([seg, data]: [string, any]) => (
              <div key={seg} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-800">{seg}</p>
                  <p className="text-[10px] text-gray-500">{data.count} orders</p>
                </div>
                <span className="text-sm font-bold text-green-600">₹{data.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        )}

        {ordersData.length > 0 && (
          <Button size="sm" className="w-full" variant="outline" onClick={() => onNavigate?.('all-orders')}>
            View All Orders
          </Button>
        )}
      </div>
    </div>
    </div>
  );
}

function UnionInfoSection({ merchant }: { merchant: Merchant }) {
  const [activeTab, setActiveTab] = useState<'union-info' | 'login-info' | 'address'>('union-info');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [headerPreview, setHeaderPreview] = useState<string | null>(null);

  const tabs = [
    { id: 'union-info' as const, label: 'District Union information', icon: Store },
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
              {activeTab === 'union-info' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-gray-500 text-sm">Union name</Label>
                      <Input defaultValue={merchant.restaurantName} className="mt-1 border-gray-200" />
                    </div>
                    <div>
                      <Label className="text-gray-500 text-sm">Union Code</Label>
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

function UnionInfoSectionOld({ merchant }: { merchant: Merchant }) {
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

function UnionSettingsSection() {
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
  agentCode?: string;
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

function getStaffFilterParams() {
  try {
    const stored = sessionStorage.getItem('staffSession');
    if (!stored) return '';
    const session = JSON.parse(stored);
    const params = new URLSearchParams();
    if (session.assignedOffice) params.set('staffOffice', session.assignedOffice);
    if (session.assignedSegments && session.assignedSegments.length > 0) {
      params.set('staffSegments', session.assignedSegments.join(','));
    }
    return params.toString() ? `?${params.toString()}` : '';
  } catch { return ''; }
}

function OrdersSection({ type, merchantId }: { type: string; merchantId: string | null }) {
  const title = type === 'pending-orders' ? 'Pending Orders' : type === 'completed-orders' ? 'Completed Orders' : type === 'new-orders' ? 'New Orders' : type === 'orders-processing' ? 'Orders Processing' : type === 'orders-ready' ? 'Orders Ready' : type === 'scheduled' ? 'Scheduled Orders' : 'Order history';
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState('10');
  const [selectedOrder, setSelectedOrder] = useState<DisplayOrder | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [filteredOrders, setFilteredOrders] = useState<DisplayOrder[]>([]);
  const [showDriverAssign, setShowDriverAssign] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showBulkApproveConfirm, setShowBulkApproveConfirm] = useState(false);
  const [bulkApproveStatus, setBulkApproveStatus] = useState('confirmed');
  const { toast } = useToast();

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const response = await fetch(`/api/union/${merchantId}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update order');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/union', merchantId, 'orders'] });
      toast({ title: 'Order Updated', description: `Order status changed to ${variables.status}` });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const assignDriverMutation = useMutation({
    mutationFn: async ({ orderId, driverName, driverPhone }: { orderId: string; driverName: string; driverPhone: string }) => {
      const response = await fetch(`/api/union/${merchantId}/orders/${orderId}/assign-driver`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ driverName, driverPhone }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to assign driver');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/union', merchantId, 'orders'] });
      setShowDriverAssign(false);
      setDriverName('');
      setDriverPhone('');
      toast({ title: 'Driver Assigned', description: 'Delivery driver has been assigned to this order' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (orderIds: string[]) => {
      const response = await fetch(`/api/union/${merchantId}/orders/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orderIds }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete orders');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/union', merchantId, 'orders'] });
      setSelectedOrderIds(new Set());
      setShowBulkDeleteConfirm(false);
      toast({ title: 'Orders Deleted', description: `${data.deleted} order(s) deleted successfully` });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async ({ orderIds, targetStatus }: { orderIds: string[]; targetStatus: string }) => {
      const response = await fetch(`/api/union/${merchantId}/orders/bulk-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orderIds, targetStatus }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve orders');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/union', merchantId, 'orders'] });
      setSelectedOrderIds(new Set());
      setShowBulkApproveConfirm(false);
      toast({ title: 'Orders Approved', description: `${data.updated} order(s) updated to ${data.targetStatus}` });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const toggleOrderSelect = (fullId: string) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(fullId)) next.delete(fullId);
      else next.add(fullId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.size === displayOrders.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(displayOrders.map(o => o.fullId)));
    }
  };

  const handleAcceptOrder = () => {
    if (selectedOrder?.fullId) {
      updateOrderStatusMutation.mutate({ orderId: selectedOrder.fullId, status: 'confirmed' });
    }
  };

  const handleRejectOrder = () => {
    if (selectedOrder?.fullId) {
      updateOrderStatusMutation.mutate({ orderId: selectedOrder.fullId, status: 'cancelled' });
    }
  };

  const handleSendProduction = () => {
    if (selectedOrder?.fullId) {
      updateOrderStatusMutation.mutate({ orderId: selectedOrder.fullId, status: 'preparing' });
    }
  };

  const handleOrderPrint = (printType: 'web' | 'pos' | 'production' | 'gst') => {
    if (!selectedOrder) return;

    if (printType === 'gst') {
      window.open(`/order/${selectedOrder.fullId}/invoice`, '_blank');
      return;
    }

    const printWindow = window.open('', 'PrintWindow', 'width=800,height=600,scrollbars=yes');
    if (!printWindow) {
      toast({ title: 'Print Error', description: 'Please allow popups to print', variant: 'destructive' });
      return;
    }

    const dateTime = new Date(selectedOrder.date).toLocaleString('en-IN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
    });

    const items = selectedOrder.itemsList || [];

    if (printType === 'production') {
      printWindow.document.write(`<!DOCTYPE html><html><head><title>Production Order #${selectedOrder.id}</title>
        <style>
          @page { size: 80mm auto; margin: 2mm; }
          body { font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.4; margin: 0; padding: 5mm; width: 76mm; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
          .title { font-size: 16px; font-weight: bold; }
          .order-num { font-size: 24px; font-weight: bold; margin: 8px 0; }
          .items { margin: 10px 0; }
          .item { margin: 8px 0; padding: 5px 0; border-bottom: 1px dashed #ccc; }
          .item-name { font-size: 14px; font-weight: bold; }
          .item-qty { font-size: 18px; font-weight: bold; }
          .footer { text-align: center; margin-top: 15px; border-top: 2px dashed #000; padding-top: 8px; }
        </style></head><body>
          <div class="header"><div class="title">PRODUCTION ORDER</div>
            <div class="order-num">#${selectedOrder.id.toUpperCase()}</div>
            <div>${dateTime}</div></div>
          <div class="items">${items.map((item: any) => `
            <div class="item"><div style="display:flex;justify-content:space-between;">
              <span class="item-name">${item.name}</span>
              <span class="item-qty">x${item.quantity}</span>
            </div></div>`).join('')}</div>
          <div class="footer"><strong>Customer: ${selectedOrder.customer}</strong></div>
        </body></html>`);
    } else if (printType === 'pos') {
      printWindow.document.write(`<!DOCTYPE html><html><head><title>Invoice #${selectedOrder.id}</title>
        <style>
          @page { size: 80mm auto; margin: 2mm; }
          body { font-family: 'Courier New', monospace; font-size: 11px; line-height: 1.3; margin: 0; padding: 3mm; width: 74mm; }
          .center { text-align: center; }
          .header { border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
          .logo { font-size: 16px; font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; margin: 2px 0; }
          .total-row { font-weight: bold; font-size: 13px; }
          .footer { margin-top: 10px; font-size: 9px; }
        </style></head><body>
          <div class="header center"><div class="logo">AAVIN CART - TCMPF</div>
            <div style="font-size:9px;">Tamil Nadu Cooperative Milk Producers' Federation</div>
            <div style="margin-top:5px;">Order #${selectedOrder.id.toUpperCase()}</div></div>
          <div class="divider"></div>
          <div class="row"><span>Customer:</span><span>${selectedOrder.customer}</span></div>
          <div class="row"><span>Date:</span><span>${dateTime}</span></div>
          <div class="row"><span>Status:</span><span>${selectedOrder.status.toUpperCase()}</span></div>
          <div class="divider"></div>
          ${items.map((item: any) => `<div class="row"><span>${item.quantity}x ${item.name}</span><span>₹${(parseFloat(item.price) * item.quantity).toFixed(2)}</span></div>`).join('')}
          <div class="divider"></div>
          <div class="row"><span>Subtotal:</span><span>₹${selectedOrder.subtotal.toFixed(2)}</span></div>
          ${selectedOrder.tax > 0 ? `<div class="row"><span>Tax:</span><span>₹${selectedOrder.tax.toFixed(2)}</span></div>` : ''}
          <div class="divider"></div>
          <div class="row total-row"><span>TOTAL:</span><span>₹${selectedOrder.total.toFixed(2)}</span></div>
          <div class="divider"></div>
          <div class="footer center"><div>Thank you for your order!</div>
            <div>Printed on: ${new Date().toLocaleString('en-IN')}</div></div>
        </body></html>`);
    } else {
      printWindow.document.write(`<!DOCTYPE html><html><head><title>Order #${selectedOrder.id} - Aavin Cart</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.5; margin: 0; padding: 20px; max-width: 210mm; }
          .invoice { max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #4AB3E8; padding-bottom: 15px; margin-bottom: 20px; }
          .header-center { text-align: center; flex:1; }
          .header-center h1 { color: #1E3A5F; font-size: 22px; margin: 0; }
          .header-center .subtitle { font-size: 11px; color: #666; }
          .section { margin-bottom: 20px; }
          .section-title { font-size: 14px; font-weight: bold; color: #1E3A5F; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .info-row { display: flex; }
          .info-label { width: 120px; color: #666; }
          .info-value { flex: 1; font-weight: 500; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th { background: #f5f5f5; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; }
          td { padding: 10px; border-bottom: 1px solid #eee; }
          .text-right { text-align: right; }
          .summary { margin-left: auto; width: 250px; }
          .summary-row { display: flex; justify-content: space-between; padding: 5px 0; }
          .summary-total { font-size: 16px; font-weight: bold; border-top: 2px solid #1E3A5F; margin-top: 10px; padding-top: 10px; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 11px; }
          .status-badge { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
          .status-pending { background: #fef3c7; color: #92400e; }
          .status-confirmed { background: #dbeafe; color: #1e40af; }
          .status-cancelled { background: #fecaca; color: #991b1b; }
          .status-preparing { background: #e9d5ff; color: #6b21a8; }
          .status-delivered, .status-completed { background: #dcfce7; color: #166534; }
        </style></head><body>
          <div class="invoice">
            <div class="header"><div>${dateTime}</div>
              <div class="header-center"><h1>AAVIN CART - TCMPF</h1>
                <div class="subtitle">Order #${selectedOrder.id.toUpperCase()}</div></div><div></div></div>
            <div class="section"><div class="section-title">Order Details</div>
              <div class="info-grid">
                <div class="info-row"><span class="info-label">Order ID:</span><span class="info-value">${selectedOrder.fullId}</span></div>
                <div class="info-row"><span class="info-label">Customer:</span><span class="info-value">${selectedOrder.customer}</span></div>
                <div class="info-row"><span class="info-label">Phone:</span><span class="info-value">${selectedOrder.phone}</span></div>
                <div class="info-row"><span class="info-label">Address:</span><span class="info-value">${selectedOrder.address}</span></div>
                <div class="info-row"><span class="info-label">Status:</span><span class="info-value"><span class="status-badge status-${selectedOrder.status}">${selectedOrder.status.toUpperCase()}</span></span></div>
                <div class="info-row"><span class="info-label">Payment:</span><span class="info-value">${selectedOrder.payment}</span></div>
              </div></div>
            <div class="section"><div class="section-title">Items</div>
              <table><thead><tr><th>Item</th><th>Qty</th><th class="text-right">Price</th><th class="text-right">Total</th></tr></thead>
                <tbody>${items.length > 0 ? items.map((item: any) => `
                  <tr><td>${item.name}</td><td>${item.quantity}</td>
                    <td class="text-right">₹${parseFloat(item.price).toFixed(2)}</td>
                    <td class="text-right">₹${(parseFloat(item.price) * item.quantity).toFixed(2)}</td></tr>
                `).join('') : '<tr><td colspan="4" style="text-align:center">Order items</td></tr>'}</tbody></table>
              <div class="summary">
                <div class="summary-row"><span>Subtotal:</span><span>₹${selectedOrder.subtotal.toFixed(2)}</span></div>
                ${selectedOrder.tax > 0 ? `<div class="summary-row"><span>Tax:</span><span>₹${selectedOrder.tax.toFixed(2)}</span></div>` : ''}
                ${selectedOrder.deliveryFee > 0 ? `<div class="summary-row"><span>Delivery Fee:</span><span>₹${selectedOrder.deliveryFee.toFixed(2)}</span></div>` : ''}
                <div class="summary-row summary-total"><span>Total Amount:</span><span>₹${selectedOrder.total.toFixed(2)}</span></div>
              </div></div>
            <div class="footer"><div>Tamil Nadu Cooperative Milk Producers' Federation</div>
              <div>Thank you for your order!</div>
              <div style="margin-top:10px;">Printed on: ${new Date().toLocaleString('en-IN')}</div></div>
          </div></body></html>`);
    }

    printWindow.document.close();
    setTimeout(() => { printWindow.focus(); printWindow.print(); }, 500);
  };
  
  // Fetch real orders from database using union endpoint
  const staffFilters = getStaffFilterParams();
  const { data: dbOrders = [], isLoading } = useQuery({
    queryKey: ['/api/union', merchantId, 'orders', staffFilters],
    queryFn: async () => {
      if (!merchantId) return [];
      const response = await fetch(`/api/union/${merchantId}/orders${staffFilters}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!merchantId,
  });

  // Transform database orders to display format
  const allOrders: DisplayOrder[] = dbOrders.map((order: any) => {
    const initials = order.customerName?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'WC';
    const itemsList = Array.isArray(order.items) ? order.items : [];
    const itemCount = itemsList.length || 1;
    return {
      id: order.orderNumber ? `#${order.orderNumber}` : `#${order.id?.slice(-6) || order.id}`,
      fullId: order.id,
      customer: order.customerName || 'Walk-in Customer',
      agentCode: order.agentCode || '',
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
      segment: order.productSegment || 'Products',
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
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }) + ' ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
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

  const staffSegments = (() => {
    try {
      const stored = sessionStorage.getItem('staffSession');
      if (!stored) return null;
      const session = JSON.parse(stored);
      const segs: string[] = session.assignedSegments || [];
      if (segs.length > 0 && segs.length < 3) return segs;
      return null;
    } catch { return null; }
  })();
  const SEGMENT_LABEL_MAP: Record<string, string> = { FM: 'Fresh Milk', DP: 'Products', IC: 'Ice Cream' };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{title}</h2>
      
      {staffSegments && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
          <Filter className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <span className="text-sm text-blue-800">
            Showing <strong>{staffSegments.map(s => SEGMENT_LABEL_MAP[s] || s).join(', ')}</strong> segment orders only
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-white">
          <CardContent className="p-3 md:p-4">
            <p className="text-xs md:text-sm text-gray-500">Orders</p>
            <p className="text-xl md:text-2xl font-bold text-gray-800">{allOrders.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-3 md:p-4">
            <p className="text-xs md:text-sm text-gray-500">Cancel</p>
            <p className="text-xl md:text-2xl font-bold text-gray-800">{cancelledCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-3 md:p-4">
            <p className="text-xs md:text-sm text-gray-500">Total refund</p>
            <p className="text-xl md:text-2xl font-bold text-gray-800">₹{refundAmount.toFixed(0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-3 md:p-4">
            <p className="text-xs md:text-sm text-gray-500">Total Orders</p>
            <p className="text-xl md:text-2xl font-bold text-gray-800">₹{totalAmount.toFixed(0)}</p>
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

      {selectedOrderIds.size > 0 && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
          <span className="text-sm font-medium text-blue-700">{selectedOrderIds.size} order(s) selected</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedOrderIds(new Set())}>
              Clear Selection
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" size="sm" onClick={() => setShowBulkApproveConfirm(true)} disabled={bulkApproveMutation.isPending}>
              <CheckCircle className="h-4 w-4 mr-1" /> Approve Selected
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setShowBulkDeleteConfirm(true)} disabled={bulkDeleteMutation.isPending}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete Selected
            </Button>
          </div>
        </div>
      )}

      <Dialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedOrderIds.size} Order(s)?</DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">
              This action cannot be undone. Are you sure you want to permanently delete {selectedOrderIds.size} selected order(s)?
            </p>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowBulkDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => bulkDeleteMutation.mutate(Array.from(selectedOrderIds))} disabled={bulkDeleteMutation.isPending}>
              {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showBulkApproveConfirm} onOpenChange={setShowBulkApproveConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve {selectedOrderIds.size} Order(s)</DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Select the target status for the selected orders:
            </p>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Select value={bulkApproveStatus} onValueChange={setBulkApproveStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="confirmed">Confirmed (Accept Order)</SelectItem>
                <SelectItem value="marketing_approved">Marketing Approved</SelectItem>
                <SelectItem value="assigned_to_delivery">Assign to Delivery</SelectItem>
                <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowBulkApproveConfirm(false)}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => bulkApproveMutation.mutate({ orderIds: Array.from(selectedOrderIds), targetStatus: bulkApproveStatus })} disabled={bulkApproveMutation.isPending}>
              {bulkApproveMutation.isPending ? 'Updating...' : `Approve ${selectedOrderIds.size} Order(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3 md:p-4 w-10">
                  <Checkbox 
                    checked={displayOrders.length > 0 && selectedOrderIds.size === displayOrders.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="text-left p-3 md:p-4 text-xs md:text-sm font-medium text-gray-600">Order ID</th>
                <th className="text-left p-3 md:p-4 text-xs md:text-sm font-medium text-gray-600">Customer</th>
                <th className="text-left p-3 md:p-4 text-xs md:text-sm font-medium text-gray-600">Order Information</th>
                <th className="text-left p-3 md:p-4 text-xs md:text-sm font-medium text-gray-600 hidden sm:table-cell">Platform</th>
                <th className="text-left p-3 md:p-4 text-xs md:text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayOrders.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">No orders found for the selected criteria</td></tr>
              ) : displayOrders.map((order) => (
                <tr key={order.id} className={`border-b hover:bg-gray-50 ${selectedOrderIds.has(order.fullId) ? 'bg-blue-50' : ''}`}>
                  <td className="p-4 w-10">
                    <Checkbox 
                      checked={selectedOrderIds.has(order.fullId)}
                      onCheckedChange={() => toggleOrderSelect(order.fullId)}
                    />
                  </td>
                  <td className="p-4">
                    <span className="font-medium">{order.id}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-purple-100 text-purple-600">{order.avatar}</AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="text-gray-700">{order.customer}</span>
                        {order.agentCode && <span className="text-[10px] text-gray-400 ml-1">({order.agentCode})</span>}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm">{order.items} items</span>
                        <Badge className={
                          order.status === 'completed' ? 'bg-green-500 text-white text-xs' :
                          order.status === 'accepted' ? 'bg-blue-500 text-white text-xs' :
                          order.status === 'cancelled' ? 'bg-red-500 text-white text-xs' :
                          'bg-orange-500 text-white text-xs'
                        }>
                          {order.status}
                        </Badge>
                        <Badge className={`text-[10px] ${
                          (order as any).segment === 'Fresh Milk' ? 'bg-blue-100 text-blue-700' :
                          (order as any).segment === 'Ice Cream' ? 'bg-purple-100 text-purple-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {(order as any).segment}
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
                    selectedOrder.status === 'completed' || selectedOrder.status === 'delivered' ? 'bg-green-500' : 
                    selectedOrder.status === 'cancelled' ? 'bg-red-500' : 
                    selectedOrder.status === 'confirmed' || selectedOrder.status === 'accepted' ? 'bg-blue-500' :
                    selectedOrder.status === 'preparing' ? 'bg-purple-500' :
                    'bg-orange-500'
                  }>{selectedOrder.status}</Badge>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-500">Placed on {selectedOrder && formatDate(selectedOrder.date)}</p>

            {selectedOrder && (
              <div className="flex items-center gap-2 pt-2 flex-wrap">
                <Button 
                  className="bg-green-600 hover:bg-green-700" size="sm"
                  onClick={handleAcceptOrder}
                  disabled={selectedOrder.status !== 'pending' || updateOrderStatusMutation.isPending}
                >
                  Accept
                </Button>
                <Button 
                  variant="destructive" size="sm"
                  onClick={handleRejectOrder}
                  disabled={selectedOrder.status === 'cancelled' || selectedOrder.status === 'delivered' || updateOrderStatusMutation.isPending}
                >
                  Reject
                </Button>
                <Button 
                  className="bg-purple-600 hover:bg-purple-700" size="sm"
                  onClick={handleSendProduction}
                  disabled={selectedOrder.status !== 'confirmed' || updateOrderStatusMutation.isPending}
                >
                  Send Production
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700" size="sm">
                      <Printer className="mr-1 h-4 w-4" /> Print
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOrderPrint('gst')}>
                      <FileText className="mr-2 h-4 w-4" /> GST Tax Invoice
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOrderPrint('web')}>
                      <FileText className="mr-2 h-4 w-4" /> Web Print (A4)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOrderPrint('pos')}>
                      <Printer className="mr-2 h-4 w-4" /> POS (80mm)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOrderPrint('production')}>
                      <ChefHat className="mr-2 h-4 w-4" /> Production Print
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </DialogHeader>
          {selectedOrder && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
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

                <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
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
                          <Badge className={selectedOrder.status === 'completed' || selectedOrder.status === 'delivered' ? 'bg-green-500' : 'bg-orange-500'}>
                            {selectedOrder.status === 'completed' || selectedOrder.status === 'delivered' ? 'Paid' : 'Unpaid'}
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

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Truck className="h-4 w-4" /> Delivery Driver
                  </h3>
                  {showDriverAssign ? (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm text-gray-600">Driver Name</Label>
                        <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Enter driver name" className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Driver Phone</Label>
                        <Input value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} placeholder="Enter phone number" className="mt-1" />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700"
                          disabled={!driverName || assignDriverMutation.isPending}
                          onClick={() => {
                            if (selectedOrder?.fullId) {
                              assignDriverMutation.mutate({ orderId: selectedOrder.fullId, driverName, driverPhone });
                            }
                          }}>
                          {assignDriverMutation.isPending ? 'Assigning...' : 'Assign Driver'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setShowDriverAssign(false); setDriverName(''); setDriverPhone(''); }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-500">Not assigned</p>
                      <button className="text-sm text-green-600 hover:underline mt-1" onClick={() => setShowDriverAssign(true)}>
                        Assign Driver
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
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
                          <Badge className={selectedOrder.status === 'completed' || selectedOrder.status === 'delivered' ? 'bg-green-500' : 'bg-orange-500'}>
                            {selectedOrder.status === 'completed' || selectedOrder.status === 'delivered' ? 'Paid' : 'Pending'}
                          </Badge>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-4">Summary</h3>
                  
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

                <div className="bg-white border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-2">Quick Print</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded" onClick={() => handleOrderPrint('gst')}>
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="text-sm">Invoice (A4)</span>
                    </div>
                    <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded" onClick={() => handleOrderPrint('production')}>
                      <div className="w-3 h-3 rounded-full bg-gray-300" />
                      <span className="text-sm">Production Order</span>
                    </div>
                    <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded" onClick={() => handleOrderPrint('pos')}>
                      <div className="w-3 h-3 rounded-full bg-gray-300" />
                      <span className="text-sm">Delivery Slip</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => handleDownloadReceipt(selectedOrder)} className="flex-1 bg-green-500 hover:bg-green-600">
                    <Download className="h-4 w-4 mr-2" /> Download Receipt
                  </Button>
                  <Button variant="outline" onClick={() => handleOrderPrint('web')}>
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
      const response = await fetch(`/api/union/${merchantId}/categories`);
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
      const response = await fetch(`/api/union/${merchantId}/menu-items/${editingItem.id}`, {
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
      const response = await fetch(`/api/union/${merchantId}/menu-items/${itemId}`, {
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
      const response = await fetch(`/api/union/${merchantId}/menu-items/${itemId}/copy`, {
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
      const response = await fetch(`/api/union/${merchantId}/menu-items/${itemId}`, {
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
      const response = await fetch(`/api/union/${merchantId}/categories/${categoryId}`, {
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
      const response = await fetch(`/api/union/${merchantId}/categories/${categoryId}`, {
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
      const response = await fetch(`/api/union/${merchantId}/categories`, {
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
                      <TableHead>Packaging</TableHead>
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
                        <TableCell>
                          {item.originalItem?.packagingType ? (
                            <div className="text-xs">
                              <span className="font-medium capitalize">{item.originalItem.packagingType}</span>
                              {item.originalItem.unitsPerPackage && (
                                <span className="text-gray-500"> × {item.originalItem.unitsPerPackage}</span>
                              )}
                              {item.originalItem.packageWeight && (
                                <div className="text-gray-400">{item.originalItem.packageWeight} {item.originalItem.packageWeightUnit || ''}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </TableCell>
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
                  {'retailPrice' in editingItem && (
                  <div>
                    <Label>Retail Price (₹)</Label>
                    <Input 
                      type="number"
                      value={editingItem.retailPrice || ''} 
                      onChange={(e) => setEditingItem({...editingItem, retailPrice: e.target.value})}
                    />
                  </div>
                  )}
                </div>
                <div>
                  <Label>Image URL</Label>
                  <Input 
                    value={editingItem.image || ''} 
                    onChange={(e) => setEditingItem({...editingItem, image: e.target.value})}
                  />
                </div>
                <div className="border rounded-lg p-3 bg-gray-50">
                  <Label className="text-sm font-semibold text-gray-700 mb-2 block">B2B Packaging (Box/Tray/Tub)</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Packaging Type</Label>
                      <Select value={editingItem.packagingType || ''} onValueChange={(v) => setEditingItem({...editingItem, packagingType: v})}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="box">Box</SelectItem>
                          <SelectItem value="tray">Tray</SelectItem>
                          <SelectItem value="tub">Tub</SelectItem>
                          <SelectItem value="bag">Bag</SelectItem>
                          <SelectItem value="tin">Tin</SelectItem>
                          <SelectItem value="jar">Jar</SelectItem>
                          <SelectItem value="carton">Carton</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Units per {editingItem.packagingType || 'Package'}</Label>
                      <Input 
                        type="number"
                        value={editingItem.unitsPerPackage || ''} 
                        onChange={(e) => setEditingItem({...editingItem, unitsPerPackage: parseInt(e.target.value) || null})}
                        placeholder="e.g. 100"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Package Weight</Label>
                      <Input 
                        type="number"
                        step="0.01"
                        value={editingItem.packageWeight || ''} 
                        onChange={(e) => setEditingItem({...editingItem, packageWeight: e.target.value || null})}
                        placeholder="e.g. 10"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Weight Unit</Label>
                      <Select value={editingItem.packageWeightUnit || ''} onValueChange={(v) => setEditingItem({...editingItem, packageWeightUnit: v})}>
                        <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kgs">Kgs</SelectItem>
                          <SelectItem value="lit">Litres</SelectItem>
                          <SelectItem value="nos">Nos</SelectItem>
                          <SelectItem value="pkts">Packets</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
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
              </div>
              <div>
                <Label>Image URL</Label>
                <Input 
                  value={editingItem.image || ''} 
                  onChange={(e) => setEditingItem({...editingItem, image: e.target.value})}
                />
              </div>
              <div className="border rounded-lg p-3 bg-gray-50">
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">B2B Packaging (Box/Tray/Tub)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Packaging Type</Label>
                    <Select value={editingItem.packagingType || ''} onValueChange={(v) => setEditingItem({...editingItem, packagingType: v})}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="box">Box</SelectItem>
                        <SelectItem value="tray">Tray</SelectItem>
                        <SelectItem value="tub">Tub</SelectItem>
                        <SelectItem value="bag">Bag</SelectItem>
                        <SelectItem value="tin">Tin</SelectItem>
                        <SelectItem value="jar">Jar</SelectItem>
                        <SelectItem value="carton">Carton</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Units per {editingItem.packagingType || 'Package'}</Label>
                    <Input 
                      type="number"
                      value={editingItem.unitsPerPackage || ''} 
                      onChange={(e) => setEditingItem({...editingItem, unitsPerPackage: parseInt(e.target.value) || null})}
                      placeholder="e.g. 100"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Package Weight</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      value={editingItem.packageWeight || ''} 
                      onChange={(e) => setEditingItem({...editingItem, packageWeight: e.target.value || null})}
                      placeholder="e.g. 10"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Weight Unit</Label>
                    <Select value={editingItem.packageWeightUnit || ''} onValueChange={(v) => setEditingItem({...editingItem, packageWeightUnit: v})}>
                      <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kgs">Kgs</SelectItem>
                        <SelectItem value="lit">Litres</SelectItem>
                        <SelectItem value="nos">Nos</SelectItem>
                        <SelectItem value="pkts">Packets</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
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
      const response = await fetch(`/api/union/${merchantId}/menu-items/${itemId}`, {
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
                    {item?.retailerPrice && (
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
                    )}
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
                {item?.retailerPrice && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                    <strong>Note:</strong> Retailer price is calculated automatically as: MRP - ((MRP - Dealer) × 60%)
                  </div>
                )}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
  const [posCustomerSearch, setPosCustomerSearch] = useState('');
  const [showPosCustomerSuggestions, setShowPosCustomerSuggestions] = useState(false);
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
      const response = await fetch(`/api/union/${merchantId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!merchantId,
  });

  // Customer search for POS - filters by customer type (pricing tier)
  // Shows customers based on tier when dialog opens, or search results when typing
  const { data: posCustomerSuggestions = [] } = useQuery<any[]>({
    queryKey: ['/api/customers/search', posCustomerSearch, customerType, showCustomerDialog],
    queryFn: async () => {
      if (customerType === 'mrp') return []; // No suggestions for walk-in customers
      
      const params = new URLSearchParams();
      if (posCustomerSearch.length >= 1) {
        params.append('q', posCustomerSearch);
      }
      // Add type param for inter-union and federation
      if (customerType === 'district') {
        params.append('type', 'district');
      } else if (customerType === 'federation') {
        params.append('type', 'federation');
      } else {
        params.append('role', customerType);
      }
      const res = await fetch(`/api/customers/search?${params.toString()}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: showCustomerDialog && customerType !== 'mrp',
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
  
  // MMO Offices for grouping parlours
  const mmoOffices = [
    { id: 'head_office', name: 'Head Office' },
    { id: 'city_mmo', name: 'City MMO Office' },
    { id: 'mettur_mmo', name: 'Mettur MMO Office' },
    { id: 'edappadi_mmo', name: 'Edappadi MMO Office' },
  ];

  // All parlours - filtered by union code with MMO office assignment
  const allParloursList = [
    { id: '1', code: 'SLM-001', name: 'Aavin Parlour - Salem Main', mmoOffice: 'head_office' },
    { id: '2', code: 'SLM-002', name: 'Aavin Parlour - Salem Junction', mmoOffice: 'city_mmo' },
    { id: '3', code: 'SLM-003', name: 'Aavin Parlour - Attur', mmoOffice: 'mettur_mmo' },
    { id: '4', code: 'SLM-004', name: 'Aavin Parlour - Mettur Dam', mmoOffice: 'mettur_mmo' },
    { id: '5', code: 'SLM-005', name: 'Aavin Parlour - Edappadi Main', mmoOffice: 'edappadi_mmo' },
    { id: '6', code: 'SLM-006', name: 'Aavin Parlour - Edappadi Bus Stand', mmoOffice: 'edappadi_mmo' },
    { id: '7', code: 'ERD-001', name: 'Aavin Parlour - Erode Central', mmoOffice: 'head_office' },
    { id: '8', code: 'CBE-001', name: 'Aavin Parlour - Coimbatore RS Puram', mmoOffice: 'head_office' },
    { id: '9', code: 'MDU-001', name: 'Aavin Parlour - Madurai Meenakshi', mmoOffice: 'head_office' },
    { id: '10', code: 'CHN-001', name: 'Aavin Parlour - Chennai T Nagar', mmoOffice: 'head_office' },
  ];
  
  // Filter parlours by union code - only show parlours belonging to this union
  const filteredParlours = allParloursList.filter(p => !unionCode || p.code.startsWith(unionCode));
  
  // Group parlours by MMO office
  const parloursGroupedByOffice = mmoOffices.map(office => ({
    ...office,
    parlours: filteredParlours.filter(p => p.mmoOffice === office.id)
  })).filter(group => group.parlours.length > 0);
  
  // Flat list for backward compatibility
  const parloursList = [
    { id: 'all', code: 'ALL', name: 'All Parlours (Union HQ)', mmoOffice: 'all' },
    ...filteredParlours
  ];

  // Customer type labels for role-based pricing
  // All pricing tiers available: Federation (50%), Inter-Union (55%), WSD (65%), Dealer (85%), Retailer, MRP
  const customerTypes = [
    { id: 'mrp', label: 'MRP/Consumer' },
    { id: 'retailer', label: 'Retailer' },
    { id: 'dealer', label: 'Dealer' },
    { id: 'wholesale', label: 'Wholesale Dealer' },
    { id: 'district', label: 'Inter Union' },
    { id: 'federation', label: 'Federation' },
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
    queryKey: ['/api/restaurants', restaurantId, 'menu'],
    queryFn: async () => {
      if (!restaurantId) return [];
      const response = await fetch(`/api/restaurants/${restaurantId}/menu`);
      return response.json();
    },
    enabled: !!restaurantId && !!merchantData,
  });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['/api/merchant', merchantId, 'categories'],
    queryFn: async () => {
      if (!merchantId) return [];
      const response = await fetch(`/api/union/${merchantId}/categories`);
      return response.json();
    },
    enabled: !!merchantId,
  });

  // Fetch real POS orders from database using merchant endpoint
  const posStaffFilters = getStaffFilterParams();
  const { data: dbOrders = [], isLoading: ordersLoading } = useQuery<any[]>({
    queryKey: ['/api/merchant', merchantId, 'orders', posStaffFilters],
    queryFn: async () => {
      if (!merchantId) return [];
      const response = await fetch(`/api/union/${merchantId}/orders${posStaffFilters}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!merchantId,
  });

  // Transform database orders to POS format
  const posOrders = dbOrders.map((order: any) => ({
    id: order.orderNumber ? `#${order.orderNumber}` : `#${order.id?.slice(-6) || order.id}`,
    orderId: order.id,
    orderType: order.orderType === 'pickup' ? 'Takeout' : order.orderType === 'delivery' ? 'Delivery' : 'Dine-in',
    customer: order.customerName || 'Walk-in Customer',
    phone: order.customerPhone || '',
    email: order.customerEmail || '',
    amount: `\u20B9${parseFloat(order.total || 0).toLocaleString('en-IN')}`,
    total: parseFloat(order.total || 0),
    date: order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN') : '',
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

  const uniqueCategories = Array.from(new Set(menuItems.map(item => item.category).filter(Boolean)));
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
              description: `Order #${order.id?.slice(-8) || 'POS-' + Date.now()} has been processed.`,
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
        description: `Order #${order.id?.slice(-8) || 'POS-' + Date.now()} has been processed successfully.`,
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
              <SelectTrigger className="w-[300px] h-9">
                <SelectValue placeholder="Select Parlour" />
              </SelectTrigger>
              <SelectContent className="max-h-[400px]">
                {/* All Parlours option */}
                <SelectItem value="all">
                  <span className="font-medium">ALL</span> - All Parlours (Union HQ)
                </SelectItem>
                {/* Group parlours by MMO Office */}
                {parloursGroupedByOffice.map(group => (
                  <div key={group.id}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-100 sticky top-0">
                      {group.name}
                    </div>
                    {group.parlours.map(p => (
                      <SelectItem key={p.id} value={p.id} className="pl-4">
                        <span className="font-medium">{p.code}</span> - {p.name}
                      </SelectItem>
                    ))}
                  </div>
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
      <Dialog open={showCustomerDialog} onOpenChange={(open) => {
        setShowCustomerDialog(open);
        if (!open) {
          setPosCustomerSearch('');
          setShowPosCustomerSuggestions(false);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            {customerType !== 'mrp' && (
              <p className="text-sm text-muted-foreground">
                Searching for {customerType === 'wholesale' ? 'Wholesale Dealers' : 
                  customerType === 'dealer' ? 'Dealers' : 
                  customerType === 'retailer' ? 'Retailers' :
                  customerType === 'district' ? 'District Unions' :
                  customerType === 'federation' ? 'Federation Dairies' : 'customers'}
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Label>Customer Name</Label>
              <Input 
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  if (customerType !== 'mrp') {
                    setPosCustomerSearch(e.target.value);
                    setShowPosCustomerSuggestions(true);
                  }
                }}
                onFocus={() => {
                  if (customerType !== 'mrp') {
                    setShowPosCustomerSuggestions(true);
                  }
                }}
                placeholder={customerType === 'mrp' ? 'Walk-in Customer' : `Search ${customerType === 'wholesale' ? 'WSD' : customerType} customers...`}
              />
              {/* Customer suggestions dropdown - show when dialog opens for B2B tiers */}
              {customerType !== 'mrp' && posCustomerSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                  {posCustomerSuggestions.map((customer: any) => (
                    <button
                      key={customer.id}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0"
                      onClick={() => {
                        setCustomerName(customer.name);
                        setCustomerPhone(customer.phone || '');
                        setCustomerEmail(customer.email || '');
                        setShowPosCustomerSuggestions(false);
                        setPosCustomerSearch('');
                      }}
                    >
                      <p className="font-medium text-sm">{customer.name}</p>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        {customer.phone && <span>{customer.phone}</span>}
                        {customer.pricingRole && (
                          <span className="text-blue-600">{customer.pricingRole}</span>
                        )}
                        {customer.gstin && <span>GSTIN: {customer.gstin}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
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
                setPosCustomerSearch('');
                setShowPosCustomerSuggestions(false);
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

function BulkUploadSection({ merchantId }: { merchantId: string }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<{
    id: string;
    file: File;
    preview: string;
    status: 'pending' | 'uploading' | 'complete' | 'error';
    progress: number;
    objectPath?: string;
    mappedProductId?: string;
    mappedProductName?: string;
  }[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { data: menuItems } = useQuery<any[]>({
    queryKey: [`/api/union/${merchantId}/menu-items`],
    enabled: !!merchantId,
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newImages = files.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      preview: URL.createObjectURL(file),
      status: 'pending' as const,
      progress: 0,
    }));

    setImages((prev) => [...prev, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadImage = async (image: typeof images[0]) => {
    try {
      setImages((prev) => prev.map((img) => 
        img.id === image.id ? { ...img, status: 'uploading' as const, progress: 30 } : img
      ));

      const fd = new FormData();
      fd.append('file', image.file);
      const response = await fetch(`/api/union/${merchantId}/upload-image`, {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Upload failed');
      const { url } = await response.json();

      setImages((prev) => prev.map((img) =>
        img.id === image.id ? { ...img, status: 'complete' as const, progress: 100, objectPath: url } : img
      ));
      return url;
    } catch (error) {
      setImages((prev) => prev.map((img) =>
        img.id === image.id ? { ...img, status: 'error' as const, progress: 0 } : img
      ));
      return null;
    }
  };

  const handleUploadAll = async () => {
    const pendingImages = images.filter((img) => img.status === 'pending');
    if (pendingImages.length === 0) return;

    setIsUploading(true);
    for (const image of pendingImages) {
      await uploadImage(image);
    }
    setIsUploading(false);
    toast({ title: 'Upload complete', description: `${pendingImages.length} images uploaded` });
  };

  const handleMapToProduct = async (imageId: string, productId: string) => {
    const image = images.find((img) => img.id === imageId);
    const product = menuItems?.find((item: any) => item.id === productId);
    if (!image?.objectPath || !product) return;

    try {
      await fetch(`/api/union/${merchantId}/menu-items/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ image: image.objectPath }),
      });

      setImages((prev) => prev.map((img) =>
        img.id === imageId ? { ...img, mappedProductId: productId, mappedProductName: product.name } : img
      ));
      toast({ title: 'Image linked', description: `Linked to "${product.name}"` });
    } catch (error) {
      toast({ title: 'Failed', description: 'Could not link image', variant: 'destructive' });
    }
  };

  const removeImage = (imageId: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === imageId);
      if (img?.preview) URL.revokeObjectURL(img.preview);
      return prev.filter((i) => i.id !== imageId);
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl md:text-2xl font-bold">Bulk Image Upload</h2>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Product Images
          </CardTitle>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700">Click to select images</p>
            <p className="text-sm text-gray-500 mt-1">JPG, PNG, WebP - Max 10MB per file</p>
          </div>

          {images.length > 0 && (
            <div className="mt-4 flex justify-between items-center">
              <span className="text-sm text-gray-600">
                {images.length} images • {images.filter(i => i.status === 'complete').length} uploaded
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setImages([])}>Clear</Button>
                <Button size="sm" onClick={handleUploadAll} disabled={isUploading}>
                  {isUploading ? 'Uploading...' : 'Upload All'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {images.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Images ({images.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((image) => (
                <div key={image.id} className="border rounded-lg overflow-hidden bg-white">
                  <div className="relative aspect-video bg-gray-100">
                    <img src={image.preview} alt={image.file.name} className="w-full h-full object-cover" />
                    <button onClick={() => removeImage(image.id)} className="absolute top-2 right-2 p-1 bg-white rounded-full shadow">
                      <X className="h-4 w-4" />
                    </button>
                    {image.status === 'uploading' && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 text-white animate-spin" />
                      </div>
                    )}
                    {image.status === 'complete' && (
                      <div className="absolute top-2 left-2 p-1 bg-green-500 rounded-full">
                        <CheckCircle className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    <p className="text-sm font-medium truncate">{image.file.name}</p>
                    {image.status === 'uploading' && <Progress value={image.progress} className="h-1" />}
                    {image.status === 'complete' && !image.mappedProductId && (
                      <Select onValueChange={(val) => handleMapToProduct(image.id, val)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Map to product..." />
                        </SelectTrigger>
                        <SelectContent>
                          {menuItems?.map((item: any) => (
                            <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {image.mappedProductId && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> {image.mappedProductName}
                      </p>
                    )}
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

function ImagesSection({ type, merchantId }: { type?: string; merchantId?: string | null }) {
  const isMediaLibrary = type === 'media-library';
  const [activeTab, setActiveTab] = useState('media-list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const apiMerchantId = merchantId || 'merchant-3';

  const { data, isLoading } = useQuery<{ images: { url: string; name: string; size: number }[] }>({
    queryKey: ['/api/union', apiMerchantId, 'product-images'],
    queryFn: async () => {
      const res = await fetch(`/api/union/${apiMerchantId}/product-images`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load images');
      return res.json();
    },
  });

  const images = data?.images || [];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    let successCount = 0;
    for (const file of Array.from(files)) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(`/api/union/${apiMerchantId}/upload-image`, {
          method: 'POST', body: fd, credentials: 'include',
        });
        if (res.ok) successCount++;
      } catch {}
    }
    setIsUploading(false);
    e.target.value = '';
    if (successCount > 0) {
      toast({ title: 'Upload Successful', description: `${successCount} image(s) uploaded` });
      queryClient.invalidateQueries({ queryKey: ['/api/union', apiMerchantId, 'product-images'] });
    }
  };

  const handleDelete = async (url: string) => {
    try {
      const res = await fetch(`/api/union/${apiMerchantId}/product-images`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url }),
      });
      if (res.ok) {
        toast({ title: 'Deleted', description: 'Image has been deleted' });
        queryClient.invalidateQueries({ queryKey: ['/api/union', apiMerchantId, 'product-images'] });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete image', variant: 'destructive' });
    }
  };

  const handleDeleteSelected = async () => {
    let deleted = 0;
    for (const url of selectedUrls) {
      try {
        const res = await fetch(`/api/union/${apiMerchantId}/product-images`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ url }),
        });
        if (res.ok) deleted++;
      } catch {}
    }
    setSelectedUrls([]);
    toast({ title: 'Deleted', description: `${deleted} image(s) deleted` });
    queryClient.invalidateQueries({ queryKey: ['/api/union', apiMerchantId, 'product-images'] });
  };

  const toggleImageSelection = (url: string) => {
    setSelectedUrls(prev => 
      prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
    );
  };

  const formatSize = (size: number) => {
    if (size > 1048576) return `${(size / 1048576).toFixed(1)} MB`;
    return `${Math.round(size / 1024)} KB`;
  };

  const filteredImages = images.filter(img => 
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
                {isLoading ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : filteredImages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No images uploaded yet. Upload images using the Upload New tab.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {filteredImages.map((img) => (
                      <div key={img.url} className="relative group">
                        <div className="absolute top-2 left-2 z-10">
                          <input
                            type="checkbox"
                            checked={selectedUrls.includes(img.url)}
                            onChange={() => toggleImageSelection(img.url)}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                        </div>
                        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border">
                          <img src={img.url} alt={img.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </div>
                        <div className="mt-2">
                          <p className="text-sm font-medium truncate">{img.name}</p>
                          <p className="text-xs text-gray-500">{formatSize(img.size)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-gray-500">{filteredImages.length} image(s)</p>
                  {selectedUrls.length > 0 && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={handleDeleteSelected}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete File ({selectedUrls.length})
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
                {isUploading ? (
                  <>
                    <Loader2 className="h-12 w-12 text-green-500 mx-auto mb-4 animate-spin" />
                    <p className="text-gray-600">Uploading images...</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">Drag and drop files here</p>
                    <p className="text-gray-400 text-sm mb-4">or</p>
                    <Button 
                      className="bg-green-500 hover:bg-green-600"
                      onClick={() => document.getElementById('media-upload')?.click()}
                    >
                      Browse Files
                    </Button>
                  </>
                )}
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
          <Button className="bg-green-500 hover:bg-green-600" onClick={() => document.getElementById('image-upload')?.click()} disabled={isUploading}>
            {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            {isUploading ? 'Uploading...' : 'Upload Image'}
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : images.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No images uploaded yet. Click "Upload Image" to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {images.map((img) => (
                <div key={img.url} className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <img src={img.url} alt={img.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/20 hover:bg-white/30 text-white" onClick={() => handleDelete(img.url)}>
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
          )}
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

  const getPromoExportData = () => {
    if (isCoupon) {
      return couponData.map((item: any) => ({
        '#': item.id || '-',
        'Name': item.name || '-',
        'Status': item.status || '-',
        'Voucher Type': item.voucherType || '-',
        'Discount': item.discount || '-',
        'Expiration': item.expiration || '-',
        'Last Update': item.lastUpdate || '-',
        'Used': item.used || 0,
      }));
    }
    return offersData.map((item: any) => ({
      '#': item.id || '-',
      'Name': item.name || '-',
      'Status': item.status || '-',
      'Over Amount': item.overAmount || '-',
      'Valid From': item.validFrom || '-',
      'Valid To': item.validTo || '-',
      'Last Update': item.lastUpdate || '-',
    }));
  };

  const handlePromoExportExcel = () => {
    const data = getPromoExportData();
    if (data.length === 0) { toast({ title: 'No Data', description: 'No data to export' }); return; }
    const headers = Object.keys(data[0]).join('\t');
    const rows = data.map(row => Object.values(row).join('\t')).join('\n');
    const blob = new Blob([headers + '\n' + rows], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = isCoupon ? 'coupons.xls' : 'offers.xls'; a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Export Complete', description: `${data.length} records exported to Excel` });
  };

  const handlePromoExportCSV = () => {
    const data = getPromoExportData();
    if (data.length === 0) { toast({ title: 'No Data', description: 'No data to export' }); return; }
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([headers + '\n' + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = isCoupon ? 'coupons.csv' : 'offers.csv'; a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Export Complete', description: `${data.length} records exported to CSV` });
  };

  const handlePromoExportPDF = () => {
    const data = getPromoExportData();
    if (data.length === 0) { toast({ title: 'No Data', description: 'No data to export' }); return; }
    const headers = Object.keys(data[0]);
    const title = isCoupon ? 'Coupon List' : 'Offers List';
    const printContent = `<html><head><title>${title}</title>
      <style>body{font-family:Arial,sans-serif;padding:20px}h1{color:#1a365d;font-size:20px}table{width:100%;border-collapse:collapse;margin-top:15px}th{background:#2d3748;color:white;padding:8px 12px;text-align:left;font-size:12px}td{border:1px solid #e2e8f0;padding:6px 12px;font-size:11px}tr:nth-child(even){background:#f7fafc}</style></head>
      <body><h1>${title}</h1><p style="color:#718096;font-size:12px">Generated: ${new Date().toLocaleDateString()} | Total: ${data.length} records</p>
      <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>
      ${data.map(row => `<tr>${Object.values(row).map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}
      </tbody></table></body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(printContent); win.document.close(); win.print(); }
    toast({ title: 'PDF Export', description: 'Print dialog opened - save as PDF' });
  };

  const handlePromoPrint = () => { handlePromoExportPDF(); };

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

// Customer Search for Invoice
interface CustomerSearchData {
  id: string;
  name: string;
  email: string;
  phone: string;
  pricingRole?: string;
  unionId?: string;
}

// Create B2B Invoice Form with Customer Search
function CreateB2BInvoiceForm({ 
  merchantId, 
  merchantData,
  onClose, 
  onSuccess,
  staffSalesSegment = 'all_access'
}: { 
  merchantId: string | null; 
  merchantData?: any;
  onClose: () => void; 
  onSuccess: () => void;
  staffSalesSegment?: string;
}) {
  const { toast } = useToast();
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchData | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  // Pricing Tier selection - determines customer filtering and product rates
  const [selectedPricingTier, setSelectedPricingTier] = useState<string>('DEALER');
  const [isNCDFI, setIsNCDFI] = useState(false);
  const [creditDays, setCreditDays] = useState(0); // 0 = Due on Receipt
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false);
  
  // Pricing tiers based on staff's sales segment
  // Note: Retailer tier is hidden by default - only shown when admin enables retailerPriceEnabled for the merchant
  const getPricingTiersForSegment = () => {
    const allTiers = [
      { value: 'FEDERATION', label: 'Federation (50% of MRP)' },
      { value: 'INTER_UNION', label: 'Inter-Union (55% of MRP)' },
      { value: 'WHOLESALE_DEALER', label: 'Wholesale Dealer (65% of MRP)' },
      { value: 'DEALER', label: 'Dealer (85% of MRP)' },
      { value: 'MRP', label: 'MRP (Full Price)' },
      { value: 'NCDFI', label: 'NCDFI Bulk (Price TBD)' },
    ];
    
    if (staffSalesSegment === 'all_access') return allTiers;
    if (staffSalesSegment === 'federation_interunion') {
      return allTiers.filter(t => ['FEDERATION', 'INTER_UNION'].includes(t.value));
    }
    if (staffSalesSegment === 'wsd_dealer') {
      return allTiers.filter(t => ['WHOLESALE_DEALER', 'DEALER'].includes(t.value));
    }
    if (staffSalesSegment === 'retail_parlour') {
      return allTiers.filter(t => ['MRP'].includes(t.value));
    }
    if (staffSalesSegment === 'ncdfi_bulk') {
      return allTiers.filter(t => t.value === 'NCDFI');
    }
    return allTiers;
  };
  
  const availablePricingTiers = getPricingTiersForSegment();
  
  // Product search state
  const [activeProductRow, setActiveProductRow] = useState<number | null>(null);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const productSearchRef = useRef<HTMLDivElement>(null);

  // Fetch products via search API for auto-fill
  const { data: searchedProducts = [] } = useQuery<any[]>({
    queryKey: ['/api/products/search', productSearchQuery],
    queryFn: async () => {
      if (productSearchQuery.length < 1) return [];
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(productSearchQuery)}`, {
        credentials: 'include'
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: productSearchQuery.length >= 1,
  });

  // Filtered products from search API
  const filteredProducts = searchedProducts;
  
  const [invoiceData, setInvoiceData] = useState({
    billToName: '',
    billToPhone: '',
    billToEmail: '',
    billToAddress: '',
    billToGstin: '',
    shipToName: '',
    shipToAddress: '',
    items: [] as { description: string; hsn: string; quantity: number; rate: number; gstRate: number }[],
    paymentTerms: 'Net 30',
  });

  // Customer search filtered by selected pricing tier - loads all buyers on focus, filters as you type
  const { data: searchResults = [] } = useQuery<CustomerSearchData[]>({
    queryKey: ['/api/customers/search', customerSearch, selectedPricingTier],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (customerSearch.length >= 1) {
        params.append('q', customerSearch);
      }
      if (selectedPricingTier === 'FEDERATION') {
        params.append('type', 'federation');
      } else if (selectedPricingTier === 'INTER_UNION') {
        params.append('type', 'district');
      } else if (selectedPricingTier === 'WHOLESALE_DEALER') {
        params.append('role', 'wholesale');
      } else if (selectedPricingTier === 'DEALER') {
        params.append('role', 'dealer');
      } else if (selectedPricingTier === 'RETAILER') {
        params.append('role', 'retailer');
      }
      const res = await fetch(`/api/customers/search?${params.toString()}`);
      return res.json();
    },
    enabled: selectedPricingTier !== 'MRP' && selectedPricingTier !== 'NCDFI',
  });

  const selectCustomer = (customer: CustomerSearchData) => {
    setSelectedCustomer(customer);
    setInvoiceData(prev => ({
      ...prev,
      billToName: customer.name,
      billToPhone: customer.phone || '',
      billToEmail: customer.email,
      shipToName: customer.name,
    }));
    setCustomerSearch('');
    setShowDropdown(false);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setInvoiceData(prev => ({
      ...prev,
      billToName: '',
      billToPhone: '',
      billToEmail: '',
      shipToName: '',
    }));
  };

  // Select product and auto-fill row based on selected pricing tier
  const selectProduct = (index: number, product: any) => {
    const mrp = parseFloat(product.mrp || product.price || '0');
    let rate = mrp;
    
    // NCDFI mode - rate will be 0 (TBD) or provisional
    if (isNCDFI || selectedPricingTier === 'NCDFI') {
      rate = 0; // Price to be determined later
    } else {
      // Apply pricing tier - use stored prices or calculate from MRP
      if (selectedPricingTier === 'FEDERATION') {
        rate = parseFloat(product.federationPrice) || mrp * 0.5;
      } else if (selectedPricingTier === 'INTER_UNION') {
        rate = parseFloat(product.districtUnionPrice) || mrp * 0.55;
      } else if (selectedPricingTier === 'WHOLESALE_DEALER') {
        rate = parseFloat(product.wholesalePrice) || mrp * 0.65;
      } else if (selectedPricingTier === 'DEALER') {
        rate = parseFloat(product.retailPrice) || mrp * 0.85;
      } else if (selectedPricingTier === 'RETAILER') {
        rate = parseFloat(product.retailerPrice) || mrp * 0.92;
      } else {
        rate = mrp;
      }
    }
    
    // Get GST rate from product
    const gstRate = parseFloat(product.gstPercent || '0');
    
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? {
        ...item,
        description: product.name,
        hsn: product.hsnCode || '',
        rate: rate,
        gstRate: gstRate,
      } : item),
    }));
    setActiveProductRow(null);
    setProductSearchQuery('');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (productSearchRef.current && !productSearchRef.current.contains(event.target as Node)) {
        setActiveProductRow(null);
        setProductSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addItem = () => {
    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', hsn: '', quantity: 1, rate: 0, gstRate: 0 }],
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item),
    }));
  };

  const removeItem = (index: number) => {
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const calculateTotal = () => {
    return invoiceData.items.reduce((sum, item) => {
      const amount = item.quantity * item.rate;
      const gst = amount * (item.gstRate / 100);
      return sum + amount + gst;
    }, 0);
  };

  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      const invoiceNo = `INV-${Date.now()}`;
      const totalAmount = calculateTotal();
      const isProvisional = selectedPricingTier === 'NCDFI' || isNCDFI;
      
      // Calculate due date based on credit days
      const dueDate = creditDays > 0 
        ? new Date(Date.now() + creditDays * 24 * 60 * 60 * 1000).toISOString()
        : new Date().toISOString(); // Due on receipt
      
      const payload = {
        merchantId,
        invoiceNo,
        invoiceDate: new Date().toISOString(),
        dueDate,
        pricingTier: selectedPricingTier,
        // Seller (District Union) details
        sellerName: merchantData?.restaurantName || merchantData?.name || '',
        sellerAddress: merchantData?.address || '',
        sellerCity: merchantData?.city || '',
        sellerState: merchantData?.state || 'Tamil Nadu',
        sellerStateCode: merchantData?.stateCode || '33',
        sellerGstin: merchantData?.gstin || '',
        sellerFssai: merchantData?.fssaiLicense || '',
        // Buyer details
        customerId: selectedCustomer?.id,
        billToName: invoiceData.billToName,
        billToPhone: invoiceData.billToPhone,
        billToEmail: invoiceData.billToEmail,
        billToAddress: invoiceData.billToAddress,
        billToGstin: invoiceData.billToGstin,
        shipToName: invoiceData.shipToName,
        shipToAddress: invoiceData.shipToAddress,
        items: invoiceData.items,
        subtotal: invoiceData.items.reduce((sum, i) => sum + i.quantity * i.rate, 0).toFixed(2),
        cgstAmount: invoiceData.items.reduce((sum, i) => sum + (i.quantity * i.rate * i.gstRate / 200), 0).toFixed(2),
        sgstAmount: invoiceData.items.reduce((sum, i) => sum + (i.quantity * i.rate * i.gstRate / 200), 0).toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        balanceDue: totalAmount.toFixed(2),
        amountPaid: '0',
        status: isProvisional ? 'pending_price' : 'pending',
        paymentTerms: creditDays === 0 ? 'Due on Receipt' : `Net ${creditDays}`,
        creditDays,
        isProvisionalPrice: isProvisional,
        salesSegment: staffSalesSegment,
      };
      const res = await fetch(`/api/merchants/${merchantId}/b2b-invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create invoice');
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: 'Success', description: 'B2B Invoice created successfully' });
      // Trigger push notification
      notifyInvoiceCreated(
        data?.invoiceNo || 'New',
        invoiceData.billToName || 'Customer',
        calculateTotal().toFixed(2)
      );
      onSuccess();
      onClose();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create invoice', variant: 'destructive' });
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-auto">
      <div className="bg-white max-w-4xl w-full max-h-[95vh] rounded-lg shadow-xl flex flex-col">
        <div className="p-4 border-b flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold">Create B2B Invoice</h2>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto overflow-x-visible flex-1" style={{ overflowX: 'visible' }}>
          {/* Pricing Tier & Payment Terms Row */}
          <div className="grid grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div>
              <Label className="text-sm font-medium mb-2 block">Price List / Pricing Tier *</Label>
              <Select value={selectedPricingTier} onValueChange={(val) => {
                setSelectedPricingTier(val);
                setIsNCDFI(val === 'NCDFI');
                // Clear customer when tier changes
                setSelectedCustomer(null);
                setInvoiceData(prev => ({ ...prev, billToName: '', billToPhone: '', billToEmail: '', shipToName: '' }));
              }}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select pricing tier" />
                </SelectTrigger>
                <SelectContent>
                  {availablePricingTiers.map(tier => (
                    <SelectItem key={tier.value} value={tier.value}>{tier.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPricingTier === 'NCDFI' && (
                <p className="text-xs text-orange-600 mt-1">
                  NCDFI Bulk: Product prices will be set to ₹0 (TBD). Final prices will be updated when NCDFI confirms.
                </p>
              )}
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Payment Terms</Label>
              <Select value={String(creditDays)} onValueChange={(val) => setCreditDays(parseInt(val))}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select payment terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Due on Receipt (Cash)</SelectItem>
                  <SelectItem value="15">Net 15 Days (Credit)</SelectItem>
                  <SelectItem value="30">Net 30 Days (Credit)</SelectItem>
                  <SelectItem value="45">Net 45 Days (Credit)</SelectItem>
                  <SelectItem value="60">Net 60 Days (Credit)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Customer Search */}
          <div ref={searchRef}>
            <Label className="text-sm font-medium mb-2 block">Customer / Bill To</Label>
            {selectedCustomer ? (
              <div className="flex items-center justify-between bg-green-50 rounded-lg p-3 border border-green-200">
                <div>
                  <p className="font-medium text-green-900">{selectedCustomer.name}</p>
                  <p className="text-sm text-green-700">
                    {selectedCustomer.phone} • {selectedCustomer.email}
                    {selectedCustomer.pricingRole && ` • ${selectedCustomer.pricingRole}`}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={clearCustomer}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customer by name, phone, or ID..."
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    className="pl-10"
                  />
                </div>
                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                    {searchResults.map((customer) => (
                      <button
                        key={customer.id}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0"
                        onClick={() => selectCustomer(customer)}
                      >
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {customer.phone} • {customer.email}
                          {customer.pricingRole && ` • ${customer.pricingRole}`}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
                {showDropdown && searchResults.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 p-4 text-center text-muted-foreground">
                    {customerSearch.length >= 1 ? 'No customers found - enter details manually below' : 'Loading buyers...'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Manual Entry Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Bill To Name</Label>
              <Input 
                value={invoiceData.billToName} 
                onChange={(e) => setInvoiceData(prev => ({ ...prev, billToName: e.target.value }))}
                placeholder="Customer name"
              />
            </div>
            <div>
              <Label className="text-sm">Phone</Label>
              <Input 
                value={invoiceData.billToPhone} 
                onChange={(e) => setInvoiceData(prev => ({ ...prev, billToPhone: e.target.value }))}
                placeholder="Phone number"
              />
            </div>
            <div>
              <Label className="text-sm">Email</Label>
              <Input 
                value={invoiceData.billToEmail} 
                onChange={(e) => setInvoiceData(prev => ({ ...prev, billToEmail: e.target.value }))}
                placeholder="Email address"
              />
            </div>
            <div>
              <Label className="text-sm">GSTIN</Label>
              <Input 
                value={invoiceData.billToGstin} 
                onChange={(e) => setInvoiceData(prev => ({ ...prev, billToGstin: e.target.value }))}
                placeholder="GSTIN number"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-sm">Address</Label>
              <Input 
                value={invoiceData.billToAddress} 
                onChange={(e) => setInvoiceData(prev => ({ ...prev, billToAddress: e.target.value }))}
                placeholder="Full address"
              />
            </div>
          </div>

          {/* Items */}
          <div className="overflow-visible">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Invoice Items</Label>
              <Button size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
            </div>
            <div className="overflow-visible">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>HSN</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>GST %</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoiceData.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="relative" ref={activeProductRow === index ? productSearchRef : null}>
                        <Input 
                          value={activeProductRow === index ? productSearchQuery : item.description} 
                          onChange={(e) => {
                            const value = e.target.value;
                            setProductSearchQuery(value);
                            setActiveProductRow(index);
                            updateItem(index, 'description', value);
                          }}
                          onFocus={() => {
                            setActiveProductRow(index);
                            setProductSearchQuery(item.description);
                          }}
                          placeholder="Search product..."
                          className="w-40"
                        />
                        {activeProductRow === index && filteredProducts.length > 0 && (
                          <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-xl z-[9999] max-h-60 overflow-y-auto min-w-[350px]">
                            {filteredProducts.map((product: any) => (
                              <button
                                key={product.id}
                                className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0"
                                onClick={() => selectProduct(index, product)}
                              >
                                <p className="font-medium text-sm text-gray-900">{product.name}</p>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                  <span className="text-xs text-blue-600 font-medium">
                                    HSN: {product.hsnCode || '-'}
                                  </span>
                                  <span className="text-xs text-green-600 font-medium">
                                    GST: {product.gstPercent || 0}%
                                  </span>
                                  <span className="text-xs text-gray-600">
                                    MRP: ₹{product.mrp || product.price}
                                  </span>
                                </div>
                                {product.productCode && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Code: {product.productCode}
                                  </p>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input 
                        value={item.hsn} 
                        onChange={(e) => updateItem(index, 'hsn', e.target.value)}
                        placeholder="HSN"
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        value={item.quantity} 
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-16"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        value={item.rate} 
                        onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        value={item.gstRate} 
                        onChange={(e) => updateItem(index, 'gstRate', parseFloat(e.target.value) || 0)}
                        className="w-16"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      ₹{(item.quantity * item.rate * (1 + item.gstRate / 100)).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => removeItem(index)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {invoiceData.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No items added. Click "Add Item" to add products.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-end">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-lg font-bold">Total: ₹{calculateTotal().toFixed(2)}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              onClick={() => createInvoiceMutation.mutate()} 
              disabled={createInvoiceMutation.isPending || invoiceData.items.length === 0}
            >
              {createInvoiceMutation.isPending ? 'Creating...' : 'Create Invoice'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Edit B2B Invoice Form Component
function EditB2BInvoiceForm({ 
  invoice,
  onClose, 
  onSuccess 
}: { 
  invoice: any;
  onClose: () => void; 
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  
  // Product search state for autocomplete
  const [activeProductRow, setActiveProductRow] = useState<number | null>(null);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const productSearchRef = useRef<HTMLDivElement>(null);

  // Fetch products via search API for auto-fill
  const { data: searchedProducts = [] } = useQuery({
    queryKey: ['/api/products/search', productSearchQuery],
    queryFn: async () => {
      if (productSearchQuery.length < 1) return [];
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(productSearchQuery)}`, {
        credentials: 'include'
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: productSearchQuery.length >= 1,
  });

  const filteredProducts = searchedProducts;

  // Handle click outside to close product dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productSearchRef.current && !productSearchRef.current.contains(event.target as Node)) {
        setActiveProductRow(null);
        setProductSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Select product and auto-fill the row
  const selectProduct = (index: number, product: any) => {
    const priceToUse = product.mrp || product.price || 0;
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.map((item: any, i: number) => 
        i === index ? {
          ...item,
          description: product.name,
          hsn: product.hsnCode || '',
          rate: priceToUse,
          gstRate: product.gstPercent || 5,
        } : item
      )
    }));
    setActiveProductRow(null);
    setProductSearchQuery('');
  };
  
  const [invoiceData, setInvoiceData] = useState({
    billToName: invoice.billToName || '',
    billToPhone: invoice.billToPhone || '',
    billToEmail: invoice.billToEmail || '',
    billToAddress: invoice.billToAddress || '',
    billToCity: invoice.billToCity || '',
    billToState: invoice.billToState || 'Tamil Nadu',
    billToStateCode: invoice.billToStateCode || '33',
    billToGstin: invoice.billToGstin || '',
    shipToName: invoice.shipToName || '',
    shipToAddress: invoice.shipToAddress || '',
    shipToCity: invoice.shipToCity || '',
    shipToState: invoice.shipToState || 'Tamil Nadu',
    shipToStateCode: invoice.shipToStateCode || '33',
    shipToGstin: invoice.shipToGstin || '',
    paymentTerms: invoice.paymentTerms || 'Net 30',
    buyerOrderNo: invoice.buyerOrderNo || '',
    deliveryNote: invoice.deliveryNote || '',
    destination: invoice.destination || '',
    vehicleNo: invoice.vehicleNo || '',
    status: invoice.status || 'pending',
    items: (invoice.items || []).map((item: any) => ({
      description: item.description || '',
      hsn: item.hsn || item.hsnCode || '',
      quantity: item.quantity || item.qty || 0,
      rate: item.rate || item.price || 0,
      gstRate: item.gstRate || item.gst || 0,
    })),
  });

  const addItem = () => {
    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', hsn: '', quantity: 1, rate: 0, gstRate: 5 }]
    }));
  };

  const removeItem = (index: number) => {
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.filter((_: any, i: number) => i !== index)
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.map((item: any, i: number) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const calculateTotal = () => {
    return invoiceData.items.reduce((sum: number, item: any) => {
      const itemTotal = item.quantity * item.rate * (1 + item.gstRate / 100);
      return sum + itemTotal;
    }, 0);
  };

  const updateInvoiceMutation = useMutation({
    mutationFn: async () => {
      const subtotal = invoiceData.items.reduce((sum: number, item: any) => sum + (item.quantity * item.rate), 0);
      const totalTax = invoiceData.items.reduce((sum: number, item: any) => sum + (item.quantity * item.rate * item.gstRate / 100), 0);
      
      const payload = {
        billToName: invoiceData.billToName,
        billToPhone: invoiceData.billToPhone,
        billToEmail: invoiceData.billToEmail,
        billToAddress: invoiceData.billToAddress,
        billToCity: invoiceData.billToCity,
        billToState: invoiceData.billToState,
        billToStateCode: invoiceData.billToStateCode,
        billToGstin: invoiceData.billToGstin,
        shipToName: invoiceData.shipToName,
        shipToAddress: invoiceData.shipToAddress,
        shipToCity: invoiceData.shipToCity,
        shipToState: invoiceData.shipToState,
        shipToStateCode: invoiceData.shipToStateCode,
        shipToGstin: invoiceData.shipToGstin,
        paymentTerms: invoiceData.paymentTerms,
        buyerOrderNo: invoiceData.buyerOrderNo,
        deliveryNote: invoiceData.deliveryNote,
        destination: invoiceData.destination,
        vehicleNo: invoiceData.vehicleNo,
        status: invoiceData.status,
        items: invoiceData.items,
        subtotal: subtotal.toFixed(2),
        cgstAmount: (totalTax / 2).toFixed(2),
        sgstAmount: (totalTax / 2).toFixed(2),
        total: calculateTotal().toFixed(2),
      };
      
      const res = await fetch(`/api/b2b-invoices/${invoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) throw new Error('Failed to update invoice');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Invoice updated successfully' });
      onSuccess();
      onClose();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update invoice', variant: 'destructive' });
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-auto">
      <div className="bg-white max-w-4xl w-full max-h-[95vh] overflow-auto rounded-lg shadow-xl">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold">Edit B2B Invoice - {invoice.invoiceNo}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Status */}
          <div>
            <Label>Invoice Status</Label>
            <Select 
              value={invoiceData.status} 
              onValueChange={(value) => setInvoiceData(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bill To */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="font-semibold">Bill To (Buyer)</h3>
              <Input 
                placeholder="Name" 
                value={invoiceData.billToName}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, billToName: e.target.value }))}
              />
              <Input 
                placeholder="Address" 
                value={invoiceData.billToAddress}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, billToAddress: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input 
                  placeholder="City" 
                  value={invoiceData.billToCity}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, billToCity: e.target.value }))}
                />
                <Input 
                  placeholder="GSTIN" 
                  value={invoiceData.billToGstin}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, billToGstin: e.target.value }))}
                />
              </div>
            </div>

            {/* Ship To */}
            <div className="space-y-3">
              <h3 className="font-semibold">Ship To (Consignee)</h3>
              <Input 
                placeholder="Name" 
                value={invoiceData.shipToName}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, shipToName: e.target.value }))}
              />
              <Input 
                placeholder="Address" 
                value={invoiceData.shipToAddress}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, shipToAddress: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input 
                  placeholder="City" 
                  value={invoiceData.shipToCity}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, shipToCity: e.target.value }))}
                />
                <Input 
                  placeholder="GSTIN" 
                  value={invoiceData.shipToGstin}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, shipToGstin: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Other Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div>
              <Label>Payment Terms</Label>
              <Select 
                value={invoiceData.paymentTerms} 
                onValueChange={(value) => setInvoiceData(prev => ({ ...prev, paymentTerms: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Net 7">Net 7</SelectItem>
                  <SelectItem value="Net 15">Net 15</SelectItem>
                  <SelectItem value="Net 30">Net 30</SelectItem>
                  <SelectItem value="Net 45">Net 45</SelectItem>
                  <SelectItem value="Net 60">Net 60</SelectItem>
                  <SelectItem value="Credit">Credit (B2B)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Buyer Order No.</Label>
              <Input 
                value={invoiceData.buyerOrderNo}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, buyerOrderNo: e.target.value }))}
              />
            </div>
            <div>
              <Label>Destination</Label>
              <Input 
                value={invoiceData.destination}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, destination: e.target.value }))}
              />
            </div>
            <div>
              <Label>Vehicle No.</Label>
              <Input 
                value={invoiceData.vehicleNo}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, vehicleNo: e.target.value }))}
              />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Line Items</h3>
              <Button size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>
            
            <div className="overflow-visible">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>HSN</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>GST%</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoiceData.items.map((item: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="overflow-visible">
                      <div className="relative" ref={activeProductRow === index ? productSearchRef : null}>
                        <Input 
                          value={item.description} 
                          onChange={(e) => {
                            const value = e.target.value;
                            setActiveProductRow(index);
                            setProductSearchQuery(value);
                            updateItem(index, 'description', value);
                          }}
                          onFocus={() => {
                            setActiveProductRow(index);
                            setProductSearchQuery(item.description);
                          }}
                          placeholder="Search product..."
                          className="w-40"
                        />
                        {activeProductRow === index && filteredProducts.length > 0 && (
                          <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-xl z-[9999] max-h-60 overflow-y-auto min-w-[350px]">
                            {filteredProducts.map((product: any) => (
                              <button
                                key={product.id}
                                className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0"
                                onClick={() => selectProduct(index, product)}
                              >
                                <p className="font-medium text-sm text-gray-900">{product.name}</p>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                  <span className="text-xs text-blue-600 font-medium">
                                    HSN: {product.hsnCode || '-'}
                                  </span>
                                  <span className="text-xs text-green-600 font-medium">
                                    GST: {product.gstPercent || 0}%
                                  </span>
                                  <span className="text-xs text-gray-600">
                                    MRP: ₹{product.mrp || product.price}
                                  </span>
                                </div>
                                {product.productCode && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Code: {product.productCode}
                                  </p>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input 
                        value={item.hsn}
                        onChange={(e) => updateItem(index, 'hsn', e.target.value)}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-16"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number"
                        value={item.rate}
                        onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number"
                        value={item.gstRate}
                        onChange={(e) => updateItem(index, 'gstRate', parseFloat(e.target.value) || 0)}
                        className="w-16"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      ₹{(item.quantity * item.rate * (1 + item.gstRate / 100)).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => removeItem(index)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {invoiceData.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No items. Click "Add Item" to add products.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-end">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-lg font-bold">Total: ₹{calculateTotal().toFixed(2)}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              onClick={() => updateInvoiceMutation.mutate()} 
              disabled={updateInvoiceMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {updateInvoiceMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// B2B Tax Invoice Component
function B2BTaxInvoice({ invoice, onClose, onEdit }: { invoice: any; onClose: () => void; onEdit?: () => void }) {
  const printInvoice = () => {
    window.print();
  };

  const generateIRN = () => {
    return Array.from({ length: 64 }, () => Math.random().toString(36).charAt(2)).join('').toUpperCase().slice(0, 64);
  };

  const formatInvoiceDate = (dateStr: string | Date | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  const isNewInvoice = !invoice.id;
  const irn = invoice.irn || generateIRN();
  const ackNo = invoice.ackNo || Math.floor(Math.random() * 9999999999999999).toString().padStart(16, '0');
  const ackDate = invoice.ackDate || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-auto">
      <div className="bg-white max-w-4xl w-full max-h-[95vh] overflow-auto rounded-lg shadow-xl print:shadow-none print:max-h-none">
        <div className="p-4 border-b flex items-center justify-between print:hidden">
          <h2 className="text-lg font-bold">B2B Tax Invoice</h2>
          <div className="flex gap-2">
            {onEdit && (
              <Button onClick={onEdit} className="bg-amber-500 hover:bg-amber-600">
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
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
              <p className="font-bold text-blue-700">{invoice.sellerName || invoice.seller?.name || '-'}</p>
              <p className="text-xs">{invoice.sellerAddress || invoice.seller?.address || '-'}</p>
              <p className="text-xs">{invoice.sellerCity || invoice.seller?.city || '-'}</p>
              <p className="text-xs">FSSAI/Licence No: {invoice.sellerFssai || invoice.seller?.fssai || '-'}</p>
              <p className="text-xs">GSTIN/UIN: {invoice.sellerGstin || invoice.seller?.gstin || '-'}</p>
              <p className="text-xs">State Name: {invoice.sellerState || invoice.seller?.state || '-'}, Code: {invoice.sellerStateCode || invoice.seller?.stateCode || '-'}</p>
              
              <div className="mt-3 pt-2 border-t">
                <p className="text-xs font-semibold">Consignee (Ship to)</p>
                <p className="font-bold text-xs">{invoice.shipToName || invoice.shipTo?.name || '-'}</p>
                <p className="text-xs">{invoice.shipToAddress || invoice.shipTo?.address || '-'}</p>
                <p className="text-xs">{invoice.shipToCity || invoice.shipTo?.city || '-'}</p>
                <p className="text-xs">GSTIN/UIN: {invoice.shipToGstin || invoice.shipTo?.gstin || '-'}</p>
                <p className="text-xs">State Name: {invoice.shipToState || invoice.shipTo?.state || '-'}, Code: {invoice.shipToStateCode || invoice.shipTo?.stateCode || '-'}</p>
              </div>

              <div className="mt-3 pt-2 border-t">
                <p className="text-xs font-semibold">Buyer (Bill to)</p>
                <p className="font-bold text-xs">{invoice.billToName || invoice.billTo?.name || '-'}</p>
                <p className="text-xs">{invoice.billToAddress || invoice.billTo?.address || '-'}</p>
                <p className="text-xs">{invoice.billToCity || invoice.billTo?.city || '-'}</p>
                <p className="text-xs">GSTIN/UIN: {invoice.billToGstin || invoice.billTo?.gstin || '-'}</p>
                <p className="text-xs">State Name: {invoice.billToState || invoice.billTo?.state || '-'}, Code: {invoice.billToStateCode || invoice.billTo?.stateCode || '-'}</p>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="p-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-gray-600">Invoice No.</p>
                  <p className="font-semibold">{invoice.invoiceNo || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-600">e-Way Bill No.</p>
                  <p className="font-semibold">{invoice.ewayBillNo || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Dated</p>
                  <p className="font-semibold">{formatInvoiceDate(invoice.invoiceDate || invoice.date)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Mode/Terms of Payment</p>
                  <p className="font-semibold">{invoice.paymentTerms || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Delivery Note</p>
                  <p className="font-semibold">{invoice.deliveryNote || '-'}</p>
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
                  <p className="font-semibold">{formatInvoiceDate(invoice.buyerOrderDate)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Dispatch Doc No.</p>
                  <p className="font-semibold">{invoice.dispatchDocNo || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Delivery Note Date</p>
                  <p className="font-semibold">{formatInvoiceDate(invoice.deliveryNoteDate)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Dispatched through</p>
                  <p className="font-semibold">{invoice.dispatchedThrough || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Destination</p>
                  <p className="font-semibold">{invoice.destination || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Vessel/Flight No.</p>
                  <p className="font-semibold">{invoice.vehicleNo || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Place of receipt by shipper</p>
                  <p className="font-semibold">{invoice.receiptPlace || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-600">City/Port of Loading</p>
                  <p className="font-semibold">{invoice.loadingCity || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-600">City/Port of Discharge</p>
                  <p className="font-semibold">{invoice.dischargeCity || '-'}</p>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-gray-600 text-xs">Terms of Delivery</p>
                <p className="font-semibold text-xs">{invoice.termsOfDelivery || '-'}</p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
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
              {((invoice.items && invoice.items.length > 0) ? invoice.items : []).map((item: any, index: number) => (
                <tr key={index}>
                  <td className="border border-gray-300 p-2">{item.sl || index + 1}</td>
                  <td className="border border-gray-300 p-2 font-medium">{item.description || item.name || '-'}</td>
                  <td className="border border-gray-300 p-2 text-center">{item.hsn || item.hsnCode || '-'}</td>
                  <td className="border border-gray-300 p-2 text-center">{item.gstRate || item.gstPercent || 0}%</td>
                  <td className="border border-gray-300 p-2 text-center">{item.qty || item.quantity || 0} {item.unit || 'Nos'}</td>
                  <td className="border border-gray-300 p-2 text-right">₹{(item.rate || item.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="border border-gray-300 p-2 text-center">{item.unit || 'Nos'}</td>
                  <td className="border border-gray-300 p-2 text-right">₹{(item.amount || (item.rate * item.qty) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
              {(!invoice.items || invoice.items.length === 0) && (
                <tr>
                  <td className="border border-gray-300 p-4 text-center text-gray-500" colSpan={8}>No items in this invoice</td>
                </tr>
              )}
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
                    <p>₹{parseFloat(invoice.cgstAmount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    <p>₹{parseFloat(invoice.sgstAmount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    <p>₹{parseFloat(invoice.roundingOff || '0').toFixed(2)}</p>
                  </div>
                </td>
              </tr>
              {/* Total */}
              <tr className="bg-gray-100 font-bold">
                <td className="border border-gray-300 p-2" colSpan={4}>Total</td>
                <td className="border border-gray-300 p-2 text-center">{(invoice.items || []).reduce((sum: number, item: any) => sum + (item.qty || item.quantity || 0), 0)} Nos</td>
                <td className="border border-gray-300 p-2" colSpan={2}></td>
                <td className="border border-gray-300 p-2 text-right text-lg">₹{parseFloat(invoice.totalAmount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
          </div>

          {/* Amount in Words */}
          <div className="border border-gray-300 p-3 mb-4">
            <p className="text-xs text-gray-600">Amount Chargeable (in words)</p>
            <p className="font-bold text-sm">{invoice.amountInWords || amountInWords(parseFloat(invoice.totalAmount || '0'))}</p>
          </div>

          {/* Tax Breakdown Table */}
          <div className="border border-gray-300 mb-4 overflow-x-auto">
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
                  <td className="border-r border-t border-gray-300 p-2 text-right">₹{parseFloat(invoice.subtotal || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="border-r border-t border-gray-300 p-2 text-center">2.5%</td>
                  <td className="border-r border-t border-gray-300 p-2 text-right">₹{parseFloat(invoice.cgstAmount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="border-r border-t border-gray-300 p-2 text-center">2.5%</td>
                  <td className="border-r border-t border-gray-300 p-2 text-right">₹{parseFloat(invoice.sgstAmount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="border-t border-gray-300 p-2 text-right">₹{(parseFloat(invoice.cgstAmount || '0') + parseFloat(invoice.sgstAmount || '0')).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr className="font-bold bg-gray-50">
                  <td className="border-r border-t border-gray-300 p-2 text-right">Total: ₹{parseFloat(invoice.subtotal || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="border-r border-t border-gray-300 p-2"></td>
                  <td className="border-r border-t border-gray-300 p-2 text-right">₹{parseFloat(invoice.cgstAmount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="border-r border-t border-gray-300 p-2"></td>
                  <td className="border-r border-t border-gray-300 p-2 text-right">₹{parseFloat(invoice.sgstAmount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="border-t border-gray-300 p-2 text-right">₹{(parseFloat(invoice.cgstAmount || '0') + parseFloat(invoice.sgstAmount || '0')).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
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

function InvoiceSection({ type, merchantId, merchantData }: { type?: string; merchantId?: string | null; merchantData?: any }) {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState('10');
  const [showB2BInvoice, setShowB2BInvoice] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [showEditInvoice, setShowEditInvoice] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);

  const { data: invoicesData = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/merchants', merchantId, 'b2b-invoices', startDate, endDate],
    queryFn: async () => {
      if (!merchantId) return [];
      let url = `/api/merchants/${merchantId}/b2b-invoices`;
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (params.toString()) url += `?${params.toString()}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch invoices');
      return res.json();
    },
    enabled: !!merchantId,
  });

  const invoices = invoicesData.map((inv: any) => ({
    id: inv.id,
    invoiceNo: inv.invoiceNo,
    date: inv.invoiceDate,
    description: `B2B Invoice - ${(inv.items || []).map((i: any) => `${i.description || i.name} x ${i.quantity || 1}`).join(', ') || 'Products'}`,
    status: inv.status,
    dueDate: inv.dueDate,
    amount: parseFloat(inv.totalAmount) || 0,
    type: 'b2b',
    ...inv,
  }));

  const formatDate = (dateStr: string | Date) => {
    if (!dateStr) return '-';
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

  const openEditInvoice = (invoice: any) => {
    setEditingInvoice(invoice);
    setShowEditInvoice(true);
  };

  return (
    <div className="space-y-6">
      {showB2BInvoice && selectedInvoice && (
        <B2BTaxInvoice 
          invoice={selectedInvoice} 
          onClose={() => setShowB2BInvoice(false)} 
          onEdit={() => {
            setShowB2BInvoice(false);
            openEditInvoice(selectedInvoice);
          }}
        />
      )}
      
      {showCreateInvoice && (
        <CreateB2BInvoiceForm 
          merchantId={merchantId || null}
          merchantData={merchantData}
          onClose={() => setShowCreateInvoice(false)}
          onSuccess={() => refetch()}
        />
      )}
      
      {showEditInvoice && editingInvoice && (
        <EditB2BInvoiceForm 
          invoice={editingInvoice}
          onClose={() => {
            setShowEditInvoice(false);
            setEditingInvoice(null);
          }}
          onSuccess={() => refetch()}
        />
      )}
      
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">B2B Tax Invoices</h2>
        <Button className="bg-green-600 hover:bg-green-700" onClick={() => setShowCreateInvoice(true)}>
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
                        className="h-8 w-8 text-amber-600 hover:bg-amber-100" 
                        onClick={() => openEditInvoice(invoice)}
                        title="Edit Invoice"
                      >
                        <Pencil className="h-4 w-4" />
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
      const response = await fetch(`/api/union/${merchantId}/sub-users`);
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
        ? `/api/union/${merchantId}/sub-users/${editingUser.id}`
        : `/api/union/${merchantId}/sub-users`;
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
      const response = await fetch(`/api/union/${merchantId}/sub-users/${user.id}`, {
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
      const response = await fetch(`/api/union/${merchantId}/sub-users/${userId}`, {
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
              {UNION_PERMISSIONS.map((perm) => (
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
                            {UNION_PERMISSIONS.find(mp => mp.key === p)?.label || p}
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
                {UNION_PERMISSIONS.map((perm) => (
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

const UNION_ROLE_LABELS: Record<string, string> = {
  dealer: 'Dealer', wholesale_dealer: 'Wholesale Dealer (WSD)', wsd: 'Wholesale Dealer (WSD)',
  retailer: 'Retailer', inter_union: 'Inter Union', federation: 'Federation',
  fmd: 'Fresh Milk Dealer', customer: 'Consumer', consumer: 'Consumer',
  mpcs: 'MPCS', hotel: 'Hotel', institution: 'Institution',
  private_parlour: 'Private Parlour', union_parlour: 'Union Parlour',
  general_shop: 'General Shop / Retail',
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
  const [editUser, setEditUser] = useState<any>(null);
  const [credUser, setCredUser] = useState<any>(null);
  const [deleteUser, setDeleteUser] = useState<any>(null);
  const [autoLoginUser, setAutoLoginUser] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [autoLoginUrl, setAutoLoginUrl] = useState('');
  const [copied, setCopied] = useState(false);
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
    const cfg: Record<string, { className: string; label: string }> = {
      active: { className: 'bg-green-100 text-green-800', label: 'Active' },
      inactive: { className: 'bg-gray-100 text-gray-800', label: 'Inactive' },
      pending: { className: 'bg-yellow-100 text-yellow-800', label: 'Pending Approval' },
      rejected: { className: 'bg-red-100 text-red-800', label: 'Rejected' },
    };
    const c = cfg[status] || { className: 'bg-gray-100 text-gray-800', label: status };
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

  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  const b2bRoles = ['dealer', 'wholesale_dealer', 'wsd', 'retailer', 'inter_union', 'federation', 'fmd', 'mpcs', 'hotel', 'institution', 'private_parlour', 'union_parlour', 'general_shop'];

  const filteredUsers = displayUsers.filter(user => {
    const matchesSearch = !searchQuery || user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone?.includes(searchQuery) ||
      user.businessName?.toLowerCase().includes(searchQuery.toLowerCase());
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

  const handleOpenEdit = (user: any) => {
    setEditForm({
      name: user.name || '', phone: user.phone || '', email: user.email || '',
      businessName: user.businessName || '', businessType: user.businessType || '',
      businessCode: user.businessCode || '', district: user.district || '',
      route: user.businessRoute || '', point: user.point || '', office: user.office || '',
      role: user.role || '', freshMilkTier: user.freshMilkTier || 'X',
      productsTier: user.productsTier || 'X', iceCreamTier: user.iceCreamTier || 'X',
      pan: user.pan || '', aadhaar: user.aadhaar || '', gst: user.gst || '',
      msme: user.msme || '', securityDeposit: user.securityDeposit || '',
      status: user.status || 'active',
    });
    setEditUser(user);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/merchant/${merchantId}/users/${editUser.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm), credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed');
      toast({ title: 'User Updated', description: 'User details saved successfully' });
      invalidateUsers();
      setEditUser(null);
    } catch { toast({ title: 'Error', description: 'Failed to update user', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim()) return;
    setResettingPassword(true);
    try {
      const res = await fetch(`/api/union/${merchantId}/reset-user-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: credUser.id, newPassword }), credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed');
      toast({ title: 'Password Reset', description: 'Password has been reset successfully' });
      setCredUser({ ...credUser, plainPassword: newPassword });
      setNewPassword('');
    } catch { toast({ title: 'Error', description: 'Failed to reset password', variant: 'destructive' }); }
    finally { setResettingPassword(false); }
  };

  const handleDeleteUser = async () => {
    setDeletingUser(true);
    try {
      const res = await fetch(`/api/merchant/${merchantId}/users/${deleteUser.id}`, {
        method: 'DELETE', credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed');
      toast({ title: 'User Deleted' });
      invalidateUsers();
      setDeleteUser(null);
    } catch { toast({ title: 'Error', description: 'Failed to delete user', variant: 'destructive' }); }
    finally { setDeletingUser(false); }
  };

  const getRoleDashboardPath = (role: string) => {
    switch (role) {
      case 'wholesale_dealer':
      case 'wsd':
        return '/wsd/dashboard';
      case 'retailer':
        return '/retailer/dashboard';
      case 'dealer':
        return '/dealer/dashboard';
      default:
        return '/b2b/dashboard';
    }
  };

  const handleAutoLogin = async (user: any) => {
    try {
      const res = await fetch(`/api/union/${merchantId}/user/${user.id}/auto-login`, {
        method: 'POST', credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const url = `${window.location.origin}/api/auto-login/${data.token}`;
      window.open(url, '_blank');
    } catch { toast({ title: 'Error', description: 'Failed to generate auto-login link', variant: 'destructive' }); }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(autoLoginUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
                    {(type === 'users-b2b' || type === 'users-all' || isRegistrations) && <TableHead>Code</TableHead>}
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
                          <span className="font-medium text-sm">{user.businessName || '-'}</span>
                          {user.businessType && <p className="text-xs text-gray-500">{user.businessType}</p>}
                        </TableCell>
                      )}
                      {(type === 'users-b2b' || type === 'users-all' || isRegistrations) && (
                        <TableCell>
                          {user.businessCode ? <Badge variant="outline" className="font-mono text-xs">{user.businessCode}</Badge> : '-'}
                        </TableCell>
                      )}
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Edit"
                            onClick={() => handleOpenEdit(user)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Credentials"
                            onClick={() => { setCredUser(user); setNewPassword(''); }}>
                            <Key className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" title="Delete"
                            onClick={() => setDeleteUser(user)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Auto-login"
                            onClick={() => handleAutoLogin(user)}>
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
                  </div>
                  <div className="flex gap-2 pt-2 border-t">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenEdit(user)}>
                      <Pencil className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setCredUser(user); setNewPassword(''); }}>
                      <Key className="h-3 w-3 mr-1" /> Creds
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-500" onClick={() => setDeleteUser(user)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleAutoLogin(user)}>
                      <LogIn className="h-3 w-3" />
                    </Button>
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

      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user details and settings</DialogDescription>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Name</Label><Input value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} /></div>
                <div><Label>Phone</Label><Input value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} /></div>
                <div><Label>Email</Label><Input value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} /></div>
                <div><Label>Business Name</Label><Input value={editForm.businessName} onChange={(e) => setEditForm({...editForm, businessName: e.target.value})} /></div>
                <div><Label>Business Type</Label><Input value={editForm.businessType} onChange={(e) => setEditForm({...editForm, businessType: e.target.value})} /></div>
                <div><Label>Business Code</Label><Input value={editForm.businessCode} onChange={(e) => setEditForm({...editForm, businessCode: e.target.value})} /></div>
                <div><Label>District</Label><Input value={editForm.district} onChange={(e) => setEditForm({...editForm, district: e.target.value})} /></div>
                <div><Label>Route</Label><Input value={editForm.route} onChange={(e) => setEditForm({...editForm, route: e.target.value})} /></div>
                <div><Label>Point</Label><Input value={editForm.point} onChange={(e) => setEditForm({...editForm, point: e.target.value})} /></div>
                <div><Label>Office</Label><Input value={editForm.office} onChange={(e) => setEditForm({...editForm, office: e.target.value})} /></div>
                <div>
                  <Label>Role</Label>
                  <Select value={editForm.role} onValueChange={(v) => setEditForm({...editForm, role: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(UNION_ROLE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fresh Milk Tier</Label>
                  <Select value={editForm.freshMilkTier} onValueChange={(v) => setEditForm({...editForm, freshMilkTier: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(UNION_TIER_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Products Tier</Label>
                  <Select value={editForm.productsTier} onValueChange={(v) => setEditForm({...editForm, productsTier: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(UNION_TIER_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ice Cream Tier</Label>
                  <Select value={editForm.iceCreamTier} onValueChange={(v) => setEditForm({...editForm, iceCreamTier: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(UNION_TIER_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>PAN</Label><Input value={editForm.pan} onChange={(e) => setEditForm({...editForm, pan: e.target.value})} /></div>
                <div><Label>Aadhaar</Label><Input value={editForm.aadhaar} onChange={(e) => setEditForm({...editForm, aadhaar: e.target.value})} /></div>
                <div><Label>GST</Label><Input value={editForm.gst} onChange={(e) => setEditForm({...editForm, gst: e.target.value})} /></div>
                <div><Label>MSME</Label><Input value={editForm.msme} onChange={(e) => setEditForm({...editForm, msme: e.target.value})} /></div>
                <div><Label>Security Deposit</Label><Input value={editForm.securityDeposit} onChange={(e) => setEditForm({...editForm, securityDeposit: e.target.value})} /></div>
                <div>
                  <Label>Status</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEditForm({...editForm, status: v})}>
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
                <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
                <Button onClick={handleSaveEdit} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!credUser} onOpenChange={(open) => !open && setCredUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Credentials</DialogTitle>
            <DialogDescription>Login credentials for {credUser?.name}</DialogDescription>
          </DialogHeader>
          {credUser && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
                <div><span className="text-gray-500 font-medium">Login Email:</span> <span className="font-mono">{credUser.email || '-'}</span></div>
                <div><span className="text-gray-500 font-medium">Business Code:</span> <span className="font-mono">{credUser.businessCode || '-'}</span></div>
                <div><span className="text-gray-500 font-medium">Phone:</span> <span className="font-mono">{credUser.phone || '-'}</span></div>
                <div><span className="text-gray-500 font-medium">Current Password:</span> <span className="font-mono">{credUser.plainPassword || 'Aavincart@123'}</span></div>
              </div>
              <div className="space-y-2">
                <Label>Reset Password</Label>
                <div className="flex gap-2">
                  <Input placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" />
                  <Button onClick={handleResetPassword} disabled={resettingPassword || !newPassword.trim()}>
                    {resettingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>Are you sure you want to delete {deleteUser?.name}? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={deletingUser}>
              {deletingUser ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!autoLoginUser} onOpenChange={(open) => !open && setAutoLoginUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Auto-Login Link</DialogTitle>
            <DialogDescription>Auto-login URL for {autoLoginUser?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-mono break-all">{autoLoginUrl}</p>
            </div>
            <Button className="w-full" onClick={handleCopyUrl}>
              {copied ? <><Check className="h-4 w-4 mr-2" /> Copied!</> : <><Copy className="h-4 w-4 mr-2" /> Copy URL</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BuyersSection({ type, merchantId, initialCategory = 'all' }: { type?: string; merchantId?: string | null; initialCategory?: string }) {
  const [entriesPerPage, setEntriesPerPage] = useState('25');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewAgent, setViewAgent] = useState<any>(null);
  const [editAgent, setEditAgent] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const { toast } = useToast();

  const { data: agents = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/merchant', merchantId, 'agents'],
    queryFn: async () => {
      if (!merchantId) return [];
      const res = await fetch(`/api/merchant/${merchantId}/agents`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!merchantId,
  });

  const { data: agentStats } = useQuery<any>({
    queryKey: ['/api/merchant', merchantId, 'agents', 'stats'],
    queryFn: async () => {
      if (!merchantId) return null;
      const res = await fetch(`/api/merchant/${merchantId}/agents/stats`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!merchantId,
  });

  const categoryConfig: Record<string, { label: string; color: string; icon: string }> = {
    'AGENT': { label: 'Agents/Dealers', color: 'bg-blue-100 text-blue-700', icon: '🏪' },
    'PRIVATE_PARLOUR': { label: 'Private Parlours', color: 'bg-purple-100 text-purple-700', icon: '🏬' },
    'INSTUTION': { label: 'Institutions', color: 'bg-amber-100 text-amber-700', icon: '🏛️' },
    'WSD': { label: 'Wholesale Dealers', color: 'bg-green-100 text-green-700', icon: '📦' },
    'HOTELS': { label: 'Hotels', color: 'bg-orange-100 text-orange-700', icon: '🏨' },
    'UNION_PARLOUR': { label: 'Union Parlours', color: 'bg-indigo-100 text-indigo-700', icon: '🏢' },
  };

  const categoryCounts = agents.reduce((acc: Record<string, number>, agent: any) => {
    const cat = agent.agentType || agent.agent_type || 'AGENT';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const filteredAgents = agents.filter((agent: any) => {
    const cat = agent.agentType || agent.agent_type || 'AGENT';
    const matchesCategory = selectedCategory === 'all' || cat === selectedCategory;
    const matchesSearch = !searchQuery || 
      (agent.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (agent.agentCode || agent.agent_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (agent.phone || '').includes(searchQuery) ||
      (agent.routeName || agent.route_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const perPage = parseInt(entriesPerPage);
  const totalPages = Math.ceil(filteredAgents.length / perPage);
  const paginatedAgents = filteredAgents.slice((currentPage - 1) * perPage, currentPage * perPage);

  const tierLabel = (tier: string) => {
    switch (tier) {
      case 'DLR': return 'Dealer';
      case 'WSD': return 'WSD';
      case 'MRP': return 'MRP';
      case 'FED': return 'Federation';
      case 'IU': return 'Inter-Union';
      default: return tier || '-';
    }
  };

  const tierColor = (tier: string) => {
    switch (tier) {
      case 'DLR': return 'bg-blue-100 text-blue-700';
      case 'WSD': return 'bg-green-100 text-green-700';
      case 'MRP': return 'bg-gray-100 text-gray-700';
      case 'FED': return 'bg-purple-100 text-purple-700';
      case 'IU': return 'bg-indigo-100 text-indigo-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getBuyersExportData = () => {
    return filteredAgents.map((agent: any) => ({
      'Name': agent.name || '-',
      'Agent Code': agent.agentCode || agent.agent_code || '-',
      'Phone': agent.phone || '-',
      'Route': agent.routeName || agent.route_name || '-',
      'Type': (agent.agentType || agent.agent_type || 'AGENT'),
      'Pricing Tier': tierLabel(agent.pricingTier || agent.pricing_tier || ''),
      'Status': agent.status || '-',
    }));
  };

  const handleBuyersExportExcel = () => {
    const data = getBuyersExportData();
    if (data.length === 0) { toast({ title: 'No Data', description: 'No data to export' }); return; }
    const headers = Object.keys(data[0]).join('\t');
    const rows = data.map(row => Object.values(row).join('\t')).join('\n');
    const blob = new Blob([headers + '\n' + rows], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'buyers_agents.xls'; a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Export Complete', description: `${data.length} records exported to Excel` });
  };

  const handleBuyersExportCSV = () => {
    const data = getBuyersExportData();
    if (data.length === 0) { toast({ title: 'No Data', description: 'No data to export' }); return; }
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([headers + '\n' + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'buyers_agents.csv'; a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Export Complete', description: `${data.length} records exported to CSV` });
  };

  const handleBuyersExportPDF = () => {
    const data = getBuyersExportData();
    if (data.length === 0) { toast({ title: 'No Data', description: 'No data to export' }); return; }
    const headers = Object.keys(data[0]);
    const printContent = `<html><head><title>Buyers / Agents Report</title>
      <style>body{font-family:Arial,sans-serif;padding:20px}h1{color:#1a365d;font-size:20px}table{width:100%;border-collapse:collapse;margin-top:15px}th{background:#2d3748;color:white;padding:8px 12px;text-align:left;font-size:12px}td{border:1px solid #e2e8f0;padding:6px 12px;font-size:11px}tr:nth-child(even){background:#f7fafc}</style></head>
      <body><h1>Buyers / Agents Report</h1><p style="color:#718096;font-size:12px">Generated: ${new Date().toLocaleDateString()} | Total: ${data.length} records</p>
      <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>
      ${data.map(row => `<tr>${Object.values(row).map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}
      </tbody></table></body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(printContent); win.document.close(); win.print(); }
    toast({ title: 'PDF Export', description: 'Print dialog opened - save as PDF' });
  };

  const handleBuyersPrint = () => { handleBuyersExportPDF(); };

  const ExportButtons = () => (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50" onClick={handleBuyersExportExcel}>Excel</Button>
      <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50" onClick={handleBuyersExportCSV}>CSV</Button>
      <Button variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-50" onClick={handleBuyersExportPDF}>PDF</Button>
      <Button variant="outline" size="sm" className="text-blue-600 border-blue-600 hover:bg-blue-50" onClick={handleBuyersPrint}>Print</Button>
    </div>
  );

  const handleDownloadTemplate = () => {
    const template = 'name,agentCode,phone,agentType,routeName,address,pricingTier,creditLimit,freshMilkCreditLimit,productsCreditLimit\nJohn Dairy Store,SLM-1001,9876543210,AGENT,Route 1,"123 Main St, Chennai",DLR,50000,25000,25000\nGreen Milk Center,SLM-1002,9876543211,WSD,Route 2,"456 Second St, Madurai",WSD,100000,50000,50000';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agents-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCSVFileSelect = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportErrors([]);
    setImportResult(null);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        setImportErrors(['CSV file must have a header row and at least one data row']);
        return;
      }
      
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const requiredFields = ['name', 'agentCode'];
      const missing = requiredFields.filter(f => !headers.includes(f));
      if (missing.length > 0) {
        setImportErrors([`Missing required columns: ${missing.join(', ')}. Required: name, agentCode`]);
        return;
      }

      const parsed: any[] = [];
      const errors: string[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].match(/(".*?"|[^,]+)/g)?.map(v => v.trim().replace(/^"|"$/g, '')) || [];
        if (values.length === 0) continue;
        
        const row: any = {};
        headers.forEach((h, idx) => {
          if (values[idx] !== undefined) row[h] = values[idx];
        });
        
        if (!row.name || !row.agentCode) {
          errors.push(`Row ${i}: Missing name or agentCode`);
          continue;
        }

        parsed.push({
          name: row.name,
          agentCode: row.agentCode,
          phone: row.phone || '',
          agentType: row.agentType || 'AGENT',
          routeName: row.routeName || '',
          address: row.address || '',
          pricingTier: row.pricingTier || 'DLR',
          creditLimit: parseInt(row.creditLimit) || 0,
          freshMilkCreditLimit: parseInt(row.freshMilkCreditLimit) || 0,
          productsCreditLimit: parseInt(row.productsCreditLimit) || 0,
          status: 'active',
        });
      }
      
      if (errors.length > 0) setImportErrors(errors);
      setImportData(parsed);
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async () => {
    if (importData.length === 0 || !merchantId) return;
    setIsImporting(true);
    try {
      const res = await fetch(`/api/merchant/${merchantId}/agents/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agents: importData }),
      });
      const result = await res.json();
      setImportResult(result);
      if (result.success > 0) {
        toast({ title: 'Import Complete', description: `${result.success} agents imported successfully` });
        queryClient.invalidateQueries({ queryKey: ['/api/merchant', merchantId, 'agents'] });
      }
      if (result.failed > 0) {
        toast({ title: 'Some imports failed', description: `${result.failed} agents could not be imported`, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Import Failed', description: 'Failed to import agents', variant: 'destructive' });
    } finally {
      setIsImporting(false);
    }
  };

  if (type === 'customer-list') {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Buyers / Agents</h2>
            <p className="text-sm text-gray-500">{agents.length} total buyers registered under this union</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-indigo-600 border-indigo-600 hover:bg-indigo-50" onClick={() => { setShowImportDialog(true); setImportData([]); setImportErrors([]); setImportResult(null); }}>
              <Upload className="h-3.5 w-3.5 mr-1" /> Import CSV
            </Button>
            <ExportButtons />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3">
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${selectedCategory === 'all' ? 'ring-2 ring-primary bg-primary/5' : ''}`}
            onClick={() => { setSelectedCategory('all'); setCurrentPage(1); }}
          >
            <CardContent className="p-3 text-center">
              <p className="text-lg sm:text-2xl font-bold">{agents.length}</p>
              <p className="text-xs text-gray-500">All Buyers</p>
            </CardContent>
          </Card>
          {Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).map(([cat, count]) => {
            const config = categoryConfig[cat] || { label: cat, color: 'bg-gray-100 text-gray-700', icon: '👤' };
            return (
              <Card 
                key={cat}
                className={`cursor-pointer transition-all hover:shadow-md ${selectedCategory === cat ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                onClick={() => { setSelectedCategory(cat); setCurrentPage(1); }}
              >
                <CardContent className="p-3 text-center">
                  <p className="text-lg sm:text-2xl font-bold">{count}</p>
                  <p className="text-xs text-gray-500 truncate">{config.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show</span>
                <Select value={entriesPerPage} onValueChange={(v) => { setEntriesPerPage(v); setCurrentPage(1); }}>
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
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search by name, code, phone..." 
                  value={searchQuery} 
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} 
                  className="pl-10" 
                />
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                <p className="text-sm text-gray-500 mt-2">Loading buyers...</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Code</TableHead>
                        <TableHead className="w-32">Category</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden md:table-cell">Route</TableHead>
                        <TableHead className="hidden lg:table-cell">Office</TableHead>
                        <TableHead className="w-20 text-center">Fresh Milk</TableHead>
                        <TableHead className="w-20 text-center">Product</TableHead>
                        <TableHead className="w-20 text-center">Status</TableHead>
                        <TableHead className="w-24 text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedAgents.map((agent: any) => {
                        const agentType = agent.agentType || agent.agent_type || 'AGENT';
                        const agentCode = agent.agentCode || agent.agent_code || '';
                        const freshMilkTier = agent.freshMilkTier || agent.fresh_milk_tier || '';
                        const productTier = agent.productTier || agent.product_tier || '';
                        const routeName = agent.routeName || agent.route_name || '';
                        const routeNumber = agent.routeNumber || agent.route_number || '';
                        const officeId = agent.officeId || agent.office_id || '';
                        const isActive = agent.isActive || agent.is_active;
                        const status = agent.status || (isActive ? 'active' : 'inactive');
                        const catConfig = categoryConfig[agentType] || { label: agentType, color: 'bg-gray-100 text-gray-700' };
                        
                        return (
                          <TableRow key={agent.id}>
                            <TableCell className="font-mono text-xs text-purple-600 font-medium">{agentCode}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${catConfig.color}`}>
                                {catConfig.label}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{agent.name}</p>
                                {agent.phone && <p className="text-xs text-gray-500">{agent.phone}</p>}
                                <p className="text-xs text-gray-400 md:hidden">{routeName} {routeNumber ? `(#${routeNumber})` : ''}</p>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm">
                              {routeName} {routeNumber ? `(#${routeNumber})` : ''}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-xs text-gray-600">
                              {officeId}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${tierColor(freshMilkTier)}`}>
                                {tierLabel(freshMilkTier)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${tierColor(productTier)}`}>
                                {tierLabel(productTier)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {status === 'active' ? 'Active' : 'Inactive'}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewAgent(agent)}><Eye className="h-3.5 w-3.5 text-blue-600" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditAgent(agent); setEditForm({ name: agent.name || '', phone: agent.phone || '', email: agent.email || '', address: agent.address || '', city: agent.city || '', district: agent.district || '', pincode: agent.pincode || '', freshMilkTier: agent.freshMilkTier || agent.fresh_milk_tier || '', productTier: agent.productTier || agent.product_tier || '', status: agent.status || 'active' }); }}><Edit className="h-3.5 w-3.5 text-green-600" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-3">
                  <p className="text-sm text-gray-500">
                    Showing {((currentPage - 1) * perPage) + 1} to {Math.min(currentPage * perPage, filteredAgents.length)} of {filteredAgents.length} entries
                    {selectedCategory !== 'all' && ` (filtered from ${agents.length} total)`}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="outline" size="sm" 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                    >Previous</Button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum = i + 1;
                      if (totalPages > 5) {
                        if (currentPage <= 3) pageNum = i + 1;
                        else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                        else pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button 
                          key={pageNum} 
                          variant="outline" 
                          size="sm" 
                          className={currentPage === pageNum ? 'bg-purple-600 text-white hover:bg-purple-700' : ''}
                          onClick={() => setCurrentPage(pageNum)}
                        >{pageNum}</Button>
                      );
                    })}
                    <Button 
                      variant="outline" size="sm" 
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => p + 1)}
                    >Next</Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!viewAgent} onOpenChange={(open) => { if (!open) setViewAgent(null); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">Agent Details</DialogTitle>
            </DialogHeader>
            {viewAgent && (() => {
              const agentCode = viewAgent.agentCode || viewAgent.agent_code || '';
              const agentType = viewAgent.agentType || viewAgent.agent_type || '';
              const freshMilkTier = viewAgent.freshMilkTier || viewAgent.fresh_milk_tier || '';
              const productTier = viewAgent.productTier || viewAgent.product_tier || '';
              const routeName = viewAgent.routeName || viewAgent.route_name || '';
              const routeNumber = viewAgent.routeNumber || viewAgent.route_number || '';
              const officeId = viewAgent.officeId || viewAgent.office_id || '';
              const agentPoint = viewAgent.agentPoint || viewAgent.agent_point || '';
              const catConfig = categoryConfig[agentType] || { label: agentType, color: 'bg-gray-100 text-gray-700' };
              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b">
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-lg">
                      {(viewAgent.name || '?')[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{viewAgent.name}</p>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${catConfig.color}`}>{catConfig.label}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-gray-500">Agent Code</p><p className="font-medium font-mono text-purple-600">{agentCode}</p></div>
                    <div><p className="text-gray-500">Status</p><p className="font-medium"><span className={`px-2 py-0.5 rounded-full text-xs ${viewAgent.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{viewAgent.status === 'active' ? 'Active' : 'Inactive'}</span></p></div>
                    <div><p className="text-gray-500">Phone</p><p className="font-medium">{viewAgent.phone || '-'}</p></div>
                    <div><p className="text-gray-500">Email</p><p className="font-medium">{viewAgent.email || '-'}</p></div>
                    <div><p className="text-gray-500">Fresh Milk Tier</p><p className="font-medium"><span className={`px-1.5 py-0.5 rounded text-xs ${tierColor(freshMilkTier)}`}>{tierLabel(freshMilkTier)}</span></p></div>
                    <div><p className="text-gray-500">Product Tier</p><p className="font-medium"><span className={`px-1.5 py-0.5 rounded text-xs ${tierColor(productTier)}`}>{tierLabel(productTier)}</span></p></div>
                    <div><p className="text-gray-500">Route</p><p className="font-medium">{routeName} {routeNumber ? `(#${routeNumber})` : ''}</p></div>
                    <div><p className="text-gray-500">Office</p><p className="font-medium">{officeId || '-'}</p></div>
                    <div><p className="text-gray-500">Agent Point</p><p className="font-medium">{agentPoint || '-'}</p></div>
                    <div><p className="text-gray-500">City / District</p><p className="font-medium">{viewAgent.city || '-'}, {viewAgent.district || '-'}</p></div>
                    <div className="col-span-2"><p className="text-gray-500">Address</p><p className="font-medium">{viewAgent.address || '-'}</p></div>
                    {viewAgent.pincode && <div><p className="text-gray-500">Pincode</p><p className="font-medium">{viewAgent.pincode}</p></div>}
                  </div>
                </div>
              );
            })()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewAgent(null)}>Close</Button>
              <Button onClick={() => { setEditAgent(viewAgent); setEditForm({ name: viewAgent.name || '', phone: viewAgent.phone || '', email: viewAgent.email || '', address: viewAgent.address || '', city: viewAgent.city || '', district: viewAgent.district || '', pincode: viewAgent.pincode || '', freshMilkTier: viewAgent.freshMilkTier || viewAgent.fresh_milk_tier || '', productTier: viewAgent.productTier || viewAgent.product_tier || '', status: viewAgent.status || 'active' }); setViewAgent(null); }}>Edit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editAgent} onOpenChange={(open) => { if (!open) setEditAgent(null); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">Edit Agent - {editAgent?.agentCode || editAgent?.agent_code}</DialogTitle>
            </DialogHeader>
            {editAgent && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Name</label>
                    <Input value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Phone</label>
                    <Input value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <Input value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">City</label>
                    <Input value={editForm.city} onChange={(e) => setEditForm({...editForm, city: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">District</label>
                    <Input value={editForm.district} onChange={(e) => setEditForm({...editForm, district: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Pincode</label>
                    <Input value={editForm.pincode} onChange={(e) => setEditForm({...editForm, pincode: e.target.value})} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-sm font-medium text-gray-700">Address</label>
                    <Input value={editForm.address} onChange={(e) => setEditForm({...editForm, address: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Fresh Milk Tier</label>
                    <Select value={editForm.freshMilkTier} onValueChange={(v) => setEditForm({...editForm, freshMilkTier: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DLR">Dealer</SelectItem>
                        <SelectItem value="WSD">WSD</SelectItem>
                        <SelectItem value="MRP">MRP</SelectItem>
                        <SelectItem value="FED">Federation</SelectItem>
                        <SelectItem value="IU">Inter-Union</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Product Tier</label>
                    <Select value={editForm.productTier} onValueChange={(v) => setEditForm({...editForm, productTier: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DLR">Dealer</SelectItem>
                        <SelectItem value="WSD">WSD</SelectItem>
                        <SelectItem value="MRP">MRP</SelectItem>
                        <SelectItem value="FED">Federation</SelectItem>
                        <SelectItem value="IU">Inter-Union</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <Select value={editForm.status} onValueChange={(v) => setEditForm({...editForm, status: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditAgent(null)}>Cancel</Button>
              <Button onClick={async () => {
                try {
                  const res = await fetch(`/api/agents/${editAgent.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(editForm),
                  });
                  if (res.ok) {
                    toast({ title: 'Agent Updated', description: `${editForm.name} has been updated successfully.` });
                    setEditAgent(null);
                    queryClient.invalidateQueries({ queryKey: ['/api/merchant', merchantId, 'agents'] });
                  } else {
                    toast({ title: 'Error', description: 'Failed to update agent.', variant: 'destructive' });
                  }
                } catch {
                  toast({ title: 'Error', description: 'Failed to update agent.', variant: 'destructive' });
                }
              }}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Import Agents from CSV</DialogTitle>
              <DialogDescription>Upload a CSV file to bulk import agents. Download the template to see the required format.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                  <Download className="h-3.5 w-3.5 mr-1" /> Download Template
                </Button>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVFileSelect}
                  className="hidden"
                  id="csv-import-input"
                />
                <label htmlFor="csv-import-input" className="cursor-pointer">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Click to select CSV file</p>
                  <p className="text-xs text-gray-400 mt-1">Required columns: name, agentCode. Optional: phone, agentType, routeName, address, pricingTier, creditLimit</p>
                </label>
              </div>

              {importErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-red-700 mb-1">Validation Errors:</p>
                  {importErrors.map((err, i) => (
                    <p key={i} className="text-xs text-red-600">{err}</p>
                  ))}
                </div>
              )}

              {importData.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-green-700 mb-2">{importData.length} agents ready to import</p>
                  <div className="max-h-40 overflow-y-auto overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="text-left text-gray-500"><th className="p-1">Name</th><th className="p-1">Code</th><th className="p-1">Type</th><th className="p-1">Phone</th></tr></thead>
                      <tbody>
                        {importData.slice(0, 10).map((agent, i) => (
                          <tr key={i} className="border-t"><td className="p-1">{agent.name}</td><td className="p-1">{agent.agentCode}</td><td className="p-1">{agent.agentType}</td><td className="p-1">{agent.phone}</td></tr>
                        ))}
                        {importData.length > 10 && <tr><td colSpan={4} className="p-1 text-gray-400">...and {importData.length - 10} more</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {importResult && (
                <div className={`border rounded-lg p-3 ${importResult.failed > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
                  <p className="text-sm font-medium">{importResult.message}</p>
                  {importResult.errors?.length > 0 && (
                    <div className="mt-2 max-h-32 overflow-y-auto">
                      {importResult.errors.map((err: any, i: number) => (
                        <p key={i} className="text-xs text-red-600">Row {err.row} ({err.name}): {err.error}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowImportDialog(false)}>Close</Button>
              <Button 
                onClick={handleImportSubmit} 
                disabled={importData.length === 0 || isImporting}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isImporting ? 'Importing...' : `Import ${importData.length} Agents`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (type === 'review-list') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Customer reviews</h2>
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-500">No reviews yet.</p>
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
            <p className="text-gray-500">No subscribers yet.</p>
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

function UsersSection({ type, merchantId }: { type?: string; merchantId?: string | null }) {
  const [entriesPerPage, setEntriesPerPage] = useState('10');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUserPasswordResetDialog, setShowUserPasswordResetDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newUserPassword, setNewUserPassword] = useState('');
  const [confirmUserPassword, setConfirmUserPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
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
  const [activeTab, setActiveTab] = useState('registered');
  const { toast } = useToast();
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [showBulkUserDeleteConfirm, setShowBulkUserDeleteConfirm] = useState(false);

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['/api/merchant', merchantId, 'agents'],
    queryFn: async () => {
      if (!merchantId) return [];
      const response = await fetch(`/api/union/${merchantId}/agents`);
      if (!response.ok) throw new Error('Failed to fetch agents');
      return response.json();
    },
    enabled: !!merchantId,
  });

  const { data: mappedUsers = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['/api/union', merchantId, 'mapped-users'],
    queryFn: async () => {
      if (!merchantId) return [];
      const response = await fetch(`/api/union/${merchantId}/mapped-users`);
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    enabled: !!merchantId,
  });

  const handleUserAutoLogin = async (user: any) => {
    try {
      const response = await fetch(`/api/union/${merchantId}/user/${user.id}/auto-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        toast({ title: "Auto Login", description: `Opening session as ${user.name}...` });
        window.open(`/?auto_login_token=${data.token}`, '_blank');
      } else {
        const error = await response.json();
        toast({ title: "Error", description: error.message || "Failed to create auto login session", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to auto login as user", variant: "destructive" });
    }
  };

  const handleUserPasswordReset = async () => {
    if (!selectedUser) return;
    if (!newUserPassword || newUserPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (newUserPassword !== confirmUserPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    setIsSavingPassword(true);
    try {
      const response = await fetch(`/api/union/${merchantId}/reset-user-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, newPassword: newUserPassword }),
      });
      if (response.ok) {
        toast({ title: "Success", description: `Password reset for ${selectedUser.name}` });
        setShowUserPasswordResetDialog(false);
        setNewUserPassword('');
        setConfirmUserPassword('');
      } else {
        const error = await response.json();
        toast({ title: "Error", description: error.message || "Failed to reset password", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to reset password", variant: "destructive" });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const bulkDeleteUsersMutation = useMutation({
    mutationFn: async (userIds: number[]) => {
      const response = await fetch('/api/admin/users/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userIds }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete users');
      }
      return response.json();
    },
    onSuccess: (data) => {
      refetchUsers();
      setSelectedUserIds(new Set());
      setShowBulkUserDeleteConfirm(false);
      toast({ title: 'Users Deleted', description: `${data.deleted} user(s) deleted successfully` });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const toggleUserSelect = (userId: number) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleSelectAllUsers = (filteredUsers: any[]) => {
    if (selectedUserIds.size === filteredUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.map((u: any) => u.id)));
    }
  };

  const getPricingRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      FEDERATION: 'bg-purple-100 text-purple-700',
      INTER_UNION: 'bg-blue-100 text-blue-700',
      WHOLESALE_DEALER: 'bg-green-100 text-green-700',
      DEALER: 'bg-orange-100 text-orange-700',
      RETAILER: 'bg-yellow-100 text-yellow-700',
      MRP: 'bg-gray-100 text-gray-700',
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

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

  const getUsersExportData = () => {
    return userData.map((item: any) => ({
      'Name': item.name || '-',
      'Email': item.email || '-',
      'Mobile': item.mobile || '-',
      'Role': item.role || '-',
      'Status': item.status || '-',
      'Permissions': item.permissions || 0,
    }));
  };

  const handleUsersExportExcel = () => {
    const data = getUsersExportData();
    if (data.length === 0) { toast({ title: 'No Data', description: 'No data to export' }); return; }
    const headers = Object.keys(data[0]).join('\t');
    const rows = data.map(row => Object.values(row).join('\t')).join('\n');
    const blob = new Blob([headers + '\n' + rows], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'users.xls'; a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Export Complete', description: `${data.length} records exported to Excel` });
  };

  const handleUsersExportCSV = () => {
    const data = getUsersExportData();
    if (data.length === 0) { toast({ title: 'No Data', description: 'No data to export' }); return; }
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([headers + '\n' + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'users.csv'; a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Export Complete', description: `${data.length} records exported to CSV` });
  };

  const handleUsersExportPDF = () => {
    const data = getUsersExportData();
    if (data.length === 0) { toast({ title: 'No Data', description: 'No data to export' }); return; }
    const headers = Object.keys(data[0]);
    const printContent = `<html><head><title>Users Report</title>
      <style>body{font-family:Arial,sans-serif;padding:20px}h1{color:#1a365d;font-size:20px}table{width:100%;border-collapse:collapse;margin-top:15px}th{background:#2d3748;color:white;padding:8px 12px;text-align:left;font-size:12px}td{border:1px solid #e2e8f0;padding:6px 12px;font-size:11px}tr:nth-child(even){background:#f7fafc}</style></head>
      <body><h1>Users Report</h1><p style="color:#718096;font-size:12px">Generated: ${new Date().toLocaleDateString()} | Total: ${data.length} records</p>
      <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>
      ${data.map(row => `<tr>${Object.values(row).map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}
      </tbody></table></body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(printContent); win.document.close(); win.print(); }
    toast({ title: 'PDF Export', description: 'Print dialog opened - save as PDF' });
  };

  const handleUsersPrint = () => { handleUsersExportPDF(); };

  const ExportButtons = () => (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50" onClick={handleUsersExportExcel}>Excel</Button>
      <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50" onClick={handleUsersExportCSV}>CSV</Button>
      <Button variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-50" onClick={handleUsersExportPDF}>PDF</Button>
      <Button variant="outline" size="sm" className="text-blue-600 border-blue-600 hover:bg-blue-50" onClick={handleUsersPrint}>Print</Button>
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

      {/* User Password Reset Dialog */}
      <Dialog open={showUserPasswordResetDialog} onOpenChange={setShowUserPasswordResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password - {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Set a new password for {selectedUser?.email}
            </p>
            <div>
              <Label htmlFor="user-new-password">New Password</Label>
              <Input
                id="user-new-password"
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="user-confirm-password">Confirm Password</Label>
              <Input
                id="user-confirm-password"
                type="password"
                value={confirmUserPassword}
                onChange={(e) => setConfirmUserPassword(e.target.value)}
                placeholder="Confirm new password"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowUserPasswordResetDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleUserPasswordReset} 
              disabled={isSavingPassword}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isSavingPassword ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Reset Password
            </Button>
          </DialogFooter>
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
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
            <TabsTrigger value="registered">Registered Users ({mappedUsers.length})</TabsTrigger>
            <TabsTrigger value="agents">Agents ({agents.length})</TabsTrigger>
            <TabsTrigger value="staff">Staff ({userData.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="registered">
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
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-gray-600">entries</span>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 w-64" />
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => refetchUsers()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
                {usersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-500">Loading users...</span>
                  </div>
                ) : mappedUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No registered users for this Union</p>
                  </div>
                ) : (
                  <>
                  {selectedUserIds.size > 0 && (
                    <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                      <span className="text-sm font-medium text-red-700">{selectedUserIds.size} user(s) selected</span>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedUserIds(new Set())}>Clear Selection</Button>
                        <Button variant="destructive" size="sm" onClick={() => setShowBulkUserDeleteConfirm(true)} disabled={bulkDeleteUsersMutation.isPending}>
                          <Trash2 className="h-4 w-4 mr-1" /> Delete Selected
                        </Button>
                      </div>
                    </div>
                  )}

                  <Dialog open={showBulkUserDeleteConfirm} onOpenChange={setShowBulkUserDeleteConfirm}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete {selectedUserIds.size} User(s)?</DialogTitle>
                        <p className="text-sm text-muted-foreground mt-2">This action cannot be undone. Are you sure you want to permanently delete {selectedUserIds.size} selected user(s)?</p>
                      </DialogHeader>
                      <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setShowBulkUserDeleteConfirm(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => bulkDeleteUsersMutation.mutate(Array.from(selectedUserIds))} disabled={bulkDeleteUsersMutation.isPending}>
                          {bulkDeleteUsersMutation.isPending ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox 
                            checked={mappedUsers.length > 0 && selectedUserIds.size === mappedUsers.filter((user: any) => 
                              user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              user.phone?.includes(searchQuery)
                            ).slice(0, parseInt(entriesPerPage)).length}
                            onCheckedChange={() => toggleSelectAllUsers(mappedUsers.filter((user: any) => 
                              user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              user.phone?.includes(searchQuery)
                            ).slice(0, parseInt(entriesPerPage)))}
                          />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Pricing Tier</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mappedUsers
                        .filter((user: any) => 
                          user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          user.phone?.includes(searchQuery)
                        )
                        .slice(0, parseInt(entriesPerPage))
                        .map((user: any) => (
                        <TableRow key={user.id} className={selectedUserIds.has(user.id) ? 'bg-blue-50' : ''}>
                          <TableCell className="w-10">
                            <Checkbox 
                              checked={selectedUserIds.has(user.id)}
                              onCheckedChange={() => toggleUserSelect(user.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                                  {user.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{user.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{user.email}</TableCell>
                          <TableCell className="text-sm">{user.phone || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs capitalize">{user.role}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge className={`text-xs ${getPricingRoleBadge(user.pricingRole)}`}>
                                {user.pricingRole || 'MRP'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {formatTimestamp(user.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                title="Auto Login as this User"
                                onClick={() => handleUserAutoLogin(user)}
                              >
                                <LogOut className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                title="Reset Password"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setNewUserPassword('');
                                  setConfirmUserPassword('');
                                  setShowUserPasswordResetDialog(true);
                                }}
                              >
                                <RefreshCw className="h-4 w-4 text-orange-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </>
                )}
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-500">
                    Showing {Math.min(parseInt(entriesPerPage), mappedUsers.length)} of {mappedUsers.length} users
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
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

function ReportsSection({ type }: { type?: string }) {
  const [entriesPerPage, setEntriesPerPage] = useState('10');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [activeTab, setActiveTab] = useState('summary');
  const { toast } = useToast();

  const salesReportData = [
    { id: 1, orderId: 'Order-428356', items: 'Full Cream Milk 10L, Curd 5kg, Butter 500g', orderType: 'B2B', paymentType: 'Credit', total: '₹5,108', avatar: 'WD' },
    { id: 2, orderId: 'Order-428125', items: 'Standardized Milk 20L, Paneer 2kg', orderType: 'B2B', paymentType: 'UPI', total: '₹2,350', avatar: 'DL' },
    { id: 3, orderId: 'Order-426087', items: 'Ghee 2L, Flavored Milk 50 packs', orderType: 'Retail', paymentType: 'Cash', total: '₹1,850', avatar: 'RT' },
  ];

  const dailySalesData = [
    { id: 1, orderId: 'Order-428356', transaction: 'Sale', paymentType: 'COD', totalSales: '₹5,108', serviceFee: '₹50', smallOrderFee: '₹0', deliveryFee: '₹40', tax: '₹460', tip: '₹100', total: '₹5,758' },
    { id: 2, orderId: 'Order-428125', transaction: 'Sale', paymentType: 'UPI', totalSales: '₹2,350', serviceFee: '₹25', smallOrderFee: '₹20', deliveryFee: '₹60', tax: '₹211', tip: '₹50', total: '₹2,716' },
  ];

  const salesSummaryData = [
    { id: 1, item: 'Aavin Full Cream Milk (500ml)', avgPrice: '₹32', qtySold: 1250, total: '₹40,000', image: '🥛' },
    { id: 2, item: 'Aavin Curd (400g)', avgPrice: '₹35', qtySold: 890, total: '₹31,150', image: '🍶' },
    { id: 3, item: 'Aavin Ghee (500ml)', avgPrice: '₹280', qtySold: 189, total: '₹52,920', image: '🫕' },
  ];

  const refundData = [
    { id: 1, orderId: 'Order-420005', refundType: 'Full Refund', status: 'paid', date: 'Jan 20, 2026', paymentRef: 'REF-12345', paymentType: 'UPI', amount: '₹1,250', avatar: 'JD' },
    { id: 2, orderId: 'Order-419985', refundType: 'Partial Refund', status: 'paid', date: 'Jan 18, 2026', paymentRef: 'REF-12340', paymentType: 'Card', amount: '₹350', avatar: 'MR' },
  ];

  const getReportsExportData = () => {
    if (type === 'sales-report') {
      return salesReportData.map((item: any) => ({
        'Order ID': item.orderId || '-',
        'Items': item.items || '-',
        'Order Type': item.orderType || '-',
        'Payment Type': item.paymentType || '-',
        'Total': item.total || '-',
      }));
    }
    if (type === 'daily-sales-report') {
      return dailySalesData.map((item: any) => ({
        'Order ID': item.orderId || '-',
        'Transaction': item.transaction || '-',
        'Payment Type': item.paymentType || '-',
        'Total Sales': item.totalSales || '-',
        'Service Fee': item.serviceFee || '-',
        'Delivery Fee': item.deliveryFee || '-',
        'Tax': item.tax || '-',
        'Tip': item.tip || '-',
        'Total': item.total || '-',
      }));
    }
    if (type === 'sales-summary') {
      return salesSummaryData.map((item: any) => ({
        'Item': item.item || '-',
        'Avg Price': item.avgPrice || '-',
        'Qty Sold': item.qtySold || 0,
        'Total': item.total || '-',
      }));
    }
    if (type === 'refund-report') {
      return refundData.map((item: any) => ({
        'Order ID': item.orderId || '-',
        'Refund Type': item.refundType || '-',
        'Status': item.status || '-',
        'Date': item.date || '-',
        'Payment Ref': item.paymentRef || '-',
        'Payment Type': item.paymentType || '-',
        'Amount': item.amount || '-',
      }));
    }
    return [];
  };

  const reportTitle = type === 'sales-report' ? 'Sales Report' : type === 'daily-sales-report' ? 'Daily Sales Report' : type === 'sales-summary' ? 'Sales Summary' : 'Refund Report';

  const handleReportsExportExcel = () => {
    const data = getReportsExportData();
    if (data.length === 0) { toast({ title: 'No Data', description: 'No data to export' }); return; }
    const headers = Object.keys(data[0]).join('\t');
    const rows = data.map(row => Object.values(row).join('\t')).join('\n');
    const blob = new Blob([headers + '\n' + rows], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${reportTitle.replace(/\s+/g, '_')}.xls`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Export Complete', description: `${data.length} records exported to Excel` });
  };

  const handleReportsExportCSV = () => {
    const data = getReportsExportData();
    if (data.length === 0) { toast({ title: 'No Data', description: 'No data to export' }); return; }
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([headers + '\n' + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${reportTitle.replace(/\s+/g, '_')}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Export Complete', description: `${data.length} records exported to CSV` });
  };

  const handleReportsExportPDF = () => {
    const data = getReportsExportData();
    if (data.length === 0) { toast({ title: 'No Data', description: 'No data to export' }); return; }
    const headers = Object.keys(data[0]);
    const printContent = `<html><head><title>${reportTitle}</title>
      <style>body{font-family:Arial,sans-serif;padding:20px}h1{color:#1a365d;font-size:20px}table{width:100%;border-collapse:collapse;margin-top:15px}th{background:#2d3748;color:white;padding:8px 12px;text-align:left;font-size:12px}td{border:1px solid #e2e8f0;padding:6px 12px;font-size:11px}tr:nth-child(even){background:#f7fafc}</style></head>
      <body><h1>${reportTitle}</h1><p style="color:#718096;font-size:12px">Generated: ${new Date().toLocaleDateString()} | Total: ${data.length} records</p>
      <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>
      ${data.map(row => `<tr>${Object.values(row).map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}
      </tbody></table></body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(printContent); win.document.close(); win.print(); }
    toast({ title: 'PDF Export', description: 'Print dialog opened - save as PDF' });
  };

  const handleReportsPrint = () => { handleReportsExportPDF(); };

  const ExportButtons = () => (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50" onClick={handleReportsExportExcel}>Excel</Button>
      <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50" onClick={handleReportsExportCSV}>CSV</Button>
      <Button variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-50" onClick={handleReportsExportPDF}>PDF</Button>
      <Button variant="outline" size="sm" className="text-blue-600 border-blue-600 hover:bg-blue-50" onClick={handleReportsPrint}>Print</Button>
    </div>
  );

  if (type === 'sales-report') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Sales Report</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">156</p><p className="text-sm text-gray-500">Orders</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-600">12</p><p className="text-sm text-gray-500">Cancel</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-orange-600">₹4,250</p><p className="text-sm text-gray-500">Total refund</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">₹2,45,830</p><p className="text-sm text-gray-500">Total Orders</p></CardContent></Card>
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
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Show</span>
                  <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                    <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem></SelectContent>
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
                {salesReportData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell><Avatar><AvatarFallback className="bg-orange-100 text-orange-600">{item.avatar}</AvatarFallback></Avatar></TableCell>
                    <TableCell className="font-medium text-blue-600">{item.orderId}</TableCell>
                    <TableCell>{item.items}</TableCell>
                    <TableCell><Badge variant="outline">{item.orderType}</Badge></TableCell>
                    <TableCell>{item.paymentType}</TableCell>
                    <TableCell className="text-right font-medium">{item.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
          <Card><CardContent className="p-4 text-center"><p className="text-xl font-bold text-green-600">₹45,230</p><p className="text-sm text-gray-500">Total Sales</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-xl font-bold text-blue-600">₹2,500</p><p className="text-sm text-gray-500">Delivery Fee</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-xl font-bold text-orange-600">₹4,070</p><p className="text-sm text-gray-500">Total Tax</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-xl font-bold text-purple-600">₹1,850</p><p className="text-sm text-gray-500">Total Tips</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-xl font-bold text-green-700">₹53,650</p><p className="text-sm text-gray-500">Total</p></CardContent></Card>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Input type="date" className="w-40" defaultValue="2026-01-28" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Show</span>
                  <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                    <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem></SelectContent>
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
                  <TableHead>Service Fee</TableHead>
                  <TableHead>Small Order Fee</TableHead>
                  <TableHead>Delivery Fee</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailySalesData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-blue-600">{item.orderId}</TableCell>
                    <TableCell>{item.transaction}</TableCell>
                    <TableCell>{item.paymentType}</TableCell>
                    <TableCell>{item.totalSales}</TableCell>
                    <TableCell>{item.serviceFee}</TableCell>
                    <TableCell>{item.smallOrderFee}</TableCell>
                    <TableCell>{item.deliveryFee}</TableCell>
                    <TableCell>{item.tax}</TableCell>
                    <TableCell>{item.tip}</TableCell>
                    <TableCell className="text-right font-medium">{item.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
                  <TableHead className="w-16"></TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Average price</TableHead>
                  <TableHead>Total qty sold</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesSummaryData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell><span className="text-2xl">{item.image}</span></TableCell>
                    <TableCell className="font-medium">{item.item}</TableCell>
                    <TableCell>{item.avgPrice}</TableCell>
                    <TableCell>{item.qtySold}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">{item.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
                  <Input type="date" className="w-40" defaultValue="2026-01-01" />
                  <span className="text-gray-500">to</span>
                  <Input type="date" className="w-40" defaultValue="2026-01-28" />
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
                    <SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem></SelectContent>
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
                {refundData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell><Avatar><AvatarFallback className="bg-orange-100 text-orange-600">{item.avatar}</AvatarFallback></Avatar></TableCell>
                    <TableCell className="font-medium text-blue-600">{item.orderId}</TableCell>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <span>{item.refundType}</span>
                          <Badge className="bg-green-100 text-green-700">{item.status}</Badge>
                        </div>
                        <p className="text-sm text-gray-500">{item.date}</p>
                        <p className="text-sm text-gray-400">Ref: {item.paymentRef}</p>
                      </div>
                    </TableCell>
                    <TableCell>{item.paymentType}</TableCell>
                    <TableCell className="text-right font-medium text-red-600">{item.amount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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

function CreditReportsSection() {
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Build query URL with parameters for credit orders
  const creditOrdersUrl = `/api/orders?isCredit=true${selectedTier !== 'all' ? `&pricingRole=${selectedTier}` : ''}`;
  
  const { data: creditOrders = [], isLoading } = useQuery<any[]>({
    queryKey: [creditOrdersUrl],
  });

  const filteredOrders = creditOrders.filter((order: any) => {
    const matchesSearch = !searchQuery || 
      order.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id?.toString().includes(searchQuery);
    const matchesDateFrom = !dateFrom || new Date(order.createdAt) >= new Date(dateFrom);
    const matchesDateTo = !dateTo || new Date(order.createdAt) <= new Date(dateTo + 'T23:59:59');
    return matchesSearch && matchesDateFrom && matchesDateTo;
  });

  const totalCredit = filteredOrders.reduce((sum: number, order: any) => sum + (order.total || 0), 0);
  const totalPaid = filteredOrders.filter((o: any) => o.status === 'completed').reduce((sum: number, order: any) => sum + (order.total || 0), 0);
  const totalOutstanding = totalCredit - totalPaid;

  const tierLabels: Record<string, string> = {
    'FEDERATION': 'Federation (45%)',
    'INTER_UNION': 'Inter-Union (55%)',
    'WHOLESALE_DEALER': 'Wholesale Dealer (65%)',
    'DEALER': 'Dealer (85%)',
    'RETAILER': 'Retailer (90%)',
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Credit Report
          </CardTitle>
          <CardDescription>View all credit sales by pricing tier</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Pricing Tier</label>
              <Select value={selectedTier} onValueChange={setSelectedTier}>
                <SelectTrigger>
                  <SelectValue placeholder="All Tiers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="FEDERATION">Federation (45%)</SelectItem>
                  <SelectItem value="INTER_UNION">Inter-Union (55%)</SelectItem>
                  <SelectItem value="WHOLESALE_DEALER">Wholesale Dealer (65%)</SelectItem>
                  <SelectItem value="DEALER">Dealer (85%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Customer name or order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">From Date</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">To Date</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="text-sm text-blue-600 font-medium">Total Credit Sales</div>
                <div className="text-2xl font-bold text-blue-700">₹{totalCredit.toFixed(2)}</div>
                <div className="text-xs text-blue-500">{filteredOrders.length} orders</div>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="text-sm text-green-600 font-medium">Total Paid</div>
                <div className="text-2xl font-bold text-green-700">₹{totalPaid.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4">
                <div className="text-sm text-orange-600 font-medium">Outstanding Balance</div>
                <div className="text-2xl font-bold text-orange-700">₹{totalOutstanding.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          {isLoading ? (
            <div className="text-center py-8">Loading credit orders...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No credit orders found</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Pricing Tier</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">#{order.id}</TableCell>
                      <TableCell>{order.customerName || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {tierLabels[order.pricingRole] || order.pricingRole || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatTimestamp(order.createdAt)}
                      </TableCell>
                      <TableCell className="font-medium">₹{(order.total || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge 
                          className={
                            order.status === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : order.status === 'confirmed'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-gray-100 text-gray-800'
                          }
                        >
                          {order.status === 'completed' ? 'Paid' : order.status === 'confirmed' ? 'Pending' : order.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
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

  const getSupplierExportData = () => {
    return supplierData.map((item: any) => ({
      '#': item.id || '-',
      'Name': item.name || '-',
      'Contact': item.contact || '-',
      'Email': item.email || '-',
    }));
  };

  const handleSupplierExportExcel = () => {
    const data = getSupplierExportData();
    if (data.length === 0) { toast({ title: 'No Data', description: 'No data to export' }); return; }
    const headers = Object.keys(data[0]).join('\t');
    const rows = data.map(row => Object.values(row).join('\t')).join('\n');
    const blob = new Blob([headers + '\n' + rows], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'suppliers.xls'; a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Export Complete', description: `${data.length} records exported to Excel` });
  };

  const handleSupplierExportCSV = () => {
    const data = getSupplierExportData();
    if (data.length === 0) { toast({ title: 'No Data', description: 'No data to export' }); return; }
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([headers + '\n' + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'suppliers.csv'; a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Export Complete', description: `${data.length} records exported to CSV` });
  };

  const handleSupplierExportPDF = () => {
    const data = getSupplierExportData();
    if (data.length === 0) { toast({ title: 'No Data', description: 'No data to export' }); return; }
    const headers = Object.keys(data[0]);
    const printContent = `<html><head><title>Supplier List</title>
      <style>body{font-family:Arial,sans-serif;padding:20px}h1{color:#1a365d;font-size:20px}table{width:100%;border-collapse:collapse;margin-top:15px}th{background:#2d3748;color:white;padding:8px 12px;text-align:left;font-size:12px}td{border:1px solid #e2e8f0;padding:6px 12px;font-size:11px}tr:nth-child(even){background:#f7fafc}</style></head>
      <body><h1>Supplier List</h1><p style="color:#718096;font-size:12px">Generated: ${new Date().toLocaleDateString()} | Total: ${data.length} records</p>
      <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>
      ${data.map(row => `<tr>${Object.values(row).map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}
      </tbody></table></body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(printContent); win.document.close(); win.print(); }
    toast({ title: 'PDF Export', description: 'Print dialog opened - save as PDF' });
  };

  const handleSupplierPrint = () => { handleSupplierExportPDF(); };

  const ExportButtons = () => (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50" onClick={handleSupplierExportExcel}>Excel</Button>
      <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50" onClick={handleSupplierExportCSV}>CSV</Button>
      <Button variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-50" onClick={handleSupplierExportPDF}>PDF</Button>
      <Button variant="outline" size="sm" className="text-blue-600 border-blue-600 hover:bg-blue-50" onClick={handleSupplierPrint}>Print</Button>
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

function InventorySection() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Inventory Management</h2>
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-500">Track and manage your inventory items here.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== Staff Management Section =====

const DEPARTMENTS = [
  { id: 'top_management', label: 'Top Management' },
  { id: 'operations', label: 'Operations' },
  { id: 'procurement', label: 'Procurement' },
  { id: 'engineering', label: 'Engineering' },
  { id: 'admin_hr', label: 'Admin & HR' },
  { id: 'finance', label: 'Finance' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'supervisory', label: 'Supervisory' },
  { id: 'plant_dairy', label: 'Plant & Dairy' },
  { id: 'transport', label: 'Transport' },
  { id: 'logistics', label: 'Logistics' },
  { id: 'sales_ground', label: 'Sales (Ground)' },
  { id: 'office_support', label: 'Office Support' },
];

function StaffManagementSection({ merchantId, type }: { merchantId: string; type?: string }) {
  const { toast } = useToast();
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [showPasswordResetDialog, setShowPasswordResetDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set());
  const [showBulkStaffDeleteConfirm, setShowBulkStaffDeleteConfirm] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferTargetUnion, setTransferTargetUnion] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [showTransferHistory, setShowTransferHistory] = useState(false);

  const { data: unionsList = [] } = useQuery<any[]>({
    queryKey: ['/api/unions/list'],
    queryFn: async () => {
      const res = await fetch('/api/unions/list', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!merchantId,
  });

  const [createForm, setCreateForm] = useState({
    name: '',
    phone: '',
    email: '',
    employeeId: '',
    department: '',
    designationId: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    employeeId: '',
    department: '',
    designationId: '',
    username: '',
    assignedSegments: [] as string[],
    assignedOffice: '',
  });

  const [customPermissions, setCustomPermissions] = useState<string[]>([]);

  // Fetch pending staff approvals
  const { data: pendingStaff = [], isLoading: loadingPending, refetch: refetchPending } = useQuery<any[]>({
    queryKey: ['/api/union', merchantId, 'staff/pending'],
    queryFn: async () => {
      const response = await fetch(`/api/union/${merchantId}/staff/pending`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!merchantId,
  });

  // Fetch all staff
  const { data: allStaff = [], isLoading: loadingAll, refetch: refetchAll } = useQuery<any[]>({
    queryKey: ['/api/union', merchantId, 'staff'],
    queryFn: async () => {
      const response = await fetch(`/api/union/${merchantId}/staff`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!merchantId,
  });

  const getDesignationsForDepartment = (deptId: string) => {
    const deptDesignations = (UNION_STAFF_DESIGNATIONS as any)[deptId];
    return deptDesignations || [];
  };

  const getPermissionsForTier = (tier: string): string[] => {
    const tierInfo = (UNION_STAFF_ACCESS_TIERS as any)[tier];
    if (!tierInfo) return [];
    if (tierInfo.permissions.includes('*')) {
      return UNION_PERMISSIONS.map((p: any) => p.key);
    }
    return tierInfo.permissions;
  };

  const handleApprove = async (staffId: string) => {
    try {
      const response = await fetch(`/api/union/${merchantId}/staff/${staffId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: 'admin' }),
      });
      if (response.ok) {
        toast({ title: "Approved", description: "Staff registration has been approved" });
        refetchPending();
        refetchAll();
      } else {
        toast({ title: "Error", description: "Failed to approve", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to approve staff", variant: "destructive" });
    }
  };

  const handleStaffAutoLogin = async (staff: any) => {
    if (!staff.username) {
      toast({ title: "Error", description: "Staff has no username set", variant: "destructive" });
      return;
    }
    try {
      const response = await fetch(`/api/union/${merchantId}/staff/${staff.id}/auto-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        toast({ title: "Auto Login", description: `Opening session as ${staff.name}...` });
        window.open(`/?auto_login_token=${data.token}`, '_blank');
      } else {
        const error = await response.json();
        toast({ title: "Error", description: error.message || "Failed to create auto login session", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to auto login as staff", variant: "destructive" });
    }
  };

  const handleReject = async () => {
    if (!selectedStaff) return;
    try {
      const response = await fetch(`/api/union/${merchantId}/staff/${selectedStaff.id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason }),
      });
      if (response.ok) {
        toast({ title: "Rejected", description: "Staff registration has been rejected" });
        setShowRejectDialog(false);
        setSelectedStaff(null);
        setRejectionReason("");
        refetchPending();
        refetchAll();
      } else {
        toast({ title: "Error", description: "Failed to reject", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to reject staff", variant: "destructive" });
    }
  };

  const handleToggleActive = async (staff: any) => {
    try {
      const response = await fetch(`/api/union/${merchantId}/staff/${staff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !staff.isActive }),
      });
      if (response.ok) {
        toast({ title: "Updated", description: `Staff ${!staff.isActive ? 'enabled' : 'disabled'}` });
        refetchAll();
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const bulkDeleteStaffMutation = useMutation({
    mutationFn: async (staffIds: string[]) => {
      const response = await fetch(`/api/union/${merchantId}/staff/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ staffIds }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete staff');
      }
      return response.json();
    },
    onSuccess: (data) => {
      refetchAll();
      refetchPending();
      setSelectedStaffIds(new Set());
      setShowBulkStaffDeleteConfirm(false);
      toast({ title: 'Staff Deleted', description: `${data.deleted} staff member(s) deleted successfully` });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const toggleStaffSelect = (staffId: string) => {
    setSelectedStaffIds(prev => {
      const next = new Set(prev);
      if (next.has(staffId)) next.delete(staffId);
      else next.add(staffId);
      return next;
    });
  };

  const toggleSelectAllStaff = () => {
    if (selectedStaffIds.size === allStaff.length) {
      setSelectedStaffIds(new Set());
    } else {
      setSelectedStaffIds(new Set(allStaff.map((s: any) => s.id)));
    }
  };

  const handleCreateStaff = async () => {
    if (!createForm.name || !createForm.phone || !createForm.department || !createForm.designationId || !createForm.username || !createForm.password) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    if (createForm.password !== createForm.confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (createForm.password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/union/${merchantId}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unionId: merchantId,
          name: createForm.name,
          phone: createForm.phone,
          email: createForm.email,
          employeeId: createForm.employeeId,
          department: createForm.department,
          designationId: createForm.designationId,
          username: createForm.username,
          password: createForm.password,
        }),
      });

      if (response.ok) {
        toast({ title: "Success", description: "Staff member created successfully" });
        setShowCreateDialog(false);
        setCreateForm({
          name: '', phone: '', email: '', employeeId: '',
          department: '', designationId: '', username: '', password: '', confirmPassword: ''
        });
        refetchAll();
      } else {
        const error = await response.json();
        toast({ title: "Error", description: error.message || "Failed to create staff", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create staff member", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditStaff = async () => {
    if (!selectedStaff) return;
    if (!editForm.name || !editForm.phone) {
      toast({ title: "Error", description: "Name and phone are required", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const designation = getDesignationsForDepartment(editForm.department)
        .find((d: any) => d.id === editForm.designationId);

      const bodyData: any = {
        name: editForm.name,
        phone: editForm.phone,
        email: editForm.email,
        employeeId: editForm.employeeId,
        department: editForm.department,
        designationId: editForm.designationId,
        designation: designation?.name || selectedStaff.designation,
        level: designation?.level || selectedStaff.level,
        accessTier: designation?.accessTier || selectedStaff.accessTier,
        username: editForm.username,
        assignedOffice: editForm.assignedOffice || null,
      };

      const { isSegmentWorkflowDesignation, buildWorkflowPermissions } = await import('@shared/schema');
      const segs = (editForm.designationId.startsWith('agm_') || editForm.designationId === 'transport_manager') ? ['FM', 'DP', 'IC'] : editForm.assignedSegments;
      bodyData.assignedSegments = segs;
      if (isSegmentWorkflowDesignation(editForm.designationId)) {
        bodyData.permissions = buildWorkflowPermissions(editForm.designationId, segs);
      }

      const response = await fetch(`/api/union/${merchantId}/staff/${selectedStaff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      if (response.ok) {
        toast({ title: "Success", description: "Staff member updated successfully" });
        setShowEditDialog(false);
        setSelectedStaff(null);
        refetchAll();
      } else {
        const error = await response.json();
        toast({ title: "Error", description: error.message || "Failed to update staff", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update staff member", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStaff = async () => {
    if (!selectedStaff) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/union/${merchantId}/staff/${selectedStaff.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({ title: "Success", description: "Staff member deleted successfully" });
        setShowDeleteDialog(false);
        setSelectedStaff(null);
        refetchAll();
        refetchPending();
      } else {
        toast({ title: "Error", description: "Failed to delete staff", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete staff member", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedStaff) return;
    if (!newPassword || newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/union/${merchantId}/staff/${selectedStaff.id}/reset-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      if (response.ok) {
        toast({ title: "Success", description: "Password reset successfully" });
        setShowPasswordResetDialog(false);
        setNewPassword("");
        setConfirmPassword("");
        setSelectedStaff(null);
      } else {
        const error = await response.json();
        toast({ title: "Error", description: error.message || "Failed to reset password", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to reset password", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePermissions = async () => {
    if (!selectedStaff) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/union/${merchantId}/staff/${selectedStaff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: customPermissions }),
      });

      if (response.ok) {
        toast({ title: "Success", description: "Permissions updated successfully" });
        setShowPermissionsDialog(false);
        setSelectedStaff(null);
        refetchAll();
      } else {
        toast({ title: "Error", description: "Failed to update permissions", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update permissions", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const openEditDialog = (staff: any) => {
    setSelectedStaff(staff);
    setEditForm({
      name: staff.name || '',
      phone: staff.phone || '',
      email: staff.email || '',
      employeeId: staff.employeeId || '',
      department: staff.department || '',
      designationId: staff.designationId || '',
      username: staff.username || '',
      assignedSegments: staff.assignedSegments || [],
      assignedOffice: staff.assignedOffice || '',
    });
    setShowEditDialog(true);
  };

  const openPermissionsDialog = (staff: any) => {
    setSelectedStaff(staff);
    const tierPermissions = getPermissionsForTier(staff.accessTier);
    const existingCustom = staff.permissions || [];
    setCustomPermissions(existingCustom.length > 0 ? existingCustom : tierPermissions);
    setShowPermissionsDialog(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-700">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700">Rejected</Badge>;
      default:
        return <Badge className="bg-orange-100 text-orange-700">Pending</Badge>;
    }
  };

  const getAccessTierBadge = (tier: string) => {
    const colors: Record<string, string> = {
      'full': 'bg-purple-100 text-purple-700',
      'full_access': 'bg-purple-100 text-purple-700',
      'department_head': 'bg-blue-100 text-blue-700',
      'manager': 'bg-cyan-100 text-cyan-700',
      'staff': 'bg-green-100 text-green-700',
      'operational': 'bg-gray-100 text-gray-700',
    };
    const labels: Record<string, string> = {
      'full': 'Full Access',
      'full_access': 'Full Access',
      'department_head': 'Dept Head',
      'manager': 'Manager',
      'staff': 'Staff',
      'operational': 'Operational',
    };
    return <Badge className={colors[tier] || 'bg-gray-100 text-gray-700'}>{labels[tier] || tier.replace('_', ' ').toUpperCase()}</Badge>;
  };

  // Pending Approvals View
  if (type === 'staff-approvals') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Pending Staff Approvals</h2>
          <Badge variant="outline" className="text-lg px-3 py-1">
            {pendingStaff.length} Pending
          </Badge>
        </div>

        {loadingPending ? (
          <Card><CardContent className="p-6 text-center"><p className="text-gray-500">Loading pending approvals...</p></CardContent></Card>
        ) : pendingStaff.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-500">No pending staff registrations</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pendingStaff.map((staff: any) => (
              <Card key={staff.id} className="border-l-4 border-l-orange-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{staff.name}</h3>
                        {getStatusBadge(staff.approvalStatus)}
                      </div>
                      <p className="text-sm text-gray-600">{staff.designation} - {staff.department}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Phone: {staff.phone}</span>
                        {staff.email && <span>Email: {staff.email}</span>}
                        {staff.employeeId && <span>ID: {staff.employeeId}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-400">Access Level:</span>
                        {getAccessTierBadge(staff.accessTier)}
                        <span className="text-xs text-gray-400 ml-2">Level {staff.level}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Registered: {new Date(staff.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleApprove(staff.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelectedStaff(staff);
                          setShowRejectDialog(true);
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Staff Registration</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-gray-600">
                Are you sure you want to reject the registration for <strong>{selectedStaff?.name}</strong>?
              </p>
              <div>
                <Label htmlFor="rejection-reason">Reason for Rejection</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Enter reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleReject}>Confirm Rejection</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // All Staff View
  if (type === 'staff-all') {
    const approvedStaff = allStaff.filter((s: any) => s.approvalStatus === 'approved');
    const rejectedStaff = allStaff.filter((s: any) => s.approvalStatus === 'rejected');

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">All Staff Members</h2>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <Badge className="bg-green-100 text-green-700">{approvedStaff.length} Active</Badge>
              <Badge className="bg-red-100 text-red-700">{rejectedStaff.length} Rejected</Badge>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-600 hover:bg-blue-700">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Staff
            </Button>
          </div>
        </div>

        {loadingAll ? (
          <Card><CardContent className="p-6 text-center"><p className="text-gray-500">Loading staff...</p></CardContent></Card>
        ) : allStaff.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No staff registered yet</p>
              <p className="text-sm text-gray-400 mt-2">
                Staff can register at <Link href="/union-staff-register" className="text-blue-600 hover:underline">/union-staff-register</Link>
              </p>
              <Button onClick={() => setShowCreateDialog(true)} className="mt-4">
                <UserPlus className="h-4 w-4 mr-2" />
                Add First Staff Member
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
          {selectedStaffIds.size > 0 && (
            <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg p-3">
              <span className="text-sm font-medium text-red-700">{selectedStaffIds.size} staff member(s) selected</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedStaffIds(new Set())}>Clear Selection</Button>
                <Button variant="destructive" size="sm" onClick={() => setShowBulkStaffDeleteConfirm(true)} disabled={bulkDeleteStaffMutation.isPending}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete Selected
                </Button>
              </div>
            </div>
          )}

          <Dialog open={showBulkStaffDeleteConfirm} onOpenChange={setShowBulkStaffDeleteConfirm}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete {selectedStaffIds.size} Staff Member(s)?</DialogTitle>
                <p className="text-sm text-muted-foreground mt-2">This action cannot be undone. Are you sure you want to permanently delete {selectedStaffIds.size} selected staff member(s)?</p>
              </DialogHeader>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setShowBulkStaffDeleteConfirm(false)}>Cancel</Button>
                <Button variant="destructive" onClick={() => bulkDeleteStaffMutation.mutate(Array.from(selectedStaffIds))} disabled={bulkDeleteStaffMutation.isPending}>
                  {bulkDeleteStaffMutation.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox 
                        checked={allStaff.length > 0 && selectedStaffIds.size === allStaff.length}
                        onCheckedChange={toggleSelectAllStaff}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Access Tier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allStaff.map((staff: any) => (
                    <TableRow key={staff.id} className={selectedStaffIds.has(staff.id) ? 'bg-blue-50' : ''}>
                      <TableCell className="w-10">
                        <Checkbox 
                          checked={selectedStaffIds.has(staff.id)}
                          onCheckedChange={() => toggleStaffSelect(staff.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{staff.name}</p>
                          <p className="text-xs text-gray-500">{staff.phone}</p>
                          {staff.email && <p className="text-xs text-gray-400">{staff.email}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-gray-100 px-2 py-0.5 rounded">{staff.username || '-'}</code>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{DEPARTMENTS.find(d => d.id === staff.department)?.label || staff.department}</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{staff.designation}</p>
                          <Badge variant="outline" className="text-xs">L{staff.level}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>{getAccessTierBadge(staff.accessTier)}</TableCell>
                      <TableCell>{getStatusBadge(staff.approvalStatus)}</TableCell>
                      <TableCell>
                        <Switch
                          checked={staff.isActive}
                          onCheckedChange={() => handleToggleActive(staff)}
                          disabled={staff.approvalStatus !== 'approved'}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            title="Auto Login as this Staff"
                            onClick={() => handleStaffAutoLogin(staff)}
                            disabled={staff.approvalStatus !== 'approved' || !staff.username}
                          >
                            <LogOut className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            title="View Permissions"
                            onClick={() => openPermissionsDialog(staff)}
                          >
                            <Shield className="h-4 w-4 text-purple-600" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            title="Edit Profile"
                            onClick={() => openEditDialog(staff)}
                          >
                            <Edit className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            title="Reset Password"
                            onClick={() => {
                              setSelectedStaff(staff);
                              setNewPassword("");
                              setConfirmPassword("");
                              setShowPasswordResetDialog(true);
                            }}
                          >
                            <RefreshCw className="h-4 w-4 text-orange-600" />
                          </Button>
                          {staff.approvalStatus === 'pending' && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 bg-green-50 hover:bg-green-100"
                                title="Approve Staff"
                                onClick={() => handleApprove(staff.id)}
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 bg-red-50 hover:bg-red-100"
                                title="Reject Staff"
                                onClick={() => {
                                  setSelectedStaff(staff);
                                  setShowRejectDialog(true);
                                }}
                              >
                                <XCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            </>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            title="Transfer to Another Union"
                            onClick={() => {
                              setSelectedStaff(staff);
                              setTransferTargetUnion("");
                              setTransferReason("");
                              setShowTransferDialog(true);
                            }}
                          >
                            <ArrowRightLeft className="h-4 w-4 text-indigo-600" />
                          </Button>
                          {staff.transferHistory && Array.isArray(staff.transferHistory) && staff.transferHistory.length > 0 && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              title="View Transfer History"
                              onClick={() => {
                                setSelectedStaff(staff);
                                setShowTransferHistory(true);
                              }}
                            >
                              <FileText className="h-4 w-4 text-teal-600" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            title="Delete Staff"
                            onClick={() => {
                              setSelectedStaff(staff);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          </>
        )}

        {/* Transfer Staff Dialog */}
        <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Transfer Staff Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Staff Member</Label>
                <Input value={selectedStaff?.name || ''} disabled className="mt-1 bg-gray-50" />
              </div>
              <div>
                <Label>Current Union</Label>
                <Input value={unionsList.find((u: any) => u.id === merchantId || (u.altIds && u.altIds.includes(merchantId)))?.name || merchantId} disabled className="mt-1 bg-gray-50" />
              </div>
              <div>
                <Label>Transfer To *</Label>
                <select
                  className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
                  value={transferTargetUnion}
                  onChange={(e) => setTransferTargetUnion(e.target.value)}
                >
                  <option value="">Select target union...</option>
                  {unionsList.filter((u: any) => u.id !== merchantId && !(u.altIds && u.altIds.includes(merchantId))).map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name} {u.unionCode ? `(${u.unionCode})` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Reason for Transfer</Label>
                <Input
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="e.g. Promotion, Reallocation, Request"
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowTransferDialog(false)}>Cancel</Button>
                <Button
                  disabled={!transferTargetUnion || isSaving}
                  onClick={async () => {
                    setIsSaving(true);
                    try {
                      const res = await fetch(`/api/union/${merchantId}/staff/${selectedStaff?.id}/transfer`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ targetUnionId: transferTargetUnion, reason: transferReason }),
                      });
                      const data = await res.json();
                      if (res.ok && data.success) {
                        toast({ title: "Transfer Successful", description: data.message });
                        refetchAll();
                        refetchPending();
                        setShowTransferDialog(false);
                      } else {
                        toast({ title: "Transfer Failed", description: data.message, variant: "destructive" });
                      }
                    } catch (err: any) {
                      toast({ title: "Error", description: err.message, variant: "destructive" });
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                >
                  {isSaving ? "Transferring..." : "Confirm Transfer"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Transfer History Dialog */}
        <Dialog open={showTransferHistory} onOpenChange={setShowTransferHistory}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Transfer History — {selectedStaff?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {selectedStaff?.transferHistory && Array.isArray(selectedStaff.transferHistory) && selectedStaff.transferHistory.length > 0 ? (
                selectedStaff.transferHistory.map((t: any, i: number) => (
                  <div key={i} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Badge variant="outline" className="text-xs">{new Date(t.transferDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Badge>
                    </div>
                    <p className="text-sm mt-1">
                      <span className="text-muted-foreground">From:</span> {unionsList.find((u: any) => u.id === t.fromUnionId || (u.altIds && u.altIds.includes(t.fromUnionId)))?.name || t.fromUnionId}
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">To:</span> {unionsList.find((u: any) => u.id === t.toUnionId || (u.altIds && u.altIds.includes(t.toUnionId)))?.name || t.toUnionId}
                    </p>
                    {t.reason && <p className="text-sm"><span className="text-muted-foreground">Reason:</span> {t.reason}</p>}
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">No transfer history</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Staff Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Staff Member</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <Label htmlFor="create-name">Full Name *</Label>
                <Input
                  id="create-name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                  placeholder="Enter full name"
                  className="mt-1"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label htmlFor="create-phone">Phone Number *</Label>
                <Input
                  id="create-phone"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({...createForm, phone: e.target.value})}
                  placeholder="Enter phone number"
                  className="mt-1"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label htmlFor="create-email">Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                  placeholder="Enter email"
                  className="mt-1"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label htmlFor="create-empid">Employee ID</Label>
                <Input
                  id="create-empid"
                  value={createForm.employeeId}
                  onChange={(e) => setCreateForm({...createForm, employeeId: e.target.value})}
                  placeholder="Optional employee ID"
                  className="mt-1"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label htmlFor="create-dept">Department *</Label>
                <Select
                  value={createForm.department}
                  onValueChange={(value) => setCreateForm({...createForm, department: value, designationId: ''})}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label htmlFor="create-designation">Designation *</Label>
                <Select
                  value={createForm.designationId}
                  onValueChange={(value) => setCreateForm({...createForm, designationId: value})}
                  disabled={!createForm.department}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={createForm.department ? "Select designation" : "Select department first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {getDesignationsForDepartment(createForm.department).map((desig: any) => (
                      <SelectItem key={desig.id} value={desig.id}>
                        {desig.name} (L{desig.level})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 border-t pt-4 mt-2">
                <h4 className="font-medium mb-3">Login Credentials</h4>
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label htmlFor="create-username">Username *</Label>
                <Input
                  id="create-username"
                  value={createForm.username}
                  onChange={(e) => setCreateForm({...createForm, username: e.target.value})}
                  placeholder="Enter username"
                  className="mt-1"
                />
              </div>
              <div className="col-span-2 md:col-span-1" />
              <div className="col-span-2 md:col-span-1">
                <Label htmlFor="create-password">Password *</Label>
                <Input
                  id="create-password"
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                  placeholder="Min 6 characters"
                  className="mt-1"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label htmlFor="create-confirm-password">Confirm Password *</Label>
                <Input
                  id="create-confirm-password"
                  type="password"
                  value={createForm.confirmPassword}
                  onChange={(e) => setCreateForm({...createForm, confirmPassword: e.target.value})}
                  placeholder="Confirm password"
                  className="mt-1"
                />
              </div>
              {createForm.designationId && (
                <div className="col-span-2 bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Access Level:</strong> {getDesignationsForDepartment(createForm.department).find((d: any) => d.id === createForm.designationId)?.accessTier || 'N/A'}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    This staff member will automatically have access based on their designation's access tier.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button onClick={handleCreateStaff} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                Create Staff
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Staff Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Staff Profile</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <Label htmlFor="edit-name">Full Name *</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label htmlFor="edit-phone">Phone Number *</Label>
                <Input
                  id="edit-phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label htmlFor="edit-empid">Employee ID</Label>
                <Input
                  id="edit-empid"
                  value={editForm.employeeId}
                  onChange={(e) => setEditForm({...editForm, employeeId: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label htmlFor="edit-username">Username</Label>
                <Input
                  id="edit-username"
                  value={editForm.username}
                  onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label htmlFor="edit-dept">Department</Label>
                <Select
                  value={editForm.department}
                  onValueChange={(value) => setEditForm({...editForm, department: value, designationId: ''})}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="edit-designation">Designation</Label>
                <Select
                  value={editForm.designationId}
                  onValueChange={(value) => {
                    const newForm = { ...editForm, designationId: value };
                    if (value.startsWith('agm_') || value === 'transport_manager') {
                      newForm.assignedSegments = ['FM', 'DP', 'IC'];
                    }
                    setEditForm(newForm);
                  }}
                  disabled={!editForm.department}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={editForm.department ? "Select designation" : "Select department first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {getDesignationsForDepartment(editForm.department).map((desig: any) => (
                      <SelectItem key={desig.id} value={desig.id}>
                        {desig.name} (L{desig.level})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="mb-2 block">Assign Segments</Label>
                <div className="flex gap-4">
                  {[
                    { id: 'FM', label: 'Fresh Milk' },
                    { id: 'DP', label: 'Dairy Products' },
                    { id: 'IC', label: 'Ice Cream' },
                  ].map((seg) => {
                    const isAllAccess = editForm.designationId.startsWith('agm_') || editForm.designationId === 'transport_manager';
                    const checked = isAllAccess ? true : editForm.assignedSegments.includes(seg.id);
                    return (
                      <label key={seg.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isAllAccess}
                          onChange={(e) => {
                            if (isAllAccess) return;
                            const newSegs = e.target.checked
                              ? [...editForm.assignedSegments, seg.id]
                              : editForm.assignedSegments.filter((s: string) => s !== seg.id);
                            setEditForm({ ...editForm, assignedSegments: newSegs });
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <span className="text-sm">{seg.label}</span>
                      </label>
                    );
                  })}
                </div>
                {(editForm.designationId.startsWith('agm_') || editForm.designationId === 'transport_manager') && (
                  <p className="text-xs text-muted-foreground mt-1">AGMs and Transport Managers automatically have access to all segments</p>
                )}
              </div>
              <div className="col-span-2">
                <Label className="mb-2 block">MMO Office</Label>
                <Select
                  value={editForm.assignedOffice}
                  onValueChange={(value) => setEditForm({ ...editForm, assignedOffice: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select MMO Office" />
                  </SelectTrigger>
                  <SelectContent>
                    {MMO_OFFICES.map((office) => (
                      <SelectItem key={office.id} value={office.id}>
                        {office.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
              <Button onClick={handleEditStaff} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Staff Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-gray-600">
                Are you sure you want to delete <strong>{selectedStaff?.name}</strong>?
              </p>
              <p className="text-sm text-red-600">
                This action cannot be undone. The staff member will no longer be able to log in.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteStaff} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Delete Staff
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Password Reset Dialog */}
        <Dialog open={showPasswordResetDialog} onOpenChange={setShowPasswordResetDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-gray-600">
                Reset password for <strong>{selectedStaff?.name}</strong> ({selectedStaff?.username})
              </p>
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPasswordResetDialog(false)}>Cancel</Button>
              <Button onClick={handleResetPassword} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Reset Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Permissions View Dialog */}
        <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Staff Permissions - {selectedStaff?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium">Access Tier:</span>
                  {selectedStaff && getAccessTierBadge(selectedStaff.accessTier)}
                  <span className="text-sm text-gray-500 ml-2">Level {selectedStaff?.level}</span>
                </div>
                <p className="text-sm text-gray-600">
                  {(UNION_STAFF_ACCESS_TIERS as any)[selectedStaff?.accessTier]?.description || 'Custom permissions'}
                </p>
              </div>
              
              {/* Feature Permissions (Backend-Defined) */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Feature Access Permissions
                </h4>
                <p className="text-xs text-gray-500 mb-4">Manually assign specific feature access to this staff member.</p>
                
                {/* Sales & POS */}
                <div className="mb-4">
                  <h5 className="text-sm font-semibold text-blue-600 mb-2 flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    Sales & POS
                  </h5>
                  <div className="ml-4 space-y-2">
                    <div className="flex items-start gap-2 p-2 border rounded hover:bg-gray-50 bg-gray-50">
                      <Checkbox
                        id="perm-pos_access"
                        checked={customPermissions.includes('pos_access')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setCustomPermissions([...customPermissions, 'pos_access']);
                          } else {
                            setCustomPermissions(customPermissions.filter(p => 
                              p !== 'pos_access' && 
                              !p.startsWith('pos_tier_') &&
                              p !== 'pos_counter_sale' &&
                              p !== 'pos_credit_sales'
                            ));
                          }
                        }}
                      />
                      <div className="flex-1">
                        <label htmlFor="perm-pos_access" className="text-sm font-medium cursor-pointer">
                          POS Access
                        </label>
                        <p className="text-xs text-gray-500">Access to Point of Sale system</p>
                      </div>
                    </div>
                    
                    {/* POS Pricing Tier Sub-options */}
                    {customPermissions.includes('pos_access') && (
                      <div className="ml-6 pl-4 border-l-2 border-blue-200 space-y-2">
                        <p className="text-xs font-medium text-gray-600 mb-2">Sale Types & Pricing Tiers:</p>
                        <div className="flex items-start gap-2 p-2 border rounded hover:bg-gray-50">
                          <Checkbox
                            id="perm-pos_counter_sale"
                            checked={customPermissions.includes('pos_counter_sale')}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setCustomPermissions([...customPermissions, 'pos_counter_sale']);
                              } else {
                                setCustomPermissions(customPermissions.filter(p => p !== 'pos_counter_sale'));
                              }
                            }}
                          />
                          <div className="flex-1">
                            <label htmlFor="perm-pos_counter_sale" className="text-sm font-medium cursor-pointer">Counter Sale (MRP)</label>
                            <p className="text-xs text-gray-500">Sell at MRP to walk-in consumers</p>
                          </div>
                        </div>
                        {[
                          { key: 'pos_tier_federation', label: 'Federation Pricing (45%)', desc: 'Sell at Federation pricing tier' },
                          { key: 'pos_tier_inter_union', label: 'Inter-Union Pricing (55%)', desc: 'Sell at Inter-Union pricing tier' },
                          { key: 'pos_tier_wholesale', label: 'Wholesale Dealer Pricing (65%)', desc: 'Sell at Wholesale Dealer pricing tier' },
                          { key: 'pos_tier_dealer', label: 'Dealer Pricing (85%)', desc: 'Sell at Dealer pricing tier' },
                          { key: 'pos_tier_retailer', label: 'Retailer Pricing (90%)', desc: 'Sell at Retailer pricing tier' },
                        ].map((tier) => (
                          <div key={tier.key} className="flex items-start gap-2 p-2 border rounded hover:bg-gray-50">
                            <Checkbox
                              id={`perm-${tier.key}`}
                              checked={customPermissions.includes(tier.key)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setCustomPermissions([...customPermissions, tier.key]);
                                } else {
                                  setCustomPermissions(customPermissions.filter(p => p !== tier.key));
                                }
                              }}
                            />
                            <div className="flex-1">
                              <label htmlFor={`perm-${tier.key}`} className="text-sm font-medium cursor-pointer">{tier.label}</label>
                              <p className="text-xs text-gray-500">{tier.desc}</p>
                            </div>
                          </div>
                        ))}
                        <div className="flex items-start gap-2 p-2 border rounded hover:bg-gray-50 border-orange-200 bg-orange-50">
                          <Checkbox
                            id="perm-pos_credit_sales"
                            checked={customPermissions.includes('pos_credit_sales')}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setCustomPermissions([...customPermissions, 'pos_credit_sales']);
                              } else {
                                setCustomPermissions(customPermissions.filter(p => p !== 'pos_credit_sales'));
                              }
                            }}
                          />
                          <div className="flex-1">
                            <label htmlFor="perm-pos_credit_sales" className="text-sm font-medium cursor-pointer text-orange-700">Credit Sales</label>
                            <p className="text-xs text-gray-500">Allow credit sales for B2B customers (requires customer selection)</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* B2B Invoicing */}
                <div className="mb-4">
                  <h5 className="text-sm font-semibold text-green-600 mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    B2B Invoicing
                  </h5>
                  <div className="ml-4 space-y-2">
                    <div className="flex items-start gap-2 p-2 border rounded hover:bg-gray-50 bg-gray-50">
                      <Checkbox
                        id="perm-b2b_invoice"
                        checked={customPermissions.includes('b2b_invoice')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setCustomPermissions([...customPermissions, 'b2b_invoice']);
                          } else {
                            setCustomPermissions(customPermissions.filter(p => 
                              p !== 'b2b_invoice' && 
                              !p.startsWith('b2b_invoice_')
                            ));
                          }
                        }}
                      />
                      <div className="flex-1">
                        <label htmlFor="perm-b2b_invoice" className="text-sm font-medium cursor-pointer">
                          Create B2B Invoice
                        </label>
                        <p className="text-xs text-gray-500">Create B2B invoices for business customers</p>
                      </div>
                    </div>
                    
                    {/* Pricing Tier Sub-options */}
                    {customPermissions.includes('b2b_invoice') && (
                      <div className="ml-6 pl-4 border-l-2 border-green-200 space-y-2">
                        <p className="text-xs font-medium text-gray-600 mb-2">Allowed Pricing Tiers:</p>
                        {[
                          { key: 'b2b_invoice_federation', label: 'Federation Pricing (50%)', desc: 'Create invoices at Federation pricing tier' },
                          { key: 'b2b_invoice_inter_union', label: 'Inter-Union Pricing (55%)', desc: 'Create invoices at Inter-Union pricing tier' },
                          { key: 'b2b_invoice_wholesale', label: 'Wholesale Dealer Pricing (65%)', desc: 'Create invoices at Wholesale Dealer pricing tier' },
                          { key: 'b2b_invoice_dealer', label: 'Dealer Pricing (85%)', desc: 'Create invoices at Dealer pricing tier' },
                          { key: 'b2b_invoice_retailer', label: 'Retailer Pricing', desc: 'Create invoices at Retailer pricing tier' },
                        ].map((tier) => (
                          <div key={tier.key} className="flex items-start gap-2 p-2 border rounded hover:bg-gray-50">
                            <Checkbox
                              id={`perm-${tier.key}`}
                              checked={customPermissions.includes(tier.key)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setCustomPermissions([...customPermissions, tier.key]);
                                } else {
                                  setCustomPermissions(customPermissions.filter(p => p !== tier.key));
                                }
                              }}
                            />
                            <div className="flex-1">
                              <label htmlFor={`perm-${tier.key}`} className="text-sm font-medium cursor-pointer">
                                {tier.label}
                              </label>
                              <p className="text-xs text-gray-500">{tier.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Compliance (E-way Bill & GST) */}
                <div className="mb-4">
                  <h5 className="text-sm font-semibold text-purple-600 mb-2 flex items-center gap-2">
                    <FileStack className="h-4 w-4" />
                    Compliance (E-way Bill & GST)
                  </h5>
                  <div className="ml-4 space-y-2">
                    {/* E-way Bill */}
                    <div className="flex items-start gap-2 p-2 border rounded hover:bg-gray-50 bg-gray-50">
                      <Checkbox
                        id="perm-eway_bill_access"
                        checked={customPermissions.includes('eway_bill_access')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setCustomPermissions([...customPermissions, 'eway_bill_access']);
                          } else {
                            setCustomPermissions(customPermissions.filter(p => 
                              p !== 'eway_bill_access' && 
                              !p.startsWith('eway_bill_')
                            ));
                          }
                        }}
                      />
                      <div className="flex-1">
                        <label htmlFor="perm-eway_bill_access" className="text-sm font-medium cursor-pointer">
                          E-way Bill Access
                        </label>
                        <p className="text-xs text-gray-500">Generate and manage E-way bills</p>
                      </div>
                    </div>
                    
                    {customPermissions.includes('eway_bill_access') && (
                      <div className="ml-6 pl-4 border-l-2 border-purple-200 space-y-2">
                        {[
                          { key: 'eway_bill_generate', label: 'Generate E-way Bills', desc: 'Create new E-way bills' },
                          { key: 'eway_bill_cancel', label: 'Cancel E-way Bills', desc: 'Cancel existing E-way bills' },
                          { key: 'eway_bill_extend', label: 'Extend E-way Bill Validity', desc: 'Extend validity of E-way bills' },
                        ].map((perm) => (
                          <div key={perm.key} className="flex items-start gap-2 p-2 border rounded hover:bg-gray-50">
                            <Checkbox
                              id={`perm-${perm.key}`}
                              checked={customPermissions.includes(perm.key)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setCustomPermissions([...customPermissions, perm.key]);
                                } else {
                                  setCustomPermissions(customPermissions.filter(p => p !== perm.key));
                                }
                              }}
                            />
                            <div className="flex-1">
                              <label htmlFor={`perm-${perm.key}`} className="text-sm font-medium cursor-pointer">
                                {perm.label}
                              </label>
                              <p className="text-xs text-gray-500">{perm.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* GST Details */}
                    <div className="flex items-start gap-2 p-2 border rounded hover:bg-gray-50 bg-gray-50 mt-3">
                      <Checkbox
                        id="perm-gst_details"
                        checked={customPermissions.includes('gst_details')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setCustomPermissions([...customPermissions, 'gst_details']);
                          } else {
                            setCustomPermissions(customPermissions.filter(p => 
                              p !== 'gst_details' && 
                              !p.startsWith('gst_')
                            ));
                          }
                        }}
                      />
                      <div className="flex-1">
                        <label htmlFor="perm-gst_details" className="text-sm font-medium cursor-pointer">
                          GST Details Access
                        </label>
                        <p className="text-xs text-gray-500">View and manage GST information</p>
                      </div>
                    </div>
                    
                    {customPermissions.includes('gst_details') && (
                      <div className="ml-6 pl-4 border-l-2 border-purple-200 space-y-2">
                        {[
                          { key: 'gst_returns_view', label: 'View GST Returns', desc: 'View GSTR-1 and other returns' },
                          { key: 'gst_returns_generate', label: 'Generate GST Returns', desc: 'Generate GSTR-1 files for filing' },
                        ].map((perm) => (
                          <div key={perm.key} className="flex items-start gap-2 p-2 border rounded hover:bg-gray-50">
                            <Checkbox
                              id={`perm-${perm.key}`}
                              checked={customPermissions.includes(perm.key)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setCustomPermissions([...customPermissions, perm.key]);
                                } else {
                                  setCustomPermissions(customPermissions.filter(p => p !== perm.key));
                                }
                              }}
                            />
                            <div className="flex-1">
                              <label htmlFor={`perm-${perm.key}`} className="text-sm font-medium cursor-pointer">
                                {perm.label}
                              </label>
                              <p className="text-xs text-gray-500">{perm.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* DMS (Distribution Management) */}
                <div className="mb-4">
                  <h5 className="text-sm font-semibold text-teal-600 mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Distribution Management (DMS)
                  </h5>
                  <div className="ml-4 space-y-2">
                    <div className="flex items-start gap-2 p-2 border rounded hover:bg-gray-50 bg-gray-50">
                      <Checkbox
                        id="perm-dms_access"
                        checked={customPermissions.includes('dms_access')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setCustomPermissions([...customPermissions, 'dms_access']);
                          } else {
                            setCustomPermissions(customPermissions.filter(p =>
                              p !== 'dms_access' && !p.startsWith('dms_')
                            ));
                          }
                        }}
                      />
                      <div className="flex-1">
                        <label htmlFor="perm-dms_access" className="text-sm font-medium cursor-pointer">DMS Access</label>
                        <p className="text-xs text-gray-500">Access to Distribution Management System</p>
                      </div>
                    </div>
                    {customPermissions.includes('dms_access') && (
                      <div className="ml-6 pl-4 border-l-2 border-teal-200 space-y-2">
                        {[
                          { key: 'dms_inventory', label: 'Inventory & Batches', desc: 'View and manage batch-wise inventory' },
                          { key: 'dms_grn', label: 'Goods Receipt Notes', desc: 'Create and manage GRN entries' },
                          { key: 'dms_sales_returns', label: 'Sales Returns', desc: 'Process and manage sales returns' },
                          { key: 'dms_collections', label: 'Collections & Outstanding', desc: 'Manage collections and outstanding ledger' },
                          { key: 'dms_schemes', label: 'Schemes & Promotions', desc: 'Manage promotional schemes' },
                          { key: 'dms_sfa', label: 'Sales Force Automation', desc: 'Manage SFA activities and field visits' },
                        ].map((perm) => (
                          <div key={perm.key} className="flex items-start gap-2 p-2 border rounded hover:bg-gray-50">
                            <Checkbox
                              id={`perm-${perm.key}`}
                              checked={customPermissions.includes(perm.key)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setCustomPermissions([...customPermissions, perm.key]);
                                } else {
                                  setCustomPermissions(customPermissions.filter(p => p !== perm.key));
                                }
                              }}
                            />
                            <div className="flex-1">
                              <label htmlFor={`perm-${perm.key}`} className="text-sm font-medium cursor-pointer">{perm.label}</label>
                              <p className="text-xs text-gray-500">{perm.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Transport Management */}
                <div className="mb-4">
                  <h5 className="text-sm font-semibold text-orange-600 mb-2 flex items-center gap-2">
                    <Navigation className="h-4 w-4" />
                    Transport Management
                  </h5>
                  <div className="ml-4 space-y-2">
                    <div className="flex items-start gap-2 p-2 border rounded hover:bg-gray-50 bg-gray-50">
                      <Checkbox
                        id="perm-transport_access"
                        checked={customPermissions.includes('transport_access')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setCustomPermissions([...customPermissions, 'transport_access']);
                          } else {
                            setCustomPermissions(customPermissions.filter(p =>
                              p !== 'transport_access' && !p.startsWith('transport_')
                            ));
                          }
                        }}
                      />
                      <div className="flex-1">
                        <label htmlFor="perm-transport_access" className="text-sm font-medium cursor-pointer">Transport Management Access</label>
                        <p className="text-xs text-gray-500">Access to Transport Management module</p>
                      </div>
                    </div>
                    {customPermissions.includes('transport_access') && (
                      <div className="ml-6 pl-4 border-l-2 border-orange-200 space-y-2">
                        {[
                          { key: 'transport_dashboard', label: 'Transport Dashboard', desc: 'View transport dashboard and KPIs' },
                          { key: 'transport_hubs', label: 'Manage Hubs', desc: 'Create and manage transport hubs' },
                          { key: 'transport_trips', label: 'Trip Sheet Management', desc: 'Create and manage trip sheets' },
                          { key: 'transport_vehicles', label: 'Fleet Management', desc: 'Manage vehicles and fleet' },
                          { key: 'transport_route_optimization', label: 'Route Optimization', desc: 'Run route optimization pipeline' },
                          { key: 'transport_live_tracking', label: 'Live Tracking', desc: 'View live vehicle tracking and GPS data' },
                          { key: 'transport_driver_management', label: 'Driver Management', desc: 'Manage driver accounts and credentials' },
                        ].map((perm) => (
                          <div key={perm.key} className="flex items-start gap-2 p-2 border rounded hover:bg-gray-50">
                            <Checkbox
                              id={`perm-${perm.key}`}
                              checked={customPermissions.includes(perm.key)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setCustomPermissions([...customPermissions, perm.key]);
                                } else {
                                  setCustomPermissions(customPermissions.filter(p => p !== perm.key));
                                }
                              }}
                            />
                            <div className="flex-1">
                              <label htmlFor={`perm-${perm.key}`} className="text-sm font-medium cursor-pointer">{perm.label}</label>
                              <p className="text-xs text-gray-500">{perm.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Menu Access Permissions (Original) */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Menu Access Permissions
                </h4>
                <p className="text-xs text-gray-500 mb-3">Dashboard and menu access permissions for this staff member.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {UNION_PERMISSIONS.map((permission: any) => {
                    const isChecked = customPermissions.includes(permission.key);
                    return (
                      <div key={permission.key} className="flex items-start gap-2 p-2 border rounded hover:bg-gray-50">
                        <Checkbox
                          id={`perm-${permission.key}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setCustomPermissions([...customPermissions, permission.key]);
                            } else {
                              setCustomPermissions(customPermissions.filter(p => p !== permission.key));
                            }
                          }}
                        />
                        <div className="flex-1">
                          <label htmlFor={`perm-${permission.key}`} className="text-sm font-medium cursor-pointer">
                            {permission.label}
                          </label>
                          <p className="text-xs text-gray-500">{permission.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPermissionsDialog(false)}>Cancel</Button>
              <Button onClick={handleUpdatePermissions} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}
                Save Permissions
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Organization Hierarchy View
  if (type === 'staff-hierarchy') {
    const approvedStaff = allStaff.filter((s: any) => s.approvalStatus === 'approved');
    const byLevel = approvedStaff.reduce((acc: any, staff: any) => {
      const level = staff.level || 5;
      if (!acc[level]) acc[level] = [];
      acc[level].push(staff);
      return acc;
    }, {});

    const levelLabels: Record<number, string> = {
      1: 'Top Management (GM/DGM)',
      2: 'Department Heads & Managers',
      3: 'Supervisors & Specialists',
      4: 'Skilled Staff',
      5: 'Operational Staff',
    };

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Organization Hierarchy</h2>
        
        {loadingAll ? (
          <Card><CardContent className="p-6 text-center"><p className="text-gray-500">Loading hierarchy...</p></CardContent></Card>
        ) : approvedStaff.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No approved staff to display</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {[1, 2, 3, 4, 5].map((level) => (
              <Card key={level} className={`border-l-4 ${
                level === 1 ? 'border-l-purple-500' :
                level === 2 ? 'border-l-blue-500' :
                level === 3 ? 'border-l-cyan-500' :
                level === 4 ? 'border-l-green-500' : 'border-l-gray-500'
              }`}>
                <CardHeader className="py-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>Level {level}: {levelLabels[level]}</span>
                    <Badge variant="outline">{(byLevel[level] || []).length} staff</Badge>
                  </CardTitle>
                </CardHeader>
                {(byLevel[level] || []).length > 0 && (
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {(byLevel[level] || []).map((staff: any) => (
                        <div key={staff.id} className="p-3 bg-gray-50 rounded-lg">
                          <p className="font-medium">{staff.name}</p>
                          <p className="text-sm text-gray-600">{staff.designation}</p>
                          <p className="text-xs text-gray-500">{staff.department}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}

// Staff Designation Table - Roles & Responsibilities Reference
function StaffDesignationTable() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  
  // Department display names
  const departmentNames: Record<string, string> = {
    'top_management': 'Top Management',
    'operations': 'Operations/Production',
    'procurement': 'Procurement',
    'engineering': 'Engineering',
    'admin_hr': 'Admin & HR',
    'finance': 'Finance & Accounts',
    'marketing': 'Marketing',
    'supervisory': 'Supervisory',
    'plant_dairy': 'Plant/Dairy Operations',
    'logistics': 'Logistics',
    'sales_ground': 'Sales (Ground)',
    'office_support': 'Office Support',
  };
  
  // Access tier display names
  const accessTierNames: Record<string, string> = {
    'full': 'Full Access',
    'department_head': 'Department Head',
    'manager': 'Manager',
    'staff': 'Staff',
    'operational': 'Operational',
  };
  
  // Sales segment display names
  const salesSegmentNames: Record<string, string> = {
    'all_access': 'All Access',
    'federation_interunion': 'Federation/Inter-Union',
    'wsd_dealer': 'WSD/Dealer',
    'retail_parlour': 'Retail/Parlour',
  };
  
  // Build flat list from UNION_STAFF_DESIGNATIONS schema
  const allDesignations = Object.entries(UNION_STAFF_DESIGNATIONS).flatMap(([deptKey, designations]) => 
    designations.map((d: any) => ({
      department: departmentNames[deptKey] || deptKey,
      id: d.id,
      name: d.name,
      level: d.level || 5,
      accessTier: accessTierNames[d.accessTier] || d.accessTier || 'Staff',
      salesSegment: d.salesSegment ? (salesSegmentNames[d.salesSegment] || d.salesSegment) : 'N/A',
      responsibilities: d.responsibilities || ['General duties as per designation'],
    }))
  );
  
  const departments = ['all', ...Array.from(new Set(allDesignations.map(d => d.department)))];
  
  const filteredDesignations = allDesignations.filter(d => {
    const matchesDept = selectedDepartment === 'all' || d.department === selectedDepartment;
    const matchesSearch = searchQuery === '' || 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.responsibilities.some(r => r.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesDept && matchesSearch;
  });
  
  const accessTierColors: Record<string, string> = {
    'Full Access': 'bg-purple-100 text-purple-800', // gitleaks:allow
    'Department Head': 'bg-blue-100 text-blue-800',
    'Manager': 'bg-green-100 text-green-800',
    'Staff': 'bg-yellow-100 text-yellow-800',
    'Operational': 'bg-gray-100 text-gray-800',
  };
  
  const salesSegmentColors: Record<string, string> = {
    'All Access': 'bg-purple-50 text-purple-700',
    'Federation/Inter-Union': 'bg-blue-50 text-blue-700',
    'WSD/Dealer': 'bg-green-50 text-green-700',
    'Retail/Parlour': 'bg-orange-50 text-orange-700',
    'Assigned Segment': 'bg-teal-50 text-teal-700',
    'Route-based': 'bg-indigo-50 text-indigo-700',
    'N/A': 'bg-gray-50 text-gray-500',
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Staff Designation Guide</h2>
          <p className="text-gray-600">Roles & Responsibilities for all Union Staff positions</p>
        </div>
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by designation or responsibility..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="w-full md:w-48">
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>
                      {dept === 'all' ? 'All Departments' : dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Legend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Access Tier Legend</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {Object.entries(accessTierColors).map(([tier, color]) => (
              <span key={tier} className={`px-2 py-1 rounded text-xs font-medium ${color}`}>
                {tier}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Designation Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Designation</TableHead>
                  <TableHead className="font-semibold">Department</TableHead>
                  <TableHead className="font-semibold text-center">Level</TableHead>
                  <TableHead className="font-semibold">Access Tier</TableHead>
                  <TableHead className="font-semibold">Sales Segment</TableHead>
                  <TableHead className="font-semibold">Key Responsibilities</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDesignations.map((designation) => (
                  <TableRow key={designation.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{designation.name}</TableCell>
                    <TableCell>{designation.department}</TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-sm font-medium">
                        {designation.level}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${accessTierColors[designation.accessTier] || 'bg-gray-100'}`}>
                        {designation.accessTier}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${salesSegmentColors[designation.salesSegment] || 'bg-gray-100'}`}>
                        {designation.salesSegment}
                      </span>
                    </TableCell>
                    <TableCell>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-0.5">
                        {designation.responsibilities.slice(0, 3).map((resp, idx) => (
                          <li key={idx}>{resp}</li>
                        ))}
                        {designation.responsibilities.length > 3 && (
                          <li className="text-gray-400">+{designation.responsibilities.length - 3} more...</li>
                        )}
                      </ul>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <p className="text-sm text-gray-500 text-center">
        Showing {filteredDesignations.length} of {allDesignations.length} designations
      </p>
    </div>
  );
}

// E-way Bill Section
function EwayBillSection({ type, merchantId }: { type: string; merchantId?: number }) {
  const [activeTab, setActiveTab] = useState(type || 'ewaybill');
  
  const tabConfig: Record<string, { title: string; description: string; icon: typeof FileText }> = {
    'ewaybill': { title: 'E-way Bill Overview', description: 'Manage your E-way Bills for GST compliance', icon: FileText },
    'ewaybill-active': { title: 'Active Bills', description: 'View and manage currently active E-way Bills', icon: FileText },
    'ewaybill-generate': { title: 'Generate E-way Bill', description: 'Create a new E-way Bill for shipments', icon: FileText },
    'ewaybill-history': { title: 'Bill History', description: 'View past E-way Bills and their status', icon: FileText },
  };
  
  const config = tabConfig[activeTab] || tabConfig['ewaybill'];
  const IconComponent = config.icon;
  
  // Sample E-way bill data for demonstration
  const sampleBills = [
    { id: 'EWB001', ewbNo: '331001234567', date: '2026-02-05', fromGstin: '33AABCU9603R1ZM', toGstin: '33AADCS2345Q1ZR', value: 125000, vehicle: 'TN01AB1234', status: 'active', validTill: '2026-02-06' },
    { id: 'EWB002', ewbNo: '331001234568', date: '2026-02-04', fromGstin: '33AABCU9603R1ZM', toGstin: '33AADCS5678P1ZK', value: 85000, vehicle: 'TN09CD5678', status: 'active', validTill: '2026-02-05' },
    { id: 'EWB003', ewbNo: '331001234569', date: '2026-02-03', fromGstin: '33AABCU9603R1ZM', toGstin: '33AADCS9012M1ZJ', value: 210000, vehicle: 'TN22EF9012', status: 'expired', validTill: '2026-02-04' },
  ];
  
  const activeBills = sampleBills.filter(b => b.status === 'active');
  const totalValue = sampleBills.reduce((sum, b) => sum + b.value, 0);
  
  const renderContent = () => {
    switch (activeTab) {
      case 'ewaybill-active':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Active E-way Bills
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeBills.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No active E-way Bills</p>
                  <p className="text-sm">Generate a new E-way Bill for B2B transactions over ₹50,000</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3">EWB Number</th>
                        <th className="text-left p-3">Date</th>
                        <th className="text-left p-3">To GSTIN</th>
                        <th className="text-right p-3">Value (₹)</th>
                        <th className="text-left p-3">Vehicle</th>
                        <th className="text-left p-3">Valid Till</th>
                        <th className="text-center p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeBills.map((bill) => (
                        <tr key={bill.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-mono text-purple-600">{bill.ewbNo}</td>
                          <td className="p-3">{bill.date}</td>
                          <td className="p-3 font-mono text-xs">{bill.toGstin}</td>
                          <td className="p-3 text-right font-medium">₹{bill.value.toLocaleString()}</td>
                          <td className="p-3">{bill.vehicle}</td>
                          <td className="p-3">{bill.validTill}</td>
                          <td className="p-3 text-center">
                            <div className="flex gap-1 justify-center">
                              <Button size="sm" variant="outline" className="h-7 px-2">
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 px-2">
                                <Printer className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        );
      
      case 'ewaybill-generate':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Generate New E-way Bill</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Document Type</label>
                  <select className="w-full border rounded-lg p-2">
                    <option>Tax Invoice</option>
                    <option>Bill of Supply</option>
                    <option>Delivery Challan</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Invoice Number</label>
                  <input type="text" className="w-full border rounded-lg p-2" placeholder="INV-2026-001" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Invoice Date</label>
                  <input type="date" className="w-full border rounded-lg p-2" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Invoice Value (₹)</label>
                  <input type="number" className="w-full border rounded-lg p-2" placeholder="50000" />
                </div>
              </div>
              
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-3">Consignee Details (Bill To)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">GSTIN</label>
                    <input type="text" className="w-full border rounded-lg p-2" placeholder="33AADCS2345Q1ZR" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Legal Name</label>
                    <input type="text" className="w-full border rounded-lg p-2" placeholder="Company Name" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Address</label>
                    <input type="text" className="w-full border rounded-lg p-2" placeholder="Full address with pincode" />
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-3">Transport Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Transport Mode</label>
                    <select className="w-full border rounded-lg p-2">
                      <option>Road</option>
                      <option>Rail</option>
                      <option>Air</option>
                      <option>Ship</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Vehicle Number</label>
                    <input type="text" className="w-full border rounded-lg p-2" placeholder="TN01AB1234" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Approx Distance (KM)</label>
                    <input type="number" className="w-full border rounded-lg p-2" placeholder="50" />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <FileText className="h-4 w-4 mr-2" />
                  Generate E-way Bill
                </Button>
                <Button variant="outline">Save as Draft</Button>
              </div>
            </CardContent>
          </Card>
        );
      
      case 'ewaybill-history':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  E-way Bill History
                </span>
                <div className="flex gap-2">
                  <input type="date" className="border rounded-lg px-3 py-1 text-sm" />
                  <input type="date" className="border rounded-lg px-3 py-1 text-sm" />
                  <Button size="sm" variant="outline">Filter</Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3">EWB Number</th>
                      <th className="text-left p-3">Date</th>
                      <th className="text-left p-3">To Party</th>
                      <th className="text-right p-3">Value (₹)</th>
                      <th className="text-center p-3">Status</th>
                      <th className="text-center p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleBills.map((bill) => (
                      <tr key={bill.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-mono text-purple-600">{bill.ewbNo}</td>
                        <td className="p-3">{bill.date}</td>
                        <td className="p-3 font-mono text-xs">{bill.toGstin}</td>
                        <td className="p-3 text-right font-medium">₹{bill.value.toLocaleString()}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            bill.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {bill.status === 'active' ? 'Active' : 'Expired'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex gap-1 justify-center">
                            <Button size="sm" variant="outline" className="h-7 px-2">
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 px-2">
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      
      default: // Overview
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{sampleBills.length}</p>
                      <p className="text-xs text-gray-500">Total Bills</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{activeBills.length}</p>
                      <p className="text-xs text-gray-500">Active Bills</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{sampleBills.filter(b => b.status === 'expired').length}</p>
                      <p className="text-xs text-gray-500">Expired</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <IndianRupee className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">₹{(totalValue / 100000).toFixed(1)}L</p>
                      <p className="text-xs text-gray-500">Total Value</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => setActiveTab('ewaybill-generate')}
                >
                  <Plus className="h-6 w-6 text-purple-600" />
                  <span>Generate New E-way Bill</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => setActiveTab('ewaybill-active')}
                >
                  <FileText className="h-6 w-6 text-green-600" />
                  <span>View Active Bills</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => setActiveTab('ewaybill-history')}
                >
                  <History className="h-6 w-6 text-blue-600" />
                  <span>Bill History</span>
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">E-way Bill Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <p>Required for movement of goods with value exceeding ₹50,000</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <p>Valid for 1 day per 100 km (or part thereof) for normal cargo</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <p>Can be cancelled within 24 hours of generation if goods not moved</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <p>Vehicle number can be updated during transit</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <IconComponent className="h-8 w-8 text-purple-600" />
        <div>
          <h2 className="text-2xl font-bold">{config.title}</h2>
          <p className="text-gray-600">{config.description}</p>
        </div>
      </div>
      
      <div className="flex gap-2 flex-wrap">
        {Object.entries(tabConfig).map(([key, val]) => (
          <Button 
            key={key} 
            variant={activeTab === key ? 'default' : 'outline'} 
            size="sm" 
            className={activeTab === key ? 'bg-purple-600' : ''}
            onClick={() => setActiveTab(key)}
          >
            {val.title.replace('E-way Bill ', '')}
          </Button>
        ))}
      </div>
      
      {renderContent()}
    </div>
  );
}

// GST Section
function GSTSection({ type, merchantId }: { type: string; merchantId?: number }) {
  const tabConfig: Record<string, { title: string; description: string }> = {
    'gst': { title: 'GST Overview', description: 'Manage GST compliance and returns' },
    'gst-returns': { title: 'GST Returns', description: 'Generate GSTR-1 and view filed returns' },
    'gst-settings': { title: 'GST Settings', description: 'Configure GST details and preferences' },
  };
  
  const config = tabConfig[type] || tabConfig['gst'];
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-8 w-8 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold">{config.title}</h2>
          <p className="text-gray-600">{config.description}</p>
        </div>
      </div>
      
      <div className="flex gap-2">
        {Object.entries(tabConfig).map(([key, val]) => (
          <Button key={key} variant={type === key ? 'default' : 'outline'} size="sm" className={type === key ? 'bg-blue-600' : ''}>
            {val.title.replace('GST ', '')}
          </Button>
        ))}
      </div>
      
      <Card>
        <CardContent className="p-12 text-center">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">GST Module</h3>
          <p className="text-gray-500 mb-4">Generate GSTR-1 returns and manage GST compliance</p>
          <p className="text-sm text-gray-400">HSN code management and automated returns generation</p>
        </CardContent>
      </Card>
    </div>
  );
}

// Customer Tier Definitions with Unique IDs
// Note: Retailer tier (TIER-RTL-005) is hidden by default - only shown when admin enables retailerPriceEnabled
// Each tier maps to a specific price field from the database
const CUSTOMER_TIERS = [
  { id: 'TIER-FED-001', code: 'federation', name: 'Federation Unions', priceField: 'federationPrice', priceMultiplier: 0.50, fallbackMultiplier: 0.50, color: 'bg-purple-600', requiresApproval: false },
  { id: 'TIER-IU-002', code: 'inter_union', name: 'Inter Union', priceField: 'districtUnionPrice', priceMultiplier: 0.55, fallbackMultiplier: 0.55, color: 'bg-indigo-600', requiresApproval: false },
  { id: 'TIER-WSD-003', code: 'wsd', name: 'Wholesale Dealers (WSD)', priceField: 'wholesalePrice', priceMultiplier: 0.65, fallbackMultiplier: 0.65, color: 'bg-blue-600', requiresApproval: false },
  { id: 'TIER-DLR-004', code: 'dealer', name: 'Dealers', priceField: 'retailPrice', priceMultiplier: 0.85, fallbackMultiplier: 0.85, color: 'bg-teal-600', requiresApproval: false },
  { id: 'TIER-RTL-005', code: 'retailer', name: 'Retailers', priceField: 'retailerPrice', priceMultiplier: 0.92, fallbackMultiplier: 0.92, color: 'bg-green-600', requiresApproval: true, hidden: true },
  { id: 'TIER-INS-006', code: 'institution', name: 'MRP Institutions', priceField: 'mrp', priceMultiplier: 1.00, fallbackMultiplier: 1.00, color: 'bg-amber-600', requiresApproval: false },
  { id: 'TIER-CON-007', code: 'consumer', name: 'Consumers (MRP)', priceField: 'mrp', priceMultiplier: 1.00, fallbackMultiplier: 1.00, color: 'bg-red-600', requiresApproval: false },
];

// Get tier price from product using database fields, fallback to calculated price
const getTierPrice = (item: any, tier: typeof CUSTOMER_TIERS[0]): number => {
  const mrp = parseFloat(item.mrp || item.price || 0);
  // Try to use the actual price field from database
  const storedPrice = parseFloat(item[tier.priceField]);
  if (!isNaN(storedPrice) && storedPrice > 0) {
    return storedPrice;
  }
  // Fallback to calculated price using multiplier
  return mrp * tier.fallbackMultiplier;
};

// Get visible tiers based on admin approval status
const getVisibleTiers = (retailerPriceEnabled: boolean = false) => {
  return CUSTOMER_TIERS.filter(tier => !tier.hidden || (tier.code === 'retailer' && retailerPriceEnabled));
};

function ImageGalleryPicker({ 
  open, onOpenChange, merchantId, onSelect 
}: { 
  open: boolean; onOpenChange: (open: boolean) => void; 
  merchantId?: number; onSelect: (url: string) => void;
}) {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery<{ images: { url: string; name: string; size: number }[] }>({
    queryKey: ['/api/union', merchantId ? `merchant-${merchantId}` : '', 'product-images'],
    queryFn: async () => {
      const res = await fetch(`/api/union/merchant-${merchantId}/product-images`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load');
      return res.json();
    },
    enabled: open && !!merchantId,
  });

  const filtered = (data?.images || []).filter(img => 
    !search || img.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Image Gallery</DialogTitle>
          <DialogDescription>Select from previously uploaded product images ({data?.images?.length || 0} images found)</DialogDescription>
        </DialogHeader>
        <div className="mb-4">
          <Input placeholder="Search images by name..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{data?.images?.length === 0 ? 'No images uploaded yet. Upload images using the Bulk Upload section or the product edit form.' : 'No images match your search.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filtered.map((img) => (
              <button key={img.url} type="button" className="group relative aspect-square rounded-lg border-2 border-transparent hover:border-primary overflow-hidden bg-muted transition-all" onClick={() => { onSelect(img.url); onOpenChange(false); }}>
                <img src={img.url} alt={img.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = ''; (e.target as HTMLImageElement).className = 'hidden'; }} />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1">
                  <span className="text-white text-[10px] truncate w-full">{img.name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProductFormDialog({ 
  open, onOpenChange, merchantId, editItem, segment, onSuccess 
}: { 
  open: boolean; onOpenChange: (open: boolean) => void; 
  merchantId?: number; editItem?: any; segment: string;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!editItem;
  
  const getDefaults = () => {
    const hsnMap: Record<string, string> = { 'Fresh Milk': '0401', 'Products': '04039010', 'Ice Cream': '2105' };
    const gstMap: Record<string, number> = { 'Fresh Milk': 0, 'Products': 5, 'Ice Cream': 18 };
    return {
      name: '', description: '', category: '', hsnCode: hsnMap[segment] || '',
      mrp: '', federationPrice: '', districtUnionPrice: '', wholesalePrice: '', retailPrice: '',
      gstPercent: gstMap[segment] || 0, productSegment: segment,
      packagingType: '', unitsPerPackage: '', packageWeight: '', packageWeightUnit: 'kgs',
      isAvailable: true, image: ''
    };
  };

  const [form, setForm] = useState<any>(getDefaults());
  const [submitting, setSubmitting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);

  useEffect(() => {
    if (open) {
      if (editItem) {
        setForm({
          name: editItem.name || '', description: editItem.description || '',
          category: editItem.category || '', hsnCode: editItem.hsnCode || '',
          mrp: editItem.mrp || editItem.price || '',
          federationPrice: editItem.federationPrice || '',
          districtUnionPrice: editItem.districtUnionPrice || '',
          wholesalePrice: editItem.wholesalePrice || '',
          retailPrice: editItem.retailPrice || '',
          gstPercent: editItem.gstPercent || editItem.gstRate || 0,
          productSegment: editItem.productSegment || segment,
          packagingType: editItem.packagingType || '',
          unitsPerPackage: editItem.unitsPerPackage || '',
          packageWeight: editItem.packageWeight || '',
          packageWeightUnit: editItem.packageWeightUnit || 'kgs',
          isAvailable: editItem.isAvailable !== false,
          image: editItem.image || ''
        });
      } else {
        setForm(getDefaults());
      }
    }
  }, [open, editItem]);

  const handleSubmit = async () => {
    if (!form.name || !form.mrp) {
      toast({ title: 'Validation Error', description: 'Name and MRP are required', variant: 'destructive' });
      return;
    }
    if (!merchantId) {
      toast({ title: 'Error', description: 'Merchant ID is required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        ...form,
        mrp: parseFloat(form.mrp) || 0,
        price: parseFloat(form.mrp) || 0,
        federationPrice: form.federationPrice ? parseFloat(form.federationPrice) : undefined,
        districtUnionPrice: form.districtUnionPrice ? parseFloat(form.districtUnionPrice) : undefined,
        wholesalePrice: form.wholesalePrice ? parseFloat(form.wholesalePrice) : undefined,
        retailPrice: form.retailPrice ? parseFloat(form.retailPrice) : undefined,
        gstPercent: parseFloat(form.gstPercent) || 0,
        unitsPerPackage: form.unitsPerPackage ? parseInt(form.unitsPerPackage) : undefined,
        packageWeight: form.packageWeight ? parseFloat(form.packageWeight) : undefined,
      };
      const url = isEdit
        ? `/api/union/merchant-${merchantId}/menu-items/${editItem.id}`
        : `/api/union/merchant-${merchantId}/menu-items`;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: isEdit ? 'Product Updated' : 'Product Created', description: `${form.name} has been ${isEdit ? 'updated' : 'added'} successfully` });
      onSuccess();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save product', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field: string, value: any) => setForm((prev: any) => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          <DialogDescription>{isEdit ? `Editing ${editItem?.name}` : `Add a new ${segment} product`}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Product Name *</Label>
              <Input value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="Product name" />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => updateField('description', e.target.value)} placeholder="Product description" rows={2} />
            </div>
            <div>
              <Label>Category</Label>
              <Input value={form.category} onChange={(e) => updateField('category', e.target.value)} placeholder="e.g. Curd, Butter Milk" />
            </div>
            <div>
              <Label>Product Segment</Label>
              <Select value={form.productSegment} onValueChange={(v) => updateField('productSegment', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fresh Milk">Fresh Milk</SelectItem>
                  <SelectItem value="Products">Products</SelectItem>
                  <SelectItem value="Ice Cream">Ice Cream</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>HSN Code</Label>
              <Input value={form.hsnCode} onChange={(e) => updateField('hsnCode', e.target.value)} placeholder="e.g. 0401" />
            </div>
            <div>
              <Label>GST %</Label>
              <Input type="number" value={form.gstPercent} onChange={(e) => updateField('gstPercent', e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="border-t pt-4">
            <Label className="text-sm font-semibold mb-2 block">Pricing</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>MRP *</Label>
                <Input type="number" value={form.mrp} onChange={(e) => updateField('mrp', e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <Label>Federation Price (50%)</Label>
                <Input type="number" value={form.federationPrice} onChange={(e) => updateField('federationPrice', e.target.value)} placeholder="Auto-calculated" />
              </div>
              <div>
                <Label>District Union Price (55%)</Label>
                <Input type="number" value={form.districtUnionPrice} onChange={(e) => updateField('districtUnionPrice', e.target.value)} placeholder="Auto-calculated" />
              </div>
              <div>
                <Label>Wholesale Price (65%)</Label>
                <Input type="number" value={form.wholesalePrice} onChange={(e) => updateField('wholesalePrice', e.target.value)} placeholder="Auto-calculated" />
              </div>
              <div>
                <Label>Retail Price (85%)</Label>
                <Input type="number" value={form.retailPrice} onChange={(e) => updateField('retailPrice', e.target.value)} placeholder="Auto-calculated" />
              </div>
            </div>
          </div>
          <div className="border-t pt-4">
            <Label className="text-sm font-semibold mb-2 block">Packaging</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Packaging Type</Label>
                <Select value={form.packagingType} onValueChange={(v) => updateField('packagingType', v)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="box">Box</SelectItem>
                    <SelectItem value="tray">Tray</SelectItem>
                    <SelectItem value="tub">Tub</SelectItem>
                    <SelectItem value="bag">Bag</SelectItem>
                    <SelectItem value="tin">Tin</SelectItem>
                    <SelectItem value="jar">Jar</SelectItem>
                    <SelectItem value="carton">Carton</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Units Per Package</Label>
                <Input type="number" value={form.unitsPerPackage} onChange={(e) => updateField('unitsPerPackage', e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label>Package Weight</Label>
                <Input type="number" value={form.packageWeight} onChange={(e) => updateField('packageWeight', e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label>Weight Unit</Label>
                <Select value={form.packageWeightUnit} onValueChange={(v) => updateField('packageWeightUnit', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kgs">Kgs</SelectItem>
                    <SelectItem value="lit">Litres</SelectItem>
                    <SelectItem value="nos">Nos</SelectItem>
                    <SelectItem value="pkts">Packets</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Product Image</Label>
              <div className="space-y-2">
                {form.image && (
                  <div className="relative w-20 h-20 rounded border overflow-hidden">
                    <img src={form.image} alt="Product" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <button type="button" className="absolute top-0 right-0 bg-red-500 text-white rounded-bl p-0.5" onClick={() => updateField('image', '')}>
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background hover:bg-accent text-sm font-medium">
                    <Upload className="h-4 w-4" />
                    {imageUploading ? 'Uploading...' : 'Upload New'}
                    <input type="file" accept="image/*" className="hidden" disabled={imageUploading} onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !merchantId) return;
                      setImageUploading(true);
                      try {
                        const fd = new FormData();
                        fd.append('file', file);
                        const res = await fetch(`/api/union/merchant-${merchantId}/upload-image`, { method: 'POST', body: fd, credentials: 'include' });
                        if (!res.ok) throw new Error('Upload failed');
                        const data = await res.json();
                        updateField('image', data.url);
                      } catch (err) {
                        toast({ title: 'Upload failed', description: 'Could not upload image', variant: 'destructive' });
                      } finally {
                        setImageUploading(false);
                        e.target.value = '';
                      }
                    }} />
                  </label>
                  <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setGalleryOpen(true)}>
                    <Image className="h-4 w-4" />
                    Browse Gallery
                  </Button>
                </div>
                <ImageGalleryPicker open={galleryOpen} onOpenChange={setGalleryOpen} merchantId={merchantId} onSelect={(url) => updateField('image', url)} />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Checkbox checked={form.isAvailable} onCheckedChange={(v) => updateField('isAvailable', !!v)} />
              <Label>Available for sale</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? 'Update Product' : 'Add Product'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirmDialog({
  open, onOpenChange, merchantId, item, onSuccess
}: { open: boolean; onOpenChange: (open: boolean) => void; merchantId?: number; item: any; onSuccess: () => void }) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!merchantId || !item?.id) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/union/merchant-${merchantId}/menu-items/${item.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: 'Product Deleted', description: `${item.name} has been removed` });
      onSuccess();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to delete product', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Product</DialogTitle>
          <DialogDescription>Are you sure you want to delete <strong>{item?.name}</strong>? This action cannot be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UnionProductsSection({ merchantId }: { merchantId?: string | null }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const { toast } = useToast();

  const { data: products = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['/api/union', merchantId, 'my-products'],
    queryFn: async () => {
      if (!merchantId) return [];
      const res = await fetch(`/api/union/${merchantId}/my-products`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!merchantId,
  });

  const filteredProducts = products.filter((p: any) => {
    const mp = p.masterProduct;
    if (!mp) return false;
    if (selectedSegment !== 'all' && mp.segment !== selectedSegment) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return mp.name.toLowerCase().includes(q) || mp.productCode.toLowerCase().includes(q) || (mp.category || '').toLowerCase().includes(q);
    }
    return true;
  });

  const segmentCounts = {
    all: products.length,
    'Fresh Milk': products.filter((p: any) => p.masterProduct?.segment === 'Fresh Milk').length,
    'Products': products.filter((p: any) => p.masterProduct?.segment === 'Products').length,
    'Ice Cream': products.filter((p: any) => p.masterProduct?.segment === 'Ice Cream').length,
  };

  const handleToggleActive = async (item: any) => {
    try {
      const res = await fetch(`/api/union/${merchantId}/my-products/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      if (res.ok) {
        toast({ title: 'Updated', description: `Product ${!item.isActive ? 'activated' : 'deactivated'}` });
        refetch();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update product', variant: 'destructive' });
    }
  };

  const handleUpdatePricing = async (item: any, updates: any) => {
    try {
      const res = await fetch(`/api/union/${merchantId}/my-products/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        toast({ title: 'Updated', description: 'Product pricing updated' });
        setEditItem(null);
        refetch();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update pricing', variant: 'destructive' });
    }
  };

  const handleDelete = async (item: any) => {
    try {
      const res = await fetch(`/api/union/${merchantId}/my-products/${item.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Removed', description: 'Product removed from your catalog' });
        setDeleteItem(null);
        refetch();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to remove product', variant: 'destructive' });
    }
  };

  const handleUpdateStock = async (item: any, stock: number) => {
    try {
      const res = await fetch(`/api/union/${merchantId}/my-products/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock }),
      });
      if (res.ok) {
        refetch();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update stock', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-48" />
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-600" />
            My Products
          </h2>
          <p className="text-sm text-gray-500">Products available in your union</p>
        </div>
        <Badge variant="secondary" className="font-mono">{products.length} products</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'All', color: 'bg-gray-100 text-gray-800' },
          { key: 'Fresh Milk', label: 'Fresh Milk', color: 'bg-cyan-100 text-cyan-800' },
          { key: 'Products', label: 'Products', color: 'bg-emerald-100 text-emerald-800' },
          { key: 'Ice Cream', label: 'Ice Cream', color: 'bg-pink-100 text-pink-800' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setSelectedSegment(tab.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              selectedSegment === tab.key ? tab.color + ' ring-2 ring-offset-1 ring-purple-400' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label} ({segmentCounts[tab.key as keyof typeof segmentCounts] || 0})
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {filteredProducts.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-700 mb-1">No products found</h3>
          <p className="text-sm text-gray-500">
            {products.length === 0 ? 'Add products from the Master Catalog to get started.' : 'Try adjusting your search or filter.'}
          </p>
        </Card>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-3 py-2.5 font-medium text-gray-600">Product</th>
                  <th className="text-left px-3 py-2.5 font-medium text-gray-600">Segment</th>
                  <th className="text-left px-3 py-2.5 font-medium text-gray-600">Category</th>
                  <th className="text-right px-3 py-2.5 font-medium text-gray-600">MRP</th>
                  <th className="text-right px-3 py-2.5 font-medium text-gray-600">Fed. Price</th>
                  <th className="text-right px-3 py-2.5 font-medium text-gray-600">WSD Price</th>
                  <th className="text-right px-3 py-2.5 font-medium text-gray-600">Dealer Price</th>
                  <th className="text-center px-3 py-2.5 font-medium text-gray-600">Stock</th>
                  <th className="text-center px-3 py-2.5 font-medium text-gray-600">Status</th>
                  <th className="text-center px-3 py-2.5 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((item: any) => {
                  const mp = item.masterProduct;
                  if (!mp) return null;
                  const segmentColors: Record<string, string> = {
                    'Fresh Milk': 'bg-cyan-100 text-cyan-700',
                    'Products': 'bg-emerald-100 text-emerald-700',
                    'Ice Cream': 'bg-pink-100 text-pink-700',
                  };
                  return (
                    <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          {mp.imageUrl ? (
                            <img src={mp.imageUrl} alt={mp.name} className="w-8 h-8 rounded object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                              <Package className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900 text-xs">{mp.name}</p>
                            <p className="text-[10px] text-gray-500">{mp.productCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${segmentColors[mp.segment] || 'bg-gray-100 text-gray-700'}`}>
                          {mp.segment}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-600">{mp.category || '—'}</td>
                      <td className="px-3 py-2.5 text-right text-xs font-medium">₹{item.mrp || mp.mrp || '—'}</td>
                      <td className="px-3 py-2.5 text-right text-xs">₹{item.federationPrice || '—'}</td>
                      <td className="px-3 py-2.5 text-right text-xs">₹{item.wholesalePrice || '—'}</td>
                      <td className="px-3 py-2.5 text-right text-xs">₹{item.dealerPrice || '—'}</td>
                      <td className="px-3 py-2.5 text-center">
                        <Input
                          type="number"
                          value={item.stock || 0}
                          onChange={(e) => handleUpdateStock(item, parseInt(e.target.value) || 0)}
                          className="w-16 h-7 text-xs text-center mx-auto"
                          min={0}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => handleToggleActive(item)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                            item.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          {item.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditItem(item)}>
                            <Edit className="h-3.5 w-3.5 text-blue-600" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteItem(item)}>
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editItem && (
        <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Pricing - {editItem.masterProduct?.name}</DialogTitle>
            </DialogHeader>
            <EditPricingForm item={editItem} onSave={(updates) => handleUpdatePricing(editItem, updates)} onCancel={() => setEditItem(null)} />
          </DialogContent>
        </Dialog>
      )}

      {deleteItem && (
        <Dialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Remove Product</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600">
              Remove <strong>{deleteItem.masterProduct?.name}</strong> from your catalog? This won't delete it from the master catalog.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => handleDelete(deleteItem)}>Remove</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function EditPricingForm({ item, onSave, onCancel }: { item: any; onSave: (updates: any) => void; onCancel: () => void }) {
  const [federationPrice, setFederationPrice] = useState(item.federationPrice || '');
  const [interUnionPrice, setInterUnionPrice] = useState(item.interUnionPrice || '');
  const [wholesalePrice, setWholesalePrice] = useState(item.wholesalePrice || '');
  const [dealerPrice, setDealerPrice] = useState(item.dealerPrice || '');
  const [retailerPrice, setRetailerPrice] = useState(item.retailerPrice || '');
  const [mrp, setMrp] = useState(item.mrp || '');
  const [stock, setStock] = useState(item.stock || 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Federation Price</Label>
          <Input type="number" step="0.01" value={federationPrice} onChange={(e) => setFederationPrice(e.target.value)} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Inter-Union Price</Label>
          <Input type="number" step="0.01" value={interUnionPrice} onChange={(e) => setInterUnionPrice(e.target.value)} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">WSD Price</Label>
          <Input type="number" step="0.01" value={wholesalePrice} onChange={(e) => setWholesalePrice(e.target.value)} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Dealer Price</Label>
          <Input type="number" step="0.01" value={dealerPrice} onChange={(e) => setDealerPrice(e.target.value)} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Retailer Price</Label>
          <Input type="number" step="0.01" value={retailerPrice} onChange={(e) => setRetailerPrice(e.target.value)} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">MRP</Label>
          <Input type="number" step="0.01" value={mrp} onChange={(e) => setMrp(e.target.value)} className="h-8 text-sm" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Stock</Label>
        <Input type="number" value={stock} onChange={(e) => setStock(parseInt(e.target.value) || 0)} className="h-8 text-sm" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={() => onSave({ federationPrice, interUnionPrice, wholesalePrice, dealerPrice, retailerPrice, mrp, stock })}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}

function BrowseMasterCatalogSection({ merchantId, onProductAdded }: { merchantId?: string | null; onProductAdded?: () => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('all');
  const { toast } = useToast();

  const { data: catalog = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['/api/union', merchantId, 'master-catalog'],
    queryFn: async () => {
      if (!merchantId) return [];
      const res = await fetch(`/api/union/${merchantId}/master-catalog`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!merchantId,
  });

  const filteredProducts = catalog.filter((p: any) => {
    if (selectedSegment !== 'all' && p.segment !== selectedSegment) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.productCode.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q);
    }
    return true;
  });

  const handleAddProduct = async (product: any) => {
    try {
      const res = await fetch(`/api/union/${merchantId}/add-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterProductId: product.id }),
      });
      if (res.ok) {
        toast({ title: 'Added', description: `${product.name} added to your catalog` });
        refetch();
      } else {
        const error = await res.json();
        toast({ title: 'Error', description: error.error || 'Failed to add product', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add product', variant: 'destructive' });
    }
  };

  const segmentCounts = {
    all: catalog.length,
    'Fresh Milk': catalog.filter((p: any) => p.segment === 'Fresh Milk').length,
    'Products': catalog.filter((p: any) => p.segment === 'Products').length,
    'Ice Cream': catalog.filter((p: any) => p.segment === 'Ice Cream').length,
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-48" />
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
            Browse Master Catalog
          </h2>
          <p className="text-sm text-gray-500">Add products from TCMPF's master catalog to your union</p>
        </div>
        <Badge variant="secondary" className="font-mono">{catalog.length} available</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'All', color: 'bg-gray-100 text-gray-800' },
          { key: 'Fresh Milk', label: 'Fresh Milk', color: 'bg-cyan-100 text-cyan-800' },
          { key: 'Products', label: 'Products', color: 'bg-emerald-100 text-emerald-800' },
          { key: 'Ice Cream', label: 'Ice Cream', color: 'bg-pink-100 text-pink-800' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setSelectedSegment(tab.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              selectedSegment === tab.key ? tab.color + ' ring-2 ring-offset-1 ring-blue-400' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label} ({segmentCounts[tab.key as keyof typeof segmentCounts] || 0})
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search master catalog..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredProducts.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-700 mb-1">No products available</h3>
          <p className="text-sm text-gray-500">The master catalog is empty. Contact TCMPF admin to add products.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredProducts.map((product: any) => {
            const segmentColors: Record<string, string> = {
              'Fresh Milk': 'border-l-cyan-500',
              'Products': 'border-l-emerald-500',
              'Ice Cream': 'border-l-pink-500',
            };
            return (
              <Card key={product.id} className={`border-l-4 ${segmentColors[product.segment] || 'border-l-gray-300'} hover:shadow-md transition-shadow`}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Package className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{product.name}</p>
                        <p className="text-[10px] text-gray-500">{product.productCode} | {product.segment}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex gap-3 text-xs text-gray-600">
                      <span>MRP: <strong>₹{product.mrp || '—'}</strong></span>
                      {product.unitSize && product.unitType && (
                        <span>{product.unitSize}{product.unitType}</span>
                      )}
                    </div>
                    {product.isEnabled ? (
                      <Badge variant="secondary" className="text-[10px] bg-green-50 text-green-700">Added</Badge>
                    ) : (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAddProduct(product)}>
                        <Plus className="h-3 w-3 mr-1" /> Add
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Fresh Milk Section (HSN 0401, 0% GST)
function FreshMilkSection({ type, merchantId, retailerPriceEnabled = false }: { type: string; merchantId?: number; retailerPriceEnabled?: boolean }) {
  const [searchQuery, setSearchQuery] = useState('');
  const visibleTiers = getVisibleTiers(retailerPriceEnabled);
  const [selectedTier, setSelectedTier] = useState(visibleTiers[0]);
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  
  // Fetch fresh milk products from all unions
  const { data: apiItems = [], isLoading, isError, refetch } = useQuery<any[]>({
    queryKey: ['/api/menu-items', 'fresh-milk'],
    queryFn: async () => {
      // Try to fetch all menu items directly
      const response = await fetch(`/api/menu-items`);
      if (!response.ok) {
        // Fallback: fetch from all restaurants
        const restResponse = await fetch(`/api/restaurants`);
        if (!restResponse.ok) {
          toast({ title: 'Error', description: 'Failed to load fresh milk products', variant: 'destructive' });
          return [];
        }
        const restaurants = await restResponse.json();
        const allProducts: any[] = [];
        for (const restaurant of restaurants) {
          const menuRes = await fetch(`/api/restaurants/${restaurant.id}/menu`);
          if (menuRes.ok) {
            const items = await menuRes.json();
            allProducts.push(...items);
          }
        }
        // Filter for Fresh Milk segment
        return allProducts.filter((item: any) => 
          item.productSegment === 'Fresh Milk' || 
          (!item.productSegment && item.hsnCode === '0401')
        );
      }
      const allProducts = await response.json();
      // Filter for Fresh Milk segment - prioritize productSegment field, fallback to HSN 0401 only
      return allProducts.filter((item: any) => 
        item.productSegment === 'Fresh Milk' || 
        (!item.productSegment && item.hsnCode === '0401')
      );
    },
  });
  
  // Safe number parsing helper
  const safePrice = (value: any, fallbackMultiplier?: number, basePrice?: any): string => {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) return parsed.toFixed(2);
    if (fallbackMultiplier && basePrice) {
      const base = parseFloat(basePrice);
      if (!isNaN(base)) return (base * fallbackMultiplier).toFixed(2);
    }
    return '0.00';
  };
  
  const tabConfig: Record<string, { title: string; description: string }> = {
    'fresh-milk': { title: 'Fresh Milk Overview', description: 'Manage fresh milk products (HSN 0401, 0% GST)' },
    'fresh-milk-list': { title: 'Product List', description: 'View and manage all fresh milk items' },
    'fresh-milk-categories': { title: 'Categories', description: 'Organize fresh milk by category' },
    'fresh-milk-inventory': { title: 'Inventory', description: 'Track fresh milk stock levels' },
  };
  
  const config = tabConfig[type] || tabConfig['fresh-milk'];
  
  const filteredItems = apiItems.filter((item: any) => 
    item.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Get unique categories for fresh milk
  const categories = Array.from(new Set(apiItems.map((item: any) => item.category || 'Uncategorized')));
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Milk className="h-8 w-8 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold">{config.title}</h2>
          <p className="text-gray-600">{config.description}</p>
        </div>
      </div>
      
      <div className="flex gap-2">
        {Object.entries(tabConfig).map(([key, val]) => (
          <Button key={key} variant={type === key ? 'default' : 'outline'} size="sm" className={type === key ? 'bg-blue-600' : ''}>
            {val.title.replace('Fresh Milk ', '').replace('Product ', '')}
          </Button>
        ))}
      </div>
      
      {/* Customer Tier Tabs */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-5 w-5 text-gray-600" />
          <span className="font-medium text-gray-700">Select Customer Type:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {visibleTiers.map((tier) => (
            <Button
              key={tier.id}
              variant={selectedTier.id === tier.id ? 'default' : 'outline'}
              size="sm"
              className={selectedTier.id === tier.id ? tier.color : ''}
              onClick={() => setSelectedTier(tier)}
            >
              <span className="text-xs mr-1 opacity-70">[{tier.id}]</span>
              {tier.name}
              <span className="ml-1 text-xs opacity-70">({(tier.priceMultiplier * 100).toFixed(0)}%)</span>
            </Button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Selected: <strong>{selectedTier.name}</strong> - Prices shown at {(selectedTier.priceMultiplier * 100).toFixed(0)}% of MRP
        </p>
      </Card>
      
      {/* Search and Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search fresh milk products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsAddOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            <p className="mt-4 text-gray-500">Loading fresh milk products...</p>
          </CardContent>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Milk className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Fresh Milk Products Found</h3>
            <p className="text-gray-500 mb-4">Add fresh milk products (Full Cream, Standardized, Toned, Double Toned, Skim Milk) to see them here.</p>
            <p className="text-sm text-gray-400">HSN Code: 0401 | GST: 0%</p>
          </CardContent>
        </Card>
      ) : type === 'fresh-milk-categories' ? (
        <Card>
          <CardHeader>
            <CardTitle>Fresh Milk Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map((category, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <Milk className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <p className="font-medium">{category}</p>
                    <p className="text-sm text-gray-500">
                      {apiItems.filter((item: any) => (item.category || 'Uncategorized') === category).length} items
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : type === 'fresh-milk-inventory' ? (
        <Card>
          <CardHeader>
            <CardTitle>Fresh Milk Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Min Stock</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item: any, index: number) => (
                  <TableRow key={item.id || index}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.sku || `FM-${String(index + 1).padStart(4, '0')}`}</TableCell>
                    <TableCell>{item.stock || item.stockQuantity || 'N/A'}</TableCell>
                    <TableCell>{item.minStock || 10}</TableCell>
                    <TableCell>
                      <Badge variant={item.isAvailable !== false ? 'default' : 'secondary'}>
                        {item.isAvailable !== false ? 'In Stock' : 'Out of Stock'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className={`p-3 ${selectedTier.color} text-white rounded-t-lg flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span className="font-medium">{selectedTier.name}</span>
                <span className="text-xs opacity-80">[{selectedTier.id}]</span>
              </div>
              <Badge variant="secondary" className="bg-white text-gray-800">
                {(selectedTier.priceMultiplier * 100).toFixed(0)}% of MRP
              </Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>HSN Code</TableHead>
                  <TableHead>MRP</TableHead>
                  <TableHead className={`font-bold`}>{selectedTier.name} Price</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item: any, index: number) => {
                  const mrp = parseFloat(item.mrp || item.price || 0);
                  const tierPrice = getTierPrice(item, selectedTier);
                  const discount = mrp - tierPrice;
                  return (
                  <TableRow key={item.id || index}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded bg-blue-100 flex items-center justify-center overflow-hidden">
                          {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : <Milk className="h-5 w-5 text-blue-600" />}
                        </div>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.description?.substring(0, 40) || ''}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{item.category || 'Fresh Milk'}</TableCell>
                    <TableCell>{item.hsnCode || '0401'}</TableCell>
                    <TableCell className="text-gray-500">₹{safePrice(item.mrp || item.price)}</TableCell>
                    <TableCell className="font-bold text-green-700">₹{tierPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-orange-600">₹{discount.toFixed(2)} off</TableCell>
                    <TableCell>
                      <Badge variant={item.isAvailable !== false ? 'default' : 'secondary'}>
                        {item.isAvailable !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditItem(item)}>
                          <Pencil className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteItem(item)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <ProductFormDialog open={isAddOpen} onOpenChange={setIsAddOpen} merchantId={merchantId} segment="Fresh Milk" onSuccess={() => { refetch(); setIsAddOpen(false); }} />
      <ProductFormDialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)} merchantId={merchantId} editItem={editItem} segment="Fresh Milk" onSuccess={() => { refetch(); setEditItem(null); }} />
      <DeleteConfirmDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)} merchantId={merchantId} item={deleteItem} onSuccess={() => { refetch(); setDeleteItem(null); }} />
    </div>
  );
}

// Products Section (Dairy Products other than Fresh Milk)
function ProductsSection({ type, merchantId, retailerPriceEnabled = false }: { type: string; merchantId?: number; retailerPriceEnabled?: boolean }) {
  const [searchQuery, setSearchQuery] = useState('');
  const visibleTiers = getVisibleTiers(retailerPriceEnabled);
  const [selectedTier, setSelectedTier] = useState(visibleTiers[0]);
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  
  // Fetch dairy products from all unions (excluding Fresh Milk)
  const { data: apiItems = [], isLoading, isError, refetch } = useQuery<any[]>({
    queryKey: ['/api/menu-items', 'products'],
    queryFn: async () => {
      // Try to fetch all menu items directly
      const response = await fetch(`/api/menu-items`);
      if (!response.ok) {
        // Fallback: fetch from all restaurants
        const restResponse = await fetch(`/api/restaurants`);
        if (!restResponse.ok) {
          toast({ title: 'Error', description: 'Failed to load dairy products', variant: 'destructive' });
          return [];
        }
        const restaurants = await restResponse.json();
        const allProducts: any[] = [];
        for (const restaurant of restaurants) {
          const menuRes = await fetch(`/api/restaurants/${restaurant.id}/menu`);
          if (menuRes.ok) {
            const items = await menuRes.json();
            allProducts.push(...items);
          }
        }
        // Filter for Products segment (exclude Fresh Milk and Ice Cream)
        const iceCreamCats = ['ice cream', 'ice_cream', 'frozen desserts', 'kulfi'];
        return allProducts.filter((item: any) => 
          item.productSegment === 'Products' || 
          (!item.productSegment && item.productSegment !== 'Ice Cream' && item.hsnCode !== '0401' && !iceCreamCats.includes((item.category || '').toLowerCase()))
        );
      }
      const allProducts = await response.json();
      // Filter for Products segment - exclude Fresh Milk and Ice Cream
      const iceCreamCats = ['ice cream', 'ice_cream', 'frozen desserts', 'kulfi'];
      return allProducts.filter((item: any) => 
        item.productSegment === 'Products' || 
        (!item.productSegment && item.productSegment !== 'Ice Cream' && item.hsnCode !== '0401' && !iceCreamCats.includes((item.category || '').toLowerCase()))
      );
    },
  });
  
  // Safe number parsing helper
  const safePrice = (value: any, fallbackMultiplier?: number, basePrice?: any): string => {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) return parsed.toFixed(2);
    if (fallbackMultiplier && basePrice) {
      const base = parseFloat(basePrice);
      if (!isNaN(base)) return (base * fallbackMultiplier).toFixed(2);
    }
    return '0.00';
  };
  
  const tabConfig: Record<string, { title: string; description: string }> = {
    'products': { title: 'Products Overview', description: 'Manage dairy products catalog' },
    'products-list': { title: 'Product List', description: 'View and manage all products' },
    'products-categories': { title: 'Categories', description: 'Organize products by category' },
    'products-inventory': { title: 'Inventory', description: 'Track stock levels and manage inventory' },
  };
  
  const config = tabConfig[type] || tabConfig['products'];
  
  const filteredItems = apiItems.filter((item: any) => 
    item.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Get unique categories for products
  const categoriesList = Array.from(new Set(apiItems.map((item: any) => item.category || 'Uncategorized')));
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Package className="h-8 w-8 text-green-600" />
        <div>
          <h2 className="text-2xl font-bold">{config.title}</h2>
          <p className="text-gray-600">{config.description}</p>
        </div>
      </div>
      
      <div className="flex gap-2">
        {Object.entries(tabConfig).map(([key, val]) => (
          <Button key={key} variant={type === key ? 'default' : 'outline'} size="sm" className={type === key ? 'bg-green-600' : ''}>
            {val.title.replace('Products ', '').replace('Product ', '')}
          </Button>
        ))}
      </div>
      
      {/* Customer Tier Tabs */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-5 w-5 text-gray-600" />
          <span className="font-medium text-gray-700">Select Customer Type:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {visibleTiers.map((tier) => (
            <Button
              key={tier.id}
              variant={selectedTier.id === tier.id ? 'default' : 'outline'}
              size="sm"
              className={selectedTier.id === tier.id ? tier.color : ''}
              onClick={() => setSelectedTier(tier)}
            >
              <span className="text-xs mr-1 opacity-70">[{tier.id}]</span>
              {tier.name}
              <span className="ml-1 text-xs opacity-70">({(tier.priceMultiplier * 100).toFixed(0)}%)</span>
            </Button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Selected: <strong>{selectedTier.name}</strong> - Prices shown at {(selectedTier.priceMultiplier * 100).toFixed(0)}% of MRP
        </p>
      </Card>
      
      {/* Search and Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search dairy products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsAddOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600" />
            <p className="mt-4 text-gray-500">Loading dairy products...</p>
          </CardContent>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Dairy Products Found</h3>
            <p className="text-gray-500 mb-4">Add dairy products (Curd, Butter, Paneer, Ghee, Flavored Milk, Ice Cream) to see them here.</p>
            <p className="text-sm text-gray-400">Various HSN codes with applicable GST rates</p>
          </CardContent>
        </Card>
      ) : type === 'products-categories' ? (
        <Card>
          <CardHeader>
            <CardTitle>Product Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categoriesList.map((category, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <Package className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="font-medium">{category}</p>
                    <p className="text-sm text-gray-500">
                      {apiItems.filter((item: any) => (item.category || 'Uncategorized') === category).length} items
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : type === 'products-inventory' ? (
        <Card>
          <CardHeader>
            <CardTitle>Products Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Min Stock</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item: any, index: number) => (
                  <TableRow key={item.id || index}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.sku || `PRD-${String(index + 1).padStart(4, '0')}`}</TableCell>
                    <TableCell>{item.stock || item.stockQuantity || 'N/A'}</TableCell>
                    <TableCell>{item.minStock || 10}</TableCell>
                    <TableCell>
                      <Badge variant={item.isAvailable !== false ? 'default' : 'secondary'}>
                        {item.isAvailable !== false ? 'In Stock' : 'Out of Stock'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className={`p-3 ${selectedTier.color} text-white rounded-t-lg flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span className="font-medium">{selectedTier.name}</span>
                <span className="text-xs opacity-80">[{selectedTier.id}]</span>
              </div>
              <Badge variant="secondary" className="bg-white text-gray-800">
                {(selectedTier.priceMultiplier * 100).toFixed(0)}% of MRP
              </Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>HSN Code</TableHead>
                  <TableHead>GST %</TableHead>
                  <TableHead>MRP</TableHead>
                  <TableHead className="font-bold">{selectedTier.name} Price</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item: any, index: number) => {
                  const mrp = parseFloat(item.mrp || item.price || 0);
                  const tierPrice = getTierPrice(item, selectedTier);
                  const discount = mrp - tierPrice;
                  return (
                  <TableRow key={item.id || index}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded bg-green-100 flex items-center justify-center overflow-hidden">
                          {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-green-600" />}
                        </div>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.description?.substring(0, 40) || ''}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{item.category || 'Dairy Products'}</TableCell>
                    <TableCell>{item.hsnCode || 'N/A'}</TableCell>
                    <TableCell>{item.gstPercent || item.gstRate || '5'}%</TableCell>
                    <TableCell className="text-gray-500">₹{safePrice(item.mrp || item.price)}</TableCell>
                    <TableCell className="font-bold text-green-700">₹{tierPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-orange-600">₹{discount.toFixed(2)} off</TableCell>
                    <TableCell>
                      <Badge variant={item.isAvailable !== false ? 'default' : 'secondary'}>
                        {item.isAvailable !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditItem(item)}>
                          <Pencil className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteItem(item)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <ProductFormDialog open={isAddOpen} onOpenChange={setIsAddOpen} merchantId={merchantId} segment="Products" onSuccess={() => { refetch(); setIsAddOpen(false); }} />
      <ProductFormDialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)} merchantId={merchantId} editItem={editItem} segment="Products" onSuccess={() => { refetch(); setEditItem(null); }} />
      <DeleteConfirmDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)} merchantId={merchantId} item={deleteItem} onSuccess={() => { refetch(); setDeleteItem(null); }} />
    </div>
  );
}

// Ice Cream Section
function IceCreamSection({ type, merchantId, retailerPriceEnabled = false }: { type: string; merchantId?: number; retailerPriceEnabled?: boolean }) {
  const [searchQuery, setSearchQuery] = useState('');
  const visibleTiers = getVisibleTiers(retailerPriceEnabled);
  const [selectedTier, setSelectedTier] = useState(visibleTiers[0]);
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const iceCreamCategoryNames = ['Ice Cream', 'ice_cream', 'Frozen Desserts', 'Kulfi'];
  
  const { data: apiItems = [], isLoading, isError, refetch } = useQuery<any[]>({
    queryKey: ['/api/menu-items', 'icecream'],
    queryFn: async () => {
      const response = await fetch(`/api/menu-items`);
      if (!response.ok) {
        const restResponse = await fetch(`/api/restaurants`);
        if (!restResponse.ok) {
          toast({ title: 'Error', description: 'Failed to load ice cream products', variant: 'destructive' });
          return [];
        }
        const restaurants = await restResponse.json();
        const allProducts: any[] = [];
        for (const restaurant of restaurants) {
          const menuRes = await fetch(`/api/restaurants/${restaurant.id}/menu`);
          if (menuRes.ok) {
            const items = await menuRes.json();
            allProducts.push(...items);
          }
        }
        return allProducts.filter((item: any) => 
          item.productSegment === 'Ice Cream' || 
          (!item.productSegment && iceCreamCategoryNames.some(c => c.toLowerCase() === (item.category || '').toLowerCase()))
        );
      }
      const allProducts = await response.json();
      return allProducts.filter((item: any) => 
        item.productSegment === 'Ice Cream' || 
        (!item.productSegment && iceCreamCategoryNames.some(c => c.toLowerCase() === (item.category || '').toLowerCase()))
      );
    },
  });
  
  const safePrice = (value: any, fallbackMultiplier?: number, basePrice?: any): string => {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) return parsed.toFixed(2);
    if (fallbackMultiplier && basePrice) {
      const base = parseFloat(basePrice);
      if (!isNaN(base)) return (base * fallbackMultiplier).toFixed(2);
    }
    return '0.00';
  };
  
  const tabConfig: Record<string, { title: string; description: string }> = {
    'icecream': { title: 'Ice Cream Overview', description: 'Manage ice cream and frozen desserts catalog' },
    'icecream-list': { title: 'Product List', description: 'View and manage all ice cream products' },
    'icecream-categories': { title: 'Categories', description: 'Organize ice cream by category' },
    'icecream-inventory': { title: 'Inventory', description: 'Track stock levels and manage inventory' },
  };
  
  const config = tabConfig[type] || tabConfig['icecream'];
  
  const filteredItems = apiItems.filter((item: any) => 
    item.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const categoriesList = Array.from(new Set(apiItems.map((item: any) => item.category || 'Uncategorized')));
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Package className="h-8 w-8 text-purple-600" />
        <div>
          <h2 className="text-2xl font-bold">{config.title}</h2>
          <p className="text-gray-600">{config.description}</p>
        </div>
      </div>
      
      <div className="flex gap-2">
        {Object.entries(tabConfig).map(([key, val]) => (
          <Button key={key} variant={type === key ? 'default' : 'outline'} size="sm" className={type === key ? 'bg-purple-600' : ''}>
            {val.title.replace('Ice Cream ', '')}
          </Button>
        ))}
      </div>
      
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-5 w-5 text-gray-600" />
          <span className="font-medium text-gray-700">Select Customer Type:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {visibleTiers.map((tier) => (
            <Button
              key={tier.id}
              variant={selectedTier.id === tier.id ? 'default' : 'outline'}
              size="sm"
              className={selectedTier.id === tier.id ? tier.color : ''}
              onClick={() => setSelectedTier(tier)}
            >
              <span className="text-xs mr-1 opacity-70">[{tier.id}]</span>
              {tier.name}
              <span className="ml-1 text-xs opacity-70">({(tier.priceMultiplier * 100).toFixed(0)}%)</span>
            </Button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Selected: <strong>{selectedTier.name}</strong> - Prices shown at {(selectedTier.priceMultiplier * 100).toFixed(0)}% of MRP
        </p>
      </Card>
      
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search ice cream products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsAddOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
            <p className="mt-4 text-gray-500">Loading ice cream products...</p>
          </CardContent>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Ice Cream Products Found</h3>
            <p className="text-gray-500 mb-4">Add ice cream, kulfi, and frozen dessert products to see them here.</p>
            <p className="text-sm text-gray-400">HSN 2105 with 18% GST rate</p>
          </CardContent>
        </Card>
      ) : type === 'icecream-categories' ? (
        <Card>
          <CardHeader>
            <CardTitle>Ice Cream Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categoriesList.map((category, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <Package className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                    <p className="font-medium">{category}</p>
                    <p className="text-sm text-gray-500">
                      {apiItems.filter((item: any) => (item.category || 'Uncategorized') === category).length} items
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : type === 'icecream-inventory' ? (
        <Card>
          <CardHeader>
            <CardTitle>Ice Cream Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Min Stock</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item: any, index: number) => (
                  <TableRow key={item.id || index}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.sku || `IC-${String(index + 1).padStart(4, '0')}`}</TableCell>
                    <TableCell>{item.stock || item.stockQuantity || 'N/A'}</TableCell>
                    <TableCell>{item.minStock || 10}</TableCell>
                    <TableCell>
                      <Badge variant={item.isAvailable !== false ? 'default' : 'secondary'}>
                        {item.isAvailable !== false ? 'In Stock' : 'Out of Stock'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className={`p-3 ${selectedTier.color} text-white rounded-t-lg flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span className="font-medium">{selectedTier.name}</span>
                <span className="text-xs opacity-80">[{selectedTier.id}]</span>
              </div>
              <Badge variant="secondary" className="bg-white text-gray-800">
                {(selectedTier.priceMultiplier * 100).toFixed(0)}% of MRP
              </Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>HSN Code</TableHead>
                  <TableHead>GST %</TableHead>
                  <TableHead>MRP</TableHead>
                  <TableHead className="font-bold">{selectedTier.name} Price</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item: any, index: number) => {
                  const mrp = parseFloat(item.mrp || item.price || 0);
                  const tierPrice = getTierPrice(item, selectedTier);
                  const discount = mrp - tierPrice;
                  return (
                  <TableRow key={item.id || index}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded bg-purple-100 flex items-center justify-center overflow-hidden">
                          {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-purple-600" />}
                        </div>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.description?.substring(0, 40) || ''}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{item.category || 'Ice Cream'}</TableCell>
                    <TableCell>{item.hsnCode || '2105'}</TableCell>
                    <TableCell>{item.gstPercent || item.gstRate || '18'}%</TableCell>
                    <TableCell className="text-gray-500">₹{safePrice(item.mrp || item.price)}</TableCell>
                    <TableCell className="font-bold text-purple-700">₹{tierPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-orange-600">₹{discount.toFixed(2)} off</TableCell>
                    <TableCell>
                      <Badge variant={item.isAvailable !== false ? 'default' : 'secondary'}>
                        {item.isAvailable !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditItem(item)}>
                          <Pencil className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteItem(item)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <ProductFormDialog open={isAddOpen} onOpenChange={setIsAddOpen} merchantId={merchantId} segment="Ice Cream" onSuccess={() => { refetch(); setIsAddOpen(false); }} />
      <ProductFormDialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)} merchantId={merchantId} editItem={editItem} segment="Ice Cream" onSuccess={() => { refetch(); setEditItem(null); }} />
      <DeleteConfirmDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)} merchantId={merchantId} item={deleteItem} onSuccess={() => { refetch(); setDeleteItem(null); }} />
    </div>
  );
}

// Daily Indent Section
function DailyIndentSection({ type, merchantId }: { type: string; merchantId?: number }) {
  const tabConfig: Record<string, { title: string; description: string }> = {
    'daily-indent': { title: 'Daily Indent Overview', description: 'Manage daily indent orders and credit system' },
    'indent-orders': { title: 'Indent Orders', description: 'View and process daily indent orders' },
    'indent-approvals': { title: 'Approvals', description: 'Approve pending indent requests' },
    'indent-history': { title: 'History', description: 'View past indent orders and transactions' },
  };
  
  const config = tabConfig[type] || tabConfig['daily-indent'];
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-8 w-8 text-orange-600" />
        <div>
          <h2 className="text-2xl font-bold">{config.title}</h2>
          <p className="text-gray-600">{config.description}</p>
        </div>
      </div>
      
      <div className="flex gap-2">
        {Object.entries(tabConfig).map(([key, val]) => (
          <Button key={key} variant={type === key ? 'default' : 'outline'} size="sm" className={type === key ? 'bg-orange-600' : ''}>
            {val.title.replace('Daily ', '').replace('Indent ', '')}
          </Button>
        ))}
      </div>
      
      <Card>
        <CardContent className="p-12 text-center">
          <ClipboardList className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Daily Indent Module</h3>
          <p className="text-gray-500 mb-4">B2B credit ordering system with MMO office approval workflow</p>
          <p className="text-sm text-gray-400">Federation, Inter-Union, WSD, Dealer, and Retailer indent management</p>
        </CardContent>
      </Card>
    </div>
  );
}
