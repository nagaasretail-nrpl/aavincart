import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, DollarSign, ShoppingCart, Users, TrendingUp, Download, Search, Calendar } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "./layout";

interface SalesSummary {
  totalB2CRevenue: number;
  totalB2BRevenue: number;
  totalB2COrders: number;
  totalB2BOrders: number;
  totalRevenue: number;
  totalOrders: number;
}

interface UserSale {
  name: string;
  email: string;
  role: string;
  businessType: string;
  unionId: string;
  orderCount: number;
  totalRevenue: number;
  lastOrderDate: string;
}

interface DailySale {
  date: string;
  b2c: number;
  b2b: number;
  total: number;
  orders: number;
}

interface SalesAnalyticsData {
  summary: SalesSummary;
  userSales: UserSale[];
  dailySales: DailySale[];
}

interface Merchant {
  id: number;
  name: string;
  [key: string]: any;
}

type SortField = "name" | "email" | "role" | "businessType" | "orderCount" | "totalRevenue" | "lastOrderDate";
type SortDir = "asc" | "desc";

function getDateRange(preset: string): { start: string; end: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const end = fmt(today);

  if (preset === "today") return { start: end, end };
  if (preset === "week") {
    const d = new Date(today);
    d.setDate(d.getDate() - 6);
    return { start: fmt(d), end };
  }
  if (preset === "month") {
    const d = new Date(today);
    d.setDate(d.getDate() - 29);
    return { start: fmt(d), end };
  }
  return { start: end, end };
}

const formatCurrency = (val: number) => `₹${val.toLocaleString("en-IN")}`;

export default function SalesAnalyticsPage() {
  const { toast } = useToast();
  const [datePreset, setDatePreset] = useState("month");
  const [startDate, setStartDate] = useState(() => getDateRange("month").start);
  const [endDate, setEndDate] = useState(() => getDateRange("month").end);
  const [roleFilter, setRoleFilter] = useState("all");
  const [unionFilter, setUnionFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("totalRevenue");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { data: authData } = useQuery<{ user?: { isGlobalAdmin?: boolean; merchantId?: string } }>({
    queryKey: ["/api/auth/me"],
  });
  const isGlobalAdmin = authData?.user?.isGlobalAdmin ?? true;

  useEffect(() => {
    document.title = "Sales Analytics - Aavin Cart Admin";
  }, []);

  useEffect(() => {
    if (datePreset !== "custom") {
      const range = getDateRange(datePreset);
      setStartDate(range.start);
      setEndDate(range.end);
    }
  }, [datePreset]);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (roleFilter && roleFilter !== "all") params.set("role", roleFilter);
    if (unionFilter && unionFilter !== "all") params.set("unionId", unionFilter);
    return params.toString();
  }, [startDate, endDate, roleFilter, unionFilter]);

  const { data, isLoading } = useQuery<SalesAnalyticsData>({
    queryKey: ["/api/admin/sales-analytics", queryParams],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/sales-analytics?${queryParams}`);
      return res.json();
    },
  });

  const { data: merchants } = useQuery<Merchant[]>({
    queryKey: ["/api/merchants"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/merchants");
      return res.json();
    },
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  };

  const filteredAndSortedUsers = useMemo(() => {
    let users = data?.userSales || [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      users = users.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.role?.toLowerCase().includes(q) ||
          u.businessType?.toLowerCase().includes(q)
      );
    }
    return [...users].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      if (sortField === "lastOrderDate") {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [data?.userSales, searchQuery, sortField, sortDir]);

  const summary = data?.summary;
  const dailySales = data?.dailySales || [];

  const maxDailyTotal = useMemo(() => Math.max(...dailySales.map((d) => d.total), 1), [dailySales]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-blue-600" />
              Sales Analytics
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Revenue and order insights across channels</p>
          </div>
          <Button
            variant="outline"
            onClick={() => toast({ title: "Export", description: "Export feature coming soon." })}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-end">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Date Range</p>
                <Tabs value={datePreset} onValueChange={setDatePreset}>
                  <TabsList>
                    <TabsTrigger value="today">Today</TabsTrigger>
                    <TabsTrigger value="week">Week</TabsTrigger>
                    <TabsTrigger value="month">Month</TabsTrigger>
                    <TabsTrigger value="custom">Custom</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              {datePreset === "custom" && (
                <div className="flex gap-2 items-center">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Start</p>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">End</p>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
                    </div>
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Role</p>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="B2C">B2C</SelectItem>
                    <SelectItem value="B2B">B2B</SelectItem>
                    <SelectItem value="WSD">WSD</SelectItem>
                    <SelectItem value="Dealer">Dealer</SelectItem>
                    <SelectItem value="Retailer">Retailer</SelectItem>
                    <SelectItem value="Parlour">Parlour</SelectItem>
                    <SelectItem value="Institution">Institution</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isGlobalAdmin && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Union</p>
                <Select value={unionFilter} onValueChange={setUnionFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Unions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Unions</SelectItem>
                    {(merchants || []).map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              )}
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-3" />
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Total Revenue</p>
                      <p className="text-2xl font-bold mt-1">{formatCurrency(summary?.totalRevenue || 0)}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-green-600 dark:text-green-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">B2C Revenue</p>
                      <p className="text-2xl font-bold mt-1">{formatCurrency(summary?.totalB2CRevenue || 0)}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <Users className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">B2B Revenue</p>
                      <p className="text-2xl font-bold mt-1">{formatCurrency(summary?.totalB2BRevenue || 0)}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Total Orders</p>
                      <p className="text-2xl font-bold mt-1">{(summary?.totalOrders || 0).toLocaleString("en-IN")}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                      <ShoppingCart className="h-6 w-6 text-orange-600 dark:text-orange-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-cyan-500 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">B2C Orders</p>
                      <p className="text-2xl font-bold mt-1">{(summary?.totalB2COrders || 0).toLocaleString("en-IN")}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-cyan-100 dark:bg-cyan-900 flex items-center justify-center">
                      <ShoppingCart className="h-6 w-6 text-cyan-600 dark:text-cyan-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-pink-500 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">B2B Orders</p>
                      <p className="text-2xl font-bold mt-1">{(summary?.totalB2BOrders || 0).toLocaleString("en-IN")}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-pink-100 dark:bg-pink-900 flex items-center justify-center">
                      <ShoppingCart className="h-6 w-6 text-pink-600 dark:text-pink-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Daily Sales
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dailySales.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-[120px_1fr_100px_100px_100px_60px] gap-2 text-xs font-medium text-muted-foreground border-b pb-2">
                      <span>Date</span>
                      <span>Bar</span>
                      <span className="text-right">B2C</span>
                      <span className="text-right">B2B</span>
                      <span className="text-right">Total</span>
                      <span className="text-right">Orders</span>
                    </div>
                    {dailySales.map((day) => {
                      const pct = (day.total / maxDailyTotal) * 100;
                      const b2cPct = day.total > 0 ? (day.b2c / day.total) * pct : 0;
                      const b2bPct = pct - b2cPct;
                      return (
                        <div key={day.date} className="grid grid-cols-[120px_1fr_100px_100px_100px_60px] gap-2 items-center text-sm">
                          <span className="text-muted-foreground text-xs">
                            {new Date(day.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                          </span>
                          <div className="h-6 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden flex">
                            {b2cPct > 0 && (
                              <div className="h-full bg-blue-500" style={{ width: `${b2cPct}%` }} />
                            )}
                            {b2bPct > 0 && (
                              <div className="h-full bg-purple-500" style={{ width: `${b2bPct}%` }} />
                            )}
                          </div>
                          <span className="text-right text-xs">{formatCurrency(day.b2c)}</span>
                          <span className="text-right text-xs">{formatCurrency(day.b2b)}</span>
                          <span className="text-right text-xs font-medium">{formatCurrency(day.total)}</span>
                          <span className="text-right text-xs">
                            <Badge variant="secondary">{day.orders}</Badge>
                          </span>
                        </div>
                      );
                    })}
                    <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded inline-block" /> B2C</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-500 rounded inline-block" /> B2B</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No daily sales data available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    User-wise Sales
                  </CardTitle>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredAndSortedUsers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="cursor-pointer hover:text-foreground" onClick={() => handleSort("name")}>
                            Name{sortIndicator("name")}
                          </TableHead>
                          <TableHead className="cursor-pointer hover:text-foreground" onClick={() => handleSort("email")}>
                            Email{sortIndicator("email")}
                          </TableHead>
                          <TableHead className="cursor-pointer hover:text-foreground" onClick={() => handleSort("role")}>
                            Role{sortIndicator("role")}
                          </TableHead>
                          <TableHead className="cursor-pointer hover:text-foreground" onClick={() => handleSort("businessType")}>
                            Business Type{sortIndicator("businessType")}
                          </TableHead>
                          <TableHead>Union</TableHead>
                          <TableHead className="text-right cursor-pointer hover:text-foreground" onClick={() => handleSort("orderCount")}>
                            Orders{sortIndicator("orderCount")}
                          </TableHead>
                          <TableHead className="text-right cursor-pointer hover:text-foreground" onClick={() => handleSort("totalRevenue")}>
                            Revenue{sortIndicator("totalRevenue")}
                          </TableHead>
                          <TableHead className="cursor-pointer hover:text-foreground" onClick={() => handleSort("lastOrderDate")}>
                            Last Order{sortIndicator("lastOrderDate")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAndSortedUsers.map((user, idx) => {
                          const unionName = merchants?.find((m) => String(m.id) === String(user.unionId))?.name || user.unionId || "-";
                          return (
                            <TableRow key={`${user.email}-${idx}`}>
                              <TableCell className="font-medium">{user.name || "-"}</TableCell>
                              <TableCell className="text-muted-foreground text-xs">{user.email || "-"}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{user.role || "-"}</Badge>
                              </TableCell>
                              <TableCell>{user.businessType || "-"}</TableCell>
                              <TableCell className="text-xs">{unionName}</TableCell>
                              <TableCell className="text-right">{user.orderCount}</TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(user.totalRevenue)}</TableCell>
                              <TableCell className="text-xs">
                                {user.lastOrderDate
                                  ? new Date(user.lastOrderDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                                  : "-"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No user sales data available</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}