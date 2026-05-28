import { useState } from "react";
import { Link, useLocation as useWouterLocation } from "wouter";
import customerLogo from "@assets//aavin-logo.png";
import { MapPin, ShoppingCart, Menu, User, LogOut, LayoutDashboard, X, Home, Grid3X3, Package, UserCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "@/lib/location-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

export default function Navbar() {
  const [routeLocation, setRouteLocation] = useWouterLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { toggleCart, getItemCount } = useCartStore();
  const { user, logout } = useAuth();
  const { detectedAddress, isDetecting } = useLocation();
  const itemCount = getItemCount();

  const getDisplayName = () => {
    if (!user) return '';
    if (user.businessName && user.businessName.trim()) return user.businessName;
    if (user.name && user.name.trim() && !user.name.includes('@')) return user.name;
    if (user.email) {
      const parts = user.email.split('@');
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
    return 'User';
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const displayName = getDisplayName();

  const handleLogout = async () => {
    await logout();
    setRouteLocation("/");
  };

  const isActive = (path: string) => routeLocation === path;

  return (
    <nav className="bg-card shadow-sm border-b border-border sticky top-0 z-40 safe-area-top">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <div className="flex items-center gap-3 sm:gap-8 min-w-0">
            <div className="flex-shrink-0">
              <Link href="/" data-testid="logo-link">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <img src={customerLogo} alt="Aavin Cart" className="h-8 w-8 sm:h-10 sm:w-10 object-contain rounded-lg" />
                  <h1 className="text-lg sm:text-2xl font-bold text-primary whitespace-nowrap">Aavin Cart</h1>
                </div>
              </Link>
            </div>
            <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 rounded-full px-2.5 py-1 max-w-[180px] lg:hidden">
              <MapPin className="h-3 w-3 text-primary shrink-0" />
              <span className="truncate">{detectedAddress || "Detecting..."}</span>
            </div>
            <div className="hidden lg:block">
              <div className="ml-4 flex items-baseline space-x-4">
                <Link href="/" data-testid="nav-home">
                  <span className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/') 
                      ? 'text-foreground' 
                      : 'text-muted-foreground hover:text-primary'
                  }`}>
                    Home
                  </span>
                </Link>
                <Link href="/unions" data-testid="nav-restaurants">
                  <span className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/unions') 
                      ? 'text-foreground' 
                      : 'text-muted-foreground hover:text-primary'
                  }`}>
                    District Unions
                  </span>
                </Link>
                <Link href="/orders" data-testid="nav-orders">
                  <span className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/orders') 
                      ? 'text-foreground' 
                      : 'text-muted-foreground hover:text-primary'
                  }`}>
                    Orders
                  </span>
                </Link>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden lg:block">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg text-sm">
                {isDetecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-muted-foreground">Detecting location...</span>
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground">{detectedAddress || "Location not detected"}</span>
                  </>
                )}
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCart}
              className="relative"
              data-testid="button-cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span 
                  className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center"
                  data-testid="text-cart-count"
                >
                  {itemCount}
                </span>
              )}
            </Button>
            
            <div className="hidden md:flex items-center space-x-3">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" data-testid="button-user-menu">
                      <User className="h-4 w-4 mr-2" />
                      {displayName}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span className="text-xs text-primary font-normal">{getGreeting()},</span>
                        <span>{displayName}</span>
                        {user.email && <span className="text-xs text-muted-foreground">{user.email}</span>}
                        {((user as any).freshMilkPricingRole && (user as any).productsPricingRole && (user as any).freshMilkPricingRole !== (user as any).productsPricingRole) ? (
                          <div className="text-xs text-primary mt-1 space-y-0.5">
                            <div>Fresh Milk: {(user as any).freshMilkPricingRole?.replace('_', ' ')}</div>
                            <div>Products: {(user as any).productsPricingRole?.replace('_', ' ')}</div>
                          </div>
                        ) : user.pricingRole && user.pricingRole !== 'MRP' && (
                          <span className="text-xs text-primary mt-1">{user.pricingRole?.replace('_', ' ')} Pricing</span>
                        )}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {user.role === 'admin' && (
                      <DropdownMenuItem onClick={() => setRouteLocation("/admin/dashboard")}>
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        Admin Dashboard
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => setRouteLocation("/orders")}>
                      My Orders
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setRouteLocation("/profile")}>
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm" data-testid="button-signin">
                      <User className="h-4 w-4 mr-2" />
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button size="sm" data-testid="button-signup">
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>
            
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" data-testid="button-menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[350px] p-0 flex flex-col">
                <SheetHeader className="p-4 border-b bg-gradient-to-r from-primary/10 to-accent/10 shrink-0">
                  <SheetTitle className="flex items-center gap-2">
                    <img src={customerLogo} alt="Aavin" className="h-8 w-8 rounded-lg" />
                    <span className="text-primary font-bold">Aavin Cart</span>
                  </SheetTitle>
                </SheetHeader>
                
                <div className="flex flex-col flex-1 overflow-hidden">
                  {user ? (
                    <div className="p-3 bg-gradient-to-r from-primary/5 to-accent/5 border-b shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <UserCircle className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-primary">{getGreeting()}!</p>
                          <p className="font-semibold text-foreground text-sm truncate">{displayName}</p>
                          {user.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
                          {((user as any).freshMilkPricingRole && (user as any).productsPricingRole && (user as any).freshMilkPricingRole !== (user as any).productsPricingRole) ? (
                            <div className="text-xs mt-1 space-x-1">
                              <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">FM: {(user as any).freshMilkPricingRole?.replace('_', ' ')}</span>
                              <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Prod: {(user as any).productsPricingRole?.replace('_', ' ')}</span>
                            </div>
                          ) : user.pricingRole && user.pricingRole !== 'MRP' && (
                            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full mt-1 inline-block">
                              {user.pricingRole?.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-gradient-to-r from-primary/5 to-accent/5 border-b shrink-0">
                      <p className="text-sm text-muted-foreground mb-2">Sign in to access all features</p>
                      <div className="flex gap-2">
                        <Link href="/login" className="flex-1">
                          <Button 
                            variant="outline" 
                            className="w-full h-11" 
                            onClick={() => setMobileMenuOpen(false)}
                            data-testid="mobile-signin"
                          >
                            <User className="h-4 w-4 mr-2" />
                            Sign In
                          </Button>
                        </Link>
                        <Link href="/signup" className="flex-1">
                          <Button 
                            className="w-full bg-primary hover:bg-primary/90 h-11" 
                            onClick={() => setMobileMenuOpen(false)}
                            data-testid="mobile-signup"
                          >
                            Sign Up
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                  
                  <nav className="flex-1 overflow-y-auto p-2">
                    <div className="space-y-1">
                      <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                        <div className={`flex items-center gap-3 px-4 py-3.5 rounded-lg transition-colors ${
                          isActive('/') ? 'bg-primary/10 text-primary' : 'hover:bg-muted active:bg-muted'
                        }`}>
                          <Home className="h-5 w-5" />
                          <span className="font-medium">Home</span>
                        </div>
                      </Link>
                      <Link href="/unions" onClick={() => setMobileMenuOpen(false)}>
                        <div className={`flex items-center gap-3 px-4 py-3.5 rounded-lg transition-colors ${
                          isActive('/unions') ? 'bg-primary/10 text-primary' : 'hover:bg-muted active:bg-muted'
                        }`}>
                          <Grid3X3 className="h-5 w-5" />
                          <span className="font-medium">District Unions</span>
                        </div>
                      </Link>
                      <Link href="/orders" onClick={() => setMobileMenuOpen(false)}>
                        <div className={`flex items-center gap-3 px-4 py-3.5 rounded-lg transition-colors ${
                          isActive('/orders') ? 'bg-primary/10 text-primary' : 'hover:bg-muted active:bg-muted'
                        }`}>
                          <Package className="h-5 w-5" />
                          <span className="font-medium">My Orders</span>
                        </div>
                      </Link>
                      
                      {user && (
                        <>
                          <div className="h-px bg-border my-2" />
                          {user.role === 'admin' && (
                            <Link href="/admin/dashboard" onClick={() => setMobileMenuOpen(false)}>
                              <div className="flex items-center gap-3 px-4 py-3.5 rounded-lg hover:bg-muted active:bg-muted">
                                <LayoutDashboard className="h-5 w-5" />
                                <span className="font-medium">Admin Dashboard</span>
                              </div>
                            </Link>
                          )}
                          <Link href="/profile" onClick={() => setMobileMenuOpen(false)}>
                            <div className="flex items-center gap-3 px-4 py-3.5 rounded-lg hover:bg-muted active:bg-muted">
                              <UserCircle className="h-5 w-5" />
                              <span className="font-medium">Profile</span>
                            </div>
                          </Link>
                        </>
                      )}
                    </div>
                  </nav>
                  
                  {user && (
                    <div className="p-3 border-t shrink-0" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}>
                      <Button 
                        variant="outline" 
                        className="w-full h-12 text-destructive hover:text-destructive hover:bg-destructive/10 text-base"
                        onClick={() => {
                          handleLogout();
                          setMobileMenuOpen(false);
                        }}
                      >
                        <LogOut className="h-5 w-5 mr-2" />
                        Logout
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
