import { ReactNode, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Menu, Bell, Search, ToggleRight, ToggleLeft } from "lucide-react";
import { MerchantProvider, useMerchantContext, SubUserSession, StaffSession } from "./context";
import MerchantSidebar from "./sidebar";

interface MerchantLayoutProps {
  children: ReactNode;
}

function MerchantLayoutInner({ children }: MerchantLayoutProps) {
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [acceptingOrders, setAcceptingOrders] = useState(true);
  const { user, isLoading, isAuthenticated, merchantId } = useMerchantContext();

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/admin/login?tab=union");
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Loading Union Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex">
      <MerchantSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

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
              <span
                className={cn(
                  "text-xs sm:text-sm font-medium",
                  acceptingOrders
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {acceptingOrders ? "Accepting Orders" : "Not Accepting"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAcceptingOrders(!acceptingOrders)}
                className={cn("p-1", acceptingOrders ? "text-green-600" : "text-red-600")}
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

        <main className="p-3 sm:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

export default function MerchantLayout({ children }: MerchantLayoutProps) {
  const [subUserSession, setSubUserSession] = useState<SubUserSession | null>(null);
  const [staffSession, setStaffSession] = useState<StaffSession | null>(null);

  useEffect(() => {
    const storedSubUser = sessionStorage.getItem("merchantSubUser");
    if (storedSubUser) {
      try {
        setSubUserSession(JSON.parse(storedSubUser));
      } catch (e) {}
    }
    const storedStaff = sessionStorage.getItem("staffSession");
    if (storedStaff) {
      try {
        setStaffSession(JSON.parse(storedStaff));
      } catch (e) {}
    }
  }, []);

  return (
    <MerchantProvider subUserSession={subUserSession} staffSession={staffSession}>
      <MerchantLayoutInner>{children}</MerchantLayoutInner>
    </MerchantProvider>
  );
}
