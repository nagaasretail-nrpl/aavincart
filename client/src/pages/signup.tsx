import { useState, useEffect } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserPlus, Eye, EyeOff, Building2, Store, ShoppingBag, User, MapPin, Loader2, Check, ChevronsUpDown, Truck, Shield, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import AddressCapture from "@/components/address-capture";
import { Separator } from "@/components/ui/separator";

const PRICING_ROLES = [
  { value: "MRP", label: "MRP (Consumer)" },
];

const DISTRICT_UNIONS = [
  { value: "chennai", label: "Chennai Union", lat: 13.0827, lng: 80.2707 },
  { value: "coimbatore", label: "Coimbatore Union", lat: 11.0168, lng: 76.9558 },
  { value: "cuddalore", label: "Cuddalore Union", lat: 11.7480, lng: 79.7714 },
  { value: "dharmapuri", label: "Dharmapuri Union", lat: 12.1357, lng: 78.1602 },
  { value: "dindigul", label: "Dindigul Union", lat: 10.3673, lng: 77.9803 },
  { value: "erode", label: "Erode Union", lat: 11.3410, lng: 77.7172 },
  { value: "kancheepuram", label: "Kancheepuram Union", lat: 12.8342, lng: 79.7036 },
  { value: "kanniyakumari", label: "Kanniyakumari Union", lat: 8.0883, lng: 77.5385 },
  { value: "karur", label: "Karur Union", lat: 10.9601, lng: 78.0766 },
  { value: "krishnagiri", label: "Krishnagiri Union", lat: 12.5186, lng: 78.2137 },
  { value: "madurai", label: "Madurai Union", lat: 9.9252, lng: 78.1198 },
  { value: "nagapattinam", label: "Nagapattinam Union", lat: 10.7672, lng: 79.8449 },
  { value: "namakkal", label: "Namakkal Union", lat: 11.2189, lng: 78.1674 },
  { value: "nilgiris", label: "Nilgiris Union", lat: 11.4102, lng: 76.6950 },
  { value: "perambalur", label: "Perambalur Union", lat: 11.2320, lng: 78.8807 },
  { value: "pudukottai", label: "Pudukottai Union", lat: 10.3833, lng: 78.8001 },
  { value: "ramanathapuram", label: "Ramanathapuram Union", lat: 9.3639, lng: 78.8395 },
  { value: "salem", label: "Salem Union", lat: 11.6643, lng: 78.1460 },
  { value: "sivagangai", label: "Sivagangai Union", lat: 9.8433, lng: 78.4809 },
  { value: "thanjavur", label: "Thanjavur Union", lat: 10.7870, lng: 79.1378 },
  { value: "theni", label: "Theni Union", lat: 10.0104, lng: 77.4768 },
  { value: "thiruvallur", label: "Thiruvallur Union", lat: 13.1231, lng: 79.9067 },
  { value: "tirunelveli", label: "Tirunelveli Union", lat: 8.7139, lng: 77.7567 },
  { value: "tiruppur", label: "Tiruppur Union", lat: 11.1085, lng: 77.3411 },
  { value: "tiruchirappalli", label: "Tiruchirappalli Union", lat: 10.7905, lng: 78.7047 },
  { value: "tiruvannamalai", label: "Tiruvannamalai Union", lat: 12.2253, lng: 79.0747 },
  { value: "vellore", label: "Vellore Union", lat: 12.9165, lng: 79.1325 },
  { value: "villupuram", label: "Villupuram Union", lat: 11.9401, lng: 79.4861 },
  { value: "virudhunagar", label: "Virudhunagar Union", lat: 9.5681, lng: 77.9624 },
  { value: "ariyalur", label: "Ariyalur Union", lat: 11.1428, lng: 79.0780 },
  { value: "tenkasi", label: "Tenkasi Union", lat: 8.9604, lng: 77.3152 },
];

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function findNearestUnion(lat: number, lng: number): string {
  let nearest = DISTRICT_UNIONS[0];
  let minDistance = Infinity;
  
  for (const union of DISTRICT_UNIONS) {
    const distance = getDistanceKm(lat, lng, union.lat, union.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = union;
    }
  }
  return nearest.value;
}

const ROLE_INFO: Record<string, { title: string; description: string; icon: any; color: string }> = {
  "wholesale-dealer": { 
    title: "Wholesale Dealer Registration", 
    description: "Get wholesale prices on bulk orders",
    icon: Building2,
    color: "bg-blue-500"
  },
  "dealer": { 
    title: "Dealer Registration", 
    description: "Special dealer pricing on all products",
    icon: Store,
    color: "bg-green-500"
  },
  "retailer": { 
    title: "Retailer Registration", 
    description: "Retailer margin pricing",
    icon: ShoppingBag,
    color: "bg-orange-500"
  },
  "mrp": { 
    title: "Consumer Registration", 
    description: "Standard MRP pricing",
    icon: User,
    color: "bg-purple-500"
  },
};

const ROLE_MAP: Record<string, string> = {
  "wholesale-dealer": "WHOLESALE_DEALER",
  "dealer": "DEALER",
  "retailer": "RETAILER",
  "mrp": "MRP",
};

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  email: z.string().email("Please enter a valid email address"),
  unionId: z.string().min(1, "Please select your District Union"),
  pricingRole: z.string().min(1, "Please select your role"),
  freshMilkPricingRole: z.string().optional(),
  productsPricingRole: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
  businessId: z.string().optional(),
  pointName: z.string().optional(),
  route: z.string().optional(),
  deliveryAddress: z.string().optional(),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  fssaiLicense: z.string().optional(),
  tradeLicense: z.string().optional(),
  msmeNumber: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankIfscCode: z.string().optional(),
  accountHolderName: z.string().optional(),
  accountType: z.string().optional(),
  upiId: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupForm = z.infer<typeof signupSchema>;

export default function Signup() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/signup/:role");
  const roleFromUrl = params?.role || "";
  const roleInfo = ROLE_INFO[roleFromUrl];
  const mappedRole = ROLE_MAP[roleFromUrl] || "MRP";
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [unionOpen, setUnionOpen] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(true);
  const [locationStatus, setLocationStatus] = useState<string>("");
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);
  const [gstVerifyResult, setGstVerifyResult] = useState<any>(null);
  const [gstVerifying, setGstVerifying] = useState(false);
  const [panVerifyResult, setPanVerifyResult] = useState<any>(null);
  const [panVerifying, setPanVerifying] = useState(false);
  const [fssaiVerifyResult, setFssaiVerifyResult] = useState<any>(null);
  const [fssaiVerifying, setFssaiVerifying] = useState(false);
  const [ifscVerifyResult, setIfscVerifyResult] = useState<any>(null);
  const [ifscVerifying, setIfscVerifying] = useState(false);
  const [msmeVerifyResult, setMsmeVerifyResult] = useState<any>(null);
  const [msmeVerifying, setMsmeVerifying] = useState(false);
  const { setUser } = useAuth();

  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      unionId: "",
      pricingRole: mappedRole,
      freshMilkPricingRole: mappedRole,
      productsPricingRole: mappedRole,
      password: "",
      confirmPassword: "",
      businessId: "",
      pointName: "",
      route: "",
      deliveryAddress: "",
      gstNumber: "",
      panNumber: "",
      fssaiLicense: "",
      tradeLicense: "",
      msmeNumber: "",
      bankAccountNumber: "",
      bankIfscCode: "",
      accountHolderName: "",
      accountType: "",
      upiId: "",
    },
  });

  const watchedRole = form.watch("pricingRole");
  const isB2B = watchedRole && watchedRole !== "MRP";

  const verifyGst = async () => {
    const gst = form.getValues("gstNumber");
    if (!gst || gst.length !== 15) return;
    setGstVerifying(true);
    try {
      const res = await apiRequest("POST", "/api/verify/gst", { gstNumber: gst });
      const data = await res.json();
      setGstVerifyResult(data);
      if (data.panFromGst) {
        form.setValue("panNumber", data.panFromGst);
      }
    } catch { setGstVerifyResult({ error: true }); }
    setGstVerifying(false);
  };

  const verifyPan = async () => {
    const pan = form.getValues("panNumber");
    if (!pan || pan.length !== 10) return;
    setPanVerifying(true);
    try {
      const res = await apiRequest("POST", "/api/verify/pan", { panNumber: pan });
      const data = await res.json();
      setPanVerifyResult(data);
    } catch { setPanVerifyResult({ error: true }); }
    setPanVerifying(false);
  };

  const verifyFssai = async () => {
    const fssai = form.getValues("fssaiLicense");
    if (!fssai || fssai.length !== 14) return;
    setFssaiVerifying(true);
    try {
      const res = await apiRequest("POST", "/api/verify/fssai", { fssaiLicense: fssai });
      const data = await res.json();
      setFssaiVerifyResult(data);
    } catch { setFssaiVerifyResult({ error: true }); }
    setFssaiVerifying(false);
  };

  const verifyIfsc = async () => {
    const ifsc = form.getValues("bankIfscCode");
    if (!ifsc || ifsc.length !== 11) return;
    setIfscVerifying(true);
    try {
      const res = await apiRequest("POST", "/api/verify/ifsc", { ifscCode: ifsc });
      const data = await res.json();
      setIfscVerifyResult(data);
      if (data.bankName) {
        form.setValue("bankName" as any, data.bankName);
      }
    } catch { setIfscVerifyResult({ error: true }); }
    setIfscVerifying(false);
  };

  const verifyMsme = async () => {
    const msme = form.getValues("msmeNumber");
    if (!msme) return;
    setMsmeVerifying(true);
    try {
      const res = await apiRequest("POST", "/api/verify/msme", { msmeNumber: msme });
      const data = await res.json();
      setMsmeVerifyResult(data);
    } catch { setMsmeVerifyResult({ error: true }); }
    setMsmeVerifying(false);
  };

  useEffect(() => {
    if (mappedRole) {
      form.setValue("pricingRole", mappedRole);
      form.setValue("freshMilkPricingRole", mappedRole);
      form.setValue("productsPricingRole", mappedRole);
    }
  }, [mappedRole, form]);

  useEffect(() => {
    if (navigator.geolocation) {
      setLocationStatus("Detecting your location...");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const nearestUnion = findNearestUnion(latitude, longitude);
          form.setValue("unionId", nearestUnion);
          const unionLabel = DISTRICT_UNIONS.find(u => u.value === nearestUnion)?.label || nearestUnion;
          setLocationStatus(`Auto-selected: ${unionLabel}`);
          setDetectingLocation(false);
        },
        (error) => {
          console.log("Geolocation error:", error.message);
          setLocationStatus("Please select your union");
          setDetectingLocation(false);
        },
        { timeout: 5000, enableHighAccuracy: false }
      );
    } else {
      setLocationStatus("Please select your union");
      setDetectingLocation(false);
    }
  }, [form]);

  const signupMutation = useMutation({
    mutationFn: async (data: Omit<SignupForm, 'confirmPassword'> & { deliveryPoint?: any }) => {
      const response = await apiRequest("POST", "/api/auth/signup", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.pendingApproval) {
        form.setError("root", {
          type: "success",
          message: "Registration successful! Your account is pending approval by the admin. You will be able to login once approved.",
        });
      } else if (data.user) {
        queryClient.clear();
        setUser(data.user);
        form.setError("root", {
          type: "success",
          message: "Account created successfully! Redirecting to home...",
        });
        setTimeout(() => {
          setLocation("/");
        }, 2000);
      }
    },
    onError: (error: Error) => {
      form.setError("root", {
        message: error.message.includes("409") 
          ? "An account with this email already exists" 
          : "Sign up failed. Please try again.",
      });
    },
  });

  const onSubmit = (data: SignupForm) => {
    const { confirmPassword, businessId, pointName, route, deliveryAddress, 
            gstNumber, panNumber, fssaiLicense, tradeLicense, msmeNumber,
            bankAccountNumber, bankIfscCode, accountHolderName, accountType, upiId,
            ...signupData } = data;
    const payload: any = { ...signupData };
    if (isB2B && pointName && deliveryAddress) {
      payload.deliveryPoint = {
        businessId: businessId || null,
        pointName,
        route: route || null,
        deliveryAddress,
        latitude: deliveryLat ? String(deliveryLat) : null,
        longitude: deliveryLng ? String(deliveryLng) : null,
      };
    }
    if (isB2B) {
      if (gstNumber) payload.gstNumber = gstNumber;
      if (panNumber) payload.panNumber = panNumber;
      if (fssaiLicense) payload.fssaiLicense = fssaiLicense;
      if (tradeLicense) payload.tradeLicense = tradeLicense;
      if (msmeNumber) payload.msmeNumber = msmeNumber;
      if (bankAccountNumber) payload.bankAccountNumber = bankAccountNumber;
      if (bankIfscCode) payload.bankIfscCode = bankIfscCode;
      if (accountHolderName) payload.accountHolderName = accountHolderName;
      if (accountType) payload.accountType = accountType;
      if (upiId) payload.upiId = upiId;
    }
    signupMutation.mutate(payload);
  };

  const IconComponent = roleInfo?.icon || UserPlus;
  const iconBgColor = roleInfo?.color || "bg-orange-500";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-3 sm:px-4 py-4 sm:py-8">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="text-center p-4 sm:p-6">
          <div className="flex justify-center mb-3 sm:mb-4">
            <div className={`rounded-full ${iconBgColor} p-2.5 sm:p-3`}>
              <IconComponent className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold">
            {roleInfo?.title || "Sign Up"}
          </CardTitle>
          <CardDescription className="text-sm">
            {roleInfo?.description || "Create your account and select your pricing role"}
          </CardDescription>
          {roleFromUrl && (
            <Link href="/register" className="text-sm text-green-600 hover:underline mt-2 inline-block">
              ← Choose a different role
            </Link>
          )}
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        placeholder="Enter your full name"
                        className="text-base"
                        data-testid="input-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="tel"
                        placeholder="Enter your phone number"
                        className="text-base"
                        data-testid="input-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="Enter your email address"
                        className="text-base"
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="unionId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Select Your District Union
                    </FormLabel>
                    <Popover open={unionOpen} onOpenChange={setUnionOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={unionOpen}
                            className={cn(
                              "w-full justify-between min-h-[44px]",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="select-union"
                          >
                            {detectingLocation ? (
                              <span className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Detecting location...
                              </span>
                            ) : field.value ? (
                              DISTRICT_UNIONS.find((union) => union.value === field.value)?.label
                            ) : (
                              "Type or select your union..."
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Type union name..." />
                          <CommandList>
                            <CommandEmpty>No union found.</CommandEmpty>
                            <CommandGroup>
                              {DISTRICT_UNIONS.map((union) => (
                                <CommandItem
                                  key={union.value}
                                  value={union.label}
                                  onSelect={() => {
                                    field.onChange(union.value);
                                    setUnionOpen(false);
                                    setLocationStatus(`Selected: ${union.label}`);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === union.value ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {union.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {detectingLocation ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          {locationStatus}
                        </>
                      ) : locationStatus.includes("Auto-selected") ? (
                        <>
                          <MapPin className="h-3 w-3 text-green-600" />
                          <span className="text-green-600">{locationStatus}</span>
                        </>
                      ) : locationStatus.includes("Selected") ? (
                        <>
                          <Check className="h-3 w-3 text-blue-600" />
                          <span className="text-blue-600">{locationStatus}</span>
                        </>
                      ) : (
                        "You will only be able to order from this union"
                      )}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <input type="hidden" {...form.register("pricingRole")} value="MRP" />
              
              {isB2B && (
                <>
                  <Separator className="my-2" />
                  <div className="space-y-1 mb-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Truck className="h-4 w-4 text-primary" />
                      Delivery Point Details
                    </h3>
                    <p className="text-xs text-muted-foreground">Add your primary delivery point (you can add more later)</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="businessId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business ID</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. DLR-101" className="text-base" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="route"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Route</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. Route 5" className="text-base" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="pointName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Point Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. Rajan Milk Center - Anna Nagar" className="text-base" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deliveryAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <AddressCapture
                            value={field.value || ""}
                            onChange={field.onChange}
                            onCoordinatesChange={(lat, lng) => {
                              setDeliveryLat(lat);
                              setDeliveryLng(lng);
                            }}
                            latitude={deliveryLat}
                            longitude={deliveryLng}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Separator className="my-2" />

                  <Separator className="my-2" />
                  <div className="space-y-1 mb-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      Business Compliance (Optional)
                    </h3>
                    <p className="text-xs text-muted-foreground">Add your business licenses for verification</p>
                  </div>

                  <FormField
                    control={form.control}
                    name="gstNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GST Number (GSTIN)</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input {...field} placeholder="e.g. 33AABCU9603R1ZM" maxLength={15} className="uppercase text-base" onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                            <Button type="button" size="sm" variant="outline" className="min-h-[44px]" onClick={verifyGst} disabled={gstVerifying || !field.value || field.value.length < 15}>
                              {gstVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                            </Button>
                          </div>
                        </FormControl>
                        {gstVerifyResult && !gstVerifyResult.error && (
                          <div className={`text-xs p-2 rounded space-y-1 ${gstVerifyResult.verified ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                            {gstVerifyResult.verified ? (
                              <>
                                <div className="font-semibold flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {gstVerifyResult.businessName}</div>
                                {gstVerifyResult.tradeName && gstVerifyResult.tradeName !== gstVerifyResult.businessName && <div>Trade Name: {gstVerifyResult.tradeName}</div>}
                                <div>Status: {gstVerifyResult.status} | {gstVerifyResult.businessType} | {gstVerifyResult.stateName}</div>
                                {gstVerifyResult.address && <div className="text-[10px] opacity-80">{gstVerifyResult.address}</div>}
                                <div className="text-[10px]">PAN: {gstVerifyResult.panFromGst} (auto-filled below)</div>
                              </>
                            ) : (
                              <>
                                <div className="font-semibold">Format Valid - {gstVerifyResult.stateName}</div>
                                <div>Entity: {gstVerifyResult.entityType} | PAN: {gstVerifyResult.panFromGst} (auto-filled below)</div>
                                <div className="text-[10px] opacity-80">Online portal could not be reached. Please ensure details match your GST certificate.</div>
                              </>
                            )}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="panNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PAN Number</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input {...field} placeholder="e.g. ABCDE1234F" maxLength={10} className="uppercase text-base" onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                            <Button type="button" size="sm" variant="outline" className="min-h-[44px]" onClick={verifyPan} disabled={panVerifying || !field.value || field.value.length < 10}>
                              {panVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                            </Button>
                          </div>
                        </FormControl>
                        {panVerifyResult && !panVerifyResult.error && (
                          <div className="text-xs p-2 rounded bg-green-50 text-green-700">
                            ✓ Valid PAN ({panVerifyResult.entityType})
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fssaiLicense"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>FSSAI License Number</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input {...field} placeholder="14-digit FSSAI number" maxLength={14} className="text-base" onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))} />
                            <Button type="button" size="sm" variant="outline" className="min-h-[44px]" onClick={verifyFssai} disabled={fssaiVerifying || !field.value || field.value.length < 14}>
                              {fssaiVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                            </Button>
                          </div>
                        </FormControl>
                        {fssaiVerifyResult && !fssaiVerifyResult.error && (
                          <div className="text-xs p-2 rounded bg-green-50 text-green-700">
                            ✓ Valid {fssaiVerifyResult.licenseType} - {fssaiVerifyResult.state}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="tradeLicense"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trade License</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Trade License No." className="text-base" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="msmeNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>MSME Registration (Udyam)</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input {...field} placeholder="UDYAM-TN-00-0000000" className="uppercase text-base" />
                            </FormControl>
                            <Button type="button" variant={msmeVerifyResult?.verified ? "default" : "outline"} size="sm" className="min-h-[44px]" onClick={verifyMsme} disabled={msmeVerifying}>
                              {msmeVerifying ? "..." : msmeVerifyResult?.verified ? <><CheckCircle2 className="h-3 w-3 mr-1" />Verified</> : "Verify"}
                            </Button>
                          </div>
                          {msmeVerifyResult && !msmeVerifyResult.error && (
                            <p className={`text-xs mt-1 ${msmeVerifyResult.verified ? 'text-green-600' : 'text-amber-600'}`}>
                              {msmeVerifyResult.verified ? `Valid Udyam - ${msmeVerifyResult.stateName || ''} (${msmeVerifyResult.enterpriseType || ''})` : msmeVerifyResult.message || 'Format validated'}
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator className="my-2" />
                  <div className="space-y-1 mb-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      Bank Details (Optional)
                    </h3>
                    <p className="text-xs text-muted-foreground">Add your bank details for payments and settlements</p>
                  </div>

                  <FormField
                    control={form.control}
                    name="accountHolderName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Holder Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Name as per bank account" className="text-base" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="bankAccountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Bank account number" className="text-base" onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="accountType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="current">Current</SelectItem>
                              <SelectItem value="savings">Savings</SelectItem>
                              <SelectItem value="overdraft">Overdraft</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="bankIfscCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>IFSC Code</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input {...field} placeholder="e.g. SBIN0001234" maxLength={11} className="uppercase text-base" onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                            <Button type="button" size="sm" variant="outline" className="min-h-[44px]" onClick={verifyIfsc} disabled={ifscVerifying || !field.value || field.value.length < 11}>
                              {ifscVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                            </Button>
                          </div>
                        </FormControl>
                        {ifscVerifyResult && !ifscVerifyResult.error && ifscVerifyResult.verified && (
                          <div className="text-xs p-2 rounded bg-green-50 text-green-700">
                            ✓ {ifscVerifyResult.bankName} - {ifscVerifyResult.branch}, {ifscVerifyResult.city}
                          </div>
                        )}
                        {ifscVerifyResult && !ifscVerifyResult.error && !ifscVerifyResult.verified && (
                          <div className="text-xs p-2 rounded bg-amber-50 text-amber-700">
                            {ifscVerifyResult.message}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="upiId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UPI ID (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. name@upi" className="text-base" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

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
                          placeholder="Create a password"
                          className="text-base"
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
              
              <FormField
                control={form.control}
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
                          className="text-base"
                          data-testid="input-confirm-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          data-testid="button-toggle-confirm-password"
                        >
                          {showConfirmPassword ? (
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
                className="w-full min-h-[44px] bg-orange-500 hover:bg-orange-600 text-white"
                disabled={signupMutation.isPending}
                data-testid="button-signup"
              >
                {signupMutation.isPending ? "Creating account..." : "Sign Up"}
              </Button>

              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Already have an account?{" "}
                  <Link href="/login" className="text-blue-600 hover:text-blue-500 font-medium">
                    Sign In
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