import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Truck, Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react";
import customerLogo from "@assets/F-F_1770588249868.png";

function storeStaffSessionAndRedirect(manager: any, setLocation: (path: string) => void) {
  const staffSession = {
    isStaff: true,
    isDirectLogin: true,
    staffId: manager.id,
    name: manager.name,
    username: manager.email || manager.phone || '',
    permissions: ['delivery_management', 'fleet_management', 'trip_management', 'bulk_delivery'],
    accessTier: manager.accessTier || 'tier3',
    unionId: manager.unionId,
    designation: manager.designation,
    designationId: manager.designationId,
  };
  sessionStorage.setItem("staffSession", JSON.stringify(staffSession));
  setLocation("/merchant/bulk-delivery");
}

export default function TransportLogin() {
  const [, setLocation] = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const { data: authData } = useQuery<{ user?: { role?: string; designationId?: string; unionId?: string; name?: string; id?: string; designation?: string; accessTier?: string; email?: string; phone?: string } }>({
    queryKey: ["/api/auth/me"],
    refetchOnMount: true,
  });

  useEffect(() => {
    const user = authData?.user;
    const isAlreadyTransportManager =
      user?.role === "union_staff" &&
      (user.designationId === "transport_manager" ||
        user.designationId?.includes("transport"));
    if (isAlreadyTransportManager && user) {
      storeStaffSessionAndRedirect({
        id: user.id,
        name: user.name,
        unionId: user.unionId,
        designation: user.designation,
        designationId: user.designationId,
        accessTier: user.accessTier,
        email: user.email,
        phone: user.phone,
      }, setLocation);
    }
  }, [authData, setLocation]);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/transport-manager/login", {
        username: identifier.trim(),
        password,
      });
      return res.json();
    },
    onSuccess: async (data) => {
      if (data.success) {
        setError("");
        queryClient.clear();
        storeStaffSessionAndRedirect(data.manager, setLocation);
      } else {
        setError(data.message || "Login failed");
      }
    },
    onError: (err: any) => {
      const msg = err?.message || "";
      if (msg.includes("403")) {
        setError("Access denied. This login is for Transport & Delivery staff only.");
      } else if (msg.includes("401")) {
        setError("Invalid Employee ID or password.");
      } else {
        setError("Login failed. Please try again.");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError("Please enter your Employee ID and password.");
      return;
    }
    setError("");
    loginMutation.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 px-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <img
                src={customerLogo}
                alt="Aavin Cart"
                className="h-16 w-16 object-contain rounded-xl"
              />
              <div className="absolute -bottom-1 -right-1 bg-teal-600 rounded-full p-1">
                <Truck className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-teal-800 dark:text-teal-300">
            Transport Manager
          </CardTitle>
          <CardDescription>
            Logistics & Fleet Management Portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="identifier">Employee ID / Username / Phone</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="Enter Employee ID, username, or phone"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                data-testid="input-identifier"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  data-testid="input-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              disabled={loginMutation.isPending}
              data-testid="btn-sign-in"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setLocation("/admin/login")}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Admin Login
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
