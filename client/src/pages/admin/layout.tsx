import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  LayoutDashboard, 
  Store, 
  ShoppingBag, 
  Users, 
  LogOut,
  Menu,
  X,
  Settings,
  Building,
  CreditCard,
  UserCheck,
  DollarSign,
  FileText,
  Tag,
  Bell,
  Megaphone,
  ShoppingCart,
  Puzzle,
  MessageSquare,
  Truck,
  Smartphone,
  Gift,
  ChefHat,
  Wallet,
  Coins,
  MessageCircle,
  BarChart3,
  MapPin,
  User,
  Printer,
  Globe,
  Image,
  Package,
  Settings2,
  ChevronDown,
  ChevronRight,
  Database,
  Trash2,
  Clock,
  RefreshCw,
  Building2,
  Phone,
  Mail,
  Key,
  Shield,
  MoreHorizontal,
  Zap,
  LayoutList,
  UserPlus,
  Star,
  ScrollText,
  Search,
  ToggleLeft,
  ToggleRight,
  Copy,
  Route,
  Droplets,
  ClipboardList,
  Navigation,
  TrendingUp,
  Wrench
} from "lucide-react";
import { useState } from "react";

interface AdminLayoutProps {
  children: ReactNode;
}

interface NavItem {
  href?: string;
  label: string;
  icon: ReactNode;
  children?: NavItem[];
  isSection?: boolean;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
    isSection: true,
    children: [
      { href: "/admin/dashboard", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
      { href: "/admin/app-performance", label: "App Performance", icon: <TrendingUp className="h-4 w-4" /> },
    ],
  },

  {
    label: "Users & Network",
    icon: <Users className="h-5 w-5" />,
    isSection: true,
    children: [
      { href: "/admin/merchant", label: "District Unions", icon: <Building2 className="h-4 w-4" /> },
      { href: "/admin/parlours", label: "Parlours", icon: <Store className="h-4 w-4" /> },
      { href: "/admin/users/b2b", label: "B2B Users", icon: <Building className="h-4 w-4" /> },
      { href: "/admin/users/b2c", label: "B2C Users", icon: <User className="h-4 w-4" /> },
      { href: "/admin/b2b-registrations", label: "B2B Registrations", icon: <UserPlus className="h-4 w-4" /> },
      { href: "/admin/b2b-dashboard", label: "B2B Dashboard", icon: <Search className="h-4 w-4" /> },
      { href: "/admin/staff-management", label: "Staff Management", icon: <UserCheck className="h-4 w-4" /> },
      { href: "/admin/segment-staff", label: "Segment Staff", icon: <Users className="h-4 w-4" /> },
      { href: "/admin/users/roles", label: "Roles & Permissions", icon: <Shield className="h-4 w-4" /> },
      { href: "/admin/sub-users", label: "Sub-Users", icon: <UserPlus className="h-4 w-4" /> },
      { href: "/admin/account", label: "Admin Users", icon: <Key className="h-4 w-4" /> },
      { href: "/admin/address-proofs", label: "Address Proofs", icon: <Shield className="h-4 w-4" /> },
    ],
  },

  {
    label: "Products",
    icon: <Package className="h-5 w-5" />,
    isSection: true,
    children: [
      { href: "/admin/master-catalog", label: "Master Catalog", icon: <Package className="h-4 w-4" /> },
      { href: "/admin/dms-inventory", label: "Inventory & Batches", icon: <Database className="h-4 w-4" /> },
      { href: "/admin/dms-grn", label: "Goods Receipt Notes", icon: <FileText className="h-4 w-4" /> },
      { href: "/admin/eway-bill/hsn-codes", label: "HSN Codes", icon: <ScrollText className="h-4 w-4" /> },
    ],
  },

  {
    label: "Orders",
    icon: <ShoppingBag className="h-5 w-5" />,
    isSection: true,
    children: [
      { href: "/admin/orders", label: "All Orders", icon: <LayoutList className="h-4 w-4" /> },
      { href: "/admin/orders/settings", label: "Order Settings", icon: <Settings className="h-4 w-4" /> },
      { href: "/admin/dms-sales-returns", label: "Sales Returns", icon: <RefreshCw className="h-4 w-4" /> },
    ],
  },

  {
    label: "Regular Delivery",
    icon: <Package className="h-5 w-5" />,
    isSection: true,
    children: [
      { href: "/admin/regular-delivery", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
      { href: "/admin/regular-delivery?tab=orders", label: "Order Deliveries", icon: <ShoppingBag className="h-4 w-4" /> },
      { href: "/admin/regular-delivery?tab=fleet", label: "Fleet & Vehicles", icon: <Truck className="h-4 w-4" /> },
      { href: "/admin/regular-delivery?tab=drivers", label: "Drivers", icon: <User className="h-4 w-4" /> },
    ],
  },

  {
    label: "Fresh Milk Dispatch",
    icon: <Droplets className="h-5 w-5" />,
    isSection: true,
    children: [
      { href: "/admin/fresh-milk-routes", label: "Route Master", icon: <Route className="h-4 w-4" /> },
      { href: "/admin/fresh-milk-dispatch", label: "Dispatch Entry", icon: <ClipboardList className="h-4 w-4" /> },
      { href: "/admin/fresh-milk-dmr", label: "DMR Report", icon: <FileText className="h-4 w-4" /> },
      { href: "/admin/milk-dispatch-report", label: "Daily Dispatch Report", icon: <BarChart3 className="h-4 w-4" /> },
      { href: "/admin/fresh-milk-vehicles", label: "Vehicles & Drivers", icon: <Truck className="h-4 w-4" /> },
    ],
  },

  {
    label: "Bulk Delivery",
    icon: <Truck className="h-5 w-5" />,
    isSection: true,
    children: [
      { href: "/admin/bulk-delivery", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
      { href: "/admin/bulk-delivery?tab=pending", label: "Pending Jobs", icon: <Clock className="h-4 w-4" /> },
      { href: "/admin/bulk-delivery?tab=trips", label: "Trip Planning", icon: <Route className="h-4 w-4" /> },
      { href: "/admin/bulk-delivery?tab=active", label: "Active Trips", icon: <Navigation className="h-4 w-4" /> },
      { href: "/admin/bulk-delivery?tab=fleet", label: "Fleet & Vehicles", icon: <Truck className="h-4 w-4" /> },
      { href: "/admin/bulk-delivery?tab=drivers", label: "Drivers", icon: <User className="h-4 w-4" /> },
      { href: "/admin/bulk-delivery?tab=performance", label: "Performance", icon: <BarChart3 className="h-4 w-4" /> },
    ],
  },

  {
    label: "Finance",
    icon: <DollarSign className="h-5 w-5" />,
    isSection: true,
    children: [
      {
        label: "Payment Gateway",
        icon: <CreditCard className="h-4 w-4" />,
        children: [
          { href: "/admin/payment-gateway", label: "All Payments", icon: <CreditCard className="h-4 w-4" /> },
          { href: "/admin/payment-gateway/pay-on-delivery", label: "Pay on Delivery", icon: <Truck className="h-4 w-4" /> },
          { href: "/admin/payment-gateway/transactions", label: "Transaction Logs", icon: <FileText className="h-4 w-4" /> },
        ],
      },
      { href: "/admin/merchant-payment-accounts", label: "Merchant Accounts", icon: <Store className="h-4 w-4" /> },
      { href: "/admin/payment-mis-reports", label: "Payment Reports", icon: <BarChart3 className="h-4 w-4" /> },
      // Cashfree features hidden until re-enabled
      // { href: "/admin/softpos-terminals", label: "SoftPOS Terminals", icon: <Smartphone className="h-4 w-4" /> },
      // { href: "/admin/easy-split", label: "Easy Split", icon: <Building2 className="h-4 w-4" /> },
      // { href: "/admin/payouts", label: "Payouts", icon: <Coins className="h-4 w-4" /> },
      { href: "/admin/dms-collections", label: "Collections", icon: <Wallet className="h-4 w-4" /> },
      { href: "/admin/earnings", label: "Earnings", icon: <TrendingUp className="h-4 w-4" /> },
      { href: "/admin/invoice", label: "Sales Invoices", icon: <FileText className="h-4 w-4" /> },
      { href: "/admin/bulk-invoices", label: "Bulk Invoices", icon: <FileText className="h-4 w-4" /> },
      // { href: "/admin/payment-links", label: "Payment Links", icon: <CreditCard className="h-4 w-4" /> }, // Cashfree - hidden
      { href: "/admin/eway-bill", label: "E-way Bills", icon: <ScrollText className="h-4 w-4" /> },
      { href: "/admin/dms-gstr", label: "GST Returns", icon: <FileText className="h-4 w-4" /> },
      { href: "/admin/dms-tally", label: "Tally Integration", icon: <Database className="h-4 w-4" /> },
    ],
  },

  {
    label: "Reports",
    icon: <BarChart3 className="h-5 w-5" />,
    isSection: true,
    children: [
      { href: "/admin/reports", label: "All Reports", icon: <BarChart3 className="h-4 w-4" /> },
      { href: "/admin/sales-analytics", label: "Sales Analytics", icon: <TrendingUp className="h-4 w-4" /> },
      { href: "/admin/dms-sfa", label: "Sales Force", icon: <MapPin className="h-4 w-4" /> },
      { href: "/admin/dms-schemes", label: "Schemes & Promotions", icon: <Tag className="h-4 w-4" /> },
    ],
  },

  {
    label: "Marketing",
    icon: <Megaphone className="h-5 w-5" />,
    isSection: true,
    children: [
      { href: "/admin/marketing", label: "Campaigns", icon: <Megaphone className="h-4 w-4" /> },
      { href: "/admin/notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
      { href: "/admin/communication", label: "Broadcast", icon: <MessageSquare className="h-4 w-4" /> },
      { href: "/admin/sms", label: "SMS", icon: <MessageCircle className="h-4 w-4" /> },
      { href: "/admin/loyalty-points", label: "Loyalty Points", icon: <Gift className="h-4 w-4" /> },
      { href: "/admin/promo", label: "Promo", icon: <Tag className="h-4 w-4" /> },
      { href: "/admin/membership/plans", label: "Membership Plans", icon: <UserCheck className="h-4 w-4" /> },
    ],
  },

  {
    label: "System Settings",
    icon: <Settings className="h-5 w-5" />,
    isSection: true,
    children: [
      {
        label: "Site Configuration",
        icon: <Settings className="h-4 w-4" />,
        children: [
          { href: "/admin/site-configuration/automated-status-updates", label: "Automated Status Updates", icon: <Clock className="h-4 w-4" /> },
          { href: "/admin/site-configuration/merchant-registration", label: "Union Registration", icon: <Building2 className="h-4 w-4" /> },
          { href: "/admin/site-configuration/notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
          { href: "/admin/site-configuration/contact-settings", label: "Contact Settings", icon: <Phone className="h-4 w-4" /> },
          { href: "/admin/site-configuration/analytics", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
          { href: "/admin/site-configuration/api-access", label: "API Access", icon: <Key className="h-4 w-4" /> },
          { href: "/admin/site-configuration/push-notifications", label: "Push Notifications", icon: <MessageSquare className="h-4 w-4" /> },
          { href: "/admin/site-configuration/others", label: "Others", icon: <MoreHorizontal className="h-4 w-4" /> },
        ],
      },
      { href: "/admin/api-settings", label: "API Settings", icon: <Key className="h-4 w-4" /> },
      { href: "/admin/google-maps", label: "Google Maps API", icon: <MapPin className="h-4 w-4" /> },
      { href: "/admin/addon-manager", label: "Addon Manager", icon: <Puzzle className="h-4 w-4" /> },
      { href: "/admin/utilities/fixed-database", label: "Database Tools", icon: <Database className="h-4 w-4" /> },
      { href: "/admin/utilities/clean-database", label: "Clean Database", icon: <Trash2 className="h-4 w-4" /> },
      { href: "/admin/utilities/migration-tools", label: "Migration Tools", icon: <RefreshCw className="h-4 w-4" /> },
      { href: "/admin/utilities/clear-cache", label: "Clear Cache", icon: <Wrench className="h-4 w-4" /> },
      { href: "/admin/audit-logs", label: "Audit Log", icon: <ScrollText className="h-4 w-4" /> },
    ],
  },
];

interface UserInfo {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  designationId?: string;
  department?: string;
}

interface AdminSubUserSession {
  id: string;
  name: string;
  email: string;
  permissions: string[];
  isSubUser: boolean;
}

const adminPermissionToMenuMap: Record<string, string[]> = {
  dashboard: ['Dashboard', 'Overview', 'App Performance'],
  merchants_view: ['Users & Network', 'District Unions'],
  merchants_edit: ['Users & Network', 'District Unions'],
  merchants_approve: ['Users & Network', 'District Unions'],
  orders_view: ['Orders', 'All Orders', 'Order Settings', 'Sales Returns'],
  orders_manage: ['Orders', 'All Orders', 'Order Settings', 'Sales Returns'],
  users_view: ['Users & Network', 'B2C Users', 'B2B Users', 'B2B Registrations', 'B2B Dashboard', 'Roles & Permissions'],
  users_manage: ['Users & Network', 'B2C Users', 'B2B Users', 'B2B Registrations', 'B2B Dashboard', 'Roles & Permissions'],
  subusers_manage: ['Users & Network', 'Sub-Users', 'Admin Users'],
  reports_view: ['Reports', 'All Reports', 'Sales Analytics', 'Sales Force', 'Schemes & Promotions'],

  inventory_view: ['Products', 'Master Catalog', 'Inventory & Batches', 'Goods Receipt Notes', 'HSN Codes'],
  inventory_manage: ['Products', 'Master Catalog', 'Inventory & Batches', 'Goods Receipt Notes', 'HSN Codes'],

  settings: ['System Settings', 'Site Configuration', 'API Settings', 'Google Maps API', 'Addon Manager', 'Database Tools', 'Clean Database', 'Migration Tools', 'Clear Cache', 'Audit Log'],
  payment_gateway: ['Finance', 'Payment Gateway', 'All Payments', 'Pay on Delivery', 'Transaction Logs', 'Payouts', 'Easy Split'],
  eway_bill: ['Finance', 'E-way Bills', 'GST Returns', 'Tally Integration'],
  communication: ['Marketing', 'Broadcast', 'SMS'],

  account: ['Users & Network', 'Admin Users', 'Sub-Users'],
  membership: ['Marketing', 'Membership Plans'],
  earnings: ['Finance', 'Earnings'],
  withdrawals: ['Finance'],
  invoice: ['Finance', 'Sales Invoices'],

  notifications: ['Marketing', 'Notifications', 'Campaigns'],
  marketing: ['Marketing', 'Campaigns'],
  buyers: ['Users & Network'],
  promo: ['Marketing', 'Promo'],
  loyalty: ['Marketing', 'Loyalty Points'],

  delivery: ['Regular Delivery', 'Bulk Delivery', 'Fresh Milk Dispatch', 'Dashboard', 'Order Deliveries', 'Pending Jobs', 'Trip Planning', 'Active Trips', 'Fleet & Vehicles', 'Drivers', 'Performance', 'Route Master', 'Dispatch Entry', 'DMR Report', 'Daily Dispatch Report', 'Vehicles & Drivers'],
  parlours: ['Users & Network', 'Parlours'],
  wallet: ['Finance', 'Collections'],
  staff: ['Users & Network', 'Staff Management', 'Segment Staff'],
};

function collectAllLabels(items: NavItem[]): string[] {
  const labels: string[] = [];
  for (const item of items) {
    labels.push(item.label);
    if (item.children) {
      labels.push(...collectAllLabels(item.children));
    }
  }
  return labels;
}

function isHrefActive(href: string, location: string): boolean {
  if (href.includes('?')) {
    const [path, query] = href.split('?');
    if (path !== location) return false;
    const currentSearch = window.location.search;
    return currentSearch === `?${query}`;
  }
  return href === location;
}

function hasActiveChild(item: NavItem, location: string): boolean {
  if (item.href && isHrefActive(item.href, location)) return true;
  if (item.children) {
    return item.children.some(child => hasActiveChild(child, location));
  }
  return false;
}

const TRANSPORT_MANAGER_ALLOWED_LABELS = new Set([
  'Dashboard', 'Overview',
  'Regular Delivery', 'Bulk Delivery', 'Order Deliveries', 'Pending Jobs',
  'Trip Planning', 'Active Trips',
  'Fleet & Vehicles', 'Drivers', 'Performance',
  'App Performance',
]);

function isTransportManager(user?: UserInfo): boolean {
  if (!user) return false;
  const desigId = (user.designationId || '').toLowerCase();
  const dept = (user.department || '').toLowerCase();
  return desigId === 'transport_manager' || desigId.includes('transport') ||
    dept === 'transport' || dept === 'logistics';
}

function AdminSidebar({ isOpen, onClose, user, subUserSession }: { isOpen: boolean; onClose: () => void; user?: UserInfo; subUserSession?: AdminSubUserSession | null }) {
  const [location, setLoc] = useLocation();
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const [manuallyToggled, setManuallyToggled] = useState<Set<string>>(new Set());
  
  const transportManager = isTransportManager(user);
  
  const getAllowedMenuLabels = (): Set<string> => {
    if (transportManager) {
      return TRANSPORT_MANAGER_ALLOWED_LABELS;
    }
    if (!subUserSession?.isSubUser || !subUserSession.permissions) {
      return new Set(collectAllLabels(navItems));
    }
    
    const allowed = new Set<string>();
    subUserSession.permissions.forEach(permission => {
      const menuLabels = adminPermissionToMenuMap[permission];
      if (menuLabels) {
        menuLabels.forEach(label => allowed.add(label));
      }
    });
    return allowed;
  };
  
  const allowedMenuLabels = getAllowedMenuLabels();
  
  const filterItemsRecursive = (items: NavItem[]): NavItem[] => {
    if (!subUserSession?.isSubUser && !transportManager) return items;
    
    return items.reduce<NavItem[]>((acc, item) => {
      if (item.isSection && item.children) {
        const filteredChildren = filterItemsRecursive(item.children);
        if (filteredChildren.length > 0) {
          acc.push({ ...item, children: filteredChildren });
        }
      } else if (item.children) {
        if (allowedMenuLabels.has(item.label)) {
          const filteredChildren = filterItemsRecursive(item.children);
          acc.push({ ...item, children: filteredChildren.length > 0 ? filteredChildren : item.children });
        }
      } else {
        if (allowedMenuLabels.has(item.label)) {
          acc.push(item);
        }
      }
      return acc;
    }, []);
  };
  const filterItems = filterItemsRecursive;
  
  const filteredNavItems = filterItems(navItems);
  
  const displayName = subUserSession?.isSubUser ? subUserSession.name : (user?.name || 'Admin User');

  const toggleMenu = (label: string) => {
    setExpandedMenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(label)) {
        newSet.delete(label);
      } else {
        newSet.add(label);
      }
      return newSet;
    });
    setManuallyToggled(prev => new Set(prev).add(label));
  };

  const isMenuExpanded = (item: NavItem): boolean => {
    if (manuallyToggled.has(item.label)) {
      return expandedMenus.has(item.label);
    }
    return hasActiveChild(item, location);
  };

  const renderNavItem = (item: NavItem, depth: number = 0) => {
    if (item.isSection && item.children) {
      const expanded = isMenuExpanded(item);
      const isActive = hasActiveChild(item, location);
      
      return (
        <div key={`section-${item.label}`} className="mt-1">
          <div
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 text-sm font-medium cursor-pointer rounded-lg transition-colors",
              "hover:bg-gray-700",
              isActive ? "text-white" : "text-gray-300 hover:text-white"
            )}
            onClick={() => toggleMenu(item.label)}
            tabIndex={0}
            data-testid={`nav-section-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform duration-200 text-gray-400",
              !expanded && "-rotate-90"
            )} />
          </div>
          {expanded && (
            <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-600 pl-2">
              {item.children.map(child => renderNavItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    const hasChildren = item.children && item.children.length > 0;
    const expanded = isMenuExpanded(item);
    const isActive = item.href && isHrefActive(item.href, location);
    const isParentActive = hasChildren && hasActiveChild(item, location);

    const itemContent = (
      <div
        className={cn(
          "flex items-center gap-3 px-3 py-2 text-sm transition-colors cursor-pointer rounded-lg",
          hasChildren ? "font-medium" : "font-normal",
          "hover:bg-gray-700",
          isActive
            ? "text-green-400 bg-gray-700 font-semibold"
            : isParentActive
            ? "text-green-400"
            : "text-gray-300 hover:text-white"
        )}
        data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
        onClick={(e) => {
          if (hasChildren) {
            e.preventDefault();
            e.stopPropagation();
            toggleMenu(item.label);
          }
        }}
        tabIndex={0}
      >
        {item.icon}
        <span className="flex-1">{item.label}</span>
        {hasChildren && (
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform duration-200 text-gray-400",
            !expanded && "-rotate-90"
          )} />
        )}
      </div>
    );

    if (hasChildren) {
      return (
        <div key={item.label}>
          {itemContent}
          {expanded && (
            <div className="ml-3 mt-0.5 space-y-0.5 border-l border-gray-600 pl-3">
              {item.children!.map(child => renderNavItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div key={item.href || item.label}>
        {item.href ? (
          <Link href={item.href} onClick={() => onClose()}>
            {itemContent}
          </Link>
        ) : (
          itemContent
        )}
      </div>
    );
  };
  
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      sessionStorage.removeItem('adminSubUser');
      queryClient.clear();
      window.location.href = "/admin/login";
    },
  });

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      <div 
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-[#2d3748] dark:bg-gray-900 border-r border-gray-700 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <Store className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-base sm:text-lg font-bold text-white">
              Aavincart
            </h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="lg:hidden text-white hover:bg-gray-700"
            data-testid="button-close-sidebar"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="p-3 sm:p-4 border-b border-gray-700">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm sm:text-lg shrink-0">
              {displayName?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate text-sm sm:text-base">
                {displayName}
              </p>
              {subUserSession?.isSubUser ? (
                <p className="text-gray-400 text-xs">Sub-user of Aavin Admin</p>
              ) : (
                <>
                  <p className="text-gray-400 text-xs flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {user?.phone || '9843777277'}
                  </p>
                  <p className="text-gray-400 text-xs truncate flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {user?.email || 'admin@aavincart.com'}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-0.5">
          {filteredNavItems.map((item) => renderNavItem(item))}
        </nav>

        <div className="p-4 border-t border-gray-700">
          <Button
            variant="ghost"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-gray-700"
            data-testid="button-logout"
          >
            <LogOut className="h-5 w-5 mr-3" />
            {logoutMutation.isPending ? "Signing out..." : "Sign Out"}
          </Button>
        </div>
      </div>
    </>
  );
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [acceptingOrders, setAcceptingOrders] = useState(true);
  const [subUserSession, setSubUserSession] = useState<AdminSubUserSession | null>(null);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const { data, isLoading, error } = useQuery<{ user?: { role?: string; email?: string; name?: string; id?: string; phone?: string; designationId?: string; department?: string } }>({
    queryKey: ["/api/auth/me"],
    refetchOnMount: true,
  });

  const user = data?.user;
  
  useEffect(() => {
    const storedSubUser = sessionStorage.getItem('adminSubUser');
    if (storedSubUser) {
      try {
        setSubUserSession(JSON.parse(storedSubUser));
      } catch (e) {
        console.error('Failed to parse admin sub-user session:', e);
      }
    }
  }, []);

  const userIsTransportManager = user?.role === 'union_staff' && isTransportManager(user as UserInfo);

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/admin/login");
    }
    if (!isLoading && user && user.role !== 'admin' && !userIsTransportManager) {
      setLocation("/admin/login");
    }
  }, [user, isLoading, userIsTransportManager]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Loading Admin...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex">
      <AdminSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        user={user}
        subUserSession={subUserSession}
      />
      
      <div className="flex-1 min-w-0 lg:ml-0">
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-xs sm:text-sm font-medium",
                acceptingOrders ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {acceptingOrders ? "Accepting Orders" : "Not Accepting"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAcceptingOrders(!acceptingOrders)}
                className={cn(
                  "p-1",
                  acceptingOrders ? "text-green-600" : "text-red-600"
                )}
              >
                {acceptingOrders ? (
                  <ToggleRight className="h-6 w-6 sm:h-8 sm:w-8" />
                ) : (
                  <ToggleLeft className="h-6 w-6 sm:h-8 sm:w-8" />
                )}
              </Button>
            </div>
            
            <Button variant="ghost" size="sm">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm">
              <Search className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <main className="p-3 sm:p-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}