import { useState } from "react";
import { Link, useLocation } from "wouter";
import customerLogo from "@assets/F-F_1770588249868.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LogIn, Eye, EyeOff, Briefcase, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { queryClient } from "@/lib/queryClient";

export default function Login() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showB2BLinks, setShowB2BLinks] = useState(false);
  const { setUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || data.message || "Login failed. Please check your credentials.");
        return;
      }

      setSuccessMsg("Login successful! Redirecting...");
      queryClient.clear();
      if (data.user) {
        setUser(data.user);
      }
      const b2bRoles = ['dealer', 'retailer', 'wsd', 'wholesale_dealer', 'fmd', 'parlour', 'private_parlour', 'union_parlour'];
      const isB2B = b2bRoles.includes(data.user?.role || '');
      const restaurantId = data.user?.restaurantId;
      setTimeout(() => {
        if (isB2B && restaurantId) {
          setLocation(`/union/${restaurantId}`);
        } else {
          setLocation("/");
        }
      }, 500);
    } catch (err) {
      setError("Unable to connect to server. Please try again.");
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

      <div className="w-full lg:w-[55%] flex-1 flex items-center justify-center px-4 py-6 sm:p-8 bg-gray-50 overflow-y-auto">
        <div className="w-full max-w-lg">
          <div className="flex justify-center mb-3 sm:mb-4">
            <img src={customerLogo} alt="Aavin Cart" className="w-12 h-12 sm:w-16 sm:h-16 object-contain rounded-xl" />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-center text-gray-800 mb-1">
            Customer Login
          </h1>
          <p className="text-center text-gray-500 mb-4 sm:mb-5 text-xs sm:text-sm">
            Sign in with your mobile number, email, or business code
          </p>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {successMsg && (
              <Alert className="mb-4 border-green-200 bg-green-50">
                <AlertDescription className="text-green-700">{successMsg}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mobile Number / Email / Business Code</label>
                <Input
                  type="text"
                  placeholder="9876543210, your@email.com or SLM532"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 border-gray-300"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 border-gray-300 pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-blue-500 to-blue-600 hover:opacity-90 text-white font-medium"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-gray-600">
              Don't have an account?{" "}
              <Link href="/signup" className="text-blue-600 hover:underline font-medium">
                Create Account
              </Link>
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowB2BLinks(!showB2BLinks)}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-gray-500 hover:text-blue-600 transition-colors"
            >
              <Briefcase size={15} />
              <span>B2B / Partner Login</span>
              {showB2BLinks ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showB2BLinks && (
              <div className="mt-1 bg-white rounded-xl border border-gray-200 shadow-sm p-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-2 gap-1.5">
                  <Link href="/dealer/login" className="flex items-center justify-center py-2 px-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                    Dealer
                  </Link>
                  <Link href="/retailer/login" className="flex items-center justify-center py-2 px-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                    Retailer
                  </Link>
                  <Link href="/wsd/login" className="flex items-center justify-center py-2 px-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                    WSD / MPCS
                  </Link>
                  <Link href="/fmd/login" className="flex items-center justify-center py-2 px-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                    Fresh Milk Dealer
                  </Link>
                  <Link href="/district-union/login" className="flex items-center justify-center py-2 px-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                    District Union
                  </Link>
                  <Link href="/inter-union/login" className="flex items-center justify-center py-2 px-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                    Inter-Union
                  </Link>
                  <Link href="/driver/login" className="flex items-center justify-center py-2 px-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                    Driver
                  </Link>
                  <Link href="/admin/login" className="flex items-center justify-center py-2 px-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                    Admin
                  </Link>
                  <Link href="/parlour/login" className="flex items-center justify-center py-2 px-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                    Parlour
                  </Link>
                  <Link href="/union-staff-login" className="flex items-center justify-center py-2 px-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                    Union Staff
                  </Link>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <Link href="/b2b-register" className="flex items-center justify-center py-2 px-3 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                    New B2B Registration (Federation / Inter-Union / WSD / Dealer / Retailer)
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 text-center text-xs text-gray-400">
            TCMPF - Tamil Nadu Co-operative Milk Producers' Federation Ltd.
          </div>
        </div>
      </div>
    </div>
  );
}
