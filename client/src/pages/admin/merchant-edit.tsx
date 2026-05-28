import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import AdminLayout from './layout';
import { useParams, Link } from 'wouter';
import { queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Store, 
  User, 
  MapPin, 
  Globe, 
  Utensils, 
  Star,
  DollarSign,
  Shield,
  Settings,
  Code,
  Smartphone,
  Search,
  UserPlus,
  Phone,
  Share2,
  ShieldCheck,
  Map,
  Bell,
  ArrowLeft,
  LogIn,
  Save
} from 'lucide-react';

interface Merchant {
  id: string;
  merchantUuid: string;
  restaurantName: string;
  restaurantSlug: string;
  restaurantPhone: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  latitude?: string;
  longitude?: string;
  logo?: string;
  headerImage?: string;
  description?: string;
  shortDescription?: string;
  cuisine?: string;
  services?: string[];
  posServices?: string[];
  tablesideServices?: string[];
  tags?: string[];
  deliveryDistanceCovered?: string;
  distanceUnit?: string;
  status: string;
  featured?: boolean;
  published?: boolean;
  username: string;
  firstName?: string;
  lastName?: string;
  membershipType?: string;
  invoiceTerms?: string;
  commissionDelivery?: number;
  commissionPickup?: number;
  commissionDinein?: number;
  commissionTakeout?: number;
  zone?: string;
  paymentSettings?: Record<string, boolean>;
  accessSettings?: Record<string, boolean>;
  retailerPriceEnabled?: boolean;
  defaultCurrency?: string;
  taxNumber?: string;
  preparationTime?: number;
  whatsappNumber?: string;
  websiteUrl?: string;
  androidUrl?: string;
  iosUrl?: string;
  createdAt: Date;
}

const menuItems = [
  { id: 'merchant-info', label: 'Union Information', icon: Store },
  { id: 'login-info', label: 'Login Information', icon: User },
  { id: 'address', label: 'Address', icon: MapPin },
  { id: 'zone', label: 'Zone', icon: Globe },
  { id: 'merchant-type', label: 'Union Type', icon: Utensils },
  { id: 'featured', label: 'Featured', icon: Star },
  { id: 'payment-settings', label: 'Payment Settings', icon: DollarSign },
  { id: 'access-settings', label: 'Access Settings', icon: Shield },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'api-access', label: 'API Access', icon: Code },
  { id: 'mobile-settings', label: 'Mobile Settings', icon: Smartphone },
  { id: 'search-mode', label: 'Search Mode', icon: Search },
  { id: 'login-signup', label: 'Login & Signup', icon: UserPlus },
  { id: 'phone-settings', label: 'Phone Settings', icon: Phone },
  { id: 'social-settings', label: 'Social Settings', icon: Share2 },
  { id: 'google-recaptcha', label: 'Google Recaptcha', icon: ShieldCheck },
  { id: 'map-api-keys', label: 'Map API Keys', icon: Map },
  { id: 'push-notifications', label: 'Push notifications', icon: Bell },
];

const paymentGateways = [
  { id: 'pay_on_delivery', label: 'Pay on delivery' },
  { id: 'cash_on_delivery', label: 'Cash On delivery' },
  { id: 'credit_debit_card', label: 'Credit/Debit Card' },
  { id: 'paypal', label: 'Paypal' },
  { id: 'razorpay', label: 'Razorpay' },
  { id: 'cashfree', label: 'Cashfree' },
  { id: 'bank_transfer', label: 'Bank Transfer' },
  { id: 'credit', label: 'Credit (B2B Credit Terms)' },
];

const accessPermissions = [
  { category: 'Dashboard', hasActions: false, items: [
    { name: 'Dashboard', hasActions: false },
    { name: 'Order Summary', hasActions: false },
    { name: 'Week Sales', hasActions: false },
    { name: 'Daily statistics', hasActions: false },
    { name: 'Last 5 Orders', hasActions: false },
    { name: 'Popular items', hasActions: false },
    { name: 'Sales overview', hasActions: false },
    { name: 'Top Customers', hasActions: false },
    { name: 'Overview of Review', hasActions: false },
  ]},
  { category: 'Union', hasActions: true, items: [
    { name: 'Union Information', hasActions: true },
    { name: 'Login information', hasActions: true },
    { name: 'Address', hasActions: true },
    { name: 'Payment history', hasActions: true },
    { name: 'Settings', hasActions: true },
    { name: 'Time Zone', hasActions: true },
    { name: 'Store Hours', hasActions: true },
    { name: 'Taxes', hasActions: true },
    { name: 'SEO', hasActions: true },
  ]},
  { category: 'Orders', hasActions: true, items: [
    { name: 'View Order', hasActions: true },
    { name: 'New Orders', hasActions: true },
    { name: 'Orders Processing', hasActions: true },
    { name: 'Orders Ready', hasActions: true },
    { name: 'Completed', hasActions: true },
    { name: 'Scheduled', hasActions: true },
    { name: 'All Orders', hasActions: true },
  ]},
  { category: 'Attributes', hasActions: true, items: [
    { name: 'Attributes', hasActions: true },
  ]},
  { category: 'Food/Items', hasActions: true, items: [
    { name: 'Food/Items', hasActions: true },
    { name: 'Price List', hasActions: true },
    { name: 'Food Preview', hasActions: false },
    { name: 'Duplicate Items', hasActions: false },
    { name: 'Bulk Upload', hasActions: false },
    { name: 'Bulk Update', hasActions: false },
  ]},
  { category: 'Category', hasActions: true, items: [
    { name: 'Category', hasActions: true },
    { name: 'Sort Category', hasActions: false },
    { name: 'Sort Category Items', hasActions: false },
  ]},
  { category: 'Addon Category', hasActions: true, items: [
    { name: 'Addon Category', hasActions: true },
  ]},
  { category: 'Ingredients', hasActions: true, items: [
    { name: 'Ingredients', hasActions: true },
  ]},
  { category: 'Menu', hasActions: true, items: [
    { name: 'Menu', hasActions: true },
    { name: 'Preview', hasActions: false },
  ]},
  { category: 'Union', hasActions: true, items: [
    { name: 'Union', hasActions: true },
  ]},
  { category: 'Customers', hasActions: true, items: [
    { name: 'Customers', hasActions: true },
  ]},
  { category: 'Reviews', hasActions: true, items: [
    { name: 'Reviews', hasActions: true },
  ]},
  { category: 'Coupon & Promos', hasActions: true, items: [
    { name: 'Coupon & Promos', hasActions: true },
    { name: 'Apply Discount', hasActions: true },
  ]},
  { category: 'Driver Management', hasActions: true, items: [
    { name: 'Driver', hasActions: true },
    { name: 'Assign Orders', hasActions: false },
    { name: 'Driver Payout', hasActions: true },
    { name: 'Assign Orders Bulk', hasActions: false },
    { name: 'Export', hasActions: false },
  ]},
  { category: 'Ordering Platform', hasActions: false, items: [
    { name: 'POS System', hasActions: false },
    { name: 'POS Orders', hasActions: true },
    { name: 'Tableside', hasActions: false },
    { name: 'Tableside Orders', hasActions: true },
    { name: 'Booking', hasActions: false },
    { name: 'Booking Orders', hasActions: true },
  ]},
  { category: 'Live Map View', hasActions: false, items: [
    { name: 'Live Map View', hasActions: false },
    { name: 'Driver live location', hasActions: false },
  ]},
  { category: 'POS', hasActions: false, items: [
    { name: 'View POS', hasActions: false },
    { name: 'Customer Details', hasActions: false },
    { name: 'Auto Print', hasActions: false },
  ]},
  { category: 'Reports', hasActions: false, items: [
    { name: 'Sales', hasActions: false },
    { name: 'Top Customers', hasActions: false },
    { name: 'Top Items', hasActions: false },
    { name: 'Payout', hasActions: false },
    { name: 'Report Filter', hasActions: false },
    { name: 'Download Sales', hasActions: false },
    { name: 'View Payout', hasActions: false },
    { name: 'Driver Earnings Report', hasActions: false },
    { name: 'Driver Cash collected', hasActions: false },
    { name: 'Export Driver Payout', hasActions: false },
  ]},
  { category: 'Tax reports', hasActions: true, items: [
    { name: 'Tax reports', hasActions: true },
    { name: 'Tax Rates', hasActions: true },
  ]},
  { category: 'Payout', hasActions: false, items: [
    { name: 'Payout', hasActions: false },
    { name: 'Wallet History', hasActions: false },
    { name: 'Download Wallet History', hasActions: false },
  ]},
  { category: 'Gallery', hasActions: true, items: [
    { name: 'Gallery', hasActions: true },
  ]},
  { category: 'Table', hasActions: true, items: [
    { name: 'Table', hasActions: true },
    { name: 'Export', hasActions: false },
    { name: 'Generate QR Code', hasActions: false },
    { name: 'Print QR', hasActions: false },
  ]},
  { category: 'Slider', hasActions: true, items: [
    { name: 'Slider', hasActions: true },
  ]},
  { category: 'Printing', hasActions: false, items: [
    { name: 'Configure Printing', hasActions: false },
    { name: 'Print Test Receipt', hasActions: false },
  ]},
  { category: 'Settings & Configurations', hasActions: false, items: [
    { name: 'Settings', hasActions: false },
  ]},
  { category: 'Integrations', hasActions: false, items: [
    { name: 'Connect with Doordash', hasActions: false },
    { name: 'Loyalty Program', hasActions: false },
    { name: 'Store Link', hasActions: false },
  ]},
  { category: 'Whatsapp Ordering', hasActions: false, items: [
    { name: 'Whatsapp Ordering', hasActions: false },
  ]},
  { category: 'Email Marketing', hasActions: true, items: [
    { name: 'Email Marketing', hasActions: true },
    { name: 'Test email blast', hasActions: false },
  ]},
  { category: 'SMS Broadcast', hasActions: true, items: [
    { name: 'SMS Broadcast', hasActions: true },
  ]},
  { category: 'Custom Page', hasActions: true, items: [
    { name: 'Custom Page', hasActions: true },
  ]},
  { category: 'Staff', hasActions: true, items: [
    { name: 'Staff', hasActions: true },
    { name: 'Staff Logs', hasActions: false },
  ]},
  { category: 'Order status', hasActions: false, items: [
    { name: 'Order status', hasActions: false },
  ]},
  { category: 'Print Spooler', hasActions: false, items: [
    { name: 'Print Spooler', hasActions: false },
  ]},
  { category: 'Commission Report', hasActions: false, items: [
    { name: 'Commission Report', hasActions: false },
    { name: 'Export', hasActions: false },
  ]},
];

export default function MerchantEdit() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState('merchant-info');
  const [formData, setFormData] = useState<Partial<Merchant>>({});
  const [accessChecks, setAccessChecks] = useState<Record<string, boolean>>({});
  const [checkAll, setCheckAll] = useState(false);

  const { data: merchant, isLoading, error } = useQuery<Merchant>({
    queryKey: ['/api/admin/merchants', id],
    queryFn: async () => {
      const response = await fetch(`/api/admin/merchants/${id}`);
      if (!response.ok) throw new Error('Failed to fetch merchant');
      return response.json();
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (merchant) {
      setFormData(merchant);
    }
  }, [merchant]);

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Merchant>) => {
      const response = await fetch(`/api/admin/merchants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Merchant update failed:', errorData);
        throw new Error(errorData.error || 'Failed to update merchant');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/merchants'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/merchants', id] });
      toast({ title: "Success", description: "Union updated successfully" });
    },
    onError: (error: Error) => {
      console.error('Mutation error:', error);
      toast({ title: "Error", description: error.message || "Failed to update union", variant: "destructive" });
    },
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleAutoLogin = () => {
    window.open(`/union/dashboard?auto_login=${id}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !merchant) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">Failed to load merchant</p>
        <Link href="/admin/merchant">
          <Button><ArrowLeft className="h-4 w-4 mr-2" />Back to List</Button>
        </Link>
      </div>
    );
  }

  const renderMerchantInfo = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="restaurantName">District Union Name</Label>
          <Input
            id="restaurantName"
            value={formData.restaurantName || ''}
            onChange={(e) => handleInputChange('restaurantName', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="restaurantSlug">Union Slug</Label>
          <Input
            id="restaurantSlug"
            value={formData.restaurantSlug || ''}
            onChange={(e) => handleInputChange('restaurantSlug', e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="contactName">Contact Name</Label>
        <Input
          id="contactName"
          value={formData.contactName || ''}
          onChange={(e) => handleInputChange('contactName', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="contactPhone">Contact Phone</Label>
          <Input
            id="contactPhone"
            value={formData.contactPhone || ''}
            onChange={(e) => handleInputChange('contactPhone', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="contactEmail">Contact email</Label>
          <Input
            id="contactEmail"
            type="email"
            value={formData.contactEmail || ''}
            onChange={(e) => handleInputChange('contactEmail', e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="logo">Logo</Label>
        <p className="text-xs text-gray-500 mb-1">Recommended image size: 600x600 pixels</p>
        <div className="flex gap-2">
          <Input id="logo" value={formData.logo || ''} onChange={(e) => handleInputChange('logo', e.target.value)} placeholder="Logo URL" />
          <Button variant="outline">Browse</Button>
        </div>
      </div>

      <div>
        <Label htmlFor="headerImage">Header</Label>
        <p className="text-xs text-gray-500 mb-1">Recommended image size: 1400x600 pixels</p>
        <div className="flex gap-2">
          <Input id="headerImage" value={formData.headerImage || ''} onChange={(e) => handleInputChange('headerImage', e.target.value)} placeholder="Header URL" />
          <Button variant="outline">Browse</Button>
        </div>
      </div>

      <div>
        <Label htmlFor="description">About</Label>
        <Textarea
          id="description"
          rows={5}
          value={formData.description || ''}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Full description of the district union..."
        />
      </div>

      <div>
        <Label htmlFor="shortDescription">Short About</Label>
        <Textarea
          id="shortDescription"
          rows={3}
          value={formData.shortDescription || ''}
          onChange={(e) => handleInputChange('shortDescription', e.target.value)}
          placeholder="Brief description..."
        />
      </div>

      <div>
        <Label htmlFor="cuisine">Cuisine</Label>
        <Input
          id="cuisine"
          value={formData.cuisine || ''}
          onChange={(e) => handleInputChange('cuisine', e.target.value)}
          placeholder="e.g., Italian, Chinese, Indian"
        />
      </div>

      <div>
        <Label>Online Services</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {['Delivery', 'Pickup', 'Dinein', 'Takeout'].map(service => (
            <Badge 
              key={service} 
              variant={(formData.services || []).includes(service.toLowerCase()) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => {
                const current = formData.services || [];
                const newServices = current.includes(service.toLowerCase())
                  ? current.filter(s => s !== service.toLowerCase())
                  : [...current, service.toLowerCase()];
                handleInputChange('services', newServices);
              }}
            >
              × {service}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <Label>POS Services <span className="text-gray-400 font-normal text-xs">(if empty will use online services instead)</span></Label>
        <div className="border rounded-lg mt-2 bg-gray-50">
          <div className="p-2 border-b">
            <Input placeholder="Search..." className="border-0 bg-transparent focus-visible:ring-0" />
          </div>
          <div className="max-h-40 overflow-y-auto">
            {['Delivery', 'Pickup', 'Dinein', 'POS', 'Takeout'].map(service => (
              <div 
                key={service} 
                className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${(formData.posServices || []).includes(service.toLowerCase()) ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}`}
                onClick={() => {
                  const current = formData.posServices || [];
                  const newServices = current.includes(service.toLowerCase())
                    ? current.filter(s => s !== service.toLowerCase())
                    : [...current, service.toLowerCase()];
                  handleInputChange('posServices', newServices);
                }}
              >
                {service}
              </div>
            ))}
          </div>
        </div>
        {(formData.posServices || []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {(formData.posServices || []).map(s => (
              <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
            ))}
          </div>
        )}
      </div>

      <div>
        <Label>Tableside Services <span className="text-gray-400 font-normal text-xs">(if empty will use online services instead)</span></Label>
        <div className="border rounded-lg mt-2 bg-gray-50">
          <div className="p-2 border-b">
            <Input placeholder="Search..." className="border-0 bg-transparent focus-visible:ring-0" />
          </div>
          <div className="max-h-40 overflow-y-auto">
            {['Delivery', 'Pickup', 'Dinein', 'POS', 'Takeout'].map(service => (
              <div 
                key={service} 
                className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${(formData.tablesideServices || []).includes(service.toLowerCase()) ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}`}
                onClick={() => {
                  const current = formData.tablesideServices || [];
                  const newServices = current.includes(service.toLowerCase())
                    ? current.filter(s => s !== service.toLowerCase())
                    : [...current, service.toLowerCase()];
                  handleInputChange('tablesideServices', newServices);
                }}
              >
                {service}
              </div>
            ))}
          </div>
        </div>
        {(formData.tablesideServices || []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {(formData.tablesideServices || []).map(s => (
              <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
            ))}
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="tags">Tags</Label>
        <Input
          id="tags"
          value={(formData.tags || []).join(', ')}
          onChange={(e) => handleInputChange('tags', e.target.value.split(',').map(t => t.trim()))}
          placeholder="Enter tags separated by commas"
        />
      </div>

      <div>
        <Label>Featured</Label>
        <div className="mt-2">
          <Switch
            checked={formData.featured || false}
            onCheckedChange={(checked) => handleInputChange('featured', checked)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="deliveryDistance">Delivery Distance Covered</Label>
          <Input
            id="deliveryDistance"
            type="number"
            value={formData.deliveryDistanceCovered || 0}
            onChange={(e) => handleInputChange('deliveryDistanceCovered', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="distanceUnit">Distance Unit</Label>
          <Select value={formData.distanceUnit || 'miles'} onValueChange={(value) => handleInputChange('distanceUnit', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="miles">Miles</SelectItem>
              <SelectItem value="km">Kilometers</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            checked={formData.published || false}
            onCheckedChange={(checked) => handleInputChange('published', checked)}
          />
          <Label>Published Union</Label>
        </div>
      </div>

      <div>
        <Label>Status</Label>
        <Select value={formData.status || 'pending'} onValueChange={(value) => handleInputChange('status', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending for approval</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderLoginInfo = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="firstName">First Name</Label>
        <Input
          id="firstName"
          value={formData.firstName || ''}
          onChange={(e) => handleInputChange('firstName', e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="lastName">Last Name</Label>
        <Input
          id="lastName"
          value={formData.lastName || ''}
          onChange={(e) => handleInputChange('lastName', e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          value={formData.contactEmail || ''}
          onChange={(e) => handleInputChange('contactEmail', e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="contactNumber">Contact number</Label>
        <Input
          id="contactNumber"
          value={formData.contactPhone || ''}
          onChange={(e) => handleInputChange('contactPhone', e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          value={formData.username || ''}
          onChange={(e) => handleInputChange('username', e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="newPassword">New Password</Label>
        <Input
          id="newPassword"
          type="password"
          placeholder="Leave empty to keep current password"
        />
      </div>
      <div>
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Confirm new password"
        />
      </div>
      <div>
        <Label>Status</Label>
        <Select value={formData.status || 'pending'} onValueChange={(value) => handleInputChange('status', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderAddress = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Address details</h3>
      <div>
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          value={formData.address || ''}
          onChange={(e) => handleInputChange('address', e.target.value)}
        />
      </div>

      <h3 className="text-lg font-semibold mt-6">Geolocation</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="latitude">Latitude</Label>
          <Input
            id="latitude"
            value={formData.latitude || ''}
            onChange={(e) => handleInputChange('latitude', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="longitude">Longitude</Label>
          <Input
            id="longitude"
            value={formData.longitude || ''}
            onChange={(e) => handleInputChange('longitude', e.target.value)}
          />
        </div>
      </div>
      <p className="text-sm text-gray-500">
        Get your address geolocation via service like{' '}
        <a href="https://www.maps.ie/coordinates.html" target="_blank" className="text-emerald-600 hover:underline">https://www.maps.ie/coordinates.html</a>
        {' '}or{' '}
        <a href="https://www.latlong.net/" target="_blank" className="text-emerald-600 hover:underline">https://www.latlong.net/</a>
        , entering invalid coordinates will make your store not available for ordering
      </p>

      <h3 className="text-lg font-semibold mt-6">Radius distance covered</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="deliveryDistanceCovered">Delivery Distance Covered</Label>
          <Input
            id="deliveryDistanceCovered"
            type="number"
            step="0.01"
            value={formData.deliveryDistanceCovered || 0}
            onChange={(e) => handleInputChange('deliveryDistanceCovered', e.target.value)}
          />
        </div>
        <div>
          <Label>Unit</Label>
          <Select value={formData.distanceUnit || 'miles'} onValueChange={(value) => handleInputChange('distanceUnit', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="miles">Miles</SelectItem>
              <SelectItem value="km">Kilometers</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const renderZone = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="zone">Zone</Label>
        <Select value={formData.zone || ''} onValueChange={(value) => handleInputChange('zone', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select zone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="zone1">Zone 1</SelectItem>
            <SelectItem value="zone2">Zone 2</SelectItem>
            <SelectItem value="zone3">Zone 3</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderMerchantType = () => (
    <div className="space-y-6">
      <div>
        <Label>Type</Label>
        <Select value={formData.membershipType || 'commission'} onValueChange={(value) => handleInputChange('membershipType', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="commission">Commission</SelectItem>
            <SelectItem value="membership">Membership</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Invoice terms</Label>
        <Select value={formData.invoiceTerms || ''} onValueChange={(value) => handleInputChange('invoiceTerms', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Please select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="net30">Net 30</SelectItem>
            <SelectItem value="net60">Net 60</SelectItem>
            <SelectItem value="due_on_receipt">Due on Receipt</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-base font-medium">Commission on orders</Label>
        <p className="text-sm text-gray-500 mb-4">For membership type you can also set commission per order</p>
        
        <div className="space-y-4">
          {['Delivery', 'Pickup', 'Dinein', 'Takeout'].map(service => (
            <div key={service} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <Label>{service}</Label>
              <Select defaultValue="percentage">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">percentage</SelectItem>
                  <SelectItem value="fixed">fixed</SelectItem>
                </SelectContent>
              </Select>
              <div>
                <Label className="text-xs text-gray-500">Commission</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData[`commission${service}` as keyof Merchant] as number || 0}
                  onChange={(e) => handleInputChange(`commission${service}`, parseFloat(e.target.value))}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderFeatured = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Switch
          checked={formData.featured || false}
          onCheckedChange={(checked) => handleInputChange('featured', checked)}
        />
        <Label>Featured</Label>
      </div>
    </div>
  );

  const renderPaymentSettings = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <Label className="text-base font-medium">Enabled Payment gateway</Label>
        <div className="flex items-center gap-2">
          <Switch />
          <span className="text-sm">Check All</span>
        </div>
      </div>
      
      <div className="space-y-3">
        {paymentGateways.map(gateway => (
          <div key={gateway.id} className="flex items-center gap-3">
            <Switch
              checked={(formData.paymentSettings || {})[gateway.id] || false}
              onCheckedChange={(checked) => {
                const current = formData.paymentSettings || {};
                handleInputChange('paymentSettings', { ...current, [gateway.id]: checked });
              }}
            />
            <Label>{gateway.label}</Label>
          </div>
        ))}
      </div>
    </div>
  );

  const handleCheckAll = (checked: boolean) => {
    setCheckAll(checked);
    const newChecks: Record<string, boolean> = {};
    accessPermissions.forEach(category => {
      newChecks[`cat_${category.category}`] = checked;
      category.items.forEach(item => {
        newChecks[`item_${category.category}_${item.name}`] = checked;
        if (item.hasActions) {
          newChecks[`create_${category.category}_${item.name}`] = checked;
          newChecks[`update_${category.category}_${item.name}`] = checked;
          newChecks[`delete_${category.category}_${item.name}`] = checked;
          newChecks[`view_${category.category}_${item.name}`] = checked;
        }
      });
    });
    setAccessChecks(newChecks);
  };

  const handleCategoryCheck = (category: string, checked: boolean) => {
    const cat = accessPermissions.find(c => c.category === category);
    if (!cat) return;
    
    const newChecks = { ...accessChecks };
    newChecks[`cat_${category}`] = checked;
    cat.items.forEach(item => {
      newChecks[`item_${category}_${item.name}`] = checked;
      if (item.hasActions) {
        newChecks[`create_${category}_${item.name}`] = checked;
        newChecks[`update_${category}_${item.name}`] = checked;
        newChecks[`delete_${category}_${item.name}`] = checked;
        newChecks[`view_${category}_${item.name}`] = checked;
      }
    });
    setAccessChecks(newChecks);
  };

  const handlePermissionCheck = (key: string, checked: boolean) => {
    setAccessChecks(prev => ({ ...prev, [key]: checked }));
  };

  const renderAccessSettings = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <Label className="text-base font-medium">Access Settings</Label>
          <p className="text-sm text-gray-500">leave empty to allow access to all menu</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch 
            checked={checkAll}
            onCheckedChange={handleCheckAll}
          />
          <span className="text-sm">Check All</span>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden max-h-[600px] overflow-y-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 bg-gray-50 p-3 font-medium text-sm sticky top-0 z-10">
          <div>Menu</div>
          <div className="text-center">Create</div>
          <div className="text-center">Update</div>
          <div className="text-center">Delete</div>
          <div className="text-center">View</div>
        </div>
        
        {accessPermissions.map(category => (
          <div key={category.category}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 p-3 bg-gray-100 border-t items-center">
              <div className="flex items-center gap-2">
                <Checkbox 
                  checked={accessChecks[`cat_${category.category}`] || false}
                  onCheckedChange={(checked) => handleCategoryCheck(category.category, checked as boolean)}
                />
                <span className="font-medium text-sm">{category.category}</span>
              </div>
              <div></div>
              <div></div>
              <div></div>
              <div></div>
            </div>
            {category.items.map(item => (
              <div key={item.name} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 p-3 border-t pl-8 items-center hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={accessChecks[`item_${category.category}_${item.name}`] || false}
                    onCheckedChange={(checked) => handlePermissionCheck(`item_${category.category}_${item.name}`, checked as boolean)}
                  />
                  <span className="text-sm">{item.name}</span>
                </div>
                {item.hasActions ? (
                  <>
                    <div className="text-center">
                      <Checkbox 
                        checked={accessChecks[`create_${category.category}_${item.name}`] || false}
                        onCheckedChange={(checked) => handlePermissionCheck(`create_${category.category}_${item.name}`, checked as boolean)}
                      />
                    </div>
                    <div className="text-center">
                      <Checkbox 
                        checked={accessChecks[`update_${category.category}_${item.name}`] || false}
                        onCheckedChange={(checked) => handlePermissionCheck(`update_${category.category}_${item.name}`, checked as boolean)}
                      />
                    </div>
                    <div className="text-center">
                      <Checkbox 
                        checked={accessChecks[`delete_${category.category}_${item.name}`] || false}
                        onCheckedChange={(checked) => handlePermissionCheck(`delete_${category.category}_${item.name}`, checked as boolean)}
                      />
                    </div>
                    <div className="text-center">
                      <Checkbox 
                        checked={accessChecks[`view_${category.category}_${item.name}`] || false}
                        onCheckedChange={(checked) => handlePermissionCheck(`view_${category.category}_${item.name}`, checked as boolean)}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div>
        <Label>Default Currency</Label>
        <Select value={formData.defaultCurrency || 'inr'} onValueChange={(value) => handleInputChange('defaultCurrency', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inr">Indian Rupee</SelectItem>
            <SelectItem value="usd">US Dollar</SelectItem>
            <SelectItem value="eur">Euro</SelectItem>
            <SelectItem value="gbp">British Pound</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500 mt-1">Leave empty to use admin based currency</p>
      </div>

      <div>
        <Label>Default Auto Print Status</Label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Please select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="enabled">Enabled</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="taxNumber">Tax number</Label>
        <Input
          id="taxNumber"
          value={formData.taxNumber || ''}
          onChange={(e) => handleInputChange('taxNumber', e.target.value)}
          placeholder="Tax number"
        />
      </div>

      <div>
        <Label htmlFor="preparationTime">Default Preparation Time (minutes)</Label>
        <Input
          id="preparationTime"
          type="number"
          value={formData.preparationTime || ''}
          onChange={(e) => handleInputChange('preparationTime', parseInt(e.target.value))}
        />
      </div>

      <div>
        <Label htmlFor="whatsapp">Whatsapp Phone number</Label>
        <Input
          id="whatsapp"
          value={formData.whatsappNumber || ''}
          onChange={(e) => handleInputChange('whatsappNumber', e.target.value)}
          placeholder="include country code"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Switch 
            checked={formData.retailerPriceEnabled || false}
            onCheckedChange={(checked) => handleInputChange('retailerPriceEnabled', checked)}
          />
          <div>
            <Label>Enable Retailer Pricing</Label>
            <p className="text-xs text-gray-500">Show retailer pricing tier (calculated as MRP - (MRP - Dealer) × 60%)</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Switch />
          <Label>Close Store</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch />
          <Label>Enabled Auto-accepted order</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch />
          <Label>Self Delivery</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch />
          <Label>Non-Commissioned POS Orders</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch />
          <Label>Enabled Voucher</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch />
          <Label>Enabled Tips</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch />
          <Label>Enabled Whatsapp Ordering</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch />
          <Label>Enabled Age Verification Popup</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch />
          <Label>Enabled Barcode</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch />
          <Label>Enabled language (Single app only)</Label>
        </div>
      </div>

      <div className="border-t pt-6">
        <Label className="text-base font-medium">Checkout Time Selection</Label>
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <input type="radio" name="checkoutTime" value="time_only" id="time_only" className="h-4 w-4 text-emerald-500" />
            <Label htmlFor="time_only" className="font-normal cursor-pointer">Time only</Label>
          </div>
          <div className="flex items-center gap-2">
            <input type="radio" name="checkoutTime" value="asap_only" id="asap_only" className="h-4 w-4 text-emerald-500" />
            <Label htmlFor="asap_only" className="font-normal cursor-pointer">Asap only</Label>
          </div>
          <div className="flex items-center gap-2">
            <input type="radio" name="checkoutTime" value="both" id="both" defaultChecked className="h-4 w-4 text-emerald-500" />
            <Label htmlFor="both" className="font-normal cursor-pointer">Both</Label>
          </div>
        </div>
      </div>

      <div>
        <Label>Default Tip</Label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Please select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="5">5%</SelectItem>
            <SelectItem value="10">10%</SelectItem>
            <SelectItem value="15">15%</SelectItem>
            <SelectItem value="20">20%</SelectItem>
            <SelectItem value="25">25%</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Tip Type</Label>
        <Select defaultValue="fixed">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">Fixed</SelectItem>
            <SelectItem value="percentage">Percentage</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Enabled Tips on the following transaction</Label>
        <div className="mt-2 border rounded-lg p-3 min-h-[80px] bg-gray-50">
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Checkbox id="tip_delivery" />
              <Label htmlFor="tip_delivery" className="font-normal cursor-pointer text-sm">Delivery</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="tip_pickup" />
              <Label htmlFor="tip_pickup" className="font-normal cursor-pointer text-sm">Pickup</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="tip_dinein" />
              <Label htmlFor="tip_dinein" className="font-normal cursor-pointer text-sm">Dine-in</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="tip_pos" />
              <Label htmlFor="tip_pos" className="font-normal cursor-pointer text-sm">POS</Label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderApiAccess = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="websiteUrl">Website Domain URL address</Label>
        <Input
          id="websiteUrl"
          value={formData.websiteUrl || ''}
          onChange={(e) => handleInputChange('websiteUrl', e.target.value)}
          placeholder="https://example.com"
        />
      </div>
      <Button className="w-full bg-emerald-500 hover:bg-emerald-600">
        Generate API keys
      </Button>
    </div>
  );

  const renderMobileSettings = () => (
    <div className="space-y-6">
      <h3 className="font-semibold">Mobile Store Information</h3>
      <div>
        <Label htmlFor="androidUrl">Your Android Google play URL</Label>
        <Input
          id="androidUrl"
          value={formData.androidUrl || ''}
          onChange={(e) => handleInputChange('androidUrl', e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="iosUrl">Your iOS Apps Store URL</Label>
        <Input
          id="iosUrl"
          value={formData.iosUrl || ''}
          onChange={(e) => handleInputChange('iosUrl', e.target.value)}
        />
      </div>

      <h3 className="font-semibold mt-6">Mobile Version</h3>
      <div>
        <Label>Your android latest version</Label>
        <Input placeholder="example 1.0" />
      </div>
      <div>
        <Label>Your iOS latest version</Label>
        <Input placeholder="example 1.0" />
      </div>
    </div>
  );

  const renderSearchMode = () => (
    <div className="space-y-6">
      <div>
        <Label>Set Specific Country (maximum of 5 country)</Label>
        <p className="text-xs text-gray-500 mb-2">Notice : this section need to be fill only if you have single website union.</p>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="india">India</SelectItem>
            <SelectItem value="usa">United States</SelectItem>
            <SelectItem value="uk">United Kingdom</SelectItem>
            <SelectItem value="australia">Australia</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500 mt-2">default mobile country</p>
      </div>
    </div>
  );

  const renderLoginSignup = () => (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-medium">Signup Verifications</Label>
        <p className="text-xs text-gray-500">Notice : this section need to be fill only if you have single website union.</p>
        <div className="flex items-center gap-3 mt-2">
          <Switch />
          <Label>Enabled</Label>
        </div>
      </div>

      <div>
        <Label htmlFor="resendCodeInterval">Resend code interval</Label>
        <Input id="resendCodeInterval" placeholder="Seconds" />
      </div>

      <div>
        <Label className="text-base font-medium">Guest Checkout</Label>
        <div className="flex items-center gap-3 mt-2">
          <Switch />
          <Label>Enabled</Label>
        </div>
      </div>

      <div>
        <Label className="text-base font-medium">Terms and condition</Label>
        <div className="flex items-center gap-3 mt-2">
          <Switch />
          <Label>Enabled</Label>
        </div>
        <Textarea className="mt-2" rows={4} placeholder="Enter terms and conditions..." />
      </div>
    </div>
  );

  const renderPhoneSettings = () => (
    <div className="space-y-6">
      <div>
        <Label>Phone Prefix</Label>
        <Input placeholder="+91" />
        <p className="text-xs text-gray-500 mt-1">Country phone prefix (e.g., +1, +91, +44)</p>
      </div>

      <div>
        <Label>Phone Number Minimum Length</Label>
        <Input type="number" defaultValue={10} />
      </div>

      <div>
        <Label>Phone Number Maximum Length</Label>
        <Input type="number" defaultValue={10} />
      </div>

      <div className="flex items-center gap-3">
        <Switch />
        <Label>Enable Phone Login</Label>
      </div>

      <div className="flex items-center gap-3">
        <Switch />
        <Label>Enable Phone Registration</Label>
      </div>

      <div className="flex items-center gap-3">
        <Switch />
        <Label>Require Phone Verification</Label>
      </div>

      <div>
        <Label>SMS Gateway</Label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Please select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="twilio">Twilio</SelectItem>
            <SelectItem value="msg91">MSG91</SelectItem>
            <SelectItem value="nexmo">Nexmo</SelectItem>
            <SelectItem value="plivo">Plivo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>SMS API Key</Label>
        <Input type="password" placeholder="Enter SMS API key" />
      </div>

      <div>
        <Label>SMS Sender ID</Label>
        <Input placeholder="FOODIE" />
      </div>
    </div>
  );

  const renderSocialSettings = () => (
    <div className="space-y-6">
      <div>
        <Label>Facebook Page URL</Label>
        <Input placeholder="https://facebook.com/yourpage" />
      </div>

      <div>
        <Label>Instagram URL</Label>
        <Input placeholder="https://instagram.com/yourpage" />
      </div>

      <div>
        <Label>Twitter URL</Label>
        <Input placeholder="https://twitter.com/yourhandle" />
      </div>

      <div>
        <Label>YouTube Channel URL</Label>
        <Input placeholder="https://youtube.com/yourchannel" />
      </div>

      <div>
        <Label>LinkedIn URL</Label>
        <Input placeholder="https://linkedin.com/company/yourcompany" />
      </div>

      <div>
        <Label>TikTok URL</Label>
        <Input placeholder="https://tiktok.com/@yourhandle" />
      </div>

      <div className="border-t pt-4">
        <Label className="text-base font-medium">Social Login Settings</Label>
      </div>

      <div className="flex items-center gap-3">
        <Switch />
        <Label>Enable Facebook Login</Label>
      </div>

      <div>
        <Label>Facebook App ID</Label>
        <Input placeholder="Enter Facebook App ID" />
      </div>

      <div>
        <Label>Facebook App Secret</Label>
        <Input type="password" placeholder="Enter Facebook App Secret" />
      </div>

      <div className="flex items-center gap-3">
        <Switch />
        <Label>Enable Google Login</Label>
      </div>

      <div>
        <Label>Google Client ID</Label>
        <Input placeholder="Enter Google Client ID" />
      </div>

      <div>
        <Label>Google Client Secret</Label>
        <Input type="password" placeholder="Enter Google Client Secret" />
      </div>
    </div>
  );

  const renderGoogleRecaptcha = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Switch />
        <Label>Enable Google Recaptcha</Label>
      </div>

      <div>
        <Label>Recaptcha Version</Label>
        <Select defaultValue="v3">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="v2">Recaptcha v2 (Checkbox)</SelectItem>
            <SelectItem value="v2_invisible">Recaptcha v2 (Invisible)</SelectItem>
            <SelectItem value="v3">Recaptcha v3</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Site Key</Label>
        <Input placeholder="Enter Recaptcha Site Key" />
        <p className="text-xs text-gray-500 mt-1">Get your keys from Google reCAPTCHA Admin Console</p>
      </div>

      <div>
        <Label>Secret Key</Label>
        <Input type="password" placeholder="Enter Recaptcha Secret Key" />
      </div>

      <div>
        <Label>Minimum Score (v3 only)</Label>
        <Input type="number" step="0.1" min="0" max="1" defaultValue="0.5" />
        <p className="text-xs text-gray-500 mt-1">Score threshold (0.0 - 1.0). Higher = stricter</p>
      </div>

      <div className="border-t pt-4">
        <Label className="text-base font-medium">Enable Recaptcha On</Label>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox id="recaptcha_login" />
          <Label htmlFor="recaptcha_login" className="font-normal">Login Form</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="recaptcha_register" />
          <Label htmlFor="recaptcha_register" className="font-normal">Registration Form</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="recaptcha_checkout" />
          <Label htmlFor="recaptcha_checkout" className="font-normal">Checkout Form</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="recaptcha_contact" />
          <Label htmlFor="recaptcha_contact" className="font-normal">Contact Form</Label>
        </div>
      </div>
    </div>
  );

  const renderMapApiKeys = () => (
    <div className="space-y-6">
      <div>
        <Label>Map Provider</Label>
        <Select defaultValue="google">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="google">Google Maps</SelectItem>
            <SelectItem value="mapbox">Mapbox</SelectItem>
            <SelectItem value="openstreetmap">OpenStreetMap</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Google Maps API Key</Label>
        <Input placeholder="Enter Google Maps API Key" />
        <p className="text-xs text-gray-500 mt-1">Required for map display and geocoding</p>
      </div>

      <div>
        <Label>Google Places API Key</Label>
        <Input placeholder="Enter Google Places API Key" />
        <p className="text-xs text-gray-500 mt-1">Required for address autocomplete</p>
      </div>

      <div>
        <Label>Google Directions API Key</Label>
        <Input placeholder="Enter Google Directions API Key" />
        <p className="text-xs text-gray-500 mt-1">Required for delivery route calculation</p>
      </div>

      <div>
        <Label>Mapbox Access Token</Label>
        <Input placeholder="Enter Mapbox Access Token" />
        <p className="text-xs text-gray-500 mt-1">Required if using Mapbox as provider</p>
      </div>

      <div className="flex items-center gap-3">
        <Switch />
        <Label>Enable Address Autocomplete</Label>
      </div>

      <div className="flex items-center gap-3">
        <Switch />
        <Label>Enable Live Driver Tracking</Label>
      </div>

      <div>
        <Label>Default Map Zoom Level</Label>
        <Input type="number" min="1" max="20" defaultValue="14" />
      </div>

      <div>
        <Label>Default Map Center (Latitude)</Label>
        <Input placeholder="e.g., 11.6643" />
      </div>

      <div>
        <Label>Default Map Center (Longitude)</Label>
        <Input placeholder="e.g., 78.1460" />
      </div>
    </div>
  );

  const renderPushNotifications = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Switch />
        <Label>Enable Push Notifications</Label>
      </div>

      <div>
        <Label>Push Notification Provider</Label>
        <Select defaultValue="firebase">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="firebase">Firebase Cloud Messaging (FCM)</SelectItem>
            <SelectItem value="onesignal">OneSignal</SelectItem>
            <SelectItem value="pusher">Pusher</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border-t pt-4">
        <Label className="text-base font-medium">Firebase Settings</Label>
      </div>

      <div>
        <Label>Firebase Server Key</Label>
        <Input type="password" placeholder="Enter Firebase Server Key" />
      </div>

      <div>
        <Label>Firebase Sender ID</Label>
        <Input placeholder="Enter Firebase Sender ID" />
      </div>

      <div>
        <Label>Firebase Project ID</Label>
        <Input placeholder="Enter Firebase Project ID" />
      </div>

      <div className="border-t pt-4">
        <Label className="text-base font-medium">OneSignal Settings</Label>
      </div>

      <div>
        <Label>OneSignal App ID</Label>
        <Input placeholder="Enter OneSignal App ID" />
      </div>

      <div>
        <Label>OneSignal REST API Key</Label>
        <Input type="password" placeholder="Enter OneSignal REST API Key" />
      </div>

      <div className="border-t pt-4">
        <Label className="text-base font-medium">Notification Triggers</Label>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox id="notify_new_order" defaultChecked />
          <Label htmlFor="notify_new_order" className="font-normal">New Order Received</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="notify_order_status" defaultChecked />
          <Label htmlFor="notify_order_status" className="font-normal">Order Status Changed</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="notify_driver_assigned" defaultChecked />
          <Label htmlFor="notify_driver_assigned" className="font-normal">Driver Assigned</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="notify_order_delivered" defaultChecked />
          <Label htmlFor="notify_order_delivered" className="font-normal">Order Delivered</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="notify_promo" />
          <Label htmlFor="notify_promo" className="font-normal">Promotional Notifications</Label>
        </div>
      </div>
    </div>
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'merchant-info': return renderMerchantInfo();
      case 'login-info': return renderLoginInfo();
      case 'address': return renderAddress();
      case 'zone': return renderZone();
      case 'merchant-type': return renderMerchantType();
      case 'featured': return renderFeatured();
      case 'payment-settings': return renderPaymentSettings();
      case 'access-settings': return renderAccessSettings();
      case 'settings': return renderSettings();
      case 'api-access': return renderApiAccess();
      case 'mobile-settings': return renderMobileSettings();
      case 'search-mode': return renderSearchMode();
      case 'login-signup': return renderLoginSignup();
      case 'phone-settings': return renderPhoneSettings();
      case 'social-settings': return renderSocialSettings();
      case 'google-recaptcha': return renderGoogleRecaptcha();
      case 'map-api-keys': return renderMapApiKeys();
      case 'push-notifications': return renderPushNotifications();
      default: return renderMerchantInfo();
    }
  };

  return (
    <AdminLayout>
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/admin/merchant" className="text-gray-500 hover:text-gray-700">All District Unions</Link>
          <span className="text-gray-400">»</span>
          <span className="text-gray-500">Edit District Union</span>
          <span className="text-gray-400">»</span>
          <span className="font-medium">{merchant.restaurantName}</span>
        </div>
        <Button variant="link" onClick={handleAutoLogin} className="text-emerald-600">
          <LogIn className="h-4 w-4 mr-2" />
          Auto login
        </Button>
      </div>

      <div className="flex gap-6">
        {/* Left Sidebar */}
        <div className="w-64 flex-shrink-0">
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-2">
              {merchant.logo ? (
                <img src={merchant.logo} alt={merchant.restaurantName} className="w-full h-full rounded-full object-cover" />
              ) : (
                <Store className="h-8 w-8 text-gray-400" />
              )}
            </div>
          </div>

          <nav className="space-y-1">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg transition-colors ${
                  activeSection === item.id
                    ? 'bg-emerald-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <Card>
            <CardContent className="p-6">
              {renderSectionContent()}
              
              <Button 
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="w-full mt-6 bg-emerald-500 hover:bg-emerald-600"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </AdminLayout>
  );
}
