import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import customerLogo from "@assets/aavin-logo.png";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Shield, Eye, EyeOff, Truck } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Check if already logged in as admin
  const { data: authData } = useQuery<{ user?: { role?: string; email?: string; name?: string; id?: string } }>({
    queryKey: ["/api/auth/me"],
    refetchOnMount: true,
  });

  // Redirect if already logged in as admin (using useEffect to avoid render issues)
  useEffect(() => {
    if (authData?.user?.role === 'admin') {
      setLocation("/");
    }
  }, [authData, setLocation]);

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: async (data) => {
      console.log('Login successful, received data:', data);
      if (data.user?.role === 'admin') {
        // Store admin sub-user data in sessionStorage for permission-based access control
        if (data.isSubUser && data.subUser) {
          sessionStorage.setItem('adminSubUser', JSON.stringify({
            id: data.subUser.id,
            name: data.subUser.name,
            email: data.subUser.email,
            permissions: data.subUser.permissions,
            isSubUser: true
          }));
        } else {
          // Clear any previous sub-user session when logging in as admin
          sessionStorage.removeItem('adminSubUser');
        }
        
        console.log('Admin role confirmed, updating cache and redirecting...');
        // Invalidate auth cache and wait for it to complete
        queryClient.clear();
        console.log('Cache cleared, navigating to dashboard...');
        setLocation("/");
      } else {
        console.log('Non-admin role or missing role:', data.user?.role);
        form.setError("root", {
          message: "Access denied. Admin privileges required.",
        });
      }
    },
    onError: (error: Error) => {
      form.setError("root", {
        message: error.message.includes("401") 
          ? "Invalid email or password" 
          : "Login failed. Please try again.",
      });
    },
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={customerLogo} alt="Aavin Cart" className="h-16 w-16 object-contain rounded-xl" />
          </div>
          <CardTitle className="text-2xl font-bold">Aavin Cart Admin</CardTitle>
          <CardDescription>
            Sign in to access the admin dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        placeholder="Enter your email"
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          data-testid="input-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          data-testid="button-toggle-password"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.formState.errors.root && (
                <Alert variant="destructive" data-testid="alert-error">
                  <AlertDescription>
                    {form.formState.errors.root.message}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                disabled={loginMutation.isPending}
                data-testid="button-login"
              >
                {loginMutation.isPending ? "Signing in..." : "Sign In"}
              </Button>

            </form>
          </Form>

          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 text-center">
            <button
              type="button"
              onClick={() => setLocation("/transport/login")}
              className="text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 font-medium inline-flex items-center gap-1.5"
            >
              <Truck className="h-3.5 w-3.5" />
              Transport Manager Login
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}