import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import unionLogo from '@assets/F-F_1770588249868.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Eye, EyeOff, Building2, MapPin, Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { cn } from "@/lib/utils";

const DISTRICTS = [
  { value: "chennai", label: "Chennai", lat: 13.0827, lng: 80.2707 },
  { value: "coimbatore", label: "Coimbatore", lat: 11.0168, lng: 76.9558 },
  { value: "cuddalore", label: "Cuddalore", lat: 11.7480, lng: 79.7714 },
  { value: "dharmapuri", label: "Dharmapuri", lat: 12.1357, lng: 78.1602 },
  { value: "dindigul", label: "Dindigul", lat: 10.3673, lng: 77.9803 },
  { value: "erode", label: "Erode", lat: 11.3410, lng: 77.7172 },
  { value: "kancheepuram", label: "Kancheepuram", lat: 12.8342, lng: 79.7036 },
  { value: "kanniyakumari", label: "Kanniyakumari", lat: 8.0883, lng: 77.5385 },
  { value: "karur", label: "Karur", lat: 10.9601, lng: 78.0766 },
  { value: "krishnagiri", label: "Krishnagiri", lat: 12.5186, lng: 78.2137 },
  { value: "madurai", label: "Madurai", lat: 9.9252, lng: 78.1198 },
  { value: "nagapattinam", label: "Nagapattinam", lat: 10.7672, lng: 79.8449 },
  { value: "namakkal", label: "Namakkal", lat: 11.2189, lng: 78.1674 },
  { value: "nilgiris", label: "Nilgiris", lat: 11.4102, lng: 76.6950 },
  { value: "perambalur", label: "Perambalur", lat: 11.2320, lng: 78.8807 },
  { value: "pudukottai", label: "Pudukottai", lat: 10.3833, lng: 78.8001 },
  { value: "ramanathapuram", label: "Ramanathapuram", lat: 9.3639, lng: 78.8395 },
  { value: "salem", label: "Salem", lat: 11.6643, lng: 78.1460 },
  { value: "sivagangai", label: "Sivagangai", lat: 9.8433, lng: 78.4809 },
  { value: "thanjavur", label: "Thanjavur", lat: 10.7870, lng: 79.1378 },
  { value: "theni", label: "Theni", lat: 10.0104, lng: 77.4768 },
  { value: "thiruvallur", label: "Thiruvallur", lat: 13.1231, lng: 79.9067 },
  { value: "tirunelveli", label: "Tirunelveli", lat: 8.7139, lng: 77.7567 },
  { value: "tiruppur", label: "Tiruppur", lat: 11.1085, lng: 77.3411 },
  { value: "tiruchirappalli", label: "Tiruchirappalli", lat: 10.7905, lng: 78.7047 },
  { value: "tiruvannamalai", label: "Tiruvannamalai", lat: 12.2253, lng: 79.0747 },
  { value: "vellore", label: "Vellore", lat: 12.9165, lng: 79.1325 },
  { value: "villupuram", label: "Villupuram", lat: 11.9401, lng: 79.4861 },
  { value: "virudhunagar", label: "Virudhunagar", lat: 9.5681, lng: 77.9624 },
  { value: "ariyalur", label: "Ariyalur", lat: 11.1428, lng: 79.0780 },
  { value: "tenkasi", label: "Tenkasi", lat: 8.9604, lng: 77.3152 },
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

function findNearestDistrict(lat: number, lng: number): string {
  let nearest = DISTRICTS[0];
  let minDistance = Infinity;
  
  for (const district of DISTRICTS) {
    const distance = getDistanceKm(lat, lng, district.lat, district.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = district;
    }
  }
  return nearest.value;
}

export default function MerchantSignup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    unionName: '',
    district: '',
    contactPersonName: '',
    contactEmail: '',
    contactPhone: '',
    officeAddress: '',
    unionCode: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(true);
  const [locationStatus, setLocationStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      setLocationStatus("Detecting your location...");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const nearestDistrict = findNearestDistrict(latitude, longitude);
          setFormData(prev => ({ ...prev, district: nearestDistrict }));
          const districtLabel = DISTRICTS.find(d => d.value === nearestDistrict)?.label || nearestDistrict;
          setLocationStatus(`Auto-selected: ${districtLabel}`);
          setDetectingLocation(false);
        },
        (error) => {
          console.log("Geolocation error:", error.message);
          setLocationStatus("Please select your district");
          setDetectingLocation(false);
        },
        { timeout: 5000, enableHighAccuracy: false }
      );
    } else {
      setLocationStatus("Please select your district");
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
      const response = await apiRequest('POST', '/api/merchant/register', {
        unionName: formData.unionName,
        district: formData.district,
        contactPerson: formData.contactPersonName,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        officeAddress: formData.officeAddress,
        username: formData.unionCode,
        password: formData.password,
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Registration Submitted',
          description: 'Registration submitted for approval'
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
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center p-4 sm:p-6">
          <div className="mx-auto w-12 h-12 sm:w-20 sm:h-20 mb-3 sm:mb-4">
            <img src={unionLogo} alt="Aavin Union" className="w-full h-full object-contain rounded-xl" />
          </div>
          <CardTitle className="text-xl sm:text-2xl flex items-center justify-center gap-2">
            <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            District Union Registration
          </CardTitle>
          <CardDescription className="text-sm">Register your District Cooperative Milk Producers' Union</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Union Name</label>
              <Input
                placeholder="e.g., Salem District Cooperative Milk..."
                value={formData.unionName}
                onChange={(e) => setFormData({...formData, unionName: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">District</label>
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
              <Popover open={districtOpen} onOpenChange={setDistrictOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={districtOpen}
                    className="w-full justify-between"
                  >
                    {formData.district
                      ? DISTRICTS.find((d) => d.value === formData.district)?.label
                      : "Select your District..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search District..." />
                    <CommandList>
                      <CommandEmpty>No district found.</CommandEmpty>
                      <CommandGroup>
                        {DISTRICTS.map((district) => (
                          <CommandItem
                            key={district.value}
                            value={district.value}
                            onSelect={(currentValue) => {
                              setFormData({...formData, district: currentValue});
                              setDistrictOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.district === district.value ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {district.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Contact Person Name</label>
                <Input
                  placeholder="Manager / In-charge name"
                  value={formData.contactPersonName}
                  onChange={(e) => setFormData({...formData, contactPersonName: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Contact Email</label>
                <Input
                  type="email"
                  placeholder="contact@example.com"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Contact Phone</label>
              <Input
                placeholder="Phone number"
                value={formData.contactPhone}
                onChange={(e) => setFormData({...formData, contactPhone: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Office Address</label>
              <Textarea
                placeholder="Complete address of the office"
                value={formData.officeAddress}
                onChange={(e) => setFormData({...formData, officeAddress: e.target.value})}
                required
                rows={2}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Username/Login Code</label>
              <Input
                placeholder="e.g., SLM, CBE, MDU"
                value={formData.unionCode}
                onChange={(e) => setFormData({...formData, unionCode: e.target.value.toUpperCase()})}
                required
                maxLength={5}
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
              <Building2 className="mr-2 h-5 w-5" />
              {isLoading ? 'Registering...' : 'Register District Union'}
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
