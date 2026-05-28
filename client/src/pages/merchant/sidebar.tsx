import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMerchantContext, SubUserSession, StaffSession } from "./context";
import {
  LayoutDashboard,
  Store,
  ShoppingBag,
  Users,
  LogOut,
  X,
  DollarSign,
  FileText,
  Tag,
  Bell,
  Megaphone,
  MessageSquare,
  Truck,
  Wallet,
  BarChart3,
  MapPin,
  User,
  Package,
  ChevronDown,
  Database,
  RefreshCw,
  Clock,
  Building,
  Building2,
  Phone,
  Mail,
  Shield,
  UserPlus,
  ScrollText,
  Navigation,
  Route,
  Monitor,
  ClipboardList,
  Image,
  Printer,
  Droplets,
  Tags,
  Plus,
  CalendarDays,
  Settings,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: number;
  badgeColor?: string;
}

interface NavSection {
  id: string;
  label: string;
  icon: ReactNode;
  isSection: true;
  children: NavItem[];
  isDynamic?: boolean;
}

type NavEntry = NavSection;

const navSections: NavEntry[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
    isSection: true,
    children: [
      { href: "/merchant/dashboard", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
    ],
  },
  {
    id: "union-setup",
    label: "Union Setup",
    icon: <Building className="h-5 w-5" />,
    isSection: true,
    children: [
      { href: "/merchant/union-info", label: "Union Information", icon: <Store className="h-4 w-4" /> },
      { href: "/merchant/union-settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
      { href: "/merchant/banner", label: "Banner", icon: <Image className="h-4 w-4" /> },
    ],
  },
  {
    id: "products",
    label: "Products",
    icon: <Package className="h-5 w-5" />,
    isSection: true,
    children: [
      { href: "/merchant/products", label: "Product Catalog (View Only)", icon: <Package className="h-4 w-4" /> },
    ],
  },
  {
    id: "orders",
    label: "Orders",
    icon: <ShoppingBag className="h-5 w-5" />,
    isSection: true,
    children: [
      { href: "/merchant/orders", label: "All Orders", icon: <ShoppingBag className="h-4 w-4" /> },
      { href: "/merchant/pos", label: "POS", icon: <Monitor className="h-4 w-4" /> },
      { href: "/merchant/daily-indent", label: "Daily Indent", icon: <ClipboardList className="h-4 w-4" /> },
    ],
  },
  {
    id: "mmo",
    label: "MMO Offices",
    icon: <Building2 className="h-5 w-5" />,
    isSection: true,
    children: [
      { href: "/merchant/mmo", label: "All MMO Offices", icon: <Building2 className="h-4 w-4" /> },
    ],
    isDynamic: true,
  },
  {
    id: "head-office",
    label: "Head Office",
    icon: <Building2 className="h-5 w-5" />,
    isSection: true,
    children: [
      { href: "/merchant/head-office", label: "Dashboard", icon: <Building2 className="h-4 w-4" /> },
      { href: "/merchant/head-office?tab=orders", label: "B2B Orders", icon: <ShoppingBag className="h-4 w-4" /> },
      { href: "/merchant/head-office?tab=routes", label: "Routes & Agents", icon: <Route className="h-4 w-4" /> },
    ],
  },
  {
    id: "regular-delivery",
    label: "Regular Delivery",
    icon: <Package className="h-5 w-5" />,
    isSection: true,
    children: [
      { href: "/merchant/regular-delivery", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
      { href: "/merchant/regular-delivery?tab=orders", label: "Order Deliveries", icon: <ShoppingBag className="h-4 w-4" /> },
      { href: "/merchant/regular-delivery?tab=fleet", label: "Fleet & Vehicles", icon: <Truck className="h-4 w-4" /> },
      { href: "/merchant/regular-delivery?tab=drivers", label: "Drivers", icon: <User className="h-4 w-4" /> },
    ],
  },
  {
    id: "bulk-delivery",
    label: "Bulk Delivery",
    icon: <Truck className="h-5 w-5" />,
    isSection: true,
    children: [
      { href: "/merchant/bulk-delivery", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
      { href: "/merchant/bulk-delivery?tab=pending", label: "Pending Jobs", icon: <Clock className="h-4 w-4" /> },
      { href: "/merchant/bulk-delivery?tab=trips", label: "Trip Planning", icon: <Route className="h-4 w-4" /> },
      { href: "/merchant/bulk-delivery?tab=active", label: "Active Trips", icon: <Navigation className="h-4 w-4" /> },
      { href: "/merchant/bulk-delivery?tab=fleet", label: "Fleet & Vehicles", icon: <Truck className="h-4 w-4" /> },
      { href: "/merchant/bulk-delivery?tab=drivers", label: "Drivers", icon: <User className="h-4 w-4" /> },
      { href: "/merchant/bulk-delivery?tab=performance", label: "Performance", icon: <BarChart3 className="h-4 w-4" /> },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: <DollarSign className="h-5 w-5" />,
    isSection: true,
    children: [
      { href: "/merchant/invoices", label: "Invoices", icon: <FileText className="h-4 w-4" /> },
      { href: "/merchant/bulk-invoices", label: "Bulk Invoices", icon: <FileText className="h-4 w-4" /> },
      { href: "/merchant/eway-bill", label: "E-way Bill", icon: <ScrollText className="h-4 w-4" /> },
      { href: "/merchant/gst", label: "GST Returns", icon: <FileText className="h-4 w-4" /> },
      { href: "/merchant/collections", label: "Collections", icon: <Wallet className="h-4 w-4" /> },
      { href: "/merchant/credit-ledger", label: "Credit Ledger", icon: <FileText className="h-4 w-4" /> },
      { href: "/merchant/account", label: "Account Statement", icon: <Wallet className="h-4 w-4" /> },
      { href: "/merchant/payment-dashboard", label: "Payment Dashboard", icon: <DollarSign className="h-4 w-4" /> },
      { href: "/merchant/payment-settings", label: "Payment Settings", icon: <Settings className="h-4 w-4" /> },
    ],
  },
  {
    id: "users-network",
    label: "Users & Network",
    icon: <Users className="h-5 w-5" />,
    isSection: true,
    children: [
      { href: "/merchant/users", label: "All Users", icon: <User className="h-4 w-4" /> },
      { href: "/merchant/users/b2b", label: "B2B Users", icon: <Building className="h-4 w-4" /> },
      { href: "/merchant/users/b2c", label: "B2C Users", icon: <User className="h-4 w-4" /> },
      { href: "/merchant/users/b2b-registrations", label: "B2B Registrations", icon: <UserPlus className="h-4 w-4" /> },
      { href: "/merchant/staff", label: "Staff Management", icon: <Shield className="h-4 w-4" /> },
      { href: "/merchant/sub-users", label: "Sub-Users", icon: <UserPlus className="h-4 w-4" /> },
      { href: "/merchant/free-milk-requests", label: "Free Milk Requests", icon: <Droplets className="h-4 w-4" /> },
    ],
  },
  {
    id: "dms",
    label: "DMS",
    icon: <Database className="h-5 w-5" />,
    isSection: true,
    children: [
      { href: "/merchant/inventory", label: "Inventory & Batches", icon: <Package className="h-4 w-4" /> },
      { href: "/merchant/grn", label: "Goods Receipt Notes", icon: <FileText className="h-4 w-4" /> },
      { href: "/merchant/sales-returns", label: "Sales Returns", icon: <RefreshCw className="h-4 w-4" /> },
      { href: "/merchant/schemes", label: "Schemes & Promotions", icon: <Tag className="h-4 w-4" /> },
      { href: "/merchant/sfa", label: "Sales Force", icon: <MapPin className="h-4 w-4" /> },
      { href: "/merchant/tally", label: "Tally Integration", icon: <Database className="h-4 w-4" /> },
      { href: "/merchant/gstr", label: "GSTR Returns", icon: <ScrollText className="h-4 w-4" /> },
    ],
  },
  {
    id: "reports",
    label: "Reports & Media",
    icon: <BarChart3 className="h-5 w-5" />,
    isSection: true,
    children: [
      { href: "/merchant/reports", label: "Sales Reports", icon: <BarChart3 className="h-4 w-4" /> },
      { href: "/merchant/milk-dispatch-report", label: "Daily Dispatch Report", icon: <Droplets className="h-4 w-4" /> },
      { href: "/merchant/products-dispatch-report", label: "Products Dispatch Report", icon: <ClipboardList className="h-4 w-4" /> },
      { href: "/merchant/icecream-dispatch-report", label: "Ice Cream Dispatch Report", icon: <ClipboardList className="h-4 w-4" /> },
      { href: "/merchant/gallery", label: "Gallery & Media", icon: <Image className="h-4 w-4" /> },
      { href: "/merchant/printers", label: "Printers", icon: <Printer className="h-4 w-4" /> },
    ],
  },
];

const permissionToMenuMap: Record<string, string[]> = {
  dashboard: ["Dashboard", "Overview"],
  orders_view: ["Orders", "All Orders", "Daily Indent"],
  orders_manage: ["Orders", "All Orders", "Daily Indent"],
  products_view: ["Products", "Product Catalog (View Only)"],
  products_manage: ["Products", "Product Catalog (View Only)"],
  inventory_view: ["DMS", "Inventory & Batches", "Goods Receipt Notes"],
  inventory_manage: ["DMS", "Inventory & Batches", "Goods Receipt Notes"],
  customers_view: ["Users & Network", "All Users", "B2B Users", "B2C Users", "B2B Registrations"],
  customers_manage: ["Users & Network", "All Users", "B2B Users", "B2C Users", "B2B Registrations"],
  reports_view: ["Reports & Media", "Sales Reports"],
  pos_access: ["Orders", "POS"],
  pos_counter_sale: ["Orders", "POS"],
  settings_view: ["Union Setup", "Union Information", "Settings"],
  settings_manage: ["Union Setup", "Union Information", "Settings", "Banner"],
  subusers_manage: ["Users & Network", "Sub-Users", "Staff Management", "Free Milk Requests"],
  ewaybill_access: ["Finance", "E-way Bill"],
  gst_access: ["Finance", "GST Returns"],
  gst_returns_view: ["Finance", "GST Returns"],
  indent_orders_view: ["Orders", "Daily Indent"],
  indent_approvals: ["Orders", "Daily Indent"],
  delivery: ["Regular Delivery", "Bulk Delivery", "Dashboard", "Order Deliveries", "Pending Jobs", "Trip Planning", "Active Trips", "Fleet & Vehicles", "Drivers", "Performance"],
  head_office: ["Head Office", "Dashboard", "B2B Orders", "Routes & Agents"],
  transport_team: ["Regular Delivery", "Bulk Delivery", "Fleet & Vehicles", "Drivers"],
  invoice: ["Finance", "Invoices"],
  wallet: ["Finance", "Collections", "Credit Ledger", "Account Statement"],
  staff: ["Users & Network", "Staff Management", "Free Milk Requests"],
};

function collectAllLabels(sections: NavEntry[]): string[] {
  const labels: string[] = [];
  for (const section of sections) {
    labels.push(section.label);
    for (const child of section.children) {
      labels.push(child.label);
    }
  }
  return labels;
}

function isHrefActive(href: string, location: string): boolean {
  if (href.includes('?')) {
    const [path, query] = href.split('?');
    if (path !== location) return false;
    return window.location.search === `?${query}`;
  }
  return href === location || location.startsWith(href + "/");
}

function hasActiveChild(section: NavEntry, location: string): boolean {
  return section.children.some((child) => isHrefActive(child.href, location));
}

interface MerchantSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MerchantSidebar({ isOpen, onClose }: MerchantSidebarProps) {
  const [location] = useLocation();
  const { user, merchantId, subUserSession, staffSession } = useMerchantContext();
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const [manuallyToggled, setManuallyToggled] = useState<Set<string>>(new Set());

  const isAdminViewing = user?.role === 'admin' && merchantId && merchantId.startsWith('merchant-');
  const { data: merchantInfo } = useQuery<any>({
    queryKey: ["/api/merchant", merchantId, "info"],
    queryFn: async () => {
      const res = await fetch(`/api/merchants/${merchantId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!isAdminViewing,
    retry: false,
    staleTime: 10 * 60 * 1000,
  });

  const { data: mmoOffices = [] } = useQuery<any[]>({
    queryKey: ["/api/mmo/offices"],
    queryFn: async () => {
      const res = await fetch("/api/mmo/offices", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const { data: orderCounts } = useQuery<any>({
    queryKey: ["/api/orders/counts"],
    queryFn: async () => {
      const res = await fetch("/api/orders/counts", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    refetchInterval: 30000,
  });

  const transportManagerAllowedSections = new Set(["dashboard", "regular-delivery", "bulk-delivery"]);
  const fieldOpsAllowedSections = new Set(["mmo", "head-office"]);

  const getAllowedMenuLabels = (): Set<string> => {
    if (staffSession?.isStaff && staffSession.designationId === "transport_manager") {
      const allowed = new Set<string>();
      navSections.forEach((section) => {
        if (transportManagerAllowedSections.has(section.id)) {
          allowed.add(section.label);
          section.children.forEach((child) => allowed.add(child.label));
        }
      });
      return allowed;
    }

    const isFieldOps = staffSession?.isStaff && staffSession.accessTier === "field_ops";
    if (isFieldOps) {
      const allowed = new Set<string>();
      navSections.forEach((section) => {
        if (fieldOpsAllowedSections.has(section.id)) {
          allowed.add(section.label);
          section.children.forEach((child) => allowed.add(child.label));
        }
      });
      return allowed;
    }

    const permissions = subUserSession?.isSubUser
      ? subUserSession.permissions
      : staffSession?.isStaff
      ? staffSession.permissions
      : null;

    if (!permissions) {
      return new Set(collectAllLabels(navSections));
    }

    const allowed = new Set<string>();
    permissions.forEach((permission) => {
      const menuLabels = permissionToMenuMap[permission];
      if (menuLabels) {
        menuLabels.forEach((label) => allowed.add(label));
      }
    });
    return allowed;
  };

  const allowedMenuLabels = getAllowedMenuLabels();

  const sectionsWithDynamic = navSections.map(section => {
    if (section.id === "mmo" && mmoOffices.length > 0) {
      const topLevel = mmoOffices.filter((o: any) => !o.parentId);
      const officeChildren: NavItem[] = topLevel.map((o: any) => ({
        href: `/merchant/mmo/${o.id}/routes`,
        label: o.officeName,
        icon: <Route className="h-4 w-4" />,
      }));
      return {
        ...section,
        children: [
          { href: "/merchant/mmo", label: "All MMO Offices", icon: <Building2 className="h-4 w-4" /> } as NavItem,
          ...officeChildren,
        ],
      };
    }
    return section;
  });

  const filteredSections = sectionsWithDynamic.reduce<NavEntry[]>((acc, section) => {
    if (subUserSession?.isSubUser || staffSession?.isStaff) {
      const filteredChildren = section.children.filter((child) => allowedMenuLabels.has(child.label));
      if (filteredChildren.length > 0 || allowedMenuLabels.has(section.label)) {
        acc.push({
          ...section,
          children: filteredChildren.length > 0 ? filteredChildren : section.children,
        });
      }
    } else {
      acc.push(section);
    }
    return acc;
  }, []);

  const displayName = staffSession?.isStaff
    ? staffSession.name
    : subUserSession?.isSubUser
    ? subUserSession.name
    : isAdminViewing && merchantInfo
    ? merchantInfo.restaurantName || merchantInfo.name || "Union Admin"
    : user?.role !== 'admin'
    ? user?.name || "Union Admin"
    : "Union Admin";

  const displayEmail = isAdminViewing && merchantInfo
    ? merchantInfo.contactEmail || merchantInfo.email || ""
    : user?.role !== 'admin'
    ? user?.email || ""
    : "";
  const displayPhone = user?.phone || "";

  const toggleMenu = (id: string) => {
    setExpandedMenus((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
    setManuallyToggled((prev) => new Set(prev).add(id));
  };

  const isMenuExpanded = (section: NavEntry): boolean => {
    if (manuallyToggled.has(section.id)) return expandedMenus.has(section.id);
    return hasActiveChild(section, location);
  };

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/merchant/logout");
    },
    onSuccess: () => {
      sessionStorage.removeItem("merchantSubUser");
      sessionStorage.removeItem("staffSession");
      queryClient.clear();
      window.location.href = "/admin/login?tab=union";
    },
  });

  const getOrderBadge = (label: string): number | undefined => {
    if (!orderCounts) return undefined;
    switch (label) {
      case "All Orders":
        return orderCounts.total;
      default:
        return undefined;
    }
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={onClose} />
      )}

      <div
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-[#2d1b4e] dark:bg-gray-900 border-r border-purple-900 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-purple-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <Store className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-base sm:text-lg font-bold text-white">AavinCart</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="lg:hidden text-white hover:bg-purple-800"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-3 sm:p-4 border-b border-purple-800">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm sm:text-lg shrink-0">
              {displayName?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate text-sm sm:text-base">{displayName}</p>
              {displayPhone && (
                <p className="text-purple-300 text-xs flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {displayPhone}
                </p>
              )}
              {displayEmail && (
                <p className="text-purple-300 text-xs truncate flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {displayEmail}
                </p>
              )}
              {staffSession?.isStaff && (
                <p className="text-purple-400 text-xs mt-0.5">{staffSession.designation || "Staff"}</p>
              )}
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-0.5">
          {filteredSections.map((section) => {
            const expanded = isMenuExpanded(section);
            const isActive = hasActiveChild(section, location);

            return (
              <div key={section.id} className="mt-1">
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 text-sm font-medium cursor-pointer rounded-lg transition-colors",
                    "hover:bg-purple-800/50",
                    isActive ? "text-white" : "text-purple-200 hover:text-white"
                  )}
                  onClick={() => toggleMenu(section.id)}
                  tabIndex={0}
                >
                  {section.icon}
                  <span className="flex-1">{section.label}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200 text-purple-400",
                      !expanded && "-rotate-90"
                    )}
                  />
                </div>
                {expanded && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-purple-700 pl-2">
                    {section.children.map((child) => {
                      const childActive = isHrefActive(child.href, location);
                      const badge = getOrderBadge(child.label);
                      return (
                        <Link key={child.href} href={child.href} onClick={() => onClose()}>
                          <div
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 text-sm transition-colors cursor-pointer rounded-lg",
                              "hover:bg-purple-800/50",
                              childActive
                                ? "text-yellow-300 bg-purple-800/50 font-semibold"
                                : "text-purple-200 hover:text-white"
                            )}
                          >
                            {child.icon}
                            <span className="flex-1">{child.label}</span>
                            {badge !== undefined && badge > 0 && (
                              <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                                {badge}
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-purple-800">
          <Button
            variant="ghost"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-purple-800/50"
          >
            <LogOut className="h-5 w-5 mr-3" />
            {logoutMutation.isPending ? "Signing out..." : "Sign Out"}
          </Button>
        </div>
      </div>
    </>
  );
}
