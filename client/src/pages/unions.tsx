import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import UnionCard from "@/components/union-card";
import { useAuth } from "@/lib/auth-context";
import type { Restaurant } from "@shared/schema";
import { useLocation } from "wouter";

export default function Unions() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCuisine, setSelectedCuisine] = useState("");
  const [priceFilters, setPriceFilters] = useState<string[]>([]);
  const [ratingFilter, setRatingFilter] = useState("");
  const [sortBy, setSortBy] = useState("relevance");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const cuisine = urlParams.get('cuisine');
    const search = urlParams.get('search');
    if (cuisine) {
      setSelectedCuisine(cuisine);
    }
    if (search) {
      setSearchQuery(search);
    }
  }, []);

  const { data: restaurants = [], isLoading } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants", selectedCuisine, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCuisine) params.append('cuisine', selectedCuisine);
      if (searchQuery) params.append('search', searchQuery);
      
      const response = await fetch(`/api/restaurants?${params}`);
      return response.json();
    },
  });

  const { data: cuisines = [] } = useQuery<string[]>({
    queryKey: ["/api/cuisines"],
  });

  const handlePriceFilterChange = (price: string, checked: boolean) => {
    if (checked) {
      setPriceFilters([...priceFilters, price]);
    } else {
      setPriceFilters(priceFilters.filter(p => p !== price));
    }
  };

  const handleCuisineFilter = (cuisine: string) => {
    setSelectedCuisine(cuisine);
    const params = new URLSearchParams();
    if (cuisine) params.append('cuisine', cuisine);
    setLocation(`/unions?${params}`);
  };

  const filteredRestaurants = restaurants.filter((restaurant: Restaurant) => {
    if (priceFilters.length > 0) {
      const avgPrice = parseFloat(restaurant.deliveryFee) + 15;
      const matchesPrice = priceFilters.some(price => {
        if (price === "under-15") return avgPrice < 15;
        if (price === "15-30") return avgPrice >= 15 && avgPrice <= 30;
        if (price === "30-plus") return avgPrice > 30;
        return false;
      });
      if (!matchesPrice) return false;
    }

    if (ratingFilter) {
      const rating = parseFloat(restaurant.rating);
      if (ratingFilter === "4.5+" && rating < 4.5) return false;
      if (ratingFilter === "4.0+" && rating < 4.0) return false;
    }

    return true;
  });

  const sortedRestaurants = [...filteredRestaurants].sort((a, b) => {
    switch (sortBy) {
      case "rating":
        return parseFloat(b.rating) - parseFloat(a.rating);
      case "delivery-time":
        const aTime = parseInt(a.deliveryTime.split("-")[0]);
        const bTime = parseInt(b.deliveryTime.split("-")[0]);
        return aTime - bTime;
      case "price":
        return parseFloat(a.deliveryFee) - parseFloat(b.deliveryFee);
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen py-4 sm:py-6 md:py-12 page-content">
      <div className="max-w-7xl mx-auto px-3 sm:px-4">
        <div className="mb-4 sm:mb-8">
          <div className="relative max-w-md mx-auto">
            <Input
              type="text"
              placeholder="Search District Unions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 sm:h-11"
              data-testid="input-search-restaurants"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 lg:gap-8">
          <div className="lg:w-64 flex-shrink-0">
            <Card data-testid="filters-sidebar">
              <CardHeader className="p-3 sm:p-6 lg:block">
                <button
                  className="flex items-center justify-between w-full lg:pointer-events-none"
                  onClick={() => setFiltersOpen(!filtersOpen)}
                >
                  <CardTitle className="text-base sm:text-lg lg:text-xl flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 lg:hidden" />
                    Filters
                  </CardTitle>
                  <ChevronUp className={`h-4 w-4 lg:hidden transition-transform ${filtersOpen ? '' : 'rotate-180'}`} />
                </button>
              </CardHeader>
              <CardContent className={`p-3 sm:p-6 pt-0 sm:pt-0 space-y-4 sm:space-y-6 filters-collapsible ${filtersOpen ? '' : 'collapsed'} lg:!max-h-none lg:!overflow-visible`}>
                <div>
                  <h4 className="font-medium mb-2 sm:mb-3 text-sm">Category</h4>
                  <div className="flex flex-wrap lg:flex-col gap-1 sm:gap-2">
                    <Button
                      variant={selectedCuisine === "" ? "default" : "ghost"}
                      size="sm"
                      className="lg:w-full justify-start min-h-11 sm:min-h-9"
                      onClick={() => handleCuisineFilter("")}
                      data-testid="button-cuisine-all"
                    >
                      All Categories
                    </Button>
                    {cuisines.map((cuisine: string) => (
                      <Button
                        key={cuisine}
                        variant={selectedCuisine === cuisine ? "default" : "ghost"}
                        size="sm"
                        className="lg:w-full justify-start min-h-11 sm:min-h-9"
                        onClick={() => handleCuisineFilter(cuisine)}
                        data-testid={`button-cuisine-${cuisine.toLowerCase()}`}
                      >
                        {cuisine}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2 sm:mb-3 text-sm">Price Range</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="under-15"
                        checked={priceFilters.includes("under-15")}
                        onCheckedChange={(checked) => handlePriceFilterChange("under-15", checked as boolean)}
                        data-testid="checkbox-price-under-15"
                      />
                      <label htmlFor="under-15" className="text-sm">₹ (Under ₹500)</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="15-30"
                        checked={priceFilters.includes("15-30")}
                        onCheckedChange={(checked) => handlePriceFilterChange("15-30", checked as boolean)}
                        data-testid="checkbox-price-15-30"
                      />
                      <label htmlFor="15-30" className="text-sm">₹₹ (₹500-1000)</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="30-plus"
                        checked={priceFilters.includes("30-plus")}
                        onCheckedChange={(checked) => handlePriceFilterChange("30-plus", checked as boolean)}
                        data-testid="checkbox-price-30-plus"
                      />
                      <label htmlFor="30-plus" className="text-sm">₹₹₹ (₹1000+)</label>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2 sm:mb-3 text-sm">Rating</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="4.5-plus"
                        checked={ratingFilter === "4.5+"}
                        onCheckedChange={(checked) => setRatingFilter(checked ? "4.5+" : "")}
                        data-testid="checkbox-rating-4.5"
                      />
                      <label htmlFor="4.5-plus" className="text-sm">4.5+ ⭐</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="4.0-plus"
                        checked={ratingFilter === "4.0+"}
                        onCheckedChange={(checked) => setRatingFilter(checked ? "4.0+" : "")}
                        data-testid="checkbox-rating-4.0"
                      />
                      <label htmlFor="4.0-plus" className="text-sm">4.0+ ⭐</label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-3 mb-3 sm:mb-6">
              <h2 className="text-lg sm:text-2xl font-bold" data-testid="text-restaurants-title">
                {selectedCuisine ? `${selectedCuisine} Products` : "All District Unions"}
              </h2>
              <Select value={sortBy} onValueChange={setSortBy} data-testid="select-sort-by">
                <SelectTrigger className="w-full sm:w-48 h-9 sm:h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Sort by: Relevance</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="delivery-time">Delivery Time</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 lg:gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-card rounded-lg h-64 animate-pulse" />
                ))}
              </div>
            ) : sortedRestaurants.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <p className="text-muted-foreground" data-testid="text-no-restaurants">
                  No District Unions found matching your criteria.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6" data-testid="restaurants-grid">
                {sortedRestaurants.map((restaurant: Restaurant) => (
                  <UnionCard key={restaurant.id} restaurant={restaurant} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
