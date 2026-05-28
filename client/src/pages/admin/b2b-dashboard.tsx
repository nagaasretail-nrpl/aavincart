import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AdminLayout from "./layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Users, Search, Building, Package, TrendingUp, ArrowRight, ChevronRight, Loader2 } from "lucide-react";

interface B2BStats {
  totalB2B: number;
  totalB2C: number;
  totalAll: number;
  byRole: Record<string, number>;
  byStatus: { pending: number; approved: number; rejected: number; inactive: number };
  byUnion: Record<string, { name: string; count: number }>;
  recentRegistrations: number;
  pendingApprovals: number;
}

interface LookupUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  businessType: string;
  businessCode: string;
  businessName: string;
  gstNumber: string;
  status: string;
  unionId: string;
  pricingRole: string;
  freshMilkPricingRole: string;
  productsPricingRole: string;
  iceCreamPricingRole: string;
  createdAt: string;
}

interface RecentOrder {
  id: string;
  displayId: string;
  total: number;
  status: string;
  segment: string;
  createdAt: string;
}

interface LookupResult {
  user: LookupUser;
  unionName: string;
  ordersSummary: {
    totalOrders: number;
    totalRevenue: number;
    lastOrderDate: string;
    bySegment: Record<string, number>;
    recentOrders: RecentOrder[];
  };
  hierarchy: {
    parents: { id: string; name: string; role: string; email: string }[];
    children: { id: string; name: string; role: string; email: string; status: string }[];
  };
}

const ROLE_LABELS: Record<string, string> = {
  wsd: "WSD",
  dealer: "Dealer",
  retailer: "Retailer",
  mpcs: "MPCS",
  hotel: "Hotel",
  institution: "Institution",
  private_parlour: "Private Parlour",
  union_parlour: "Union Parlour",
  general_shop: "General Shop",
  wholesale_dealer: "WSD",
  fmd: "Fresh Milk Dealer",
  inter_union: "Inter Union",
  federation: "Federation",
};

const STATUS_COLORS: Record<string, string> = {
  approved: "bg-green-100 text-green-800",
  active: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  rejected: "bg-red-100 text-red-800",
  inactive: "bg-gray-100 text-gray-800",
};

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatisticsTab() {
  const { data: stats, isLoading } = useQuery<B2BStats>({
    queryKey: ["/api/admin/b2b-stats"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!stats) {
    return <p className="text-center text-gray-500 py-10">No statistics available.</p>;
  }

  const roleOrder = ["wsd", "dealer", "retailer", "mpcs", "hotel", "institution", "private_parlour", "union_parlour", "general_shop"];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total B2B Users</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalB2B}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Building className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total B2C Users</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalB2C}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Approvals</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pendingApprovals}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">New Registrations (30d)</p>
                <p className="text-3xl font-bold text-purple-600">{stats.recentRegistrations}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building className="h-5 w-5" />
          By Role / Business Type
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {roleOrder.map((role) => (
            <Card key={role}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{stats.byRole[role] || 0}</p>
                <p className="text-xs text-gray-500 mt-1">{ROLE_LABELS[role] || role}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          By Status
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(["approved", "pending", "rejected", "inactive"] as const).map((status) => (
            <Card key={status}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{stats.byStatus[status] || 0}</p>
                <Badge className={`mt-2 ${STATUS_COLORS[status]}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          By Union
        </h3>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Union Name</TableHead>
                  <TableHead className="text-right">User Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(stats.byUnion).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-gray-500 py-6">
                      No union data available
                    </TableCell>
                  </TableRow>
                ) : (
                  Object.entries(stats.byUnion)
                    .sort((a, b) => b[1].count - a[1].count)
                    .map(([unionId, data]) => (
                      <TableRow key={unionId}>
                        <TableCell className="font-medium">{data.name}</TableCell>
                        <TableCell className="text-right">{data.count}</TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function UserLookupTab() {
  const [searchCode, setSearchCode] = useState("");
  const [lookupCode, setLookupCode] = useState("");
  const { toast } = useToast();

  const { data: result, isLoading, isError } = useQuery<LookupResult>({
    queryKey: ["/api/admin/b2b-lookup", lookupCode],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/b2b-lookup/${encodeURIComponent(lookupCode)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "User not found");
      }
      return res.json();
    },
    enabled: !!lookupCode,
    retry: false,
  });

  const handleSearch = () => {
    const trimmed = searchCode.trim();
    if (!trimmed) {
      toast({ title: "Please enter a search term", variant: "destructive" });
      return;
    }
    setLookupCode(trimmed);
  };

  const user = result?.user;
  const ordersSummary = result?.ordersSummary;
  const hierarchy = result?.hierarchy;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            B2B User Profile Lookup
          </CardTitle>
          <CardDescription>Search by Business Code, Email, Phone, or Name</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="Enter Business Code, Email, Phone, or Name"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {isError && lookupCode && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 font-medium">User not found</p>
            <p className="text-sm text-red-500 mt-1">No B2B user matches "{lookupCode}"</p>
          </CardContent>
        </Card>
      )}

      {user && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                User Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Name</p>
                  <p className="font-medium">{user.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="font-medium">{user.email || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="font-medium">{user.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Role</p>
                  <p className="font-medium">{ROLE_LABELS[user.role] || user.role}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Business Type</p>
                  <p className="font-medium">{user.businessType || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Business Code</p>
                  <p className="font-medium">{user.businessCode || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Business Name</p>
                  <p className="font-medium">{user.businessName || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">GST Number</p>
                  <p className="font-medium">{user.gstNumber || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <Badge className={STATUS_COLORS[user.status] || "bg-gray-100 text-gray-800"}>
                    {user.status?.charAt(0).toUpperCase() + user.status?.slice(1)}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Union</p>
                  <p className="font-medium">{result?.unionName || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Created At</p>
                  <p className="font-medium">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Pricing Tiers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Fresh Milk</p>
                  <Badge variant="outline" className="text-sm">{user.freshMilkPricingRole || "—"}</Badge>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Products</p>
                  <Badge variant="outline" className="text-sm">{user.productsPricingRole || "—"}</Badge>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Ice Cream</p>
                  <Badge variant="outline" className="text-sm">{user.iceCreamPricingRole || "—"}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {ordersSummary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500">Total Orders</p>
                    <p className="text-2xl font-bold">{ordersSummary.totalOrders}</p>
                  </div>
                  <div className="border rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(ordersSummary.totalRevenue)}</p>
                  </div>
                  <div className="border rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500">Last Order</p>
                    <p className="text-sm font-medium">{ordersSummary.lastOrderDate ? new Date(ordersSummary.lastOrderDate).toLocaleDateString() : "—"}</p>
                  </div>
                </div>

                {ordersSummary.bySegment && Object.keys(ordersSummary.bySegment).length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Revenue by Segment</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {Object.entries(ordersSummary.bySegment).map(([segment, amt]) => (
                        <div key={segment} className="flex items-center justify-between border rounded-lg p-3">
                          <span className="text-sm text-gray-600">{segment}</span>
                          <span className="font-semibold">{formatCurrency(amt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {ordersSummary.recentOrders && ordersSummary.recentOrders.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Recent Orders</p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Segment</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ordersSummary.recentOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">{order.displayId || order.id}</TableCell>
                            <TableCell>{order.segment}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{order.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(order.total)}</TableCell>
                            <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {hierarchy && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Hierarchy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <ArrowRight className="h-4 w-4" />
                    Parents (Reports To)
                  </p>
                  {hierarchy.parents && hierarchy.parents.length > 0 ? (
                    <div className="space-y-2">
                      {hierarchy.parents.map((p) => (
                        <div key={p.id} className="flex items-center gap-3 border rounded-lg p-3">
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium text-sm">{p.name}</p>
                            <p className="text-xs text-gray-500">{ROLE_LABELS[p.role] || p.role} · {p.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No parent relationships</p>
                  )}
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <ArrowRight className="h-4 w-4" />
                    Children (Reports to Them)
                  </p>
                  {hierarchy.children && hierarchy.children.length > 0 ? (
                    <div className="space-y-2">
                      {hierarchy.children.map((c) => (
                        <div key={c.id} className="flex items-center justify-between border rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="font-medium text-sm">{c.name}</p>
                              <p className="text-xs text-gray-500">{ROLE_LABELS[c.role] || c.role} · {c.email}</p>
                            </div>
                          </div>
                          <Badge className={STATUS_COLORS[c.status] || "bg-gray-100 text-gray-800"}>
                            {c.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No child relationships</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

export default function B2BDashboard() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">B2B Dashboard</h1>
          <p className="text-gray-600">User statistics and profile lookup</p>
        </div>

        <Tabs defaultValue="statistics" className="w-full">
          <TabsList>
            <TabsTrigger value="statistics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Statistics
            </TabsTrigger>
            <TabsTrigger value="lookup" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              User Lookup
            </TabsTrigger>
          </TabsList>
          <TabsContent value="statistics" className="mt-4">
            <StatisticsTab />
          </TabsContent>
          <TabsContent value="lookup" className="mt-4">
            <UserLookupTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
