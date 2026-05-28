import { useState, useEffect } from "react";
import { useParams, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Star, Clock, Truck, ChevronDown, Search, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MenuItemComponent from "@/components/menu-item";
import type { Restaurant, MenuItem } from "@shared/schema";

const PRODUCT_SORT_ORDER: [RegExp, number][] = [
  [/premium.*full.*cream.*milk.*(1\s*l|1000\s*ml)/i, 1],
  [/premium.*full.*cream.*milk.*(500|½)/i, 2],
  [/del[ia]te.*milk.*(500|½)/i, 3],
  [/standard.*milk.*(200|250)/i, 4],
  [/green.*magic.*plus.*(450|500)/i, 5],
  [/butter.*milk.*(150|200)/i, 6],
  [/curd.*(130|125)/i, 7],
  [/curd.*(500|½)/i, 8],
];

function getProductSortKey(name: string): number {
  for (const [pattern, order] of PRODUCT_SORT_ORDER) {
    if (pattern.test(name)) return order;
  }
  return 100;
}

interface ShopData extends Restaurant {
  slug?: string;
}

export default function UnionDetail() {
  const params = useParams<{ id?: string; slug?: string }>();
  const [matchShops] = useRoute("/shops/:slug");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Handle both /union/:id and /shops/:slug routes
  const identifier = params.slug || params.id;
  const isSlugRoute = matchShops;

  // Fetch by slug for /shops/:slug route
  const { data: shopData, isLoading: shopLoading } = useQuery<ShopData>({
    queryKey: ["/api/shops/by-slug", identifier],
    enabled: isSlugRoute && !!identifier,
  });

  // Fetch by ID for /union/:id route
  const { data: restaurantData, isLoading: restaurantFetchLoading } = useQuery<Restaurant>({
    queryKey: ["/api/restaurants", identifier],
    enabled: !isSlugRoute && !!identifier,
  });

  // Use shop data if slug route, otherwise restaurant data
  const restaurant = isSlugRoute ? shopData : restaurantData;
  const restaurantId = isSlugRoute ? shopData?.id : identifier;
  const restaurantLoading = isSlugRoute ? shopLoading : restaurantFetchLoading;

  const { data: menuItems = [], isLoading: menuLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/restaurants", restaurantId, "menu"],
    enabled: !!restaurantId,
  });

  const categories = ["all", ...Array.from(new Set(menuItems.map((item: MenuItem) => item.category)))];
  
  // Get subcategories for selected category
  const subcategories = selectedCategory !== "all"
    ? Array.from(new Set(
        menuItems
          .filter((item: MenuItem) => item.category === selectedCategory && item.subcategory)
          .map((item: MenuItem) => item.subcategory!)
      )).sort()
    : [];

  // Reset subcategory when category changes
  useEffect(() => {
    setSelectedSubcategory("all");
  }, [selectedCategory]);

  let filteredItems = selectedCategory === "all" 
    ? menuItems 
    : menuItems.filter((item: MenuItem) => item.category === selectedCategory);
  
  if (selectedSubcategory !== "all") {
    filteredItems = filteredItems.filter((item: MenuItem) => item.subcategory === selectedSubcategory);
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filteredItems = filteredItems.filter((item: MenuItem) =>
      item.name.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q)
    );
  }

  if (restaurantLoading) {
    return (
      <div className="min-h-screen">
        <Skeleton className="w-full h-64" />
        <div className="max-w-4xl mx-auto p-6">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-4 w-96 mb-8" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground" data-testid="text-restaurant-not-found">District Union not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen page-content">
      <div className="relative">
        <img
          src="/salem-factory.png"
          alt={`${restaurant.name} - District Union`}
          className="w-full h-28 sm:h-48 md:h-64 object-cover"
          loading="lazy"
          data-testid="img-restaurant-hero"
        />
      </div>

      <div className="max-w-4xl mx-auto px-3 py-2.5 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start mb-2.5 sm:mb-6 gap-1.5">
          <div className="w-full">
            <h1 className="text-base sm:text-2xl md:text-3xl font-bold mb-0.5 sm:mb-1" data-testid="text-restaurant-name">
              {restaurant.name}
            </h1>
            <p className="text-muted-foreground text-[11px] sm:text-sm mb-1.5 sm:mb-2" data-testid="text-restaurant-description">
              {restaurant.cuisine} • {restaurant.description}
            </p>
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 text-[11px] sm:text-sm">
              <div className="flex items-center">
                <Star className="w-3 h-3 sm:w-4 sm:h-4 text-accent mr-0.5 sm:mr-1 fill-current" />
                <span data-testid="text-restaurant-rating">
                  {restaurant.rating} (500+)
                </span>
              </div>
              <div className="flex items-center">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
                <span data-testid="text-restaurant-delivery-time">{restaurant.deliveryTime}</span>
              </div>
              <div className="flex items-center">
                <Truck className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
                <span data-testid="text-restaurant-delivery-fee">
                  {parseFloat(restaurant.deliveryFee) === 0 ? 'Free delivery' : `₹${restaurant.deliveryFee}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mb-2.5 sm:mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 h-9 sm:h-11 text-sm"
            data-testid="input-product-search"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="border-b border-border mb-2.5 sm:mb-6 -mx-3 sm:mx-0 px-3 sm:px-0 sticky top-14 sm:top-16 bg-background z-10 pt-0.5 sm:pt-1">
          <nav className="flex gap-0.5 sm:gap-1 category-scroll pb-px" data-testid="menu-categories">
            {categories.map((category) => (
              <button
                key={category}
                className={`py-1.5 sm:py-2 px-2 sm:px-3 border-b-2 whitespace-nowrap text-[11px] sm:text-sm rounded-t-md transition-colors ${
                  selectedCategory === category
                    ? 'border-primary text-primary font-medium bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setSelectedCategory(category)}
                data-testid={`button-category-${category.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {category === "all" ? "All Items" : category}
              </button>
            ))}
          </nav>
        </div>

        {subcategories.length > 0 && (
          <div className="mb-3 sm:mb-6">
            <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
              <SelectTrigger className="w-full sm:w-[200px]" data-testid="dropdown-subcategory">
                <SelectValue placeholder={`Filter ${selectedCategory}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {selectedCategory}</SelectItem>
                {subcategories.map((subcategory) => (
                  <SelectItem key={subcategory} value={subcategory}>
                    {subcategory}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-3 sm:space-y-6">
          {categories
            .filter(cat => cat !== "all")
            .map((category) => {
              const categoryItems = selectedCategory === "all" || selectedCategory === category
                ? filteredItems.filter((item: MenuItem) => item.category === category)
                : [];
              
              if (categoryItems.length === 0 && selectedCategory !== "all") return null;

              return (
                <div key={category} data-testid={`section-${category.toLowerCase().replace(/\s+/g, '-')}`}>
                  {selectedCategory === "all" && (
                    <h3 className="text-base sm:text-xl font-semibold mb-3 sm:mb-4" data-testid={`text-category-title-${category.toLowerCase().replace(/\s+/g, '-')}`}>
                      {category}
                    </h3>
                  )}
                  <div className="products-grid">
                    {(selectedCategory === "all" ? categoryItems : filteredItems)
                      .slice()
                      .sort((a, b) => getProductSortKey(a.name) - getProductSortKey(b.name))
                      .map((item: MenuItem) => (
                        <MenuItemComponent key={item.id} item={item} />
                      ))}
                  </div>
                </div>
              );
            })}

          {menuLoading && (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          )}

          {!menuLoading && filteredItems.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground" data-testid="text-no-menu-items">
                {searchQuery ? `No products matching "${searchQuery}"` : 'No menu items found for this category.'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-primary text-sm mt-2 hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
