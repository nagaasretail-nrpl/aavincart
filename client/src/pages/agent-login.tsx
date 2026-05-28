import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import aavinLogo from "@assets/aavin-logo.png";
import { useAuth } from "@/lib/auth-context";

const loginSchema = z.object({
  agentCode: z.string().min(1, "Please enter your agent code"),
  password: z.string().min(1, "Please enter your password"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function AgentLogin() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const { setUser } = useAuth();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      agentCode: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const response = await apiRequest("POST", "/api/agent/login", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.clear();
      if (data.user) {
        setUser(data.user);
      }
      form.setError("root", {
        type: "success",
        message: "Login successful! Redirecting...",
      });
      setTimeout(() => {
        setLocation("/");
      }, 1000);
    },
    onError: (error: Error) => {
      let message = "Login failed. Please try again.";
      if (error.message.includes("404")) {
        message = "Agent code not found. Please check your code.";
      } else if (error.message.includes("401")) {
        message = "Invalid password. Please try again.";
      } else if (error.message.includes("403")) {
        message = "Account not yet claimed. Please claim your account first.";
      }
      form.setError("root", { message });
    },
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-3 sm:px-4 py-6 sm:py-8">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="text-center px-4 sm:px-6 pt-4 sm:pt-6">
          <div className="flex justify-center mb-3 sm:mb-4">
            <img src={aavinLogo} alt="Aavin" className="h-12 w-12 sm:h-16 sm:w-16 object-contain rounded-xl" />
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-bold">Agent Login</CardTitle>
          <CardDescription>
            Login with your agent code and password
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="agentCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent Code</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type="text"
                          placeholder="Enter your agent code (e.g., 001)"
                          className="pr-10 h-11"
                          data-testid="input-agent-code"
                        />
                        <KeyRound className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      </div>
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
                          className="h-11"
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
                <Alert 
                  variant={form.formState.errors.root.type === "success" ? "default" : "destructive"} 
                  data-testid="alert-message"
                >
                  <AlertDescription>
                    {form.formState.errors.root.message}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-green-500 hover:bg-green-600 text-white"
                disabled={loginMutation.isPending}
                data-testid="button-login"
              >
                {loginMutation.isPending ? "Signing in..." : "Sign In"}
              </Button>

              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  New agent?{" "}
                  <Link href="/agent-claim" className="text-blue-600 hover:text-blue-500 font-medium">
                    Claim Your Account
                  </Link>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Not an agent?{" "}
                  <Link href="/login" className="text-orange-600 hover:text-orange-500 font-medium">
                    Customer Login
                  </Link>
                </p>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
