import { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useCartStore } from '@/lib/store';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { CartItem } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { ArrowLeft, CreditCard, Truck, Loader2, CheckCircle, ShieldCheck, Banknote, Package, MapPin, RefreshCw, Wallet, Phone, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { SiRazorpay } from 'react-icons/si';
import { useAuth } from '@/lib/auth-context';
import { Badge } from '@/components/ui/badge';
import AddressInput from '@/components/address-input';

declare global {
  interface Window {
    Razorpay: any;
    Cashfree: any;
  }
}

interface RazorpayConfig {
  keyId: string;
  currency: string;
  name: string;
  description: string;
  theme: {
    color: string;
  };
}

interface CashfreeConfig {
  available: boolean;
  active: boolean;
  environment: string;
}

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { items, clearCart, getTotal } = useCartStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(''); // Default set dynamically based on available methods
  const [shippingMethod, setShippingMethod] = useState<'local' | 'delhivery'>('local');
  const [delhiveryCost, setDelhiveryCost] = useState<number | null>(null);
  const [checkingPincode, setCheckingPincode] = useState(false);
  const [pincodeServiceable, setPincodeServiceable] = useState<boolean | null>(null);
  
  const [selectedAddressType, setSelectedAddressType] = useState('');
  const [mobileOrderSummaryOpen, setMobileOrderSummaryOpen] = useState(false);
  const orderPayloadSnapshotRef = useRef<any>(null);

  const { data: deliveryPoints } = useQuery<any[]>({
    queryKey: ['/api/auth/delivery-points'],
    enabled: !!user,
  });

  const savedAddresses = (() => {
    const addresses: { type: string; label: string; address: string; phone: string; icon: string; details: string; pincode?: string; pointId?: string; pointName?: string; pointRoute?: string }[] = [];
    if (deliveryPoints && deliveryPoints.length > 0) {
      deliveryPoints.forEach((dp: any) => {
        const labelIcons: Record<string, string> = { Home: '🏠', Work: '🏢', Office: '🏢', Other: '📍' };
        addresses.push({
          type: `dp-${dp.id}`,
          label: dp.pointName || 'Address',
          address: dp.deliveryAddress || '',
          phone: dp.contactPhone || user?.phone || '',
          icon: labelIcons[dp.pointName] || '📍',
          details: dp.isDefault ? 'Default' : '',
          pointId: dp.businessId || '',
          pointName: dp.pointName || '',
          pointRoute: dp.route || '',
        });
      });
    }
    if (user?.address && !addresses.some(a => a.address === user.address)) {
      addresses.unshift({
        type: 'profile',
        label: user.agentCode ? 'Agent Point' : 'Primary',
        address: user.address,
        phone: user.phone || '',
        icon: user.agentCode ? '📍' : '🏠',
        details: user.agentCode ? `Agent: ${user.agentCode}` : 'Profile',
      });
    }
    return addresses;
  })();

  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    deliveryInstructions: '',
    pointCode: '',
    pointName: '',
    pointRoute: ''
  });

  // Track which fields have errors
  const [fieldErrors, setFieldErrors] = useState<{name?: boolean; email?: boolean; phone?: boolean; address?: boolean}>({});

  const userIdRef = useRef<number | null>(null);
  const prevAddressTypeRef = useRef<string>(selectedAddressType);

  useEffect(() => {
    if (user) {
      const isNewUser = userIdRef.current !== user.id;
      const addressTypeChanged = prevAddressTypeRef.current !== selectedAddressType;
      userIdRef.current = user.id;
      prevAddressTypeRef.current = selectedAddressType;

      if (isNewUser || addressTypeChanged) {
        const selected = savedAddresses.find(a => a.type === selectedAddressType);
        setCustomerInfo(prev => ({
          ...prev,
          name: user.name || prev.name,
          email: user.email || prev.email,
          phone: selected?.phone || user.phone || prev.phone,
          address: selected?.address || prev.address,
          ...(isNewUser || addressTypeChanged ? {
            pointCode: (selected as any)?.pointId || (user as any).pointCode || (user as any).agentCode || prev.pointCode,
            pointName: (selected as any)?.pointName || (user as any).pointName || prev.pointName,
            pointRoute: (selected as any)?.pointRoute || (user as any).pointRoute || (user as any).routeName || prev.pointRoute
          } : {}),
        }));
      }
    }
  }, [user, selectedAddressType, savedAddresses.length]);
  
  useEffect(() => {
    if (user && savedAddresses.length > 0 && !selectedAddressType) {
      const defaultAddr = savedAddresses.find(a => a.details === 'Default') || savedAddresses[0];
      setSelectedAddressType(defaultAddr.type);
      setCustomerInfo(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        phone: defaultAddr.phone || user.phone || '',
        address: defaultAddr.address || '',
        pointCode: (defaultAddr as any).pointId || '',
        pointName: (defaultAddr as any).pointName || '',
        pointRoute: (defaultAddr as any).pointRoute || '',
      }));
    }
  }, [user, savedAddresses.length]);

  const { data: razorpayConfig, isLoading: configLoading } = useQuery<RazorpayConfig>({
    queryKey: ['/api/razorpay/config']
  });

  const { data: cashfreeConfig } = useQuery<CashfreeConfig>({
    queryKey: ['/api/cashfree/config']
  });

  const checkoutMerchantId = items[0]?.restaurantId || '';
  const { data: paymentMethods } = useQuery<{ razorpay: boolean; cashfree: boolean; sbi: boolean; cod: boolean }>({
    queryKey: [`/api/payment-methods?merchantId=${encodeURIComponent(checkoutMerchantId)}`],
  });

  useEffect(() => {
    if (paymentMethods && !paymentMethod) {
      if (paymentMethods.razorpay) setPaymentMethod('razorpay');
      else if (paymentMethods.cashfree) setPaymentMethod('cashfree');
      else if (paymentMethods.sbi) setPaymentMethod('sbi');
      else if (paymentMethods.cod) setPaymentMethod('cod');
    }
  }, [paymentMethods, paymentMethod]);

  const isRazorpayActive = paymentMethods?.razorpay === true;
  const isCashfreeActive = paymentMethods?.cashfree === true || cashfreeConfig?.active === true;

  const { data: walletData } = useQuery<{ balance: string }>({
    queryKey: ['/api/wallet', user?.id],
    enabled: !!user,
  });
  const walletBalance = parseFloat(walletData?.balance || '0');
  const hasWalletBalance = walletBalance > 0;

  useEffect(() => {
    const rzpScript = document.createElement('script');
    rzpScript.src = 'https://checkout.razorpay.com/v1/checkout.js';
    rzpScript.async = true;
    document.body.appendChild(rzpScript);

    const cfScript = document.createElement('script');
    cfScript.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    cfScript.async = true;
    document.body.appendChild(cfScript);

    return () => {
      document.body.removeChild(rzpScript);
      if (document.body.contains(cfScript)) document.body.removeChild(cfScript);
    };
  }, []);

  const subtotal = items.reduce((sum: number, item: CartItem) => sum + parseFloat(item.price) * item.quantity, 0);
  // Delivery fee only for consumers (MRP pricing role), free for all other roles
  const isConsumer = !user || user.pricingRole === 'MRP';
  const isB2B = user && user.pricingRole && user.pricingRole !== 'MRP';
  const hasFreshMilk = items.some((item: CartItem) => (item.productSegment || '').toLowerCase().includes('fresh milk'));
  const [deliveryShift, setDeliveryShift] = useState<'morning' | 'evening'>('morning');
  const freshMilkCreditLimit = parseFloat((user as any)?.freshMilkCreditLimit || '0');
  const freshMilkCreditUsed = parseFloat((user as any)?.freshMilkCreditUsed || '0');
  const productsCreditLimit = parseFloat((user as any)?.productsCreditLimit || '0');
  const productsCreditUsed = parseFloat((user as any)?.productsCreditUsed || '0');
  const totalCreditAvailable = (freshMilkCreditLimit - freshMilkCreditUsed) + (productsCreditLimit - productsCreditUsed);
  const hasCreditAvailable = isB2B && totalCreditAvailable > 0;
  const deliveryFee = shippingMethod === 'delhivery' && delhiveryCost !== null ? delhiveryCost : 0;
  const gstBreakdown = items.reduce((acc: { taxableValue: number; gstAmount: number }, item: CartItem) => {
    const itemBillingPrice = parseFloat(item.price);
    const gstPct = parseFloat(item.gstPercent || '0');
    const itemTaxableValue = gstPct > 0 ? itemBillingPrice / (1 + gstPct / 100) : itemBillingPrice;
    const itemGst = itemBillingPrice - itemTaxableValue;
    return {
      taxableValue: acc.taxableValue + itemTaxableValue * item.quantity,
      gstAmount: acc.gstAmount + itemGst * item.quantity,
    };
  }, { taxableValue: 0, gstAmount: 0 });
  const tax = gstBreakdown.gstAmount;
  const total = subtotal + deliveryFee;

  // Check pincode serviceability for Delhivery (using public endpoint)
  const checkPincodeServiceability = async (pincode: string) => {
    if (pincode.length !== 6) return;
    setCheckingPincode(true);
    try {
      const response = await fetch(`/api/shipping/check-pincode/${pincode}`);
      if (response.ok) {
        const data = await response.json();
        setPincodeServiceable(data.serviceable === true);
        if (data.serviceable) {
          // Calculate shipping cost using public endpoint
          const costResponse = await fetch('/api/shipping/calculate-cost', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              originPincode: '636001', // Salem default
              destinationPincode: pincode,
              weight: Math.max(1, items.reduce((sum: number, item: CartItem) => sum + item.quantity * 0.5, 0)),
              paymentMode: paymentMethod === 'cod' ? 'COD' : 'Prepaid'
            })
          });
          const costData = await costResponse.json();
          if (costData.cost) {
            setDelhiveryCost(parseFloat(costData.cost) || 99);
          } else {
            setDelhiveryCost(99); // Default fallback
          }
        }
      } else {
        setPincodeServiceable(false);
      }
    } catch {
      setPincodeServiceable(false);
    }
    setCheckingPincode(false);
  };

  // Extract pincode from address
  const extractPincode = (address: string): string | null => {
    const match = address.match(/\b(\d{6})\b/);
    return match ? match[1] : null;
  };

  // Check pincode when address changes
  useEffect(() => {
    const pincode = extractPincode(customerInfo.address);
    if (pincode && shippingMethod === 'delhivery') {
      checkPincodeServiceability(pincode);
    }
  }, [customerInfo.address, shippingMethod]);

  const createOrderMutation = useMutation({
    mutationFn: async (): Promise<{ keyId: string; gatewayOrderId: string; amount: number; currency: string; merchantName: string; accountSource: string; paymentOrderId: string; internalOrderNo: string }> => {
      const merchantId = items[0]?.restaurantId || 'platform';
      const snapshot = buildOrderPayload('razorpay', 'paid', 'confirmed');
      const response = await apiRequest('POST', '/api/payments/create-order', {
        orderId: `order_${Date.now()}`,
        amount: total,
        merchantId,
        checkoutSource: 'web',
        paymentFor: 'order',
        cartSnapshot: snapshot,
      });
      const data = await response.json();
      if (!data.gatewayOrderId || !data.keyId) {
        throw new Error('Invalid response from payment server');
      }
      return data;
    },
    onError: (error: any) => {
      const msg = error.message || "";
      const isGatewayError = msg.toLowerCase().includes("gateway") || msg.toLowerCase().includes("not configured");
      toast({
        title: isGatewayError ? "Payment Not Available" : "Order Creation Failed",
        description: isGatewayError
          ? "Online payment is not available for this store right now. Please choose Cash on Delivery or contact the store."
          : msg || "Failed to create payment order. Please try again.",
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async (paymentData: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
      const snapshot = orderPayloadSnapshotRef.current;
      if (!snapshot || !snapshot.items || snapshot.items.length === 0) {
        throw new Error('Order data was lost. Please try again.');
      }

      // Step 1: Verify payment with Razorpay
      const verifyResponse = await apiRequest('POST', '/api/payments/verify', {
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature,
        orderId: snapshot.orderId || snapshot.restaurantId,
      });
      const verifyData = await verifyResponse.json();
      if (!verifyData.success && !verifyData.duplicate) {
        throw new Error(verifyData.error || 'Payment verification failed');
      }

      // Step 2: Create the order — only when this verify is the first to process the payment.
      // If duplicate=true the webhook already created the order from the cart snapshot;
      // creating it again here would produce a duplicate order.
      if (!verifyData.duplicate) {
        try {
          await apiRequest('POST', '/api/orders', snapshot);
        } catch (orderErr: any) {
          console.error('[Checkout] Order creation failed after successful payment:', orderErr);
          console.error('[Checkout] Payment ID:', paymentData.razorpay_payment_id, '| Order ID:', paymentData.razorpay_order_id);
          // Payment was captured — do not throw. Return a flag so onSuccess can show the right message.
          return { ...verifyData, orderCreationFailed: true };
        }
      }

      return verifyData;
    },
    onSuccess: (data) => {
      setPaymentSuccess(true);
      clearCart();
      localStorage.setItem('customerPhone', customerInfo.phone);
      if (data?.orderCreationFailed) {
        toast({
          title: "Payment Received — Order Processing",
          description: "Your payment was captured. Your order is being processed and will appear shortly. If it doesn't, please contact support with your payment ID.",
          variant: "default",
        });
      } else {
        toast({
          title: "Payment Successful!",
          description: data?.duplicate
            ? "Your payment was already verified. Order confirmed."
            : "Your order has been placed successfully. You will receive a confirmation shortly.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Payment Verification Failed",
        description: error.message || "Payment verification failed. Please contact support.",
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  });

  const buildOrderPayload = (paymentMethod: string, paymentStatus: string, orderStatus: string = 'pending') => ({
    restaurantId: items[0]?.restaurantId || '',
    items: items.map((item: CartItem) => ({
      itemId: item.id,
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      restaurantId: item.restaurantId,
      productSegment: item.productSegment || 'Products',
      category: item.productSegment || 'Products',
    })),
    total: total.toString(),
    subtotal: subtotal.toString(),
    deliveryFee: deliveryFee.toString(),
    tax: tax.toString(),
    status: orderStatus,
    customerName: user?.name || customerInfo.name,
    customerEmail: user?.email || customerInfo.email,
    customerPhone: customerInfo.phone || user?.phone || '',
    deliveryAddress: customerInfo.address,
    deliveryInstructions: customerInfo.deliveryInstructions,
    paymentMethod,
    paymentStatus,
    userId: user?.id,
    pricingRole: user?.pricingRole || 'MRP',
    shippingMethod: shippingMethod,
    shippingCost: shippingMethod === 'delhivery' ? delhiveryCost : 0,
    ...(isB2B ? {
      pointCode: customerInfo.pointCode,
      pointName: customerInfo.pointName,
      pointRoute: customerInfo.pointRoute
    } : {}),
    ...(isB2B ? { deliveryShift } : {}),
  });

  const codOrderMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/orders', buildOrderPayload('cod', 'pending'));
      return response.json();
    },
    onSuccess: () => {
      setPaymentSuccess(true);
      clearCart();
      localStorage.setItem('customerPhone', customerInfo.phone);
      toast({
        title: "Order Placed Successfully!",
        description: "Your Cash on Delivery order has been placed. Pay when you receive the delivery.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Order Failed",
        description: error.message || "Failed to place order. Please try again.",
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  });

  const creditOrderMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/orders', buildOrderPayload('credit', 'credit'));
      return response.json();
    },
    onSuccess: () => {
      setPaymentSuccess(true);
      clearCart();
      localStorage.setItem('customerPhone', customerInfo.phone);
      toast({
        title: "Order Placed on Credit!",
        description: `Your order has been placed on credit. Amount ₹${total.toFixed(2)} will be deducted from your credit limit.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Order Failed",
        description: error.message || "Failed to place credit order. Please try again.",
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  });

  const walletOrderMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/wallet/pay', {
        amount: total,
        orderId: `wallet-order-${Date.now()}`,
        description: `Order payment - ${items.length} items`
      });
      const response = await apiRequest('POST', '/api/orders', buildOrderPayload('wallet', 'paid', 'confirmed'));
      return response.json();
    },
    onSuccess: () => {
      setPaymentSuccess(true);
      clearCart();
      localStorage.setItem('customerPhone', customerInfo.phone);
      queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
      toast({
        title: "Order Placed Successfully!",
        description: `₹${total.toFixed(2)} deducted from your wallet. Remaining balance: ₹${(walletBalance - total).toFixed(2)}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Wallet Payment Failed",
        description: error.message || "Insufficient wallet balance or payment error.",
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  });


  const handlePayment = async () => {
    // Check each field and track errors
    const errors = {
      name: !customerInfo.name,
      email: !customerInfo.email,
      phone: !customerInfo.phone,
      address: !customerInfo.address
    };
    setFieldErrors(errors);
    
    if (errors.name || errors.email || errors.phone || errors.address) {
      const missingFields = [];
      if (errors.name) missingFields.push('Name');
      if (errors.email) missingFields.push('Email');
      if (errors.phone) missingFields.push('Phone Number');
      if (errors.address) missingFields.push('Address');
      
      toast({
        title: "Missing Information",
        description: `Please fill in: ${missingFields.join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    // B2B union guard: B2B users can only order from their registered union
    if (isB2B && user) {
      const registeredUnion = (user as any).restaurantId || (user as any).unionId;
      const cartUnion = items[0]?.restaurantId;
      if (registeredUnion && cartUnion && registeredUnion !== cartUnion) {
        const userUnionName = (user as any).unionName || registeredUnion;
        toast({
          title: "Wrong Union",
          description: `You are registered with ${userUnionName}. You can only place orders with your registered union.`,
          variant: "destructive"
        });
        return;
      }
    }

    setIsProcessing(true);

    // Validate Delhivery shipping if selected
    if (shippingMethod === 'delhivery') {
      if (pincodeServiceable === false) {
        toast({
          title: "Cannot Place Order",
          description: "Delhivery does not deliver to your pincode. Please select Local Delivery.",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }
      if (delhiveryCost === null) {
        toast({
          title: "Shipping Cost Unknown",
          description: "Please wait for shipping cost to be calculated or select Local Delivery.",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }
    }

    // Handle Cash on Delivery
    if (paymentMethod === 'cod') {
      codOrderMutation.mutate();
      return;
    }

    // Handle Credit payment
    if (paymentMethod === 'credit') {
      if (total > totalCreditAvailable) {
        toast({
          title: "Insufficient Credit",
          description: `Your available credit is ₹${totalCreditAvailable.toFixed(2)} but order total is ₹${total.toFixed(2)}. Please choose another payment method.`,
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }
      creditOrderMutation.mutate();
      return;
    }

    // Handle Wallet payment
    if (paymentMethod === 'wallet') {
      if (total > walletBalance) {
        toast({
          title: "Insufficient Wallet Balance",
          description: `Your wallet balance is ₹${walletBalance.toFixed(2)} but order total is ₹${total.toFixed(2)}. Please choose another payment method or top up your wallet.`,
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }
      walletOrderMutation.mutate();
      return;
    }

    // Handle Cashfree payment
    if (paymentMethod === 'cashfree') {
      if (!window.Cashfree) {
        toast({
          title: "Payment Not Ready",
          description: "Cashfree SDK is still loading. Please try again in a moment.",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }

      try {
        orderPayloadSnapshotRef.current = buildOrderPayload('cashfree', 'paid', 'confirmed');

        const cfResponse = await apiRequest('POST', '/api/cashfree/orders', {
          amount: total,
          customerName: customerInfo.name,
          customerEmail: customerInfo.email,
          customerPhone: customerInfo.phone,
        });
        const cfData = await cfResponse.json();

        if (!cfData.paymentSessionId) {
          throw new Error('Failed to get payment session');
        }

        const cfEnv = cashfreeConfig?.environment === 'production' ? 'production' : 'sandbox';
        const cashfree = new window.Cashfree({ mode: cfEnv });
        
        const checkoutOptions = {
          paymentSessionId: cfData.paymentSessionId,
          redirectTarget: "_modal",
        };

        cashfree.checkout(checkoutOptions).then(async (result: any) => {
          if (result.error) {
            toast({
              title: "Payment Failed",
              description: result.error.message || "Payment failed. Please try again.",
              variant: "destructive"
            });
            setIsProcessing(false);
            return;
          }
          if (result.paymentDetails) {
            try {
              const verifyRes = await apiRequest('POST', '/api/cashfree/verify', {
                cfOrderId: cfData.cfOrderId,
                orderData: orderPayloadSnapshotRef.current,
              });
              const verifyData = await verifyRes.json();
              if (verifyData.verified && verifyData.status === 'PAID') {
                setPaymentSuccess(true);
                clearCart();
                queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
                toast({
                  title: "Payment Successful!",
                  description: "Your order has been placed successfully.",
                });
              } else {
                toast({
                  title: "Payment Verification Pending",
                  description: "Your payment is being verified. Please check your orders.",
                });
              }
            } catch (verifyError) {
              toast({
                title: "Verification Error",
                description: "Payment received but verification encountered an issue. Check your orders.",
                variant: "destructive"
              });
            }
            setIsProcessing(false);
          }
        }).catch(() => {
          setIsProcessing(false);
        });
      } catch (error) {
        toast({
          title: "Payment Error",
          description: "Could not initiate Cashfree payment. Please try again.",
          variant: "destructive"
        });
        setIsProcessing(false);
      }
      return;
    }

    // Handle Razorpay payment
    if (!isRazorpayActive && !razorpayConfig?.keyId) {
      toast({
        title: "Payment Gateway Inactive",
        description: "Online payment is currently unavailable. Please try Cash on Delivery or contact support.",
        variant: "destructive"
      });
      setIsProcessing(false);
      return;
    }

    try {
      orderPayloadSnapshotRef.current = buildOrderPayload('razorpay', 'paid', 'confirmed');

      const orderData = await createOrderMutation.mutateAsync();
      
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: orderData.merchantName || razorpayConfig?.name || 'Aavin',
        description: razorpayConfig?.description || 'Order Payment',
        order_id: orderData.gatewayOrderId,
        handler: function (response: any) {
          verifyPaymentMutation.mutate({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          });
        },
        prefill: {
          name: customerInfo.name,
          email: customerInfo.email,
          contact: customerInfo.phone
        },
        notes: {
          address: customerInfo.address
        },
        theme: {
          color: razorpayConfig?.theme?.color || '#3399cc'
        },
        modal: {
          ondismiss: function() {
            setIsProcessing(false);
            toast({
              title: "Payment Cancelled",
              description: "You cancelled the payment. Your cart items are still saved.",
            });
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', function (response: any) {
        toast({
          title: "Payment Failed",
          description: response.error.description || "Payment failed. Please try again.",
          variant: "destructive"
        });
        setIsProcessing(false);
      });
      razorpay.open();
    } catch (error) {
      setIsProcessing(false);
    }
  };

  if (items.length === 0 && !paymentSuccess) {
    return (
      <div className="container mx-auto px-4 sm:px-4 py-8 sm:py-16 text-center">
        <div className="max-w-md mx-auto">
          <CreditCard className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl sm:text-2xl font-semibold mb-2">Your cart is empty</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-6">Add some items to your cart to proceed to checkout.</p>
          <Button onClick={() => setLocation('/unions')} className="bg-orange-500 hover:bg-orange-600 w-full sm:w-auto min-h-[44px]">
            Browse District Unions
          </Button>
        </div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="container mx-auto px-4 sm:px-4 py-8 sm:py-16 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 sm:h-12 sm:w-12 text-green-600" />
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-2">Order Placed Successfully!</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-6">
            Thank you for your order. We've sent a confirmation to {customerInfo.email}.
            Your dairy products will be delivered soon.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => setLocation('/orders')} variant="outline" className="w-full sm:w-auto min-h-[44px]">
              View Orders
            </Button>
            <Button onClick={() => setLocation('/')} className="bg-orange-500 hover:bg-orange-600 w-full sm:w-auto min-h-[44px]">
              Continue Shopping
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-32 sm:pb-8">
      <Button 
        variant="ghost" 
        onClick={() => setLocation('/unions')}
        className="mb-4 sm:mb-6 -ml-2"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        <span className="text-sm sm:text-base">Continue Shopping</span>
      </Button>

      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            {user ? (
              <>
                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-50 to-white border-b">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Delivering to</p>
                      <p className="text-xs text-gray-500">{user.name} • {user.pricingRole} Pricing</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">Logged in</Badge>
                </div>

                <div className="p-3 space-y-2">
                  {savedAddresses.map((addr) => (
                    <div
                      key={addr.type}
                      onClick={() => {
                        setSelectedAddressType(addr.type);
                        setCustomerInfo(prev => ({
                          ...prev,
                          address: addr.address,
                          phone: addr.phone || prev.phone,
                          pointCode: (addr as any).pointId || prev.pointCode,
                          pointName: (addr as any).pointName || prev.pointName,
                          pointRoute: (addr as any).pointRoute || prev.pointRoute,
                        }));
                      }}
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                        selectedAddressType === addr.type
                          ? 'bg-orange-50 border-2 border-orange-400'
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        selectedAddressType === addr.type ? 'bg-orange-100' : 'bg-white'
                      }`}>
                        <span className="text-lg">{addr.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-gray-900">{addr.label}</span>
                          {addr.details && (
                            <span className="text-[10px] text-orange-600 font-medium bg-orange-50 px-1.5 py-0.5 rounded">{addr.details}</span>
                          )}
                          {addr.pincode && (
                            <span className="text-[10px] text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded">PIN: {addr.pincode}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{addr.address}</p>
                      </div>
                      {selectedAddressType === addr.type && (
                        <CheckCircle className="h-5 w-5 text-orange-500 shrink-0 mt-1" />
                      )}
                    </div>
                  ))}

                  {savedAddresses.length === 0 && (
                    <div className="flex flex-col items-center gap-2 p-4 bg-orange-50 rounded-lg border-2 border-dashed border-orange-200">
                      <MapPin className="h-6 w-6 text-orange-400" />
                      <p className="text-sm text-gray-700 text-center">No saved addresses found.</p>
                      <p className="text-xs text-gray-500 text-center">Please add a delivery address in your profile first.</p>
                      <Link href="/profile" className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:text-orange-700 underline">
                        <MapPin className="h-3.5 w-3.5" /> Go to Profile to add address
                      </Link>
                    </div>
                  )}
                </div>

                {customerInfo.phone && (
                  <div className="px-4 pb-3 flex items-center gap-2 text-xs text-gray-500">
                    <Phone className="h-3 w-3" /> {customerInfo.phone}
                    <span className="mx-1">•</span>
                    <span>{customerInfo.email}</span>
                  </div>
                )}

                {isB2B && (
                  <div className="px-4 pb-3 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Select Delivery Shift *</span>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setDeliveryShift('morning')}
                        className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all ${deliveryShift === 'morning' ? 'bg-orange-50 border-orange-400 text-orange-700 ring-2 ring-orange-200' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                      >
                        ☀️ Morning
                      </button>
                      <button
                        onClick={() => setDeliveryShift('evening')}
                        className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all ${deliveryShift === 'evening' ? 'bg-indigo-50 border-indigo-400 text-indigo-700 ring-2 ring-indigo-200' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                      >
                        🌙 Evening
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">Orders placed today will be dispatched for tomorrow's {deliveryShift} delivery</p>
                  </div>
                )}

                {isB2B && (
                  <div className="px-4 pb-3 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Delivery Point Details</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500 font-medium">POINT CODE</Label>
                        <Input
                          placeholder="e.g. PT-001"
                          value={customerInfo.pointCode}
                          onChange={(e) => setCustomerInfo(prev => ({ ...prev, pointCode: e.target.value }))}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500 font-medium">POINT NAME</Label>
                        <Input
                          placeholder="e.g. Main Market Point"
                          value={customerInfo.pointName}
                          onChange={(e) => setCustomerInfo(prev => ({ ...prev, pointName: e.target.value }))}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500 font-medium">POINT ROUTE</Label>
                        <Input
                          placeholder="e.g. Route A / Salem North"
                          value={customerInfo.pointRoute}
                          onChange={(e) => setCustomerInfo(prev => ({ ...prev, pointRoute: e.target.value }))}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="px-4 pb-4">
                  <button
                    onClick={() => {
                      const el = document.getElementById('delivery-instructions');
                      if (el) el.classList.toggle('hidden');
                    }}
                    className="text-xs text-orange-600 font-medium hover:text-orange-700 transition-colors"
                  >
                    + Add delivery instructions
                  </button>
                  <div id="delivery-instructions" className={customerInfo.deliveryInstructions ? '' : 'hidden'}>
                    <Input
                      placeholder="e.g. Ring the bell, leave at door"
                      value={customerInfo.deliveryInstructions}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, deliveryInstructions: e.target.value }))}
                      className="mt-2 text-sm h-9"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 px-4 py-3 border-b bg-gray-50">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-900">Delivery Details</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="name" className="text-xs text-gray-500 font-medium">FULL NAME</Label>
                      <Input id="name" placeholder="Your name" value={customerInfo.name} onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))} className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="phone" className={`text-xs font-medium ${fieldErrors.phone ? 'text-red-500' : 'text-gray-500'}`}>PHONE</Label>
                      <Input id="phone" type="tel" placeholder="+91 98437..." value={customerInfo.phone} onChange={(e) => { setCustomerInfo(prev => ({ ...prev, phone: e.target.value })); if (fieldErrors.phone) setFieldErrors(prev => ({ ...prev, phone: false })); }} className={`h-9 text-sm ${fieldErrors.phone ? 'border-red-400' : ''}`} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email" className="text-xs text-gray-500 font-medium">EMAIL</Label>
                    <Input id="email" type="email" placeholder="you@email.com" value={customerInfo.email} onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))} className="h-9 text-sm" />
                  </div>
                  <AddressInput
                    value={customerInfo.address}
                    onChange={(address) => {
                      setCustomerInfo(prev => ({ ...prev, address }));
                      if (fieldErrors.address) setFieldErrors(prev => ({ ...prev, address: false }));
                    }}
                    hasError={fieldErrors.address}
                    label="DELIVERY ADDRESS"
                    placeholder="Search address, area, or landmark..."
                  />
                  <div className="space-y-1">
                    <Label htmlFor="instructions" className="text-xs text-gray-500 font-medium">DELIVERY INSTRUCTIONS <span className="text-gray-400">(Optional)</span></Label>
                    <Input id="instructions" placeholder="e.g. Ring the bell, leave at door" value={customerInfo.deliveryInstructions} onChange={(e) => setCustomerInfo(prev => ({ ...prev, deliveryInstructions: e.target.value }))} className="h-9 text-sm" />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Shipping Method Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Shipping Method
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={shippingMethod} onValueChange={(v) => setShippingMethod(v as 'local' | 'delhivery')}>
                <div 
                  className={`flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border rounded-lg cursor-pointer mb-3 min-h-[56px] transition-colors ${
                    shippingMethod === 'local' ? 'border-primary bg-orange-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setShippingMethod('local')}
                >
                  <RadioGroupItem value="local" id="local" />
                  <Label htmlFor="local" className="flex items-center gap-2 sm:gap-3 cursor-pointer flex-1 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
                      <Truck className="h-4 w-4 sm:h-6 sm:w-6 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                        <p className="font-medium text-sm sm:text-base">AAVIN Local</p>
                        <Badge variant="secondary" className="text-[10px] sm:text-xs">Recommended</Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-500 truncate">AAVIN milk vehicles</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-green-600 text-sm sm:text-base">FREE</p>
                      <p className="text-[10px] sm:text-xs text-gray-500">Same day</p>
                    </div>
                  </Label>
                </div>
                
                <div 
                  className={`flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border rounded-lg cursor-pointer min-h-[56px] transition-colors ${
                    shippingMethod === 'delhivery' ? 'border-primary bg-orange-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setShippingMethod('delhivery')}
                >
                  <RadioGroupItem value="delhivery" id="delhivery" />
                  <Label htmlFor="delhivery" className="flex items-center gap-2 sm:gap-3 cursor-pointer flex-1 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                      <Package className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base">Delhivery Courier</p>
                      <p className="text-xs sm:text-sm text-gray-500 truncate">Express delivery across India</p>
                    </div>
                    <div className="text-right shrink-0">
                      {checkingPincode ? (
                        <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
                      ) : delhiveryCost !== null ? (
                        <>
                          <p className="font-semibold">₹{delhiveryCost}</p>
                          <p className="text-xs text-gray-500">2-5 business days</p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-500">Enter pincode</p>
                      )}
                    </div>
                  </Label>
                </div>
              </RadioGroup>

              {shippingMethod === 'delhivery' && (
                <div className="mt-4 space-y-3">
                  {pincodeServiceable === false && (
                    <div className="p-3 bg-red-50 rounded-lg text-sm">
                      <p className="font-medium text-red-800">Pincode not serviceable</p>
                      <p className="text-red-600">Delhivery does not deliver to this pincode. Please use Local Delivery or update your address.</p>
                    </div>
                  )}
                  {pincodeServiceable === true && delhiveryCost !== null && (
                    <div className="p-3 bg-green-50 rounded-lg text-sm flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800">Pincode is serviceable!</p>
                        <p className="text-green-600">Estimated delivery: 2-5 business days</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                {paymentMethods?.cod && (
                <div className={`flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border rounded-lg cursor-pointer mb-3 min-h-[56px] transition-colors ${
                    paymentMethod === 'cod' ? 'border-primary bg-orange-50' : 'hover:bg-gray-50'
                  }`}>
                  <RadioGroupItem value="cod" id="cod" />
                  <Label htmlFor="cod" className="flex items-center gap-2 sm:gap-3 cursor-pointer flex-1">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                      <Banknote className="h-4 w-4 sm:h-6 sm:w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm sm:text-base">Cash on Delivery</p>
                      <p className="text-xs sm:text-sm text-gray-500">Pay when you receive</p>
                    </div>
                  </Label>
                </div>
                )}
                {isRazorpayActive && (
                <div className={`flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border rounded-lg cursor-pointer min-h-[56px] transition-colors ${
                    paymentMethod === 'razorpay' ? 'border-primary bg-orange-50' : 'hover:bg-gray-50'
                  }`}>
                  <RadioGroupItem value="razorpay" id="razorpay" />
                  <Label htmlFor="razorpay" className="flex items-center gap-2 sm:gap-3 cursor-pointer flex-1">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                      <SiRazorpay className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm sm:text-base">Razorpay (Axis Bank)</p>
                      <p className="text-xs sm:text-sm text-gray-500">UPI, Cards, Net Banking</p>
                    </div>
                  </Label>
                </div>
                )}
                {/* Cashfree payment option hidden until re-enabled */}
                {hasWalletBalance && (
                  <div className={`flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border rounded-lg mt-3 min-h-[56px] transition-colors hover:bg-gray-50 cursor-pointer ${paymentMethod === 'wallet' ? 'border-primary bg-orange-50' : ''}`}>
                    <RadioGroupItem value="wallet" id="wallet" />
                    <Label htmlFor="wallet" className="flex items-center gap-2 sm:gap-3 cursor-pointer flex-1">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                        <Wallet className="h-4 w-4 sm:h-6 sm:w-6 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm sm:text-base">Wallet</p>
                        <p className="text-xs sm:text-sm text-gray-500">
                          Balance: ₹{walletBalance.toFixed(2)}
                          {total > walletBalance && <span className="text-red-500 ml-1">(Insufficient)</span>}
                        </p>
                      </div>
                    </Label>
                  </div>
                )}
                {isB2B && (
                  <div className={`flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border rounded-lg mt-3 min-h-[56px] transition-colors ${hasCreditAvailable ? 'hover:bg-gray-50 cursor-pointer' : 'opacity-50 cursor-not-allowed'} ${paymentMethod === 'credit' ? 'border-primary bg-orange-50' : ''}`}>
                    <RadioGroupItem value="credit" id="credit" disabled={!hasCreditAvailable} />
                    <Label htmlFor="credit" className={`flex items-center gap-2 sm:gap-3 flex-1 ${hasCreditAvailable ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                        <Wallet className="h-4 w-4 sm:h-6 sm:w-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm sm:text-base">Credit</p>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-50 text-purple-700 border-purple-200">B2B</Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500">
                          {hasCreditAvailable 
                            ? `Available: ₹${totalCreditAvailable.toFixed(2)}`
                            : 'No credit limit available'}
                        </p>
                        {hasCreditAvailable && (
                          <div className="flex gap-3 mt-1">
                            {freshMilkCreditLimit > 0 && (
                              <span className="text-[10px] text-cyan-600">FM: ₹{(freshMilkCreditLimit - freshMilkCreditUsed).toFixed(0)}</span>
                            )}
                            {productsCreditLimit > 0 && (
                              <span className="text-[10px] text-green-600">Products: ₹{(productsCreditLimit - productsCreditUsed).toFixed(0)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </Label>
                  </div>
                )}
              </RadioGroup>
              
              <div className="mt-4 p-3 bg-green-50 rounded-lg flex items-start gap-2">
                <ShieldCheck className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-green-800">100% Secure Payments</p>
                  <p className="text-green-600">All transactions are secured by PCI DSS compliant payment gateways.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 hidden lg:block">
          <Card className="lg:sticky lg:top-4">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="space-y-2 sm:space-y-3 max-h-48 sm:max-h-64 overflow-y-auto">
                {items.map((item: CartItem) => (
                  <div key={item.id} className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium text-sm">₹{(parseFloat(item.price) * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              
              <Separator />
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Taxable Value</span>
                  <span>₹{gstBreakdown.taxableValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">GST (incl.)</span>
                  <span>₹{gstBreakdown.gstAmount.toFixed(2)}</span>
                </div>
                {deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Delivery ({shippingMethod === 'delhivery' ? 'Courier' : 'Local'})
                    </span>
                    <span>₹{deliveryFee.toFixed(2)}</span>
                  </div>
                )}
              </div>
              
              <Separator />
              
              <div className="flex justify-between items-center font-semibold text-lg">
                <span>Total</span>
                <span className="text-orange-600">₹{total.toFixed(2)}</span>
              </div>


              <Button 
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 sm:py-6 text-sm sm:text-base min-h-[52px]"
                onClick={handlePayment}
                disabled={isProcessing || (paymentMethod === 'razorpay' && configLoading)}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : paymentMethod === 'wallet' ? (
                  <>
                    <Wallet className="h-4 w-4 mr-2" />
                    Pay ₹{total.toFixed(2)} (Wallet)
                  </>
                ) : paymentMethod === 'credit' ? (
                  <>
                    <Wallet className="h-4 w-4 mr-2" />
                    Place Order - ₹{total.toFixed(2)} (Credit)
                  </>
                ) : paymentMethod === 'cod' ? (
                  <>
                    <Banknote className="h-4 w-4 mr-2" />
                    Place Order - ₹{total.toFixed(2)} (COD)
                  </>
                ) : paymentMethod === 'cashfree' ? (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay ₹{total.toFixed(2)} (Cashfree)
                  </>
                ) : (
                  <>
                    <SiRazorpay className="h-4 w-4 mr-2" />
                    Pay ₹{total.toFixed(2)}
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-gray-500">
                By placing this order, you agree to our Terms of Service and Privacy Policy
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile collapsible order summary */}
      {mobileOrderSummaryOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileOrderSummaryOpen(false)} />
      )}
      {mobileOrderSummaryOpen && (
        <div 
          role="dialog" 
          aria-modal="true" 
          aria-label="Order Summary"
          className="fixed bottom-[76px] left-0 right-0 z-50 bg-white rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)] max-h-[60vh] overflow-y-auto lg:hidden safe-area-bottom"
        >
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base">Order Summary</h3>
              <button onClick={() => setMobileOrderSummaryOpen(false)} className="text-gray-400 p-1" aria-label="Close order summary">
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {items.map((item: CartItem) => (
                <div key={item.id} className="flex justify-between items-start text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-medium">₹{(parseFloat(item.price) * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
            <Separator />
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Taxable Value</span>
                <span>₹{gstBreakdown.taxableValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">GST (incl.)</span>
                <span>₹{gstBreakdown.gstAmount.toFixed(2)}</span>
              </div>
              {deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery</span>
                  <span>₹{deliveryFee.toFixed(2)}</span>
                </div>
              )}
            </div>
            <Separator />
            <div className="flex justify-between items-center font-semibold text-base">
              <span>Total</span>
              <span className="text-orange-600">₹{total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Mobile sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-[0_-4px_12px_rgba(0,0,0,0.1)] p-3 lg:hidden safe-area-bottom">
        <div className="flex items-center justify-between mb-2">
          <button 
            onClick={() => setMobileOrderSummaryOpen(!mobileOrderSummaryOpen)} 
            className="text-left"
            aria-expanded={mobileOrderSummaryOpen}
            aria-label="View order summary"
          >
            <p className="text-xs text-gray-500 flex items-center gap-1">
              {items.length} item{items.length !== 1 ? 's' : ''}{deliveryFee > 0 ? ` • ₹${deliveryFee.toFixed(0)} delivery` : ' • Free delivery'}
              <ChevronUp className="h-3 w-3" />
            </p>
            <p className="text-lg font-bold text-orange-600">₹{total.toFixed(2)}</p>
          </button>
          <Button 
            className="bg-orange-500 hover:bg-orange-600 text-white min-h-[48px] px-6 text-sm font-semibold"
            onClick={handlePayment}
            disabled={isProcessing || (paymentMethod === 'razorpay' && configLoading)}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : paymentMethod === 'wallet' ? (
              <>
                <Wallet className="h-4 w-4 mr-2" />
                Pay (Wallet)
              </>
            ) : paymentMethod === 'credit' ? (
              <>
                <Wallet className="h-4 w-4 mr-2" />
                Place Order (Credit)
              </>
            ) : paymentMethod === 'cod' ? (
              <>
                <Banknote className="h-4 w-4 mr-2" />
                Place Order (COD)
              </>
            ) : paymentMethod === 'cashfree' ? (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Pay ₹{total.toFixed(2)}
              </>
            ) : (
              <>
                <SiRazorpay className="h-4 w-4 mr-2" />
                Pay ₹{total.toFixed(2)}
              </>
            )}
          </Button>
        </div>
      </div>
      </div>
  );
}
