import { Star, Clock, Truck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Restaurant } from "@shared/schema";
import { Link } from "wouter";

interface UnionCardProps {
  restaurant: Restaurant;
}

function shortUnionName(fullName: string): string {
  // "Salem District Cooperative Milk Producers Union Ltd" → "Salem Union"
  const districtIdx = fullName.indexOf(" District");
  if (districtIdx !== -1) {
    return fullName.slice(0, districtIdx) + " Union";
  }
  // "Ambattur Dairy", "Products Dairy (Ambattur)" → unchanged
  return fullName;
}

export default function UnionCard({ restaurant }: UnionCardProps) {
  const displayName = shortUnionName(restaurant.name);
  return (
    <Link href={`/union/${restaurant.id}`}>
      <Card className="overflow-hidden food-card cursor-pointer active:scale-[0.98] transition-transform" data-testid={`card-restaurant-${restaurant.id}`}>
        <img
          src={restaurant.image}
          alt={displayName}
          className="w-full h-40 sm:h-48 object-cover"
          data-testid={`img-restaurant-${restaurant.id}`}
          onError={(e) => { (e.target as HTMLImageElement).src = '/unions/dairy-factory-1_2.jpg'; }}
        />
        <CardContent className="p-3 sm:p-4">
          <div className="flex justify-between items-start mb-2 gap-2">
            <h3 className="font-semibold text-base sm:text-lg leading-tight" data-testid={`text-restaurant-name-${restaurant.id}`}>
              {displayName}
            </h3>
            <Badge variant="secondary" className="bg-accent text-accent-foreground shrink-0" data-testid={`text-rating-${restaurant.id}`}>
              <Star className="w-3 h-3 mr-1 fill-current" />
              {restaurant.rating}
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm mb-3 line-clamp-2" data-testid={`text-cuisine-${restaurant.id}`}>
            {restaurant.cuisine} • {restaurant.description}
          </p>
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              <span data-testid={`text-delivery-time-${restaurant.id}`}>{restaurant.deliveryTime}</span>
            </div>
            <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
              <Truck className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              <span data-testid={`text-delivery-fee-${restaurant.id}`}>
                {parseFloat(restaurant.deliveryFee) === 0 ? 'Free' : `₹${restaurant.deliveryFee}`}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
