import { useState, useEffect } from "react";
import { X, CreditCard, Smartphone, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { useCartStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { InsertOrder, OrderItem } from "@shared/schema";
import UpiPaymentModal from "./upi-payment-modal";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  subtotal: number;
  deliveryFee: number;
  tax: number;
}

export default function CheckoutModal({ 
  isOpen, 
  onClose, 
  total, 
  subtotal, 
  deliveryFee, 
  tax 
}: CheckoutModalProps) {
  const { items, clearCart } = useCartStore();
  const { toast } = useToast();
  
  const [orderType, setOrderType] = useState<"delivery" | "pickup">("delivery");
  const [paymentMethod, setPaymentMethod] = useState("credit_card");
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: "",
    city: "",
    zipCode: "",
    instructions: "",
  });
  
  // UPI Payment Modal state
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [upiPaymentData, setUpiPaymentData] = useState<any>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string>("");

  // Reset mutation state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      createOrderMutation.reset();
    }
  }, [isOpen]);

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: InsertOrder) => {
      console.log('Creating order with data:', orderData);
      const response = await apiRequest("POST", "/api/orders", orderData);
      const result = await response.json();
      console.log('Order creation response:', result);
      return result;
    },
    onSuccess: (orderResponse) => {
      console.log('Order created successfully:', orderResponse);
      console.log('Current payment method:', paymentMethod);
      
      if (paymentMethod === 'sbi_upi') {
        console.log('UPI payment method detected, initiating UPI flow');
        // For UPI payments, initiate payment flow instead of closing modal
        handleUpiPaymentFlow(orderResponse.id);
      } else {
        console.log('Non-UPI payment method, showing success');
        // For other payment methods, show success and close
        toast({
          title: "Order placed successfully!",
          description: "You will receive a confirmation email shortly.",
        });
        clearCart();
        onClose();
      }
    },
    onError: (error) => {
      console.error('Order creation failed:', error);
      toast({
        title: "Failed to place order",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleUpiPaymentFlow = async (orderId: string) => {
    try {
      // Initiate UPI payment
      const response = await apiRequest("POST", "/api/upi/payment/initiate", { orderId });
      const paymentData = await response.json();
      
      // Store payment data and show UPI modal
      setUpiPaymentData(paymentData);
      setCurrentOrderId(orderId);
      setShowUpiModal(true);
      
      // Clear cart since order is created, keep checkout modal open for UPI flow
      clearCart();
    } catch (error) {
      toast({
        title: "Payment initiation failed",
        description: "Please try again or use a different payment method.",
        variant: "destructive",
      });
    }
  };

  const handleUpiModalClose = () => {
    setShowUpiModal(false);
    setUpiPaymentData(null);
    setCurrentOrderId("");
    onClose(); // Close the checkout modal when UPI modal closes
  };

  const handlePlaceOrder = () => {
    console.log('=== Place Order Debug ===');
    console.log('Payment Method:', paymentMethod);
    console.log('Customer Info:', customerInfo);
    console.log('Delivery Address:', deliveryAddress);
    console.log('Items:', items);
    
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      console.log('Missing customer info validation failed');
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (orderType === "delivery" && (!deliveryAddress.street || !deliveryAddress.city || !deliveryAddress.zipCode)) {
      console.log('Missing delivery address validation failed');
      toast({
        title: "Missing delivery address",
        description: "Please provide a complete delivery address.",
        variant: "destructive",
      });
      return;
    }

    if (items.length === 0) {
      console.log('Empty cart validation failed');
      toast({
        title: "Empty cart",
        description: "Please add items to your cart first.",
        variant: "destructive",
      });
      return;
    }

    const restaurantId = items[0].restaurantId; // Assuming all items are from the same restaurant
    const orderItems: OrderItem[] = items.map(item => ({
      itemId: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      productSegment: (item as any).productSegment || 'Products',
    }));

    const fullAddress = orderType === "delivery" 
      ? `${deliveryAddress.street}, ${deliveryAddress.city}, ${deliveryAddress.zipCode}`
      : "Pickup";

    const orderData: InsertOrder = {
      customerName: customerInfo.name,
      customerEmail: customerInfo.email,
      customerPhone: customerInfo.phone,
      restaurantId,
      items: orderItems,
      subtotal: subtotal.toString(),
      deliveryFee: orderType === "delivery" ? deliveryFee.toString() : "0.00",
      tax: tax.toString(),
      total: (orderType === "delivery" ? total : subtotal + tax).toString(),
      deliveryAddress: fullAddress,
      deliveryInstructions: deliveryAddress.instructions || null,
      paymentMethod,
      orderType,
      status: "pending",
    };

    console.log('Order data to be sent:', orderData);
    console.log('About to call createOrderMutation.mutate');
    createOrderMutation.mutate(orderData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" data-testid="checkout-modal">
      <Card className="w-full max-w-2xl max-h-screen overflow-y-auto">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold" data-testid="text-checkout-title">Checkout</h2>
            <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-checkout">
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Order Type Toggle */}
          <div className="mb-6">
            <Label className="text-base font-semibold mb-3 block">Order Type</Label>
            <RadioGroup
              value={orderType}
              onValueChange={(value) => setOrderType(value as "delivery" | "pickup")}
              className="flex space-x-4"
              data-testid="radio-order-type"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="delivery" id="delivery" />
                <Label htmlFor="delivery">Delivery</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pickup" id="pickup" />
                <Label htmlFor="pickup">Pickup</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Customer Information */}
          <div className="mb-6">
            <Label className="text-base font-semibold mb-3 block">Contact Information</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                  data-testid="input-customer-name"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                  data-testid="input-customer-phone"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                  data-testid="input-customer-email"
                />
              </div>
            </div>
          </div>
          
          {/* Delivery Address */}
          {orderType === "delivery" && (
            <div className="mb-6">
              <Label className="text-base font-semibold mb-3 block">Delivery Address</Label>
              <div className="space-y-3">
                <Input
                  placeholder="Street Address"
                  value={deliveryAddress.street}
                  onChange={(e) => setDeliveryAddress({...deliveryAddress, street: e.target.value})}
                  data-testid="input-delivery-street"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="City"
                    value={deliveryAddress.city}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, city: e.target.value})}
                    data-testid="input-delivery-city"
                  />
                  <Input
                    placeholder="ZIP Code"
                    value={deliveryAddress.zipCode}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, zipCode: e.target.value})}
                    data-testid="input-delivery-zip"
                  />
                </div>
                <Textarea
                  placeholder="Delivery Instructions (Optional)"
                  value={deliveryAddress.instructions}
                  onChange={(e) => setDeliveryAddress({...deliveryAddress, instructions: e.target.value})}
                  className="h-20"
                  data-testid="textarea-delivery-instructions"
                />
              </div>
            </div>
          )}
          
          {/* Payment Method */}
          <div className="mb-6">
            <Label className="text-base font-semibold mb-3 block">Payment Method</Label>
            <RadioGroup
              value={paymentMethod}
              onValueChange={setPaymentMethod}
              className="space-y-3"
              data-testid="radio-payment-method"
            >
              <div className="flex items-center space-x-3 p-3 border border-border rounded-lg">
                <RadioGroupItem value="credit_card" id="credit_card" />
                <CreditCard className="h-5 w-5 text-primary" />
                <Label htmlFor="credit_card">Credit Card ending in 4567</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 border border-border rounded-lg">
                <RadioGroupItem value="paypal" id="paypal" />
                <Smartphone className="h-5 w-5 text-primary" />
                <Label htmlFor="paypal">PayPal</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 border border-border rounded-lg">
                <RadioGroupItem value="sbi_upi" id="sbi_upi" />
                <QrCode className="h-5 w-5 text-primary" />
                <Label htmlFor="sbi_upi">SBI UPI</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 border border-border rounded-lg">
                <RadioGroupItem value="cash" id="cash" />
                <span className="text-xl">💰</span>
                <Label htmlFor="cash">Cash on {orderType === "delivery" ? "Delivery" : "Pickup"}</Label>
              </div>
            </RadioGroup>
          </div>
          
          {/* Order Summary */}
          <div className="bg-muted p-4 rounded-lg mb-6" data-testid="order-summary">
            <h3 className="font-semibold mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span data-testid="text-checkout-subtotal">₹{subtotal.toFixed(2)}</span>
              </div>
              {orderType === "delivery" && (
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span data-testid="text-checkout-delivery-fee" className={deliveryFee === 0 ? "text-green-600" : ""}>
                    {deliveryFee === 0 ? "FREE" : `₹${deliveryFee.toFixed(2)}`}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tax</span>
                <span data-testid="text-checkout-tax">₹{tax.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span data-testid="text-checkout-total">
                  ₹{(orderType === "delivery" ? total : subtotal + tax).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          
          <Button
            type="button"
            className="w-full"
            onClick={handlePlaceOrder}
            disabled={createOrderMutation.isPending}
            data-testid="button-place-order"
          >
            {createOrderMutation.isPending ? "Placing Order..." : "Place Order"}
          </Button>
        </CardContent>
      </Card>
      
      {/* UPI Payment Modal */}
      {showUpiModal && upiPaymentData && (
        <UpiPaymentModal
          isOpen={showUpiModal}
          onClose={handleUpiModalClose}
          orderId={currentOrderId}
          paymentData={upiPaymentData}
        />
      )}
    </div>
  );
}
