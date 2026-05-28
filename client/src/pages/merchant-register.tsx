import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { Building2, Phone, Mail, MapPin, User } from "lucide-react";
import type { PricingTier } from "@shared/schema";

const merchantSignupSchema = z.object({
  restaurantName: z.string().min(2, "Business name must be at least 2 characters"),
  contactName: z.string().min(2, "Contact name must be at least 2 characters"),
  contactEmail: z.string().email("Please enter a valid email address"),
  contactPhone: z.string().min(10, "Please enter a valid phone number"),
  address: z.string().min(10, "Please enter your full address"),
  description: z.string().optional(),
  pricingTierCode: z.string().min(1, "Please select a pricing tier"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type MerchantSignupForm = z.infer<typeof merchantSignupSchema>;

export default function MerchantRegister() {
  const [, setLocation] = useLocation();

  const { data: pricingTiers } = useQuery<PricingTier[]>({
    queryKey: ["/api/pricing-tiers"],
  });

  const form = useForm<MerchantSignupForm>({
    resolver: zodResolver(merchantSignupSchema),
    defaultValues: {
      restaurantName: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      address: "",
      description: "",
      pricingTierCode: "",
      password: "",
      confirmPassword: "",
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: Omit<MerchantSignupForm, 'confirmPassword'>) => {
      const slug = data.restaurantName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const username = data.contactEmail.split('@')[0] + '_merchant';
      const response = await apiRequest("POST", "/api/merchants/register", {
        merchantUuid: crypto.randomUUID(),
        restaurantName: data.restaurantName,
        restaurantSlug: slug,
        restaurantPhone: data.contactPhone,
        contactName: data.contactName,
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail,
        address: data.address,
        description: data.description || '',
        shortDescription: '',
        username: username,
        password: data.password,
        pricingTierCode: data.pricingTierCode,
        status: 'pending',
      });
      return response.json();
    },
    onSuccess: () => {
      form.setError("root", {
        type: "success",
        message: "Registration submitted! Your application is pending approval. You will be notified once approved.",
      });
      setTimeout(() => {
        setLocation("/");
      }, 3000);
    },
    onError: (error: Error) => {
      form.setError("root", {
        message: error.message.includes("409") 
          ? "A merchant with this email already exists" 
          : "Registration failed. Please try again.",
      });
    },
  });

  const onSubmit = (data: MerchantSignupForm) => {
    const { confirmPassword, ...signupData } = data;
    signupMutation.mutate(signupData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white dark:from-gray-900 dark:to-gray-800 py-8 sm:py-12 px-3 sm:px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-orange-600">Aavincart</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-2">
            Join Tamil Nadu's premier dairy distribution network
          </p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center bg-orange-500 text-white rounded-t-lg p-4 sm:p-6">
            <div className="flex justify-center mb-3 sm:mb-4">
              <div className="rounded-full bg-white/20 p-2.5 sm:p-3">
                <Building2 className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
            </div>
            <CardTitle className="text-xl sm:text-2xl">Dealer / Retailer Registration</CardTitle>
            <CardDescription className="text-orange-100 text-sm">
              Register as a dealer or retailer
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-4 sm:pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="restaurantName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" /> Business Name
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Your shop/business name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <User className="h-4 w-4" /> Owner/Contact Name
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Full name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Mail className="h-4 w-4" /> Email
                        </FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="your@email.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Phone className="h-4 w-4" /> Phone Number
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="9843777277" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> Business Address
                      </FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Full address including city, district, and pincode" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pricingTierCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Type / Pricing Tier</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your business type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {pricingTiers?.filter(t => t.isActive).map((tier) => (
                            <SelectItem key={tier.id} value={tier.tierCode}>
                              {tier.tierName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        This determines your wholesale pricing. Contact support for clarification.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>About Your Business (Optional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Brief description of your business" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" placeholder="Create a password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" placeholder="Confirm password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {form.formState.errors.root && (
                  <Alert 
                    variant={form.formState.errors.root.type === "success" ? "default" : "destructive"}
                    className={form.formState.errors.root.type === "success" ? "bg-green-50 border-green-200 text-green-800" : ""}
                  >
                    <AlertDescription>
                      {form.formState.errors.root.message}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white h-11 sm:h-auto sm:py-6 text-base sm:text-lg"
                  disabled={signupMutation.isPending}
                >
                  {signupMutation.isPending ? "Submitting..." : "Submit Registration"}
                </Button>

                <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                  <p>
                    Already registered?{" "}
                    <Link href="/admin/login" className="text-orange-600 hover:text-orange-500 font-medium">
                      Sign In
                    </Link>
                  </p>
                  <p className="mt-2">
                    For support, call: <a href="tel:9843777277" className="text-orange-600 font-medium">9843777277</a>
                  </p>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
