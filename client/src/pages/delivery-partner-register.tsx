import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Truck, Building2, CheckCircle, AlertCircle } from "lucide-react";

interface UnionOption {
  id: string;
  restaurantName: string;
  address: string;
}

interface RouteOption {
  id: string;
  routeName: string;
  routeNumber: string;
}

const SEGMENTS = [
  { value: "FM", label: "FM (Fresh Milk)" },
  { value: "DP", label: "DP (Dairy Products)" },
  { value: "IC", label: "IC (Ice Cream)" },
];

const VEHICLE_TYPES = [
  "Three Wheeler",
  "Mini Van",
  "Van",
  "Truck",
  "Pickup",
  "Two Wheeler",
];

export default function DeliveryPartnerRegisterPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    segment: "",
    unionId: "",
    businessRoute: "",
    vehicleType: "",
    vehicleCapacity: "",
    vehicleNumber: "",
    driverLicenseNumber: "",
    password: "",
    confirmPassword: "",
  });

  const { data: unions } = useQuery<UnionOption[]>({
    queryKey: ["/api/merchants"],
  });

  const { data: routes } = useQuery<RouteOption[]>({
    queryKey: ["/api/delivery/routes", formData.unionId, formData.segment],
    queryFn: async () => {
      const res = await fetch(`/api/delivery/routes?merchantId=${formData.unionId}&segment=${formData.segment}`);
      return res.ok ? res.json() : [];
    },
    enabled: !!formData.unionId && !!formData.segment,
  });

  const registerMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { confirmPassword, ...payload } = data;
      return await apiRequest("POST", "/api/delivery-partners/register", payload);
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Registration Submitted",
        description: "Your registration is pending approval from your Union administrator.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Please check your details and try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please ensure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    registerMutation.mutate(formData);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100 flex items-center justify-center px-3 sm:px-4 py-6 sm:py-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 sm:pt-8 text-center px-4 sm:px-6 pb-4 sm:pb-6">
            <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Registration Submitted!</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              Your registration is pending approval from your District Union administrator.
              You will be notified once your account is approved.
            </p>
            <Button onClick={() => setLocation("/")} className="w-full h-11">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100 py-6 sm:py-8 px-3 sm:px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-5 sm:mb-8">
          <Truck className="h-10 w-10 sm:h-12 sm:w-12 text-cyan-600 mx-auto mb-3 sm:mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Delivery Partner Registration</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            Register as a delivery partner with your District Union
          </p>
        </div>

        <Card>
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Delivery Partner Registration Form
            </CardTitle>
            <CardDescription>
              Fill in your details below. Your registration will be reviewed by your Union administrator.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your full name"
                    className="h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="10-digit mobile number"
                    className="h-11"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your.email@example.com (optional)"
                  className="h-11"
                />
              </div>

              <div className="border-t pt-4">
                <Label className="text-base font-semibold mb-4 block">Assignment Details</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="segment">Segment *</Label>
                    <Select
                      value={formData.segment}
                      onValueChange={(value) => setFormData({ ...formData, segment: value, businessRoute: "" })}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select segment" />
                      </SelectTrigger>
                      <SelectContent>
                        {SEGMENTS.map((seg) => (
                          <SelectItem key={seg.value} value={seg.value}>
                            {seg.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unionId">Union *</Label>
                    <Select
                      value={formData.unionId}
                      onValueChange={(value) => setFormData({ ...formData, unionId: value, businessRoute: "" })}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select your Union" />
                      </SelectTrigger>
                      <SelectContent>
                        {unions?.map((union) => (
                          <SelectItem key={union.id} value={union.id}>
                            {union.restaurantName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <Label htmlFor="businessRoute">Business Route *</Label>
                  <Select
                    value={formData.businessRoute}
                    onValueChange={(value) => setFormData({ ...formData, businessRoute: value })}
                    disabled={!formData.unionId || !formData.segment}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder={formData.unionId && formData.segment ? "Select business route" : "Select union and segment first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {routes?.map((route) => (
                        <SelectItem key={route.id || route.routeNumber} value={route.routeName || route.routeNumber}>
                          {route.routeName || route.routeNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-base font-semibold mb-4 block">Vehicle Information</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vehicleType">Vehicle Type *</Label>
                    <Select
                      value={formData.vehicleType}
                      onValueChange={(value) => setFormData({ ...formData, vehicleType: value })}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select vehicle type" />
                      </SelectTrigger>
                      <SelectContent>
                        {VEHICLE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicleCapacity">Vehicle Capacity *</Label>
                    <Input
                      id="vehicleCapacity"
                      value={formData.vehicleCapacity}
                      onChange={(e) => setFormData({ ...formData, vehicleCapacity: e.target.value })}
                      placeholder="e.g., 500 litres, 200 kg"
                      className="h-11"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="vehicleNumber">Vehicle Number *</Label>
                    <Input
                      id="vehicleNumber"
                      value={formData.vehicleNumber}
                      onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                      placeholder="e.g., TN 36 AB 1234"
                      className="h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="driverLicenseNumber">Driver License Number *</Label>
                    <Input
                      id="driverLicenseNumber"
                      value={formData.driverLicenseNumber}
                      onChange={(e) => setFormData({ ...formData, driverLicenseNumber: e.target.value })}
                      placeholder="Enter license number"
                      className="h-11"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-base font-semibold mb-4 block">Login Credentials</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Min. 6 characters"
                      className="h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Re-enter password"
                      className="h-11"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">Approval Required</p>
                    <p>Your registration will be reviewed by your District Union administrator before you can access the system.</p>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11"
                size="lg"
                disabled={registerMutation.isPending || !formData.name || !formData.phone || !formData.segment || !formData.unionId || !formData.businessRoute || !formData.vehicleType || !formData.vehicleCapacity || !formData.vehicleNumber || !formData.driverLicenseNumber}
              >
                {registerMutation.isPending ? "Submitting..." : "Submit Registration"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already registered?{" "}
          <Link href="/login" className="text-cyan-600 hover:underline">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}