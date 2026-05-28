import { X, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCartStore } from "@/lib/store";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";

export default function CartSidebar() {
  const { items, isOpen, toggleCart, updateQuantity, removeItem, getTotal, getItemCount } = useCartStore();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  const total = getTotal();
  const itemCount = getItemCount();
  const deliveryFee = 0;
  const gstBreakdown = items.reduce((acc, item) => {
    const basePrice = parseFloat(item.basePrice || item.price);
    const gstPct = parseFloat(item.gstPercent || '0');
    const itemBillingPrice = parseFloat(item.price);
    const itemTaxableValue = gstPct > 0 ? itemBillingPrice / (1 + gstPct / 100) : itemBillingPrice;
    const itemGst = itemBillingPrice - itemTaxableValue;
    return {
      taxableValue: acc.taxableValue + itemTaxableValue * item.quantity,
      gstAmount: acc.gstAmount + itemGst * item.quantity,
    };
  }, { taxableValue: 0, gstAmount: 0 });
  const finalTotal = total + deliveryFee;

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[60]" onClick={toggleCart} />
      <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-card shadow-xl border-l border-border z-[60] flex flex-col" data-testid="cart-sidebar">
        <div className="p-3 sm:p-6 h-full flex flex-col">
          <div className="flex justify-between items-center mb-4 sm:mb-6 sticky top-0 bg-card z-10 pb-2 border-b border-border -mx-3 sm:-mx-6 px-3 sm:px-6 pt-1">
            <h3 className="text-lg sm:text-xl font-semibold" data-testid="text-cart-title">Your Cart</h3>
            <Button variant="ghost" size="icon" onClick={toggleCart} className="h-10 w-10" data-testid="button-close-cart">
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          {items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground" data-testid="text-empty-cart">Your cart is empty</p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto pb-4" data-testid="cart-items">
                <div className="space-y-3 sm:space-y-4">
                  {items.map((item) => {
                    const step = item.unitsPerPackage || 1;
                    const isCaseBased = step > 1;
                    const cases = isCaseBased ? Math.floor(item.quantity / step) : 0;

                    return (
                      <div key={item.id} className="flex items-center space-x-3 p-3 border border-border rounded-lg" data-testid={`cart-item-${item.id}`}>
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-12 h-12 rounded object-cover max-w-full"
                          loading="lazy"
                          data-testid={`img-cart-item-${item.id}`}
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-sm" data-testid={`text-cart-item-name-${item.id}`}>
                            {item.name}
                          </h4>
                          {isCaseBased && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {item.quantity} units ({cases} {cases === 1 ? 'case' : 'cases'})
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 sm:h-8 sm:w-8"
                                onClick={() => {
                                  const newQty = item.quantity - step;
                                  if (newQty < step) {
                                    removeItem(item.id);
                                  } else {
                                    updateQuantity(item.id, newQty);
                                  }
                                }}
                                data-testid={`button-decrease-${item.id}`}
                              >
                                <Minus className="h-4 w-4 sm:h-3 sm:w-3" />
                              </Button>
                              <span className="text-sm w-8 text-center" data-testid={`text-quantity-${item.id}`}>
                                {isCaseBased ? cases : item.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 sm:h-8 sm:w-8"
                                onClick={() => updateQuantity(item.id, item.quantity + step)}
                                data-testid={`button-increase-${item.id}`}
                              >
                                <Plus className="h-4 w-4 sm:h-3 sm:w-3" />
                              </Button>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-sm" data-testid={`text-item-total-${item.id}`}>
                                ₹{(parseFloat(item.price) * item.quantity).toFixed(2)}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 sm:h-8 sm:w-8 text-destructive"
                                onClick={() => removeItem(item.id)}
                                data-testid={`button-remove-${item.id}`}
                              >
                                <Trash2 className="h-4 w-4 sm:h-3 sm:w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="border-t border-border pt-3 sm:pt-4 mt-auto sticky bottom-0 bg-card -mx-3 sm:-mx-6 px-3 sm:px-6 pb-3 sm:pb-0" data-testid="cart-summary" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))' }}>
                <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Taxable Value</span>
                    <span data-testid="text-subtotal">₹{gstBreakdown.taxableValue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>GST (incl.)</span>
                    <span data-testid="text-tax">₹{gstBreakdown.gstAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Delivery</span>
                    <span data-testid="text-delivery-fee">FREE</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total</span>
                    <span data-testid="text-total">₹{finalTotal.toFixed(2)}</span>
                  </div>
                </div>
                
                <Button
                  className="w-full bg-orange-500 hover:bg-orange-600 h-12 text-base font-semibold"
                  onClick={() => {
                    toggleCart();
                    setLocation('/checkout');
                  }}
                  data-testid="button-checkout"
                >
                  Proceed to Checkout
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
