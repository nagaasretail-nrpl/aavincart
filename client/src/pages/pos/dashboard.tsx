import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, 
  Search, Milk, Package, Receipt, RefreshCw, User, Store, X, Wallet,
  MapPin, Truck, Navigation, Scan, Mic, MicOff, QrCode, CheckCircle, Smartphone, Loader2, AlertTriangle
} from "lucide-react";

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const PRICING_TIERS = [
  { value: 'MRP', label: 'MRP (Consumer)', multiplier: 1.0 },
  { value: 'RETAILER', label: 'Retailer (90%)', multiplier: 0.90 },
  { value: 'DEALER', label: 'Dealer (85%)', multiplier: 0.85 },
  { value: 'WHOLESALE_DEALER', label: 'WSD (65%)', multiplier: 0.65 },
  { value: 'INTER_UNION', label: 'Inter-Union (55%)', multiplier: 0.55 },
  { value: 'FEDERATION', label: 'Federation (45%)', multiplier: 0.45 },
];

interface CustomerData {
  id: string;
  name: string;
  email: string;
  phone: string;
  pricingRole?: string;
  unionId?: string;
  isInstitution?: boolean;
  institutionType?: string;
}

interface MenuItemData {
  id: number;
  name: string;
  description?: string;
  price: string;
  mrp?: string;
  federationPrice?: string;
  districtUnionPrice?: string;
  wholesalePrice?: string;
  retailPrice?: string;
  category?: string;
  productSegment?: string;
  isAvailable?: boolean;
}

interface CartItem {
  item: MenuItemData;
  quantity: number;
  pricePerUnit: number;
  total: number;
}

type SaleType = 'counter' | 'restock' | 'mobile';

interface DeliveryAgent {
  id: string;
  name: string;
  phone: string;
  role?: string;
}

const calculatePriceForRole = (item: MenuItemData, pricingRole: string): number => {
  const mrp = parseFloat(item.mrp || item.price || '0');
  const normalizedRole = pricingRole?.toUpperCase()?.replace(/\s+/g, '_');
  
  if (item.federationPrice && normalizedRole === 'FEDERATION') {
    return parseFloat(item.federationPrice);
  }
  if (item.districtUnionPrice && normalizedRole === 'INTER_UNION') {
    return parseFloat(item.districtUnionPrice);
  }
  if (item.wholesalePrice && (normalizedRole === 'WHOLESALE_DEALER' || normalizedRole === 'WSD')) {
    return parseFloat(item.wholesalePrice);
  }
  if (item.retailPrice && (normalizedRole === 'DEALER' || normalizedRole === 'DLR')) {
    return parseFloat(item.retailPrice);
  }
  
  const pricingMultipliers: Record<string, number> = {
    'FEDERATION': 0.45,
    'INTER_UNION': 0.55,
    'WHOLESALE_DEALER': 0.65,
    'WSD': 0.65,
    'DEALER': 0.85,
    'DLR': 0.85,
    'RETAILER': 0.90,
    'RTL': 0.90,
    'MRP': 1.0,
  };
  
  const multiplier = pricingMultipliers[normalizedRole] || 1.0;
  return mrp * multiplier;
};

export default function POSDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'fresh-milk' | 'products'>('fresh-milk');
  const [saleType, setSaleType] = useState<SaleType>('counter');
  const [selectedPricingTier, setSelectedPricingTier] = useState('MRP');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  
  // Customer search state
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerSearchRef = useRef<HTMLDivElement>(null);
  
  // Barcode search state
  const [showBarcodeDialog, setShowBarcodeDialog] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const barcodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Voice search state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // QR Delivery confirmation state
  const [showDeliveryConfirmDialog, setShowDeliveryConfirmDialog] = useState(false);
  const [deliveryConfirmCode, setDeliveryConfirmCode] = useState('');
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(false);

  // SoftPOS state
  const [showSoftPOSDialog, setShowSoftPOSDialog] = useState(false);
  const [softPOSOrderId, setSoftPOSOrderId] = useState<string | null>(null);
  const [softPOSStatus, setSoftPOSStatus] = useState<'idle' | 'created' | 'polling' | 'success' | 'failed'>('idle');
  const [softPOSPollingRef, setSoftPOSPollingRef] = useState<ReturnType<typeof setInterval> | null>(null);
  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

  // Mobile sale state
  const [selectedAgent, setSelectedAgent] = useState<DeliveryAgent | null>(null);
  const [mobileLocation, setMobileLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  
  // Get staff permissions from user
  const staffPermissions = (user as any)?.permissions || [];
  const hasPermission = (perm: string) => {
    if ((user as any)?.role === 'admin' || (user as any)?.accessTier === 'full_access') return true;
    return staffPermissions.includes(perm);
  };
  
  // Fetch merchant settings to check retailerPriceEnabled
  const merchantId = (user as any)?.merchantId || (user as any)?.unionId;
  const { data: merchantSettings } = useQuery<{ retailerPriceEnabled?: boolean }>({
    queryKey: [`/api/merchants/${merchantId}`],
    enabled: !!merchantId,
  });
  const retailerPriceEnabled = merchantSettings?.retailerPriceEnabled === true;
  
  // Check which sale types and pricing tiers the staff has access to
  const canAccessCounterSale = hasPermission('pos_counter_sale') || hasPermission('pos_access');
  const canAccessCreditSales = hasPermission('pos_credit_sales');
  const canAccessMobileSale = hasPermission('pos_mobile_sale') || hasPermission('pos_access');
  
  // Filter pricing tiers based on staff permissions AND retailerPriceEnabled for Retailer tier
  const allowedPricingTiers = PRICING_TIERS.filter(tier => {
    if (tier.value === 'MRP') return canAccessCounterSale;
    if (tier.value === 'FEDERATION') return hasPermission('pos_tier_federation');
    if (tier.value === 'INTER_UNION') return hasPermission('pos_tier_inter_union');
    if (tier.value === 'WHOLESALE_DEALER') return hasPermission('pos_tier_wholesale');
    if (tier.value === 'DEALER') return hasPermission('pos_tier_dealer');
    // Retailer tier requires both permission AND admin approval (retailerPriceEnabled)
    if (tier.value === 'RETAILER') return hasPermission('pos_tier_retailer') && retailerPriceEnabled;
    return false;
  });
  
  // Check if Credit payment is allowed
  // Credit is allowed for:
  // 1. B2B sales (restock/mobile) with non-MRP pricing and customer selected
  // 2. Counter sales (MRP) when an institution customer is selected (for institutional credit sales)
  const isInstitutionCustomer = selectedCustomer?.isInstitution === true;
  const isCreditAllowed = canAccessCreditSales && selectedCustomer && (
    // B2B credit: non-MRP pricing tiers
    (selectedPricingTier !== 'MRP' && (saleType === 'restock' || saleType === 'mobile')) ||
    // Institutional credit: MRP pricing with institution customer flagged as institution
    (saleType === 'counter' && isInstitutionCustomer)
  );
  
  // Fetch delivery agents/drivers for mobile sales
  const { data: deliveryAgents = [] } = useQuery<DeliveryAgent[]>({
    queryKey: [`/api/delivery-agents`],
    enabled: saleType === 'mobile',
  });
  
  // GPS location capture for mobile sales
  const captureLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location not supported",
        description: "Your device doesn't support GPS location",
        variant: "destructive",
      });
      return;
    }
    
    setIsCapturingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setMobileLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsCapturingLocation(false);
        toast({
          title: "Location captured",
          description: `GPS: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`,
        });
      },
      (error) => {
        setIsCapturingLocation(false);
        toast({
          title: "Location error",
          description: error.message,
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true }
    );
  };
  
  // Customer search query
  const { data: searchResults = [] } = useQuery<CustomerData[]>({
    queryKey: ['/api/customers/search', customerSearch],
    queryFn: async () => {
      if (customerSearch.length < 2) return [];
      const res = await fetch(`/api/customers/search?q=${encodeURIComponent(customerSearch)}`);
      return res.json();
    },
    enabled: customerSearch.length >= 2,
  });

  // Fetch customers matching the selected pricing tier for quick selection
  const { data: tierCustomers = [] } = useQuery<CustomerData[]>({
    queryKey: ['/api/customers/by-role', selectedPricingTier],
    queryFn: async () => {
      if (selectedPricingTier === 'MRP') return [];
      const res = await fetch(`/api/customers/by-role?pricingRole=${encodeURIComponent(selectedPricingTier)}`);
      return res.json();
    },
    enabled: (saleType === 'restock' || saleType === 'mobile') && selectedPricingTier !== 'MRP',
  });

  // Handle customer selection
  const selectCustomer = (customer: CustomerData) => {
    setSelectedCustomer(customer);
    setCustomerSearch('');
    setShowCustomerDropdown(false);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerSearch('');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: menuItemsData, isLoading } = useQuery<MenuItemData[]>({
    queryKey: ["/api/menu-items"],
  });

  const menuItems = menuItemsData || [];

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSegment = activeTab === 'fresh-milk' 
      ? item.productSegment === 'Fresh Milk'
      : item.productSegment === 'Products' || !item.productSegment;
    return matchesSearch && matchesSegment && (item.isAvailable !== false);
  });

  const getItemPrice = (item: MenuItemData): number => {
    if (saleType === 'counter') {
      return parseFloat(item.mrp || item.price || '0');
    }
    
    // Use selected pricing tier for restock and mobile sales
    const calculatedPrice = calculatePriceForRole(item, selectedPricingTier);
    return parseFloat(calculatedPrice.toFixed(2));
  };

  const addToCart = (item: MenuItemData) => {
    const pricePerUnit = getItemPrice(item);
    
    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id);
      if (existing) {
        return prev.map(c => 
          c.item.id === item.id 
            ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * pricePerUnit }
            : c
        );
      }
      return [...prev, { item, quantity: 1, pricePerUnit, total: pricePerUnit }];
    });
  };

  const updateQuantity = (itemId: number, delta: number) => {
    setCart(prev => {
      return prev.map(c => {
        if (c.item.id === itemId) {
          const newQty = Math.max(0, c.quantity + delta);
          if (newQty === 0) return null;
          return { ...c, quantity: newQty, total: newQty * c.pricePerUnit };
        }
        return c;
      }).filter((c): c is CartItem => c !== null);
    });
  };

  const removeFromCart = (itemId: number) => {
    setCart(prev => prev.filter(c => c.item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.total, 0);
  const cartItemCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const createOrderMutation = useMutation({
    mutationFn: async (paymentMethod: 'cash' | 'card' | 'upi' | 'credit') => {
      const restaurantId = user?.unionId;
      if (!restaurantId) {
        throw new Error('No union assigned to your account. Please contact admin.');
      }
      const segmentSet = new Set(cart.map(c => c.item.productSegment || 'Products'));
      const segments = Array.from(segmentSet);
      const primarySegment = segments.length === 1 ? segments[0] : 'Mixed';
      
      // Determine delivery address based on sale type
      let deliveryAddress = 'Counter Pickup';
      if (saleType === 'mobile' && mobileLocation) {
        deliveryAddress = `Mobile Sale @ ${mobileLocation.lat.toFixed(6)}, ${mobileLocation.lng.toFixed(6)}`;
      }
      
      const orderData = {
        restaurantId,
        customerName: selectedCustomer?.name || 'Walk-in Customer',
        customerEmail: selectedCustomer?.email || 'pos@aavincart.com',
        customerPhone: selectedCustomer?.phone || '0000000000',
        customerId: selectedCustomer?.id || null,
        deliveryAddress,
        isCredit: paymentMethod === 'credit',
        items: cart.map(c => ({
          itemId: c.item.id,
          name: c.item.name,
          price: String(c.pricePerUnit),
          quantity: c.quantity,
          productSegment: c.item.productSegment || 'Products',
        })),
        subtotal: String(cartTotal.toFixed(2)),
        deliveryFee: '0.00',
        tax: '0.00',
        total: String(cartTotal.toFixed(2)),
        status: paymentMethod === 'credit' ? 'confirmed' : 'completed',
        paymentMethod,
        orderType: saleType === 'counter' ? 'pickup' : saleType === 'mobile' ? 'mobile' : 'delivery',
        pricingRole: saleType === 'counter' ? 'MRP' : selectedPricingTier,
        productSegment: primarySegment,
        // Mobile sale specific data
        ...(saleType === 'mobile' && {
          isMobileSale: true,
          agentId: selectedAgent?.id,
          agentName: selectedAgent?.name,
          gpsLocation: mobileLocation,
        }),
      };
      return await apiRequest('POST', '/api/orders', orderData);
    },
    onSuccess: () => {
      toast({
        title: "Order completed",
        description: `₹${cartTotal.toFixed(2)} - Payment successful`,
      });
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    },
    onError: (error) => {
      toast({
        title: "Order failed",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const handlePayment = async (method: 'cash' | 'card' | 'upi' | 'credit') => {
    if (cart.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Add items to cart before checkout",
        variant: "destructive",
      });
      return;
    }
    
    // Validate mobile sale requirements
    if (saleType === 'mobile') {
      if (!selectedAgent) {
        toast({
          title: "Agent required",
          description: "Please select a delivery agent for mobile sale",
          variant: "destructive",
        });
        return;
      }
      if (!mobileLocation) {
        toast({
          title: "Location required",
          description: "Please capture GPS location for mobile sale",
          variant: "destructive",
        });
        return;
      }
    }

    setIsProcessing(true);
    try {
      await createOrderMutation.mutateAsync(method);
    } finally {
      setIsProcessing(false);
    }
  };

  const { data: softposTerminals = [] } = useQuery<any[]>({
    queryKey: ["/api/cashfree/softpos/terminals"],
  });

  const activeTerminals = softposTerminals.filter((t: any) => t.status === "ACTIVE");

  const handleSoftPOSPayment = async () => {
    if (cart.length === 0) {
      toast({ title: "Cart is empty", description: "Add items to cart before checkout", variant: "destructive" });
      return;
    }
    if (!isAndroid) {
      setShowSoftPOSDialog(true);
      return;
    }
    if (activeTerminals.length === 0) {
      toast({ title: "No active terminals", description: "No SoftPOS terminals available. Ask admin to register one.", variant: "destructive" });
      return;
    }
    setShowSoftPOSDialog(true);
    setSoftPOSStatus('idle');
    try {
      const res = await apiRequest("POST", "/api/cashfree/softpos/orders", {
        amount: cartTotal,
        terminalId: activeTerminals[0].terminalId,
        customerName: selectedCustomer?.name || "Walk-in Customer",
        customerPhone: selectedCustomer?.phone || "",
      });
      const data = await res.json();
      setSoftPOSOrderId(data.id);
      setSoftPOSStatus('created');

      if (isAndroid && data.intentUrl) {
        window.location.href = data.intentUrl;
      }

      setSoftPOSStatus('polling');
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await apiRequest("GET", `/api/cashfree/softpos/orders/${data.id}/status`);
          const statusData = await statusRes.json();
          if (statusData.status === "PAID") {
            clearInterval(pollInterval);
            setSoftPOSStatus('success');
            await createOrderMutation.mutateAsync('card');
            setShowSoftPOSDialog(false);
            setSoftPOSStatus('idle');
          } else if (statusData.status === "FAILED" || statusData.status === "EXPIRED") {
            clearInterval(pollInterval);
            setSoftPOSStatus('failed');
          }
        } catch {
          // continue polling
        }
      }, 3000);
      setSoftPOSPollingRef(pollInterval);

      setTimeout(() => {
        clearInterval(pollInterval);
        setSoftPOSStatus((prev) => (prev === 'polling' ? 'failed' : prev));
      }, 120000);
    } catch (error: any) {
      setSoftPOSStatus('failed');
      toast({ title: "SoftPOS error", description: error.message || "Failed to create SoftPOS order", variant: "destructive" });
    }
  };

  const cancelSoftPOSPolling = () => {
    if (softPOSPollingRef) clearInterval(softPOSPollingRef);
    setSoftPOSStatus('idle');
    setSoftPOSOrderId(null);
    setShowSoftPOSDialog(false);
  };

  useEffect(() => {
    setCart(prev => prev.map(c => ({
      ...c,
      pricePerUnit: getItemPrice(c.item),
      total: c.quantity * getItemPrice(c.item),
    })));
  }, [saleType, selectedPricingTier]);

  const getPricingRoleDisplay = () => {
    if (!user?.pricingRole) return 'MRP';
    const roleMap: Record<string, string> = {
      'FEDERATION': 'Federation (45%)',
      'INTER_UNION': 'Inter-Union (55%)',
      'WHOLESALE_DEALER': 'WSD (65%)',
      'DEALER': 'Dealer (85%)',
      'RETAILER': 'Retailer (90%)',
      'MRP': 'MRP (100%)',
    };
    return roleMap[user.pricingRole] || user.pricingRole;
  };

  const handleBarcodeSearch = (value: string) => {
    if (!value.trim()) return;
    const query = value.trim().toLowerCase();
    const matched = menuItems.find(item =>
      item.name.toLowerCase().includes(query) ||
      String(item.id) === query ||
      (item as any).hsnCode?.toLowerCase() === query
    );
    if (matched) {
      addToCart(matched);
      toast({ title: "Product found", description: `${matched.name} added to cart` });
    } else {
      setSearchQuery(value.trim());
      toast({ title: "No exact match", description: "Showing search results instead", variant: "destructive" });
    }
    setBarcodeInput('');
    setShowBarcodeDialog(false);
  };

  const handleBarcodeInputChange = (value: string) => {
    setBarcodeInput(value);
    if (barcodeDebounceRef.current) clearTimeout(barcodeDebounceRef.current);
    if (value.length >= 3) {
      barcodeDebounceRef.current = setTimeout(() => handleBarcodeSearch(value), 800);
    }
  };

  const startVoiceSearch = () => {
    if (!SpeechRecognition) {
      toast({ title: "Not supported", description: "Voice search is not supported in this browser", variant: "destructive" });
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-IN';
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => {
      setIsListening(false);
      toast({ title: "Voice error", description: "Could not recognize speech. Please try again.", variant: "destructive" });
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopVoiceSearch = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleDeliveryConfirm = () => {
    if (!deliveryConfirmCode.trim()) {
      toast({ title: "Code required", description: "Please enter the delivery confirmation code", variant: "destructive" });
      return;
    }
    setDeliveryConfirmed(true);
    toast({ title: "Delivery confirmed", description: `Order confirmed with code: ${deliveryConfirmCode}` });
    setTimeout(() => {
      setShowDeliveryConfirmDialog(false);
      setDeliveryConfirmCode('');
      setDeliveryConfirmed(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-primary text-primary-foreground p-4 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Store className="h-8 w-8" />
            <div>
              <h1 className="text-xl font-bold">Aavin POS</h1>
              <p className="text-sm text-primary-foreground/80">Point of Sale System</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm">{user?.name || 'Staff'}</p>
              <p className="text-xs text-primary-foreground/80">{getPricingRoleDisplay()}</p>
            </div>
            <User className="h-6 w-6" />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-2 sm:p-4">
        <div className="mb-3 sm:mb-4 flex flex-wrap gap-2 sm:gap-4 items-center">
          <div className="bg-white rounded-lg p-1.5 sm:p-2 flex gap-1 sm:gap-2 w-full sm:w-auto">
            {canAccessCounterSale && (
              <Button
                variant={saleType === 'counter' ? 'default' : 'ghost'}
                onClick={() => {
                  setSaleType('counter');
                  setSelectedPricingTier('MRP');
                }}
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-none min-h-[40px]"
              >
                <User className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Counter Sale (MRP)</span>
                <span className="sm:hidden">Counter</span>
              </Button>
            )}
            {allowedPricingTiers.some(t => t.value !== 'MRP') && (
              <Button
                variant={saleType === 'restock' ? 'default' : 'ghost'}
                onClick={() => {
                  setSaleType('restock');
                  const firstB2BTier = allowedPricingTiers.find(t => t.value !== 'MRP');
                  if (firstB2BTier) setSelectedPricingTier(firstB2BTier.value);
                }}
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-none min-h-[40px]"
              >
                <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">B2B Sale</span>
                <span className="sm:hidden">B2B</span>
              </Button>
            )}
            {canAccessMobileSale && allowedPricingTiers.some(t => t.value !== 'MRP') && (
              <Button
                variant={saleType === 'mobile' ? 'default' : 'ghost'}
                onClick={() => {
                  setSaleType('mobile');
                  const firstB2BTier = allowedPricingTiers.find(t => t.value !== 'MRP');
                  if (firstB2BTier) setSelectedPricingTier(firstB2BTier.value);
                }}
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-none min-h-[40px] bg-green-600 hover:bg-green-700 text-white"
              >
                <Truck className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Mobile Sale</span>
                <span className="sm:hidden">Mobile</span>
              </Button>
            )}
          </div>
          
          {(saleType === 'restock' || saleType === 'mobile') && (
            <div className="flex items-center gap-2 bg-white rounded-lg p-1.5 sm:p-2 w-full sm:w-auto">
              <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">Pricing Tier:</span>
              <Select value={selectedPricingTier} onValueChange={setSelectedPricingTier}>
                <SelectTrigger className="w-full sm:w-[180px] text-xs sm:text-sm min-h-[40px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowedPricingTiers.filter(t => t.value !== 'MRP').map(tier => (
                    <SelectItem key={tier.value} value={tier.value}>
                      {tier.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Mobile Sale: Agent Selection and GPS */}
          {saleType === 'mobile' && (
            <div className="flex items-center gap-2 bg-green-50 rounded-lg p-1.5 sm:p-2 w-full sm:w-auto border border-green-200">
              <Truck className="h-4 w-4 text-green-600" />
              <Select 
                value={selectedAgent?.id || ''} 
                onValueChange={(agentId) => {
                  const agent = deliveryAgents.find(a => a.id === agentId);
                  setSelectedAgent(agent || null);
                }}
              >
                <SelectTrigger className="w-full sm:w-[180px] text-xs sm:text-sm min-h-[40px] bg-white">
                  <SelectValue placeholder="Select Agent/Driver" />
                </SelectTrigger>
                <SelectContent>
                  {deliveryAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                  {deliveryAgents.length === 0 && (
                    <SelectItem value="self" disabled>No agents available</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={captureLocation}
                disabled={isCapturingLocation}
                className={`min-h-[40px] ${mobileLocation ? 'bg-green-100 border-green-400' : ''}`}
              >
                {isCapturingLocation ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4" />
                )}
                <span className="hidden sm:inline ml-1">
                  {mobileLocation ? 'GPS ✓' : 'Capture GPS'}
                </span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDeliveryConfirmCode('');
                  setDeliveryConfirmed(false);
                  setShowDeliveryConfirmDialog(true);
                }}
                className="min-h-[40px] border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <QrCode className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Confirm Delivery</span>
              </Button>
            </div>
          )}
          
          <Badge variant={saleType === 'counter' ? 'secondary' : 'default'} className="text-sm sm:text-lg px-2 sm:px-4 py-1 sm:py-2 hidden sm:flex">
            {saleType === 'counter' ? 'MRP Pricing' : `${PRICING_TIERS.find(t => t.value === selectedPricingTier)?.label || 'MRP'} Pricing`}
          </Badge>
        </div>

        {/* Customer Search */}
        <div className="mb-4" ref={customerSearchRef}>
          <Card className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <User className="h-5 w-5 text-muted-foreground" />
              {selectedCustomer ? (
                <div className={`flex items-center justify-between flex-1 rounded-lg p-3 border ${selectedCustomer.isInstitution ? 'bg-purple-50 border-purple-200' : 'bg-green-50 border-green-200'}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`font-medium ${selectedCustomer.isInstitution ? 'text-purple-900' : 'text-green-900'}`}>{selectedCustomer.name}</p>
                      {selectedCustomer.isInstitution && (
                        <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300 text-xs">
                          Institution {selectedCustomer.institutionType && `• ${selectedCustomer.institutionType}`}
                        </Badge>
                      )}
                    </div>
                    <p className={`text-sm ${selectedCustomer.isInstitution ? 'text-purple-700' : 'text-green-700'}`}>
                      {selectedCustomer.phone} • {selectedCustomer.email}
                      {selectedCustomer.pricingRole && ` • ${selectedCustomer.pricingRole}`}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearCustomer}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  {/* Show existing customers dropdown for B2B and Mobile sales */}
                  {(saleType === 'restock' || saleType === 'mobile') && selectedPricingTier !== 'MRP' && tierCustomers.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Select onValueChange={(customerId) => {
                        const customer = tierCustomers.find(c => c.id === customerId);
                        if (customer) selectCustomer(customer);
                      }}>
                        <SelectTrigger className="w-[220px] bg-blue-50 border-blue-200">
                          <SelectValue placeholder={`Select ${PRICING_TIERS.find(t => t.value === selectedPricingTier)?.label || 'Customer'}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {tierCustomers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{customer.name}</span>
                                <span className="text-xs text-muted-foreground">{customer.phone}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">or</span>
                    </div>
                  )}
                  <div className="flex-1 relative min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search customer by name, phone, or ID..."
                        value={customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          setShowCustomerDropdown(true);
                        }}
                        onFocus={() => setShowCustomerDropdown(true)}
                        className="pl-10"
                      />
                    </div>
                    {showCustomerDropdown && searchResults.length > 0 && (
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
                    {showCustomerDropdown && customerSearch.length >= 2 && searchResults.length === 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 p-4 text-center text-muted-foreground">
                        No customers found
                      </div>
                    )}
                  </div>
                </>
              )}
              {!selectedCustomer && saleType === 'counter' && (
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  or continue as Walk-in
                </span>
              )}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            <Card>
              <CardHeader className="pb-2 px-3 sm:px-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'fresh-milk' | 'products')}>
                    <TabsList className="h-9 sm:h-10">
                      <TabsTrigger value="fresh-milk" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                        <Milk className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Fresh Milk</span>
                        <span className="sm:hidden">Milk</span>
                      </TabsTrigger>
                      <TabsTrigger value="products" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                        <Package className="h-3 w-3 sm:h-4 sm:w-4" />
                        Products
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-52">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-9 sm:h-10 text-sm"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 sm:h-10 sm:w-10 shrink-0"
                      onClick={() => {
                        setShowBarcodeDialog(true);
                        setTimeout(() => barcodeInputRef.current?.focus(), 100);
                      }}
                      title="Barcode Scanner"
                    >
                      <Scan className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={isListening ? "destructive" : "outline"}
                      size="icon"
                      className={`h-9 w-9 sm:h-10 sm:w-10 shrink-0 ${isListening ? 'animate-pulse' : ''}`}
                      onClick={isListening ? stopVoiceSearch : startVoiceSearch}
                      title={isListening ? "Stop listening" : "Voice Search"}
                    >
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                {isLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="h-24 sm:h-32 bg-gray-200 animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto pb-20 lg:pb-0">
                    {filteredItems.map(item => (
                      <button
                        key={item.id}
                        onClick={() => addToCart(item)}
                        className="p-2 sm:p-4 bg-white border-2 rounded-lg hover:border-primary hover:shadow-md transition-all text-left group active:scale-95 touch-target"
                      >
                        <div className="flex flex-col h-full">
                          <p className="font-medium text-xs sm:text-sm mb-1 line-clamp-2">{item.name}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-2 line-clamp-1">{item.category}</p>
                          <div className="mt-auto flex justify-between items-center">
                            <span className="font-bold text-primary text-sm sm:text-base">
                              ₹{getItemPrice(item).toFixed(2)}
                            </span>
                            <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Mobile Cart FAB */}
          <button
            onClick={() => setShowMobileCart(true)}
            className="lg:hidden fixed bottom-4 right-4 z-40 bg-primary text-white rounded-full w-16 h-16 shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          >
            <div className="relative">
              <ShoppingCart className="h-6 w-6" />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </div>
          </button>

          {/* Mobile Cart Overlay */}
          {showMobileCart && (
            <div 
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowMobileCart(false)}
            />
          )}

          {/* Cart - Desktop sidebar / Mobile bottom sheet */}
          <div className={`
            lg:space-y-4 
            ${showMobileCart ? 'fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[85vh] overflow-hidden' : 'hidden lg:block'}
          `}>
            <Card className="sticky top-4 border-0 lg:border shadow-none lg:shadow-sm">
              <CardHeader className="bg-primary text-primary-foreground rounded-t-lg lg:rounded-t-lg rounded-t-2xl">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Cart
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{cartItemCount} items</Badge>
                    <button 
                      onClick={() => setShowMobileCart(false)}
                      className="lg:hidden p-1 hover:bg-white/20 rounded"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[35vh] lg:max-h-[40vh] overflow-y-auto">
                  {cart.length === 0 ? (
                    <div className="p-6 sm:p-8 text-center text-muted-foreground">
                      <ShoppingCart className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-gray-300" />
                      <p className="text-sm sm:text-base">Cart is empty</p>
                      <p className="text-xs sm:text-sm">Add items to start</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {cart.map(({ item, quantity, pricePerUnit, total }) => (
                        <div key={item.id} className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs sm:text-sm line-clamp-1">{item.name}</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">
                              ₹{pricePerUnit.toFixed(2)} × {quantity}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 sm:h-8 sm:w-8"
                              onClick={() => updateQuantity(item.id, -1)}
                            >
                              <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            <span className="w-6 sm:w-8 text-center font-medium text-sm">{quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 sm:h-8 sm:w-8"
                              onClick={() => updateQuantity(item.id, 1)}
                            >
                              <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                          <div className="w-16 sm:w-20 text-right">
                            <p className="font-medium text-sm">₹{total.toFixed(2)}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8 text-destructive"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {cart.length > 0 && (
                  <div className="border-t p-3 sm:p-4 space-y-3 sm:space-y-4 safe-area-bottom">
                    <div className="flex justify-between items-center text-sm sm:text-base">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">₹{cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-base sm:text-lg">
                      <span className="font-bold">Total</span>
                      <span className="font-bold text-primary">₹{cartTotal.toFixed(2)}</span>
                    </div>

                    <div className={`grid gap-1.5 sm:gap-2 ${isCreditAllowed ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
                      <Button
                        onClick={() => handlePayment('cash')}
                        disabled={isProcessing}
                        className="flex flex-col items-center gap-0.5 sm:gap-1 h-auto py-2 sm:py-3 min-h-[52px]"
                      >
                        <Banknote className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="text-[10px] sm:text-xs">Cash</span>
                      </Button>
                      <Button
                        onClick={() => handlePayment('card')}
                        disabled={isProcessing}
                        variant="secondary"
                        className="flex flex-col items-center gap-0.5 sm:gap-1 h-auto py-2 sm:py-3 min-h-[52px]"
                      >
                        <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="text-[10px] sm:text-xs">Card</span>
                      </Button>
                      <Button
                        onClick={() => handlePayment('upi')}
                        disabled={isProcessing}
                        variant="outline"
                        className="flex flex-col items-center gap-0.5 sm:gap-1 h-auto py-2 sm:py-3 min-h-[52px]"
                      >
                        <Receipt className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="text-[10px] sm:text-xs">UPI</span>
                      </Button>
                      {/* SoftPOS (Cashfree) hidden until re-enabled */}
                      {isCreditAllowed && (
                        <Button
                          onClick={() => handlePayment('credit')}
                          disabled={isProcessing || !selectedCustomer}
                          variant="outline"
                          className="flex flex-col items-center gap-0.5 sm:gap-1 h-auto py-2 sm:py-3 min-h-[52px] border-orange-300 text-orange-600 hover:bg-orange-50"
                          title={!selectedCustomer ? 'Select a customer to use Credit' : 'Pay on Credit'}
                        >
                          <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
                          <span className="text-[10px] sm:text-xs">Credit</span>
                        </Button>
                      )}
                    </div>
                    {isCreditAllowed && !selectedCustomer && (
                      <p className="text-[10px] sm:text-xs text-orange-600 text-center">Select a customer above to enable Credit payment</p>
                    )}

                    <Button
                      variant="ghost"
                      onClick={clearCart}
                      className="w-full text-destructive text-sm"
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                      Clear Cart
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="hidden lg:block">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Sale Type</p>
                  <Badge variant={saleType === 'counter' ? 'default' : saleType === 'mobile' ? 'outline' : 'secondary'} className={`text-sm ${saleType === 'mobile' ? 'bg-green-100 border-green-400 text-green-800' : ''}`}>
                    {saleType === 'counter' ? 'Counter Sale @ MRP' : saleType === 'mobile' ? 'Mobile Sale @ ' + getPricingRoleDisplay() : 'Restock @ ' + getPricingRoleDisplay()}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={showBarcodeDialog} onOpenChange={setShowBarcodeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5" />
              Barcode / Product Search
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Scan a barcode or type a product name, ID, or HSN code
            </p>
            <Input
              ref={barcodeInputRef}
              placeholder="Scan barcode or enter product code..."
              value={barcodeInput}
              onChange={(e) => handleBarcodeInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (barcodeDebounceRef.current) clearTimeout(barcodeDebounceRef.current);
                  handleBarcodeSearch(barcodeInput);
                }
              }}
              className="text-lg h-12"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBarcodeDialog(false)}>Cancel</Button>
            <Button onClick={() => handleBarcodeSearch(barcodeInput)}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeliveryConfirmDialog} onOpenChange={setShowDeliveryConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Confirm Delivery
            </DialogTitle>
          </DialogHeader>
          {deliveryConfirmed ? (
            <div className="py-8 text-center space-y-3">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <p className="text-lg font-medium text-green-700">Delivery Confirmed!</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Scan the QR code or enter the order ID / delivery confirmation code
              </p>
              <Input
                placeholder="Enter order ID or confirmation code..."
                value={deliveryConfirmCode}
                onChange={(e) => setDeliveryConfirmCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleDeliveryConfirm();
                }}
                className="text-lg h-12"
                autoFocus
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDeliveryConfirmDialog(false)}>Cancel</Button>
                <Button onClick={handleDeliveryConfirm} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Delivery
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showSoftPOSDialog} onOpenChange={(open) => { if (!open) cancelSoftPOSPolling(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-purple-600" />
              Cashfree SoftPOS Payment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!isAndroid ? (
              <div className="text-center space-y-3">
                <AlertTriangle className="h-12 w-12 mx-auto text-amber-500" />
                <p className="font-medium text-amber-800">Android Only</p>
                <p className="text-sm text-muted-foreground">
                  Cashfree SoftPOS requires an Android device with the Cashfree SoftPOS app installed and NFC capability. 
                  This feature is not available on your current device.
                </p>
              </div>
            ) : softPOSStatus === 'idle' || softPOSStatus === 'created' ? (
              <div className="text-center space-y-3">
                <Loader2 className="h-10 w-10 mx-auto animate-spin text-purple-600" />
                <p className="text-sm text-muted-foreground">Creating SoftPOS payment order...</p>
                <p className="text-lg font-bold">₹{cartTotal.toFixed(2)}</p>
              </div>
            ) : softPOSStatus === 'polling' ? (
              <div className="text-center space-y-3">
                <Loader2 className="h-10 w-10 mx-auto animate-spin text-purple-600" />
                <p className="font-medium">Waiting for card payment...</p>
                <p className="text-sm text-muted-foreground">
                  Complete the payment on the Cashfree SoftPOS app. This dialog will update automatically.
                </p>
                <p className="text-lg font-bold">₹{cartTotal.toFixed(2)}</p>
                {softPOSOrderId && (
                  <p className="text-xs text-muted-foreground font-mono">Order: {softPOSOrderId}</p>
                )}
              </div>
            ) : softPOSStatus === 'success' ? (
              <div className="text-center space-y-3">
                <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
                <p className="font-medium text-green-800">Payment Successful!</p>
                <p className="text-lg font-bold">₹{cartTotal.toFixed(2)}</p>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <AlertTriangle className="h-12 w-12 mx-auto text-red-500" />
                <p className="font-medium text-red-800">Payment Failed or Timed Out</p>
                <p className="text-sm text-muted-foreground">
                  The SoftPOS payment was not completed. Please try again or use a different payment method.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cancelSoftPOSPolling}>
              {softPOSStatus === 'success' ? 'Close' : 'Cancel'}
            </Button>
            {softPOSStatus === 'failed' && (
              <Button onClick={handleSoftPOSPayment} className="bg-purple-600 hover:bg-purple-700">
                Retry
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
