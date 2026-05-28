import { useState } from "react";
import { Link, useLocation } from "wouter";
import aavinLogo from "@assets/aavin-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Users } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

export default function InterUnionLogin() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
      const response = await fetch("/api/merchant/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || data.message || "Login failed. Please check your credentials.");
        return;
      }

      if (data.success) {
        queryClient.clear();
        setSuccessMsg("Login successful! Redirecting...");
        setTimeout(() => {
          setLocation("/");
        }, 500);
      }
    } catch (err) {
      setError("Unable to connect to server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen flex flex-col lg:flex-row overflow-hidden">
      <div className="hidden lg:flex lg:w-[45%] flex-shrink-0 relative">
        <img
          src="/ice-baby.png"
          alt="Aavin dairy products"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/60 to-transparent" />
        <div className="absolute bottom-8 left-8 right-8 text-white">
          <h2 className="text-3xl font-bold mb-2">Inter-Union Purchase Portal</h2>
          <p className="text-lg opacity-90">Purchase products from other District Unions</p>
        </div>
      </div>

      <div className="w-full lg:w-[55%] flex items-center justify-center px-3 sm:px-4 py-6 sm:py-8 bg-gray-50 overflow-y-auto">
        <div className="w-full max-w-lg">
          <div className="flex justify-center mb-3 sm:mb-4">
            <img src={aavinLogo} alt="Aavin Cart" className="h-12 w-12 sm:h-16 sm:w-16 object-contain rounded-xl" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-1">
            Inter-Union Login
          </h1>
          <p className="text-center text-gray-500 mb-4 sm:mb-5 text-sm">
            Sign in to purchase products from other District Unions
          </p>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Union Code / Mobile Number</label>
                <Input
                  type="text"
                  placeholder="Union code (e.g., slm, cbe) or mobile number"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11 border-gray-300"
                  autoComplete="username"
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
                className="w-full h-11 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:opacity-90 text-white font-medium"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : (
                  <>
                    <Users className="mr-2 h-4 w-4" />
                    Sign In as Inter-Union
                  </>
                )}
              </Button>
            </form>
          </div>

          <div className="mt-4 text-center">
            <div className="flex items-center justify-center gap-3 text-xs text-gray-400 flex-wrap">
              <Link href="/login" className="hover:text-gray-600 hover:underline">Customer Login</Link>
              <span>|</span>
              <Link href="/district-union/login" className="hover:text-gray-600 hover:underline">District Union Login</Link>
              <span>|</span>
              <Link href="/dealer/login" className="hover:text-gray-600 hover:underline">Dealer Login</Link>
            </div>
          </div>

          <div className="mt-4 text-center text-xs text-gray-400">
            TCMPF - Tamil Nadu Co-operative Milk Producers' Federation Ltd.
          </div>
        </div>
      </div>
    </div>
  );
}
