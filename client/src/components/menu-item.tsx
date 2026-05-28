import { Plus, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { MenuItem } from "@shared/schema";
import { useCartStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { useAuth, calculatePriceForSegment, getPricingRoleForSegment } from "@/lib/auth-context";

interface MenuItemProps {
  item: MenuItem;
}

const B2B_ROLES = ['wholesale_dealer', 'wsd', 'dealer', 'retailer', 'fmd', 'institution', 'agent', 'mpcs', 'hotel', 'private_parlour', 'union_parlour', 'general_shop', 'inter_union', 'federation'];
const B2B_PRICING_ROLES = ['WHOLESALE_DEALER', 'DEALER', 'RETAILER', 'FEDERATION', 'INTER_UNION', 'AGENT', 'FMD'];

export default function MenuItemComponent({ item }: MenuItemProps) {
  const { addItem, items, updateQuantity, removeItem } = useCartStore();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const isB2B = user && (B2B_ROLES.includes(user.role?.toLowerCase()) || (user.pricingRole && B2B_PRICING_ROLES.includes(user.pricingRole)));
  const caseUnits = item.unitsPerPackage || 1;
  const stepQty = isB2B && caseUnits > 1 ? caseUnits : 1;

  const cartItem = items.find(i => i.id === item.id);
  const quantityInCart = cartItem?.quantity || 0;
  const casesInCart = caseUnits > 1 ? Math.floor(quantityInCart / caseUnits) : quantityInCart;
  const inCart = quantityInCart > 0;

  const productSegment = item.productSegment || 'Products';
  const segmentPricingRole = getPricingRoleForSegment(user, productSegment);
  const billingPrice = parseFloat(calculatePriceForSegment(user, item));
  const gstPct = parseFloat(item.gstPercent || '0');
  const taxableValue = gstPct > 0 ? billingPrice / (1 + gstPct / 100) : billingPrice;
  const displayPrice = billingPrice.toFixed(2);

  const handleAddToCart = () => {
    addItem({
      id: item.id,
      name: item.name,
      price: displayPrice,
      quantity: stepQty,
      restaurantId: item.restaurantId,
      image: item.image,
      productSegment: productSegment,
      pricingRole: segmentPricingRole,
      gstPercent: gstPct.toString(),
      basePrice: taxableValue.toFixed(2),
      unitsPerPackage: isB2B && caseUnits > 1 ? caseUnits : undefined,
    });
    
    toast({
      title: "Added to cart",
      description: isB2B && caseUnits > 1
        ? `${item.name} — 1 case (${caseUnits} units) added to cart.`
        : `${item.name} has been added to your cart.`,
    });
  };

  return (
    <Card
      className={`menu-item-card w-full overflow-hidden transition-all ${
        inCart
          ? "ring-2 ring-green-400 bg-green-50 dark:bg-green-950/30 shadow-md"
          : "hover:shadow-md"
      }`}
      data-testid={`card-menu-item-${item.id}`}
    >
      <CardContent className="p-0">
        <div className="relative">
          <img
            src={item.image || '/products/fresh-milk.png'}
            alt={item.name}
            className="w-full aspect-square object-cover max-h-[120px] sm:max-h-[180px] md:max-h-none"
            data-testid={`img-menu-item-${item.id}`}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/products/fresh-milk.png';
            }}
          />
          {inCart && (
            <div className="absolute top-1.5 left-1.5">
              <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0.5">
                In Cart
              </Badge>
            </div>
          )}
          <div className="absolute top-1.5 right-1.5">
            {inCart ? (
              <div className="flex items-center gap-0.5 bg-white rounded-full shadow-lg border border-green-200 p-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (quantityInCart <= stepQty) {
                      removeItem(item.id);
                    } else {
                      updateQuantity(item.id, quantityInCart - stepQty);
                    }
                  }}
                  className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                  disabled={!item.isAvailable}
                  data-testid={`button-decrease-${item.id}`}
                >
                  <Minus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                </button>
                <span className="w-7 sm:w-6 text-center font-bold text-sm text-green-700" data-testid={`quantity-${item.id}`}>
                  {isB2B && caseUnits > 1 ? casesInCart : quantityInCart}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateQuantity(item.id, quantityInCart + stepQty);
                  }}
                  className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors"
                  disabled={!item.isAvailable}
                  data-testid={`button-increase-${item.id}`}
                >
                  <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleAddToCart}
                className="hidden sm:flex w-9 h-9 sm:w-8 sm:h-8 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg hover:bg-orange-600 transition-colors"
                disabled={!item.isAvailable}
                data-testid={`button-add-to-cart-${item.id}`}
              >
                <Plus className="h-4.5 w-4.5 sm:h-4 sm:w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="p-2 sm:p-2.5 md:p-3">
          <h4 className="font-semibold text-[11px] sm:text-xs md:text-sm leading-tight truncate" data-testid={`text-menu-item-name-${item.id}`}>
            {item.name}
          </h4>
          <p className="text-muted-foreground text-[9px] sm:text-[10px] md:text-xs mt-0.5 line-clamp-1" data-testid={`text-menu-item-description-${item.id}`}>
            {item.description}
          </p>
          <div className="flex flex-wrap items-center gap-1 mt-0.5 sm:mt-1.5">
            <span className={`text-[11px] sm:text-sm md:text-base font-bold ${inCart ? "text-green-600" : "text-primary"}`} data-testid={`text-menu-item-price-${item.id}`}>
              ₹{displayPrice}
            </span>
          </div>

          {!inCart && (
            <button
              onClick={handleAddToCart}
              className="sm:hidden w-full mt-1 py-1.5 flex items-center justify-center gap-1 rounded bg-orange-500 text-white text-[11px] font-medium hover:bg-orange-600 active:scale-[0.97] transition-all"
              disabled={!item.isAvailable}
              data-testid={`button-add-to-cart-mobile-${item.id}`}
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
