import { useState } from "react";
import { Link, useLocation } from "wouter";
import customerLogo from "@assets//aavin-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Shield, Store, User, Truck } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

type TabKey = "admin" | "union";

const tabs: { key: TabKey; label: string; icon: typeof Shield }[] = [
  { key: "admin", label: "Admin", icon: Shield },
  { key: "union", label: "Union / Merchant", icon: Store },
];

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'union' || tab === 'merchant') return 'union';
    return "admin";
  });

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const clearForm = () => {
    setUsername("");
    setPassword("");
    setShowPw(false);
    setError(null);
    setSuccessMsg(null);
  };

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
      if (activeTab === "admin") {
        const response = await apiRequest("POST", "/api/auth/login", {
          email: username.trim(),
          password,
        });
        const data = await response.json();
        if (data.user) {
          setSuccessMsg("Admin login successful! Redirecting...");
          setTimeout(() => setLocation("/admin/dashboard"), 500);
        } else {
          throw new Error(data.message || data.error || "Invalid admin credentials");
        }
      } else if (activeTab === "union") {
        const response = await apiRequest("POST", "/api/merchant/login", {
          username: username.trim(),
          password,
        });
        const data = await response.json();
        if (data.success) {
          setSuccessMsg("Union login successful! Redirecting...");
          queryClient.invalidateQueries({ queryKey: ["/api/merchant/me"] });
          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
          setTimeout(() => setLocation("/merchant/dashboard"), 500);
        } else {
          throw new Error(data.message || "Invalid credentials");
        }
      }
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("403")) {
        if (msg.includes("pending")) {
          setError("Your account is pending approval. Please wait for admin to approve.");
        } else if (msg.includes("not active")) {
          setError("Your account is not active. Please contact admin.");
        } else {
          setError(msg.replace(/^\d+:\s*/, '') || "Access denied.");
        }
      } else if (msg.includes("401")) {
        setError("Invalid username or password");
      } else if (msg.includes("not found")) {
        setError("Account not found. Please check your credentials.");
      } else {
        setError(msg.replace(/^\d+:\s*/, '') || "Unable to connect. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden">
      <div className="hidden lg:flex lg:w-[45%] flex-shrink-0 relative bg-gradient-to-br from-indigo-800 to-blue-900">
        <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-white">
          <Shield className="h-20 w-20 mb-6 opacity-80" />
          <h2 className="text-3xl font-bold mb-3 text-center">Administration Portal</h2>
          <p className="text-lg opacity-80 text-center max-w-md">
            Manage Federation operations, District Unions, orders, and the entire distribution network
          </p>
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
            Admin & Union Login
          </h1>
          <p className="text-center text-indigo-500 mb-4 sm:mb-5 text-sm">
            For Federation Admin & District Union Managers
          </p>

          <div className="mb-5">
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.key);
                      clearForm();
                    }}
                    className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs sm:text-sm font-medium transition-all border-b-2 ${
                      isActive
                        ? "text-indigo-600 border-indigo-600 bg-indigo-50/50"
                        : "text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon size={18} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
              <Input
                type="text"
                placeholder={activeTab === "admin" ? "e.g. admin" : "e.g. Union username"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-[48px] border-gray-300 text-base"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  placeholder="........"
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
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-base"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>

            {activeTab === "union" && (
              <div className="text-center text-sm text-gray-600">
                New Union?{" "}
                <Link href="/merchant-signup" className="text-indigo-600 hover:underline font-medium">
                  Register Here
                </Link>
              </div>
            )}
          </form>

          <div className="mt-6 pt-5 border-t border-gray-200 space-y-2">
            <p className="text-center text-xs text-gray-400 mb-3">Other logins</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link href="/login" className="flex-1">
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  <User size={15} />
                  Customer Login
                </button>
              </Link>
              <Link href="/pwa/staff" className="flex-1">
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  <Store size={15} />
                  Staff Login
                </button>
              </Link>
              <Link href="/pwa/driver" className="flex-1">
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  <Truck size={15} />
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
