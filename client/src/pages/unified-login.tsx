import { useState } from "react";
import { Link, useLocation } from "wouter";
import customerLogo from "@assets//aavin-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LogIn, Eye, EyeOff, User, Briefcase } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function UnifiedLogin() {
  const [, setLocation] = useLocation();
  const { setUser } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const response = await apiRequest("POST", "/api/auth/login", {
        email: username.trim(),
        password,
      });
      const data = await response.json();

      // B2B-only gate — block customer accounts from this portal
      const b2bRoles = ["wholesale_dealer", "dealer", "retailer", "wsd", "federation", "inter_union", "agent", "fmd", "mpcs", "hotel", "institution", "private_parlour", "union_parlour", "general_shop"];
      const userRole = (data.user?.role || "").toLowerCase();
      const pricingRole = (data.user?.pricingRole || "").toUpperCase();
      const freshMilkRole = (data.user?.freshMilkPricingRole || "").toUpperCase();
      const productsRole = (data.user?.productsPricingRole || "").toUpperCase();
      const iceCreamRole = (data.user?.iceCreamPricingRole || "").toUpperCase();
      const b2bPricingRoles = ["WHOLESALE_DEALER", "DEALER", "RETAILER", "FEDERATION", "INTER_UNION"];

      const isB2BByRole = b2bRoles.includes(userRole);
      const isB2BByPricing = b2bPricingRoles.includes(pricingRole) || b2bPricingRoles.includes(freshMilkRole) || b2bPricingRoles.includes(productsRole) || b2bPricingRoles.includes(iceCreamRole);

      if (!isB2BByRole && !isB2BByPricing) {
        // Invalidate the session immediately — customer must not remain authenticated
        try { await apiRequest("POST", "/api/auth/logout", {}); } catch { /* ignore */ }
        setError("This portal is for business accounts only. For Union/Merchant login, please use Admin Login below.");
        setIsLoading(false);
        return;
      }

      setSuccessMsg("Login successful! Redirecting...");
      queryClient.clear();
      if (data.user) setUser(data.user);

      const restaurantId = data.user?.restaurantId;
      const redirectPath = restaurantId ? `/union/${restaurantId}` : "/";
      setTimeout(() => setLocation(redirectPath), 500);

    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("403")) {
        if (msg.includes("pending")) {
          setError("Your account is pending approval. Please wait for your administrator to approve.");
        } else if (msg.includes("rejected")) {
          setError("Your registration was rejected. Please contact your administrator.");
        } else if (msg.includes("deactivated")) {
          setError("Your account has been deactivated. Please contact your administrator.");
        } else {
          setError(msg || "Access denied.");
        }
      } else if (msg.includes("401")) {
        setError("Invalid credentials. For Union/Merchant login, please use Admin Login below.");
      } else {
        setError("Unable to connect. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden">
      <div className="hidden lg:flex lg:w-[45%] flex-shrink-0 relative">
        <img
          src="/login-icecream.png"
          alt="Aavin dairy products"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-8 left-8 right-8 text-white">
          <h2 className="text-3xl font-bold mb-2">Tamil Nadu Cooperative Milk Producers' Federation</h2>
          <p className="text-lg opacity-90">Serving quality dairy products across 27 District Unions</p>
        </div>
      </div>

      <div className="w-full lg:w-[55%] flex-1 flex flex-col items-center px-4 py-4 sm:p-8 bg-gray-50 overflow-y-auto relative lg:justify-center">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-3 sm:mb-4">
            <Link href="/">
              <img src={customerLogo} alt="Aavin Cart" className="w-14 h-14 sm:w-20 sm:h-20 object-contain rounded-xl cursor-pointer hover:opacity-80 transition-opacity" />
            </Link>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-center text-gray-800 mb-0.5">
            Welcome Back
          </h1>
          <p className="text-center text-blue-500 mb-6 sm:mb-7 text-sm">
            Business & Partner Login
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {successMsg && (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-700">{successMsg}</AlertDescription>
              </Alert>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Mobile Number / Username / Code
              </label>
              <Input
                type="text"
                placeholder="e.g. 9843777277, WSD025, slm, or AA0152"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-[48px] border-gray-300 text-base"
                autoComplete="username"
                inputMode="text"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-[48px] border-gray-300 pr-10 text-base"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPw(!showPw)}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium text-base"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="text-center text-sm text-gray-600">
              New Business?{" "}
              <Link href="/b2b-register" className="text-blue-600 hover:underline font-medium">
                Register Here
              </Link>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-200 space-y-2">
            <p className="text-center text-xs text-gray-400 mb-3">Other logins</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link href="/admin/login" className="flex-1">
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  <LogIn size={15} />
                  Admin Login
                </button>
              </Link>
              <Link href="/pwa/staff" className="flex-1">
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  <User size={15} />
                  Staff Login
                </button>
              </Link>
              <Link href="/pwa/driver" className="flex-1">
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  <Briefcase size={15} />
                  Driver Login
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
