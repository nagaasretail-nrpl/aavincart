import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Store } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import aavinLogo from "@assets/aavin-logo.png";

export default function FmdLogin() {
  const [, setLocation] = useLocation();
  const [fmdCode, setFmdCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/fmd/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fmdCode: fmdCode.toUpperCase(), password })
      });

      const data = await response.json();

      if (data.success) {
        queryClient.clear();
        toast({ title: "Login Successful", description: `Welcome, ${data.dealer.name}` });
        localStorage.setItem("fmd_dealer", JSON.stringify(data.dealer));
        setLocation("/");
      } else {
        toast({ title: "Login Failed", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Unable to connect to server", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center px-3 sm:px-4 py-6 sm:py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-3 mb-3 sm:mb-4">
            <img src={aavinLogo} alt="Aavin" className="h-12 w-12 sm:h-16 sm:w-16 object-contain rounded-xl" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Aavincart FMD</h1>
          <p className="text-gray-600 mt-2">Fresh Milk Dealer Portal</p>
          <p className="text-sm text-gray-500">All District Unions</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-1 pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-xl sm:text-2xl font-bold text-center">Dealer Login</CardTitle>
            <CardDescription className="text-center">
              Enter your FMD code and registered phone number
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fmdCode">FMD Code</Label>
                <div className="relative">
                  <Store className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="fmdCode"
                    placeholder="e.g., FMD001, FMD002"
                    value={fmdCode}
                    onChange={(e) => setFmdCode(e.target.value.toUpperCase())}
                    className="pl-10 h-11 uppercase"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500">Enter your Fresh Milk Dealer code</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password (Phone Number)</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your registered phone number"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10 h-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">Use your registered mobile number as password</p>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-green-600 hover:bg-green-700 h-11 text-base"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t text-center">
              <p className="text-sm text-gray-500">
                Having trouble logging in?
              </p>
              <p className="text-sm text-green-600 mt-1">
                Contact your District Union Office
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-500 flex items-center justify-center gap-3 flex-wrap">
          <Link href="/login" className="hover:underline">Customer Login</Link>
          <span>|</span>
          <Link href="/dealer/login" className="hover:underline">Dealer Login</Link>
          <span>|</span>
          <Link href="/wsd/login" className="hover:underline">WSD Login</Link>
          <span>|</span>
          <Link href="/district-union/login" className="hover:underline">Union Login</Link>
        </div>

        <div className="mt-4 text-center">
          <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
            <span>TCMPF</span>
            <span>•</span>
            <span>Tamil Nadu Co-operative Milk Producers' Federation Ltd.</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">© 2026 Aavincart - All Rights Reserved</p>
        </div>
      </div>
    </div>
  );
}
