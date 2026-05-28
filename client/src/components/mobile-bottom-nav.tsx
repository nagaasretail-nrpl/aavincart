import { Link, useLocation } from "wouter";
import { Home, ShoppingBag, Package, Star, User, LayoutDashboard, Monitor } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { isB2BUser, isHiddenNavRole } from "@/lib/role-utils";

type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
};

function getNavItems(user: any): NavItem[] {
  if (isHiddenNavRole(user)) return [];

  const accountHref = user ? "/profile" : "/login";
  const accountLabel = user ? "Account" : "Sign In";

  if (user && isB2BUser(user)) {
    return [
      { href: "/", icon: Home, label: "Home" },
      { href: "/orders", icon: Package, label: "Orders" },
      { href: "/pos", icon: Monitor, label: "POS" },
      { href: "/dashboard", icon: LayoutDashboard, label: "Ledger" },
      { href: accountHref, icon: User, label: accountLabel },
    ];
  }

  return [
    { href: "/", icon: Home, label: "Home" },
    { href: "/unions", icon: ShoppingBag, label: "Shop" },
    { href: "/orders", icon: Package, label: "Orders" },
    { href: "/services", icon: Star, label: "Services" },
    { href: accountHref, icon: User, label: accountLabel },
  ];
}

export default function MobileBottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();

  if (location === "/checkout") return null;

  const navItems = getNavItems(user);
  if (navItems.length === 0) return null;

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 md:hidden safe-area-bottom"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-stretch justify-around" style={{ minHeight: "56px" }}>
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <div
              className={`flex flex-col items-center justify-center min-w-[64px] min-h-[52px] py-1.5 px-2 transition-colors ${
                isActive(item.href) ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[13px] mt-0.5 font-medium">{item.label}</span>
            </div>
          </Link>
        ))}
      </div>
    </nav>
  );
}
