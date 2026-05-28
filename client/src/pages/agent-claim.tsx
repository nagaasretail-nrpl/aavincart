import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserCheck, Eye, EyeOff, Search, MapPin, Truck, Building2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const lookupSchema = z.object({
  agentCode: z.string().min(1, "Please enter your agent code"),
});

const claimSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LookupForm = z.infer<typeof lookupSchema>;
type ClaimForm = z.infer<typeof claimSchema>;

interface AgentDetails {
  id: string;
  agentCode: string;
  agentType: string;
  name: string;
  phone: string;
  assignedUnionId: string;
  officeId: string;
  routeName: string;
  routeNumber: string;
  agentPoint: string;
  freshMilkTier: string;
  productTier: string;
  status: string;
}

const TIER_LABELS: Record<string, string> = {
  FED: "Federation (50%)",
  INT: "Inter Union (55%)",
  WSD: "Wholesale Dealer (65%)",
  DLR: "Dealer (85%)",
  RTL: "Retailer",
  MRP: "Consumer (100%)",
};

const UNION_LABELS: Record<string, string> = {
  chennai: "AAVIN Chennai",
  coimbatore: "AAVIN Coimbatore",
  salem: "AAVIN Salem",
  madurai: "AAVIN Madurai",
  tiruchirappalli: "AAVIN Tiruchirappalli",
};

export default function AgentClaim() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agentDetails, setAgentDetails] = useState<AgentDetails | null>(null);
  const { setUser } = useAuth();

  const lookupForm = useForm<LookupForm>({
    resolver: zodResolver(lookupSchema),
    defaultValues: { agentCode: "" },
  });

  const claimForm = useForm<ClaimForm>({
    resolver: zodResolver(claimSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const lookupMutation = useMutation({
    mutationFn: async (data: LookupForm) => {
      const response = await apiRequest("POST", "/api/agent/lookup", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.status === "claimed" || data.status === "active") {
        lookupForm.setError("root", {
          message: "This agent account is already claimed. Please use login instead.",
        });
        return;
      }
      setAgentDetails(data);
    },
    onError: (error: Error) => {
      lookupForm.setError("root", {
        message: error.message.includes("404") 
          ? "Agent code not found. Please check your code or contact admin." 
          : "Failed to lookup agent. Please try again.",
      });
    },
  });

  const claimMutation = useMutation({
    mutationFn: async (data: ClaimForm) => {
      const response = await apiRequest("POST", "/api/agent/claim", {
        agentCode: agentDetails?.agentCode,
        password: data.password,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.clear();
      if (data.user) {
        setUser(data.user);
      }
      claimForm.setError("root", {
        type: "success",
        message: "Account claimed successfully! Redirecting to home...",
      });
      setTimeout(() => {
        setLocation("/");
      }, 2000);
    },
    onError: (error: Error) => {
      claimForm.setError("root", {
        message: "Failed to claim account. Please try again.",
      });
    },
  });

  const onLookup = (data: LookupForm) => {
    lookupMutation.mutate(data);
  };

  const onClaim = (data: ClaimForm) => {
    claimMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-3 sm:px-4 py-6 sm:py-8">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="text-center px-4 sm:px-6 pt-4 sm:pt-6">
          <div className="flex justify-center mb-3 sm:mb-4">
            <div className="rounded-full bg-blue-500 p-2.5 sm:p-3">
              <UserCheck className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-bold">Agent Registration</CardTitle>
          <CardDescription>
            {agentDetails ? "Confirm your details and set password" : "Enter your agent code to claim your account"}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          {!agentDetails ? (
            <Form {...lookupForm}>
              <form onSubmit={lookupForm.handleSubmit(onLookup)} className="space-y-4">
                <FormField
                  control={lookupForm.control}
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
                          />
                          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Your admin will provide this code
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {lookupForm.formState.errors.root && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {lookupForm.formState.errors.root.message}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 bg-blue-500 hover:bg-blue-600 text-white"
                  disabled={lookupMutation.isPending}
                >
                  {lookupMutation.isPending ? "Looking up..." : "Find My Account"}
                </Button>

                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Already have an account?{" "}
                    <Link href="/agent-login" className="text-blue-600 hover:text-blue-500 font-medium">
                      Agent Login
                    </Link>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Not an agent?{" "}
                    <Link href="/signup" className="text-green-600 hover:text-green-500 font-medium">
                      Customer Sign Up
                    </Link>
                  </p>
                </div>
              </form>
            </Form>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 sm:p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-base sm:text-lg">{agentDetails.name}</h3>
                    <p className="text-sm text-gray-600">Code: <span className="font-mono font-bold">{agentDetails.agentCode}</span></p>
                  </div>
                  <Badge variant="outline">{agentDetails.agentType}</Badge>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span>{UNION_LABELS[agentDetails.assignedUnionId] || agentDetails.assignedUnionId}</span>
                  </div>
                  {agentDetails.routeName && (
                    <div className="flex items-center gap-1">
                      <Truck className="h-4 w-4 text-gray-500" />
                      <span>{agentDetails.routeName}</span>
                    </div>
                  )}
                  {agentDetails.officeId && (
                    <div className="flex items-center gap-1 col-span-1 sm:col-span-2">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <span>{agentDetails.officeId}</span>
                    </div>
                  )}
                </div>

                <div className="border-t pt-3 mt-3">
                  <p className="text-sm font-medium mb-2">Your Pricing Tiers:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white dark:bg-gray-800 rounded p-2">
                      <span className="text-xs text-gray-500">Fresh Milk</span>
                      <div className="font-medium text-sm sm:text-base">{TIER_LABELS[agentDetails.freshMilkTier] || agentDetails.freshMilkTier}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded p-2">
                      <span className="text-xs text-gray-500">Products</span>
                      <div className="font-medium text-sm sm:text-base">{TIER_LABELS[agentDetails.productTier] || agentDetails.productTier}</div>
                    </div>
                  </div>
                </div>
              </div>

              <Form {...claimForm}>
                <form onSubmit={claimForm.handleSubmit(onClaim)} className="space-y-4">
                  <FormField
                    control={claimForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Set Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="Create a password"
                              className="h-11"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={claimForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirm your password"
                              className="h-11"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {claimForm.formState.errors.root && (
                    <Alert 
                      variant={claimForm.formState.errors.root.type === "success" ? "default" : "destructive"}
                    >
                      <AlertDescription>
                        {claimForm.formState.errors.root.message}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 h-11"
                      onClick={() => setAgentDetails(null)}
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 h-11 bg-green-500 hover:bg-green-600 text-white"
                      disabled={claimMutation.isPending}
                    >
                      {claimMutation.isPending ? "Claiming..." : "Claim Account"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
