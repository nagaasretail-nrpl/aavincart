import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LogIn, UserPlus, ShoppingCart, Users, Activity, Clock, TrendingUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import AdminLayout from "./layout";

interface PerformanceData {
  range: string;
  summary: {
    signedInUsers: number;
    uniqueSignedInUsers: number;
    newSignups: number;
    ordersPlaced: number;
  };
  loginsByRole: Record<string, number>;
  hourlyActivity: Record<string, number>;
  recentActivity: {
    id: number;
    eventType: string;
    userName: string | null;
    userRole: string | null;
    userEmail: string | null;
    metadata: any;
    createdAt: string | null;
  }[];
}

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  login: { label: "Sign In", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  signup: { label: "Sign Up", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  order_placed: { label: "Order Placed", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
};

const ROLE_LABELS: Record<string, string> = {
  customer: "Customer",
  agent: "B2B Agent",
  admin: "Admin",
  union_staff: "Union Staff",
  restaurant: "District Union",
  driver: "Driver",
  viewer: "Viewer",
  MRP: "MRP",
};

export default function AppPerformancePage() {
  const [range, setRange] = useState("today");

  useEffect(() => {
    document.title = "App Performance - Aavin Cart Admin";
    const seoTags: Record<string, string> = {
      description: "Track user sign-ins, sign-ups, orders, and activity metrics for Aavin Cart platform.",
      "og:title": "App Performance - Aavin Cart Admin",
      "og:description": "Track user sign-ins, sign-ups, orders, and activity metrics for Aavin Cart platform.",
      "og:type": "website",
    };
    Object.entries(seoTags).forEach(([name, content]) => {
      const attr = name.startsWith("og:") ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (el) {
        el.setAttribute("content", content);
      } else {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        el.setAttribute("content", content);
        document.head.appendChild(el);
      }
    });
  }, []);

  const { data, isLoading } = useQuery<PerformanceData>({
    queryKey: ["/api/admin/app-performance", range],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/app-performance?range=${range}`);
      return res.json();
    },
    refetchInterval: 60000,
  });

  const rangeLabel = range === "today" ? "Today" : range === "yesterday" ? "Yesterday" : range === "week" ? "Last 7 Days" : "Last 30 Days";

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  };

  const maxHourly = data ? Math.max(...Object.values(data.hourlyActivity), 1) : 1;

  return (
    <AdminLayout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-600" />
            App Performance
          </h1>
          <p className="text-muted-foreground text-sm mt-1">User activity and engagement metrics</p>
        </div>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="week">Last 7 Days</SelectItem>
            <SelectItem value="month">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-3" />
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Signed-in Users</p>
                    <p className="text-3xl font-bold mt-1">{data?.summary.uniqueSignedInUsers || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">{data?.summary.signedInUsers || 0} total sign-ins</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <LogIn className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">New Sign-ups</p>
                    <p className="text-3xl font-bold mt-1">{data?.summary.newSignups || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">{rangeLabel}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <UserPlus className="h-6 w-6 text-green-600 dark:text-green-300" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Orders Placed</p>
                    <p className="text-3xl font-bold mt-1">{data?.summary.ordersPlaced || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">{rangeLabel}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                    <ShoppingCart className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Active Users</p>
                    <p className="text-3xl font-bold mt-1">{data?.summary.uniqueSignedInUsers || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">Unique logins {rangeLabel.toLowerCase()}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                    <Users className="h-6 w-6 text-orange-600 dark:text-orange-300" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Hourly Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data && Object.keys(data.hourlyActivity).length > 0 ? (
                  <div className="space-y-2">
                    {Array.from({ length: 24 }, (_, i) => {
                      const key = `${i}:00`;
                      const count = data.hourlyActivity[key] || 0;
                      const pct = (count / maxHourly) * 100;
                      return (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className="w-12 text-right text-muted-foreground text-xs">
                            {i.toString().padStart(2, "0")}:00
                          </span>
                          <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                            {count > 0 && (
                              <div
                                className="h-full bg-blue-500 rounded transition-all"
                                style={{ width: `${Math.max(pct, 3)}%` }}
                              />
                            )}
                          </div>
                          <span className="w-8 text-xs font-medium">{count > 0 ? count : ""}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No activity data yet</p>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Sign-ins by Role
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data && Object.keys(data.loginsByRole).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(data.loginsByRole)
                        .sort(([, a], [, b]) => b - a)
                        .map(([role, count]) => (
                          <div key={role} className="flex items-center justify-between">
                            <span className="text-sm">{ROLE_LABELS[role] || role}</span>
                            <Badge variant="secondary" className="text-sm">{count}</Badge>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No sign-in data yet</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data && data.recentActivity.length > 0 ? (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {data.recentActivity.map((item) => {
                        const evt = EVENT_LABELS[item.eventType] || { label: item.eventType, color: "bg-gray-100 text-gray-800" };
                        return (
                          <div key={item.id} className="flex items-start gap-3 text-sm border-b pb-2 last:border-0">
                            <Badge className={`text-xs shrink-0 ${evt.color}`}>{evt.label}</Badge>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{item.userName || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground truncate">{item.userEmail}</p>
                            </div>
                            <div className="text-xs text-muted-foreground text-right shrink-0">
                              <p>{formatTime(item.createdAt)}</p>
                              <p>{formatDate(item.createdAt)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
    </AdminLayout>
  );
}
