import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useCartStore } from './store';
import { queryClient } from './queryClient';

interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  pricingRole?: string;
  freshMilkPricingRole?: string;
  productsPricingRole?: string;
  agentCode?: string;
  agentType?: string;
  unionId?: string;
  restaurantId?: string;
  businessName?: string;
  address?: string;
  freshMilkTier?: string;
  productTier?: string;
  gstNumber?: string;
  gstVerified?: boolean;
  gstBusinessName?: string;
  gstStatus?: string;
  panNumber?: string;
  panVerified?: boolean;
  fssaiLicense?: string;
  fssaiVerified?: boolean;
  fssaiBusinessName?: string;
  tradeLicense?: string;
  msmeNumber?: string;
  msmeVerified?: boolean;
  gstExpiryDate?: string;
  gstRegistrationDate?: string;
  fssaiExpiryDate?: string;
  fssaiRegistrationDate?: string;
  tradeLicenseExpiryDate?: string;
  tradeLicenseRegistrationDate?: string;
  msmeExpiryDate?: string;
  msmeRegistrationDate?: string;
  bankAccountNumber?: string;
  bankIfscCode?: string;
  bankName?: string;
  bankBranch?: string;
  accountHolderName?: string;
  accountType?: string;
  upiId?: string;
}

interface AuthContextType {
  user: User | null;
  authLoading: boolean;
  pricingRole: string;
  setUser: (user: User | null) => void;
  logout: () => void;
  getPricingTierForProduct: (productSegment?: string) => string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [authLoading, setAuthLoading] = useState(true);

  const pricingRole = user?.pricingRole || 'MRP';

  const getPricingTierForProduct = (productSegment?: string): string => {
    if (!user) return 'MRP';
    
    // Agent users use tier fields
    if (user.role === 'agent') {
      if (productSegment === 'Fresh Milk') {
        return user.freshMilkTier || 'MRP';
      }
      return user.productTier || 'MRP';
    }
    
    // Non-agent users use segment-specific pricing roles
    const isFreshMilk = productSegment?.toLowerCase().includes('fresh') || productSegment === 'Fresh Milk';
    if (isFreshMilk) {
      return user.freshMilkPricingRole || user.pricingRole || 'MRP';
    }
    return user.productsPricingRole || user.pricingRole || 'MRP';
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        // Check for auto_login_token in URL (for staff/user auto-login feature)
        const urlParams = new URLSearchParams(window.location.search);
        const autoLoginToken = urlParams.get('auto_login_token');
        
        if (autoLoginToken) {
          try {
            // Decode the base64 token
            const tokenData = JSON.parse(atob(autoLoginToken));
            
            // Create user object from token data
            const autoLoginUser: User = {
              id: tokenData.staffId || tokenData.userId || '',
              name: tokenData.name || '',
              email: tokenData.email || tokenData.username || '',
              role: tokenData.role || 'customer',
              pricingRole: tokenData.pricingRole || 'MRP',
              unionId: tokenData.unionId || tokenData.merchantId || '',
            };
            
            setUser(autoLoginUser);
            
            // Clear the token from URL
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
            
            // Redirect based on user type:
            // - Staff members go to Union Dashboard with their permissions
            // - Regular users (customers/dealers) stay on homepage to shop
            if (tokenData.staffId && !tokenData.isCustomer) {
              const merchantId = tokenData.merchantId || tokenData.unionId;
              
              const staffSession = {
                isStaff: true,
                isDirectLogin: true,
                staffId: tokenData.staffId,
                name: tokenData.name,
                username: tokenData.username,
                permissions: tokenData.permissions || [],
                accessTier: tokenData.accessTier,
                unionId: tokenData.unionId,
                salesSegment: tokenData.salesSegment || 'all_access',
                assignedSegments: tokenData.assignedSegments || [],
                assignedOffice: tokenData.assignedOffice || '',
                department: tokenData.department || '',
                designation: tokenData.designation || '',
                designationId: tokenData.designationId || '',
              };
              sessionStorage.setItem('staffSession', JSON.stringify(staffSession));
              
              window.location.href = `/merchant/dashboard?auto_login=${merchantId}`;
              return;
            }
            // For customers/users, they stay on homepage to browse/shop
            // No redirect needed - they're now logged in
          } catch (e) {
            console.error('Failed to parse auto login token:', e);
          }
        }
        
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            setUser(data.user);
          }
        }
      } catch (error) {
        // Silent fail - user just not logged in
      } finally {
        setAuthLoading(false);
      }
    };
    bootstrap();
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (error) {
      // Silent fail
    }
    queryClient.clear();
    setUser(null);
    localStorage.removeItem('user');
    sessionStorage.removeItem('merchantDashboardId');
    sessionStorage.removeItem('merchantSubUser');
    sessionStorage.removeItem('staffSession');
    useCartStore.getState().clearCart();
  };

  return (
    <AuthContext.Provider value={{ user, authLoading, pricingRole, setUser, logout, getPricingTierForProduct }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

const TIER_TO_PRICING_ROLE: Record<string, string> = {
  'FED': 'FEDERATION',
  'INT': 'INTER_UNION',
  'WSD': 'WHOLESALE_DEALER',
  'DLR': 'DEALER',
  'RTL': 'RETAILER',
  'MRP': 'MRP',
  'Wholesale Dealer': 'WHOLESALE_DEALER',
  'WHOLESALE DEALER': 'WHOLESALE_DEALER',
  'WHOLESALE_DEALER': 'WHOLESALE_DEALER',
  'wholesale_dealer': 'WHOLESALE_DEALER',
  'Dealer': 'DEALER',
  'DEALER': 'DEALER',
  'dealer': 'DEALER',
  'Retailer': 'RETAILER',
  'RETAILER': 'RETAILER',
  'retailer': 'RETAILER',
  'Federation': 'FEDERATION',
  'FEDERATION': 'FEDERATION',
  'federation': 'FEDERATION',
  'Inter Union': 'INTER_UNION',
  'INTER UNION': 'INTER_UNION',
  'INTER_UNION': 'INTER_UNION',
  'inter_union': 'INTER_UNION',
  'MPCS': 'DEALER',
  'mpcs': 'DEALER',
  'HOTEL': 'DEALER',
  'hotel': 'DEALER',
  'INSTITUTION': 'DEALER',
  'INSTUTION': 'DEALER',
  'institution': 'DEALER',
  'PRIVATE_PARLOUR': 'DEALER',
  'PRIVATE PARLOUR': 'DEALER',
  'private_parlour': 'DEALER',
  'UNION_PARLOUR': 'DEALER',
  'UNION PARLOUR': 'DEALER',
  'union_parlour': 'DEALER',
  'GENERAL_SHOP': 'MRP',
  'general_shop': 'MRP',
  'AGENT': 'DEALER',
  'agent': 'DEALER',
  'FMD': 'DEALER',
  'fmd': 'DEALER',
};

export function calculatePriceForRole(
  pricingRole: string,
  item: {
    price: string;
    mrp?: string | null;
    federationPrice?: string | null;
    districtUnionPrice?: string | null;
    wholesalePrice?: string | null;
    retailPrice?: string | null;
  }
): string {
  const mrp = parseFloat(item.mrp || item.price);
  const role = TIER_TO_PRICING_ROLE[pricingRole] || pricingRole;
  
  switch (role) {
    case 'FEDERATION':
      return item.federationPrice || (mrp * 0.50).toFixed(2);
    case 'INTER_UNION':
      return item.districtUnionPrice || (mrp * 0.55).toFixed(2);
    case 'WHOLESALE_DEALER':
      return item.wholesalePrice || (mrp * 0.65).toFixed(2);
    case 'DEALER': {
      return item.retailPrice || (mrp * 0.85).toFixed(2);
    }
    case 'RETAILER': {
      const dealerPrice = parseFloat(item.retailPrice || (mrp * 0.85).toString());
      const difference = mrp - dealerPrice;
      return (mrp - (difference * 0.60)).toFixed(2);
    }
    case 'MRP':
    default:
      return item.mrp || item.price;
  }
}

export function calculatePriceForTier(
  tier: string,
  item: {
    price: string;
    mrp?: string | null;
    federationPrice?: string | null;
    districtUnionPrice?: string | null;
    wholesalePrice?: string | null;
    retailPrice?: string | null;
  }
): string {
  return calculatePriceForRole(tier, item);
}

export function getPricingRoleForSegment(
  user: {
    pricingRole?: string | null;
    freshMilkPricingRole?: string | null;
    productsPricingRole?: string | null;
    iceCreamPricingRole?: string | null;
  } | null | undefined,
  productSegment: string = 'Products'
): string {
  if (!user) return 'MRP';
  
  const seg = productSegment?.toLowerCase() || '';
  if (seg.includes('fresh')) {
    return user.freshMilkPricingRole || user.pricingRole || 'MRP';
  } else if (seg.includes('ice')) {
    return user.iceCreamPricingRole || user.productsPricingRole || user.pricingRole || 'MRP';
  } else {
    return user.productsPricingRole || user.pricingRole || 'MRP';
  }
}

export function calculatePriceForSegment(
  user: {
    pricingRole?: string | null;
    freshMilkPricingRole?: string | null;
    productsPricingRole?: string | null;
  } | null | undefined,
  item: {
    price: string;
    mrp?: string | null;
    federationPrice?: string | null;
    districtUnionPrice?: string | null;
    wholesalePrice?: string | null;
    retailPrice?: string | null;
    productSegment?: string | null;
  }
): string {
  const segment = item.productSegment || 'Products';
  const pricingRole = getPricingRoleForSegment(user, segment);
  return calculatePriceForRole(pricingRole, item);
}