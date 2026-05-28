import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import deliveryLogo from '@assets/aavin-logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Eye, EyeOff, Truck, MapPin, Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { cn } from "@/lib/utils";

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

const VEHICLE_TYPES = [
  { value: "bike", label: "Bike / Two-Wheeler" },
  { value: "auto", label: "Auto Rickshaw" },
  { value: "mini-truck", label: "Mini Truck" },
  { value: "truck", label: "Truck" },
  { value: "van", label: "Van" },
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

export default function DeliverySignup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    unionId: '',
    assignedSegment: '',
    vehicleType: '',
    vehicleNumber: '',
    licenseNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [unionOpen, setUnionOpen] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(true);
  const [locationStatus, setLocationStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      setLocationStatus("Detecting your location...");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const nearestUnion = findNearestUnion(latitude, longitude);
          setFormData(prev => ({ ...prev, unionId: nearestUnion }));
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
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest('POST', '/api/driver/signup', {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        unionId: formData.unionId,
        assignedSegment: formData.assignedSegment,
        vehicleType: formData.vehicleType,
        vehicleNumber: formData.vehicleNumber,
        licenseNumber: formData.licenseNumber,
        password: formData.password,
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Registration Successful',
          description: 'Your application has been submitted for approval.'
        });
        setLocation('/login');
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Registration failed',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Registration failed. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center px-3 sm:px-4 py-6 sm:py-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center p-4 sm:p-6">
          <div className="mx-auto w-12 h-12 sm:w-20 sm:h-20 mb-3 sm:mb-4">
            <img src={deliveryLogo} alt="Aavin Delivery" className="w-full h-full object-contain rounded-xl" />
          </div>
          <CardTitle className="text-xl sm:text-2xl flex items-center justify-center gap-2">
            <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            Delivery Partner Registration
          </CardTitle>
          <CardDescription className="text-sm">Join the Aavin Cart delivery network</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Full Name</label>
                <Input
                  placeholder="Your full name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Phone Number</label>
                <Input
                  placeholder="Mobile number"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Email Address</label>
              <Input
                type="email"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">District Union</label>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <MapPin className="h-3 w-3" />
                {detectingLocation ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {locationStatus}
                  </span>
                ) : (
                  locationStatus
                )}
              </div>
              <Popover open={unionOpen} onOpenChange={setUnionOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={unionOpen}
                    className="w-full justify-between"
                  >
                    {formData.unionId
                      ? DISTRICT_UNIONS.find((union) => union.value === formData.unionId)?.label
                      : "Select your District Union..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search District Union..." />
                    <CommandList>
                      <CommandEmpty>No union found.</CommandEmpty>
                      <CommandGroup>
                        {DISTRICT_UNIONS.map((union) => (
                          <CommandItem
                            key={union.value}
                            value={union.value}
                            onSelect={(currentValue) => {
                              setFormData({...formData, unionId: currentValue});
                              setUnionOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.unionId === union.value ? "opacity-100" : "opacity-0"
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
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Delivery Segment *</label>
              <p className="text-xs text-gray-500 mb-2">Select which products you will deliver</p>
              <Select
                value={formData.assignedSegment}
                onValueChange={(value) => setFormData({...formData, assignedSegment: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your delivery segment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fresh Milk">
                    <span className="flex items-center gap-2">🥛 Fresh Milk</span>
                  </SelectItem>
                  <SelectItem value="Products">
                    <span className="flex items-center gap-2">🧈 Products (Dairy Products)</span>
                  </SelectItem>
                  <SelectItem value="Ice Cream">
                    <span className="flex items-center gap-2">🍦 Ice Cream</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Vehicle Type</label>
                <Select
                  value={formData.vehicleType}
                  onValueChange={(value) => setFormData({...formData, vehicleType: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Vehicle Number</label>
                <Input
                  placeholder="TN 01 AB 1234"
                  value={formData.vehicleNumber}
                  onChange={(e) => setFormData({...formData, vehicleNumber: e.target.value})}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Driving License Number</label>
              <Input
                placeholder="License number"
                value={formData.licenseNumber}
                onChange={(e) => setFormData({...formData, licenseNumber: e.target.value})}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Confirm Password</label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 sm:h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              disabled={isLoading}
            >
              <Truck className="mr-2 h-5 w-5" />
              {isLoading ? 'Registering...' : 'Register as Delivery Partner'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already registered?{' '}
              <Link href="/login" className="text-blue-600 hover:underline font-medium">
                Sign In
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
