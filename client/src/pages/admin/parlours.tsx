import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Store, 
  ArrowLeft, 
  Plus,
  MapPin,
  Phone,
  Clock,
  Edit,
  Trash2,
  Search,
  Building2,
  Users,
  TrendingUp,
  Package,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from './layout';

interface Parlour {
  id: string;
  name: string;
  code: string;
  unionId: string;
  unionName: string;
  address: string;
  city: string;
  district: string;
  pincode: string;
  phone: string;
  email: string;
  managerName: string;
  openingTime: string;
  closingTime: string;
  status: 'active' | 'inactive' | 'maintenance';
  hasChiller: boolean;
  hasIceCreamCounter: boolean;
  dailySalesTarget: number;
  monthlyRevenue: number;
  productsAvailable: number;
}

interface DistrictUnion {
  id: string;
  name: string;
  code: string;
  parlourCount: number;
}

export default function Parlours() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [unionFilter, setUnionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedParlour, setSelectedParlour] = useState<Parlour | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const [newParlour, setNewParlour] = useState({
    name: '',
    code: '',
    unionId: '',
    address: '',
    city: '',
    district: '',
    pincode: '',
    phone: '',
    email: '',
    managerName: '',
    openingTime: '06:00',
    closingTime: '21:00',
    hasChiller: true,
    hasIceCreamCounter: false,
    dailySalesTarget: 10000
  });

  const { data: districtUnions = [] } = useQuery<DistrictUnion[]>({
    queryKey: ['/api/admin/district-unions'],
    queryFn: async () => [
      { id: '1', name: 'Salem District Cooperative', code: 'SLM', parlourCount: 12 },
      { id: '2', name: 'Erode District Cooperative', code: 'ERD', parlourCount: 8 },
      { id: '3', name: 'Coimbatore District Cooperative', code: 'CBE', parlourCount: 15 },
      { id: '4', name: 'Madurai District Cooperative', code: 'MDU', parlourCount: 10 },
      { id: '5', name: 'Chennai District Cooperative', code: 'CHN', parlourCount: 25 },
      { id: '6', name: 'Trichy District Cooperative', code: 'TRY', parlourCount: 9 },
      { id: '7', name: 'Tirunelveli District Cooperative', code: 'TNV', parlourCount: 7 },
      { id: '8', name: 'Thanjavur District Cooperative', code: 'TNJ', parlourCount: 6 },
    ],
  });

  const { data: parlours = [] } = useQuery<Parlour[]>({
    queryKey: ['/api/admin/parlours'],
    queryFn: async () => [
      { 
        id: '1', 
        name: 'Aavin Parlour - Salem Main',
        code: 'SLM-001',
        unionId: '1',
        unionName: 'Salem District Cooperative',
        address: '123 Main Road, Near Bus Stand',
        city: 'Salem',
        district: 'Salem',
        pincode: '636001',
        phone: '9843777001',
        email: 'salem.main@aavin.com',
        managerName: 'Rajesh Kumar',
        openingTime: '06:00',
        closingTime: '21:00',
        status: 'active',
        hasChiller: true,
        hasIceCreamCounter: true,
        dailySalesTarget: 15000,
        monthlyRevenue: 425000,
        productsAvailable: 45
      },
      { 
        id: '2', 
        name: 'Aavin Parlour - Salem Junction',
        code: 'SLM-002',
        unionId: '1',
        unionName: 'Salem District Cooperative',
        address: '45 Railway Station Road',
        city: 'Salem',
        district: 'Salem',
        pincode: '636002',
        phone: '9843777002',
        email: 'salem.junction@aavin.com',
        managerName: 'Priya Devi',
        openingTime: '05:30',
        closingTime: '22:00',
        status: 'active',
        hasChiller: true,
        hasIceCreamCounter: false,
        dailySalesTarget: 12000,
        monthlyRevenue: 380000,
        productsAvailable: 38
      },
      { 
        id: '3', 
        name: 'Aavin Parlour - Erode Central',
        code: 'ERD-001',
        unionId: '2',
        unionName: 'Erode District Cooperative',
        address: '78 Bazaar Street',
        city: 'Erode',
        district: 'Erode',
        pincode: '638001',
        phone: '9843777003',
        email: 'erode.central@aavin.com',
        managerName: 'Senthil Nathan',
        openingTime: '06:00',
        closingTime: '21:00',
        status: 'active',
        hasChiller: true,
        hasIceCreamCounter: true,
        dailySalesTarget: 18000,
        monthlyRevenue: 520000,
        productsAvailable: 52
      },
      { 
        id: '4', 
        name: 'Aavin Parlour - Coimbatore RS Puram',
        code: 'CBE-001',
        unionId: '3',
        unionName: 'Coimbatore District Cooperative',
        address: '22 RS Puram Main Road',
        city: 'Coimbatore',
        district: 'Coimbatore',
        pincode: '641002',
        phone: '9843777004',
        email: 'cbe.rspuram@aavin.com',
        managerName: 'Lakshmi Narayanan',
        openingTime: '06:00',
        closingTime: '22:00',
        status: 'active',
        hasChiller: true,
        hasIceCreamCounter: true,
        dailySalesTarget: 25000,
        monthlyRevenue: 750000,
        productsAvailable: 58
      },
      { 
        id: '5', 
        name: 'Aavin Parlour - Madurai Meenakshi',
        code: 'MDU-001',
        unionId: '4',
        unionName: 'Madurai District Cooperative',
        address: 'Near Meenakshi Temple, East Masi Street',
        city: 'Madurai',
        district: 'Madurai',
        pincode: '625001',
        phone: '9843777005',
        email: 'madurai.meenakshi@aavin.com',
        managerName: 'Muthu Krishnan',
        openingTime: '05:00',
        closingTime: '22:00',
        status: 'maintenance',
        hasChiller: true,
        hasIceCreamCounter: true,
        dailySalesTarget: 20000,
        monthlyRevenue: 580000,
        productsAvailable: 48
      },
      { 
        id: '6', 
        name: 'Aavin Parlour - Chennai T Nagar',
        code: 'CHN-001',
        unionId: '5',
        unionName: 'Chennai District Cooperative',
        address: 'Usman Road, T Nagar',
        city: 'Chennai',
        district: 'Chennai',
        pincode: '600017',
        phone: '9843777006',
        email: 'chennai.tnagar@aavin.com',
        managerName: 'Venkatesh Iyer',
        openingTime: '06:00',
        closingTime: '23:00',
        status: 'active',
        hasChiller: true,
        hasIceCreamCounter: true,
        dailySalesTarget: 35000,
        monthlyRevenue: 1050000,
        productsAvailable: 65
      },
    ],
  });

  const addParlourMutation = useMutation({
    mutationFn: async (parlour: typeof newParlour) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return parlour;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Parlour added successfully",
      });
      setIsAddDialogOpen(false);
      setNewParlour({
        name: '',
        code: '',
        unionId: '',
        address: '',
        city: '',
        district: '',
        pincode: '',
        phone: '',
        email: '',
        managerName: '',
        openingTime: '06:00',
        closingTime: '21:00',
        hasChiller: true,
        hasIceCreamCounter: false,
        dailySalesTarget: 10000
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/parlours'] });
    },
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; label: string }> = {
      active: { className: 'bg-green-100 text-green-800', label: 'Active' },
      inactive: { className: 'bg-gray-100 text-gray-800', label: 'Inactive' },
      maintenance: { className: 'bg-yellow-100 text-yellow-800', label: 'Maintenance' },
    };
    const { className, label } = config[status] || config.inactive;
    return <Badge className={className}>{label}</Badge>;
  };

  const filteredParlours = parlours.filter(parlour => {
    const matchesSearch = parlour.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         parlour.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         parlour.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesUnion = unionFilter === 'all' || parlour.unionId === unionFilter;
    const matchesStatus = statusFilter === 'all' || parlour.status === statusFilter;
    return matchesSearch && matchesUnion && matchesStatus;
  });

  const totalParlours = parlours.length;
  const activeParlours = parlours.filter(p => p.status === 'active').length;
  const totalMonthlyRevenue = parlours.reduce((sum, p) => sum + p.monthlyRevenue, 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard">
            <Button variant="outline" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-parlours">
              Parlour Management
            </h1>
            <p className="text-gray-600">Manage retail outlets for each district union</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Total Parlours</p>
                  <p className="text-2xl font-bold text-blue-800">{totalParlours}</p>
                </div>
                <Store className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Active Outlets</p>
                  <p className="text-2xl font-bold text-green-800">{activeParlours}</p>
                </div>
                <Building2 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600">District Unions</p>
                  <p className="text-2xl font-bold text-purple-800">{districtUnions.length}</p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-orange-800">₹{(totalMonthlyRevenue / 100000).toFixed(1)}L</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="parlours" className="w-full">
          <TabsList>
            <TabsTrigger value="parlours">All Parlours</TabsTrigger>
            <TabsTrigger value="unions">By District Union</TabsTrigger>
            <TabsTrigger value="reports">Sales Reports</TabsTrigger>
          </TabsList>
          
          <TabsContent value="parlours" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Store className="h-5 w-5" />
                      <span>Retail Outlets</span>
                    </CardTitle>
                    <CardDescription>Manage Aavin parlours across all district unions</CardDescription>
                  </div>
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-add-parlour">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Parlour
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Add New Parlour</DialogTitle>
                        <DialogDescription>Create a new retail outlet for a district union</DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                          <Label>Parlour Name</Label>
                          <Input
                            placeholder="Aavin Parlour - Location"
                            value={newParlour.name}
                            onChange={(e) => setNewParlour({...newParlour, name: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Parlour Code</Label>
                          <Input
                            placeholder="SLM-001"
                            value={newParlour.code}
                            onChange={(e) => setNewParlour({...newParlour, code: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2 col-span-2">
                          <Label>District Union</Label>
                          <Select value={newParlour.unionId} onValueChange={(value) => setNewParlour({...newParlour, unionId: value})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select district union" />
                            </SelectTrigger>
                            <SelectContent>
                              {districtUnions.map(union => (
                                <SelectItem key={union.id} value={union.id}>{union.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 col-span-2">
                          <Label>Address</Label>
                          <Textarea
                            placeholder="Full address"
                            value={newParlour.address}
                            onChange={(e) => setNewParlour({...newParlour, address: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>City</Label>
                          <Input
                            placeholder="City"
                            value={newParlour.city}
                            onChange={(e) => setNewParlour({...newParlour, city: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>District</Label>
                          <Input
                            placeholder="District"
                            value={newParlour.district}
                            onChange={(e) => setNewParlour({...newParlour, district: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Pincode</Label>
                          <Input
                            placeholder="636001"
                            value={newParlour.pincode}
                            onChange={(e) => setNewParlour({...newParlour, pincode: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone</Label>
                          <Input
                            placeholder="9843777XXX"
                            value={newParlour.phone}
                            onChange={(e) => setNewParlour({...newParlour, phone: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            placeholder="parlour@aavin.com"
                            value={newParlour.email}
                            onChange={(e) => setNewParlour({...newParlour, email: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Manager Name</Label>
                          <Input
                            placeholder="Manager name"
                            value={newParlour.managerName}
                            onChange={(e) => setNewParlour({...newParlour, managerName: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Opening Time</Label>
                          <Input
                            type="time"
                            value={newParlour.openingTime}
                            onChange={(e) => setNewParlour({...newParlour, openingTime: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Closing Time</Label>
                          <Input
                            type="time"
                            value={newParlour.closingTime}
                            onChange={(e) => setNewParlour({...newParlour, closingTime: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Daily Sales Target (₹)</Label>
                          <Input
                            type="number"
                            value={newParlour.dailySalesTarget}
                            onChange={(e) => setNewParlour({...newParlour, dailySalesTarget: parseInt(e.target.value) || 0})}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between py-2">
                            <Label>Has Chiller</Label>
                            <Switch 
                              checked={newParlour.hasChiller}
                              onCheckedChange={(checked) => setNewParlour({...newParlour, hasChiller: checked})}
                            />
                          </div>
                          <div className="flex items-center justify-between py-2">
                            <Label>Ice Cream Counter</Label>
                            <Switch 
                              checked={newParlour.hasIceCreamCounter}
                              onCheckedChange={(checked) => setNewParlour({...newParlour, hasIceCreamCounter: checked})}
                            />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                        <Button onClick={() => addParlourMutation.mutate(newParlour)} disabled={addParlourMutation.isPending}>
                          {addParlourMutation.isPending ? 'Adding...' : 'Add Parlour'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 mb-4">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search parlours..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-parlours"
                    />
                  </div>
                  <Select value={unionFilter} onValueChange={setUnionFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by union" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Unions</SelectItem>
                      {districtUnions.map(union => (
                        <SelectItem key={union.id} value={union.id}>{union.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parlour</TableHead>
                      <TableHead>District Union</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead>Timings</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredParlours.map((parlour) => (
                      <TableRow key={parlour.id} data-testid={`parlour-${parlour.id}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{parlour.name}</div>
                            <div className="text-xs text-gray-500 font-mono">{parlour.code}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{parlour.unionName.replace(' District Cooperative', '')}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            {parlour.city}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{parlour.managerName}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Phone className="h-3 w-3" />{parlour.phone}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3 text-gray-400" />
                            {parlour.openingTime} - {parlour.closingTime}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Package className="h-3 w-3 text-gray-400" />
                            {parlour.productsAvailable}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">₹{(parlour.monthlyRevenue / 1000).toFixed(0)}K</TableCell>
                        <TableCell>{getStatusBadge(parlour.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => {
                                setSelectedParlour(parlour);
                                setIsViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {filteredParlours.length === 0 && (
                  <div className="text-center py-8">
                    <Store className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No parlours found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="unions" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {districtUnions.map(union => {
                const unionParlours = parlours.filter(p => p.unionId === union.id);
                const unionRevenue = unionParlours.reduce((sum, p) => sum + p.monthlyRevenue, 0);
                const activeCount = unionParlours.filter(p => p.status === 'active').length;
                
                return (
                  <Card key={union.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span>{union.name.replace(' District Cooperative', '')}</span>
                        <Badge variant="outline">{union.code}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Total Parlours</span>
                          <span className="font-medium">{unionParlours.length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Active</span>
                          <span className="font-medium text-green-600">{activeCount}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Monthly Revenue</span>
                          <span className="font-medium">₹{(unionRevenue / 100000).toFixed(2)}L</span>
                        </div>
                        <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setUnionFilter(union.id)}>
                          View Parlours
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="pt-4">
                  <p className="text-blue-100">Today's Total Sales</p>
                  <p className="text-3xl font-bold">₹2,45,000</p>
                  <p className="text-blue-200 text-sm">+12% vs yesterday</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardContent className="pt-4">
                  <p className="text-green-100">Today's Orders</p>
                  <p className="text-3xl font-bold">847</p>
                  <p className="text-green-200 text-sm">Across all parlours</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <CardContent className="pt-4">
                  <p className="text-purple-100">Avg. Transaction</p>
                  <p className="text-3xl font-bold">₹289</p>
                  <p className="text-purple-200 text-sm">Per order</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                <CardContent className="pt-4">
                  <p className="text-orange-100">Active Parlours</p>
                  <p className="text-3xl font-bold">{activeParlours}/{totalParlours}</p>
                  <p className="text-orange-200 text-sm">Currently operating</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Parlour-wise Sales Report
                </CardTitle>
                <CardDescription>Daily sales performance by parlour location</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parlour</TableHead>
                      <TableHead>District</TableHead>
                      <TableHead>Today's Sales</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Avg. Order</TableHead>
                      <TableHead>Top Product</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parlours.filter(p => p.status === 'active').map((parlour, idx) => {
                      const dailySales = Math.floor(parlour.monthlyRevenue / 30);
                      const dailyOrders = Math.floor(dailySales / 289);
                      return (
                        <TableRow key={parlour.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{parlour.name.replace('Aavin Parlour - ', '')}</div>
                              <div className="text-xs text-gray-500 font-mono">{parlour.code}</div>
                            </div>
                          </TableCell>
                          <TableCell>{parlour.district}</TableCell>
                          <TableCell className="font-bold text-green-600">₹{dailySales.toLocaleString()}</TableCell>
                          <TableCell>{dailyOrders}</TableCell>
                          <TableCell>₹{dailyOrders > 0 ? Math.floor(dailySales / dailyOrders) : 0}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{['Milk 500ml', 'Curd 400g', 'Butter 100g', 'Ghee 200ml', 'Ice Cream', 'Paneer'][idx % 6]}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Parlours</CardTitle>
                  <CardDescription>Based on this month's revenue</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {parlours.sort((a, b) => b.monthlyRevenue - a.monthlyRevenue).slice(0, 5).map((p, idx) => (
                      <div key={p.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                            idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-600' : 'bg-gray-300'
                          }`}>
                            {idx + 1}
                          </div>
                          <div>
                            <div className="font-medium">{p.name.replace('Aavin Parlour - ', '')}</div>
                            <div className="text-xs text-gray-500">{p.code}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">₹{(p.monthlyRevenue / 100000).toFixed(2)}L</div>
                          <div className="text-xs text-gray-500">This month</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sales by Category</CardTitle>
                  <CardDescription>Product category distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { name: 'Milk', percentage: 35, amount: '₹8.5L' },
                      { name: 'Curd', percentage: 20, amount: '₹4.8L' },
                      { name: 'Butter & Ghee', percentage: 18, amount: '₹4.3L' },
                      { name: 'Ice Cream', percentage: 15, amount: '₹3.6L' },
                      { name: 'Paneer & Cheese', percentage: 8, amount: '₹1.9L' },
                      { name: 'Others', percentage: 4, amount: '₹0.9L' },
                    ].map(cat => (
                      <div key={cat.name} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{cat.name}</span>
                          <span className="font-medium">{cat.amount}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-500 h-2 rounded-full" 
                            style={{ width: `${cat.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedParlour?.name}</DialogTitle>
              <DialogDescription>Parlour details and information</DialogDescription>
            </DialogHeader>
            {selectedParlour && (
              <div className="grid grid-cols-2 gap-4 py-4">
                <div>
                  <Label className="text-gray-500">Code</Label>
                  <p className="font-mono">{selectedParlour.code}</p>
                </div>
                <div>
                  <Label className="text-gray-500">District Union</Label>
                  <p>{selectedParlour.unionName}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-gray-500">Address</Label>
                  <p>{selectedParlour.address}, {selectedParlour.city} - {selectedParlour.pincode}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Manager</Label>
                  <p>{selectedParlour.managerName}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Contact</Label>
                  <p>{selectedParlour.phone}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Timings</Label>
                  <p>{selectedParlour.openingTime} - {selectedParlour.closingTime}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Status</Label>
                  <p>{getStatusBadge(selectedParlour.status)}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Products Available</Label>
                  <p>{selectedParlour.productsAvailable}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Monthly Revenue</Label>
                  <p className="font-bold text-green-600">₹{selectedParlour.monthlyRevenue.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Facilities</Label>
                  <div className="flex gap-2 mt-1">
                    {selectedParlour.hasChiller && <Badge variant="secondary">Chiller</Badge>}
                    {selectedParlour.hasIceCreamCounter && <Badge variant="secondary">Ice Cream Counter</Badge>}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
