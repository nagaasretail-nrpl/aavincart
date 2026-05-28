import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import aavinLogo from "@assets/aavin-logo.png";

export default function UnionStaffLoginPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/union-staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        queryClient.clear();
        toast({
          title: "Login Successful",
          description: `Welcome back, ${data.staff.name}!`,
        });
        
        const staffSessionData = {
          ...data.staff,
          isStaff: true,
          isDirectLogin: true,
        };
        sessionStorage.setItem('staffSession', JSON.stringify(staffSessionData));
        const officeDesignations = ['data_entry_operator', 'marketing_executive', 'segment_mgr_marketing_fm', 'segment_mgr_marketing_dp', 'segment_mgr_marketing_ic'];
        const desId = data.staff.designationId || '';
        if (officeDesignations.includes(desId) || data.staff.department === 'segment_workflow') {
          setLocation('/union/segment-manager');
        } else {
          setLocation(`/union/dashboard?auto_login=${data.staff.unionId}`);
        }
      } else {
        setError(data.message || "Invalid username or password");
      }
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center px-3 sm:px-4 py-6 sm:py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-5 sm:mb-8">
          <img src={aavinLogo} alt="Aavin" className="h-12 w-12 sm:h-16 sm:w-16 object-contain rounded-xl mx-auto mb-3 sm:mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Staff Login</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            Login to your District Union staff account
          </p>
        </div>

        <Card>
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>
              Enter your credentials to access your staff dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">Employee ID or Phone Number</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Enter your Employee ID or Phone"
                  className="h-11"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter your password"
                    className="h-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 bg-blue-600 hover:bg-blue-700"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>

              <div className="text-center pt-4 border-t">
                <p className="text-sm text-gray-600">
                  Don't have an account?{" "}
                  <Link href="/union-staff-register" className="text-blue-600 hover:underline font-medium">
                    Register here
                  </Link>
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  <Link href="/union/login" className="hover:underline">
                    Union Admin Login
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-6">
          Your account must be approved by your Union administrator before you can login.
        </p>
      </div>
    </div>
  );
}
