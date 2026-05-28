import { useState, useEffect } from "react";
import { MapPin, Loader2, ChevronDown } from "lucide-react";
import customerLogo from "@assets/aavin-logo.png";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import UnionCard from "@/components/union-card";
import { useLocation, DISTRICT_UNIONS } from "@/lib/location-context";
import { useAuth } from "@/lib/auth-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Restaurant } from "@shared/schema";

const categoryImages: Record<string, string> = {
  Milk: "/categories/milk.jpg",
  Curd: "/categories/curd.jpg",
  Paneer: "/categories/paneer.jpg",
  Butter: "/categories/butter.jpg",
  Ghee: "/categories/ghee.jpg",
  Buttermilk: "/categories/buttermilk.jpg",
  "Ice Cream": "/categories/ice-cream.jpg",
  Sweets: "/categories/sweets.jpg",
};

const B2B_ROLES = ['dealer', 'wholesale_dealer', 'wsd', 'retailer', 'b2b', 'fmd'];

export default function Home() {
  const { detectedUnion, isDetecting, detectedAddress, setManualUnion, locationError, isManualSelection } = useLocation();
  const { user } = useAuth();
  const [showUnionSelector, setShowUnionSelector] = useState(false);

  const { data: restaurants = [], isLoading } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
  });

  // For B2B users (dealers, WSD, etc.) auto-select their assigned union so the home
  // page always shows their union, not whatever GPS detects.
  useEffect(() => {
    if (!user) return;
    const role = (user.role || '').toLowerCase();
    const restaurantId = user.restaurantId;
    if (B2B_ROLES.includes(role) && restaurantId) {
      const union = DISTRICT_UNIONS.find(u => u.id === restaurantId);
      if (union && detectedUnion?.id !== restaurantId) {
        setManualUnion(restaurantId);
      }
    }
  }, [user?.id]);

  const { data: cuisines = [] } = useQuery<string[]>({
    queryKey: ["/api/cuisines"],
  });

  // Get the detected District Union based on GPS location - strictly by ID
  const detectedRestaurant = detectedUnion && !isLoading
    ? restaurants.find((r: Restaurant) => r.id === detectedUnion.id)
    : null;

  // Featured restaurants for fallback (all unions)
  const featuredRestaurants = restaurants.slice(0, 6);

  // Use only the GPS-detected or user-manually-selected union.
  // Never fall back to a hardcoded union — show all unions if location is unknown.
  const displayRestaurant = detectedRestaurant || null;

  // Determine which sections to show
  const showDetectedUnion = !isLoading && !!displayRestaurant;
  const showLoadingLocation = isLoading;
  const showFallbackUnions = !isLoading && !displayRestaurant;

  return (
    <div className="min-h-screen page-content">
      <section className="relative w-full overflow-hidden bg-gradient-to-br from-[#1E3A5F] via-[#4AB3E8] to-[#8CC63F]">
        <video
          className="w-full h-auto max-h-[30vh] sm:max-h-[40vh] md:max-h-[55vh] object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          poster={customerLogo}
        >
          <source src="/aavin-hero-video.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-[#1E3A5F]/80 via-[#1E3A5F]/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-10">
          <div className="max-w-7xl mx-auto">
            <span className="inline-flex items-center gap-1.5 bg-[#4AB3E8]/60 backdrop-blur-sm text-white text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider mb-2">
              TCMPF - Since 1981
            </span>
            <h1 className="text-white text-xl sm:text-3xl md:text-4xl font-bold leading-tight drop-shadow-md">
              Fresh From Farm to You
            </h1>
            <p className="text-white/90 text-xs sm:text-sm md:text-base mt-1 max-w-xl">
              Pure milk &amp; dairy products delivered daily from 3.85 lakh farmers across Tamil Nadu
            </p>
          </div>
        </div>
      </section>


      {/* Cuisine Categories - Hidden per user request */}
      {/* 
      <section className="py-8 sm:py-12 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8" data-testid="text-cuisine-section-title">
            Browse by Category
          </h2>
          
          <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-6">
            {cuisines.map((category: string) => (
              <Link key={category} href={`/unions?cuisine=${encodeURIComponent(category)}`}>
                <div className="text-center group cursor-pointer p-2 sm:p-3 rounded-xl hover:bg-muted/50 active:bg-muted transition-colors" data-testid={`cuisine-category-${category.toLowerCase()}`}>
                  <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-3 rounded-full overflow-hidden shadow-md group-hover:shadow-lg transition-shadow bg-white">
                    <img
                      src={categoryImages[category as keyof typeof categoryImages] || categoryImages.Milk}
                      alt={`${category} products`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      data-testid={`img-cuisine-${category.toLowerCase()}`}
                    />
                  </div>
                  <h3 className="font-medium text-xs sm:text-sm leading-tight" data-testid={`text-cuisine-name-${category.toLowerCase()}`}>
                    {category}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      */}

      {/* Loading State - Detecting location */}
      {showLoadingLocation && (
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Detecting your location...</p>
            </div>
          </div>
        </section>
      )}

      {/* Detected District Union - Show the one union based on GPS location */}
      {showDetectedUnion && (
        <section className="py-5 sm:py-8 md:py-12 bg-primary/5">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-2">
              <div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold" data-testid="text-your-union-title">
                  Your District Union
                </h2>
                <p className="text-muted-foreground text-xs sm:text-sm md:text-base mt-1 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  {isManualSelection
                    ? `Selected: ${detectedAddress}`
                    : (detectedAddress ? `Based on your location: ${detectedAddress}` : `Nearest union: ${displayRestaurant?.name || ''}`)}
                </p>
                {locationError && (
                  <p className="text-amber-600 text-xs mt-1">Location access blocked — please select your union below</p>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowUnionSelector(!showUnionSelector)}
                className="flex items-center gap-1"
              >
                Change Union <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
            
            {showUnionSelector && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-white rounded-lg border shadow-sm">
                <p className="text-xs sm:text-sm text-muted-foreground mb-2">Select your District Union:</p>
                <Select 
                  value={detectedUnion?.id || ""} 
                  onValueChange={(value) => {
                    setManualUnion(value);
                    setShowUnionSelector(false);
                  }}
                >
                  <SelectTrigger className="w-full sm:max-w-md">
                    <SelectValue placeholder="Choose a District Union" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {DISTRICT_UNIONS.map((union) => (
                      <SelectItem key={union.id} value={union.id}>
                        {union.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 lg:gap-6" data-testid="detected-union">
              <UnionCard restaurant={displayRestaurant!} />
            </div>
            
            <div className="mt-6 text-center">
              <Link href="/unions">
                <Button variant="outline" size="sm" data-testid="button-view-all-unions">
                  View All District Unions
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Fallback - Show featured unions when location detection fails */}
      {showFallbackUnions && (
        <section className="py-8 sm:py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold" data-testid="text-featured-section-title">
                District Unions Near You
              </h2>
              <Link href="/unions">
                <Button variant="outline" size="sm" className="h-10 px-4" data-testid="button-view-all">
                  View All
                </Button>
              </Link>
            </div>
            
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 lg:gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-card rounded-lg h-64 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 lg:gap-6" data-testid="featured-restaurants">
                {featuredRestaurants.map((restaurant: Restaurant) => (
                  <UnionCard key={restaurant.id} restaurant={restaurant} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="py-8 sm:py-12 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-6 sm:mb-10">
            Join <span className="text-[#4AB3E8]">Aavincart</span>
          </h2>
          
          <div className="hidden md:grid md:grid-cols-3 gap-5 lg:gap-6">
            <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-48 overflow-hidden">
                <img
                  src="/join/district-union.jpg"
                  alt="Join as District Union"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
              <div className="p-6 text-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Join as a District Union
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Discover the advantages of partnering with TCMPF and expand your dairy distribution network.
                </p>
                <Link href="/union/signup">
                  <Button className="w-full bg-[#8CC63F] hover:bg-[#7ab835] text-white font-medium h-11">
                    Signup now
                  </Button>
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-48 overflow-hidden">
                <img
                  src="/join/customer-ordering.jpg"
                  alt="Order Fresh Milk & Products"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
              <div className="p-6 text-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Order Fresh Milk & Dairy Products
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Enjoy fresh milk and quality dairy products delivered to your doorstep from Tamil Nadu's cooperative network.
                </p>
                <Link href="/signup">
                  <Button className="w-full bg-[#8CC63F] hover:bg-[#7ab835] text-white font-medium h-11">
                    Signup now
                  </Button>
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-48 overflow-hidden">
                <img
                  src="/join/delivery-partner.jpg"
                  alt="Join as Delivery Partner"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
              <div className="p-6 text-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Join as a Delivery Partner
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Start earning extra income by delivering fresh dairy products. Enjoy great rates and benefits.
                </p>
                <Link href="/driver/signup">
                  <Button className="w-full bg-[#F97316] hover:bg-[#ea6c0f] text-white font-medium h-11">
                    Register now!
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 md:hidden">
            <Link href="/union/signup">
              <div className="bg-gradient-to-br from-[#4AB3E8]/15 to-[#4AB3E8]/25 border border-[#4AB3E8]/30 rounded-xl p-3 sm:p-4 text-center hover:shadow-xl hover:from-[#4AB3E8]/25 hover:to-[#4AB3E8]/35 transition-all cursor-pointer group active:scale-[0.97]">
                <div className="w-10 h-10 sm:w-11 sm:h-11 mx-auto mb-2 bg-[#4AB3E8]/20 rounded-full flex items-center justify-center group-hover:bg-[#4AB3E8]/30 transition-colors">
                  <span className="text-base sm:text-lg">🏭</span>
                </div>
                <h3 className="text-[11px] sm:text-xs font-semibold text-[#2a7ab5]">Union</h3>
                <p className="text-[9px] sm:text-[10px] text-[#4AB3E8]">Join</p>
              </div>
            </Link>

            <Link href="/signup">
              <div className="bg-gradient-to-br from-[#4AB3E8]/15 to-[#4AB3E8]/25 border border-[#4AB3E8]/30 rounded-xl p-3 sm:p-4 text-center hover:shadow-xl hover:from-[#4AB3E8]/25 hover:to-[#4AB3E8]/35 transition-all cursor-pointer group active:scale-[0.97]">
                <div className="w-10 h-10 sm:w-11 sm:h-11 mx-auto mb-2 bg-[#4AB3E8]/20 rounded-full flex items-center justify-center group-hover:bg-[#4AB3E8]/30 transition-colors">
                  <span className="text-base sm:text-lg">🛒</span>
                </div>
                <h3 className="text-[11px] sm:text-xs font-semibold text-[#2a7ab5]">Order</h3>
                <p className="text-[9px] sm:text-[10px] text-[#4AB3E8]">Milk</p>
              </div>
            </Link>

            <Link href="/delivery-partner/register">
              <div className="bg-gradient-to-br from-[#4AB3E8]/15 to-[#4AB3E8]/25 border border-[#4AB3E8]/30 rounded-xl p-3 sm:p-4 text-center hover:shadow-xl hover:from-[#4AB3E8]/25 hover:to-[#4AB3E8]/35 transition-all cursor-pointer group active:scale-[0.97]">
                <div className="w-10 h-10 sm:w-11 sm:h-11 mx-auto mb-2 bg-[#4AB3E8]/20 rounded-full flex items-center justify-center group-hover:bg-[#4AB3E8]/30 transition-colors">
                  <span className="text-base sm:text-lg">🚚</span>
                </div>
                <h3 className="text-[11px] sm:text-xs font-semibold text-[#2a7ab5]">Delivery</h3>
                <p className="text-[9px] sm:text-[10px] text-[#4AB3E8]">Partner</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-4 sm:py-6 bg-gray-100 pb-24 sm:pb-6">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 text-xs sm:text-sm">
            <Link href="/login?tab=customer">
              <span className="text-gray-600 hover:text-[#4AB3E8] transition-colors cursor-pointer">
                Admin Portal
              </span>
            </Link>
            <span className="text-gray-400">|</span>
            <Link href="/login?tab=staff">
              <span className="text-gray-600 hover:text-[#4AB3E8] transition-colors cursor-pointer">
                Union Portal
              </span>
            </Link>
            <span className="text-gray-400">|</span>
            <Link href="/login?tab=delivery">
              <span className="text-gray-600 hover:text-[#4AB3E8] transition-colors cursor-pointer">
                Delivery Partner Portal
              </span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
