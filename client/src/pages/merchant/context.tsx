import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

interface MerchantUser {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  merchantId?: string;
  isGlobalAdmin?: boolean;
}

interface SubUserSession {
  id: string;
  name: string;
  email: string;
  permissions: string[];
  isSubUser: boolean;
}

interface StaffSession {
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
}

interface MerchantContextValue {
  user: MerchantUser | null;
  merchantId: string;
  isLoading: boolean;
  isAuthenticated: boolean;
  subUserSession: SubUserSession | null;
  staffSession: StaffSession | null;
}

const MerchantContext = createContext<MerchantContextValue>({
  user: null,
  merchantId: "",
  isLoading: true,
  isAuthenticated: false,
  subUserSession: null,
  staffSession: null,
});

export function useMerchantContext() {
  return useContext(MerchantContext);
}

interface MerchantProviderProps {
  children: ReactNode;
  subUserSession: SubUserSession | null;
  staffSession: StaffSession | null;
  merchantIdOverride?: string | null;
}

export function MerchantProvider({ children, subUserSession, staffSession, merchantIdOverride }: MerchantProviderProps) {
  const [autoLoginDone, setAutoLoginDone] = useState(false);

  const autoLoginId = (() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('auto_login');
    } catch { return null; }
  })();

  useEffect(() => {
    if (autoLoginId && !autoLoginDone) {
      fetch('/api/merchant/auto-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ merchantId: autoLoginId })
      })
        .then(res => res.json())
        .then(() => {
          queryClient.removeQueries({ queryKey: ["/api/merchant/me"] });
          setAutoLoginDone(true);
        })
        .catch(err => {
          console.error('Auto-login failed:', err);
          setAutoLoginDone(true);
        });
    } else if (!autoLoginId) {
      setAutoLoginDone(true);
    }
  }, [autoLoginId, autoLoginDone]);

  const { data: authMe, isLoading: authLoading } = useQuery<any>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const { data: merchantMe, isLoading: merchantLoading } = useQuery<any>({
    queryKey: ["/api/merchant/me"],
    queryFn: async () => {
      const res = await fetch("/api/merchant/me", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled: autoLoginDone,
  });

  const isLoading = authLoading || merchantLoading || !autoLoginDone;

  const user: MerchantUser | null = merchantMe?.id
    ? {
        id: merchantMe.id,
        name: merchantMe.name || merchantMe.businessName || merchantMe.restaurantName,
        email: merchantMe.email,
        phone: merchantMe.phone,
        role: "merchant",
        merchantId: merchantMe.id,
      }
    : authMe?.user
    ? {
        id: authMe.user.id,
        name: authMe.user.name,
        email: authMe.user.email,
        phone: authMe.user.phone,
        role: authMe.user.role,
        merchantId: authMe.user.merchantId,
        isGlobalAdmin: authMe.user.isGlobalAdmin,
      }
    : null;

  const merchantId = merchantIdOverride || staffSession?.unionId || user?.merchantId || user?.id || "";
  const isAuthenticated = !!user || !!merchantId;

  return (
    <MerchantContext.Provider value={{ user, merchantId, isLoading, isAuthenticated, subUserSession, staffSession }}>
      {children}
    </MerchantContext.Provider>
  );
}

export type { MerchantUser, SubUserSession, StaffSession };
