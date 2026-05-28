import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import MerchantLayout from "./layout";
import { useMerchantContext } from "./context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Package, Search, Filter } from "lucide-react";

const SEGMENT_TABS = ["All", "Fresh Milk", "Products", "Ice Cream"] as const;

function formatINR(price: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

function ProductsContent() {
  const { merchantId } = useMerchantContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSegment, setActiveSegment] = useState<string>("All");

  const { data: products = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/menu-items", { merchantId }],
    queryFn: async () => {
      const res = await fetch(`/api/menu-items?merchantId=${merchantId}`);
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
    enabled: !!merchantId,
  });

  const filteredProducts = useMemo(() => {
    let items = products;
    if (activeSegment !== "All") {
      items = items.filter(
        (p: any) =>
          p.category?.toLowerCase() === activeSegment.toLowerCase() ||
          p.segment?.toLowerCase() === activeSegment.toLowerCase()
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((p: any) => p.name?.toLowerCase().includes(q));
    }
    return items;
  }, [products, activeSegment, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Product Catalog
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""} assigned to your union (read-only — managed by Admin)
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filter</span>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {SEGMENT_TABS.map((tab) => (
          <Button
            key={tab}
            variant={activeSegment === tab ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveSegment(tab)}
            className="whitespace-nowrap"
          >
            {tab}
          </Button>
        ))}
      </div>

      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
            No products found
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {searchQuery || activeSegment !== "All"
              ? "Try adjusting your search or filter."
              : "No products have been added yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product: any) => (
            <Card key={product.id} className="overflow-hidden">
              <div className="aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                {product.image || product.imageUrl ? (
                  <img
                    src={product.image || product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                )}
              </div>
              <CardContent className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                    {product.name}
                  </h3>
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-1">
                    {formatINR(product.price || 0)}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    {product.category || product.segment || "General"}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {product.available !== false ? "Available" : "Unavailable"}
                    </span>
                    <Switch
                      checked={product.available !== false}
                      disabled
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MerchantProducts() {
  return (
    <MerchantLayout>
      <ProductsContent />
    </MerchantLayout>
  );
}
