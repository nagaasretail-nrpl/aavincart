import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "./layout";
import { ArrowLeft, Plus, Trash2, Save, Send } from "lucide-react";
import { Link } from "wouter";

interface ItemLine {
  productName: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  taxableValue: number;
  sgstRate: number;
  cgstRate: number;
  igstRate: number;
  cessRate: number;
}

export default function EwayBillGeneratePage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const [formData, setFormData] = useState({
    supplyType: "O",
    subSupplyType: "1",
    docType: "INV",
    docNo: "",
    docDate: new Date().toISOString().split('T')[0],
    fromGstin: "33AABCT1332L1ZZ",
    fromTradeName: "Tamil Nadu Cooperative Milk Producers' Federation Ltd",
    fromAddr1: "Aavin Illam, Madhavaram Milk Colony",
    fromAddr2: "",
    fromPlace: "Chennai",
    fromPincode: "600051",
    fromStateCode: "33",
    toGstin: "",
    toTradeName: "",
    toAddr1: "",
    toAddr2: "",
    toPlace: "",
    toPincode: "",
    toStateCode: "33",
    transMode: "1",
    transDistance: 0,
    transporterId: "",
    transporterName: "",
    vehicleNo: "",
    vehicleType: "R",
  });

  const [items, setItems] = useState<ItemLine[]>([
    {
      productName: "",
      hsnCode: "",
      quantity: 1,
      unit: "LTR",
      taxableValue: 0,
      sgstRate: 0,
      cgstRate: 0,
      igstRate: 0,
      cessRate: 0,
    }
  ]);

  const { data: stateCodes = [] } = useQuery({
    queryKey: ['/api/eway-bill/state-codes'],
  });

  const { data: hsnCodes = [] } = useQuery({
    queryKey: ['/api/admin/hsn-codes'],
    queryFn: async () => {
      const res = await fetch('/api/admin/hsn-codes');
      if (!res.ok) return [];
      return res.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/admin/eway-bills', data);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "E-way Bill created as draft" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/eway-bills'] });
      navigate(`/admin/eway-bill/${data.id}`);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create E-way Bill", description: error.message, variant: "destructive" });
    }
  });

  const addItem = () => {
    setItems([...items, {
      productName: "",
      hsnCode: "",
      quantity: 1,
      unit: "LTR",
      taxableValue: 0,
      sgstRate: 0,
      cgstRate: 0,
      igstRate: 0,
      cessRate: 0,
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof ItemLine, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    
    if (field === 'hsnCode') {
      const hsn = hsnCodes.find((h: any) => h.hsnCode === value);
      if (hsn) {
        const isInterstate = formData.fromStateCode !== formData.toStateCode;
        if (isInterstate) {
          newItems[index].igstRate = parseFloat(hsn.gstRate);
          newItems[index].cgstRate = 0;
          newItems[index].sgstRate = 0;
        } else {
          newItems[index].cgstRate = parseFloat(hsn.gstRate) / 2;
          newItems[index].sgstRate = parseFloat(hsn.gstRate) / 2;
          newItems[index].igstRate = 0;
        }
      }
    }
    
    setItems(newItems);
  };

  const calculateTotals = () => {
    let totalValue = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalCess = 0;

    items.forEach(item => {
      totalValue += item.taxableValue;
      totalCgst += (item.taxableValue * item.cgstRate / 100);
      totalSgst += (item.taxableValue * item.sgstRate / 100);
      totalIgst += (item.taxableValue * item.igstRate / 100);
      totalCess += (item.taxableValue * item.cessRate / 100);
    });

    return {
      totalValue: totalValue + totalCgst + totalSgst + totalIgst + totalCess,
      cgstValue: totalCgst,
      sgstValue: totalSgst,
      igstValue: totalIgst,
      cessValue: totalCess,
    };
  };

  const handleSubmit = (status: 'draft' | 'pending') => {
    const totals = calculateTotals();
    
    if (!formData.docNo) {
      toast({ title: "Document number is required", variant: "destructive" });
      return;
    }
    if (!formData.toTradeName || !formData.toAddr1 || !formData.toPincode) {
      toast({ title: "Consignee details are required", variant: "destructive" });
      return;
    }
    if (totals.totalValue < 50000) {
      toast({ 
        title: "E-way Bill not required", 
        description: "Total value is less than ₹50,000. E-way Bill is only required for consignments above ₹50,000.",
        variant: "destructive" 
      });
      return;
    }

    const ewayBillData = {
      ...formData,
      transDistance: formData.transDistance || null,
      totalValue: totals.totalValue.toFixed(2),
      cgstValue: totals.cgstValue.toFixed(2),
      sgstValue: totals.sgstValue.toFixed(2),
      igstValue: totals.igstValue.toFixed(2),
      cessValue: totals.cessValue.toFixed(2),
      status,
      itemList: items.map(item => ({
        productName: item.productName,
        hsnCode: item.hsnCode,
        quantity: item.quantity,
        qtyUnit: item.unit,
        taxableAmount: item.taxableValue,
        sgstRate: item.sgstRate,
        cgstRate: item.cgstRate,
        igstRate: item.igstRate,
        cessRate: item.cessRate,
      }))
    };

    createMutation.mutate(ewayBillData);
  };

  const totals = calculateTotals();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/eway-bill">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Generate E-way Bill</h2>
            <p className="text-gray-500">Create a new E-way Bill for GST compliance</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Document Details</CardTitle>
                <CardDescription>Basic transaction details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Supply Type</Label>
                    <Select 
                      value={formData.supplyType} 
                      onValueChange={(v) => setFormData({...formData, supplyType: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="O">Outward</SelectItem>
                        <SelectItem value="I">Inward</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Sub Supply Type</Label>
                    <Select 
                      value={formData.subSupplyType} 
                      onValueChange={(v) => setFormData({...formData, subSupplyType: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Supply</SelectItem>
                        <SelectItem value="2">Import</SelectItem>
                        <SelectItem value="3">Export</SelectItem>
                        <SelectItem value="4">Job Work</SelectItem>
                        <SelectItem value="5">For Own Use</SelectItem>
                        <SelectItem value="6">Job Work Returns</SelectItem>
                        <SelectItem value="7">Sales Return</SelectItem>
                        <SelectItem value="8">Others</SelectItem>
                        <SelectItem value="9">SKD/CKD</SelectItem>
                        <SelectItem value="10">Line Sales</SelectItem>
                        <SelectItem value="11">Recipient Not Known</SelectItem>
                        <SelectItem value="12">Exhibition or Fairs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Document Type</Label>
                    <Select 
                      value={formData.docType} 
                      onValueChange={(v) => setFormData({...formData, docType: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INV">Tax Invoice</SelectItem>
                        <SelectItem value="BIL">Bill of Supply</SelectItem>
                        <SelectItem value="BOE">Bill of Entry</SelectItem>
                        <SelectItem value="CHL">Delivery Challan</SelectItem>
                        <SelectItem value="CNT">Credit Note</SelectItem>
                        <SelectItem value="OTH">Others</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Document No.</Label>
                    <Input 
                      value={formData.docNo}
                      onChange={(e) => setFormData({...formData, docNo: e.target.value})}
                      placeholder="INV-001"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Document Date</Label>
                    <Input 
                      type="date"
                      value={formData.docDate}
                      onChange={(e) => setFormData({...formData, docDate: e.target.value})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Consignor Details (From)</CardTitle>
                <CardDescription>Supplier/sender information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>GSTIN</Label>
                    <Input 
                      value={formData.fromGstin}
                      onChange={(e) => setFormData({...formData, fromGstin: e.target.value.toUpperCase()})}
                      placeholder="33AABCT1332L1ZZ"
                    />
                  </div>
                  <div>
                    <Label>Trade Name</Label>
                    <Input 
                      value={formData.fromTradeName}
                      onChange={(e) => setFormData({...formData, fromTradeName: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label>Address Line 1</Label>
                  <Input 
                    value={formData.fromAddr1}
                    onChange={(e) => setFormData({...formData, fromAddr1: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label>Place</Label>
                    <Input 
                      value={formData.fromPlace}
                      onChange={(e) => setFormData({...formData, fromPlace: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Pincode</Label>
                    <Input 
                      value={formData.fromPincode}
                      onChange={(e) => setFormData({...formData, fromPincode: e.target.value})}
                      maxLength={6}
                    />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Select 
                      value={formData.fromStateCode} 
                      onValueChange={(v) => setFormData({...formData, fromStateCode: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(stateCodes) && stateCodes.map((state: any) => (
                          <SelectItem key={state.code} value={state.code}>
                            {state.name} ({state.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Consignee Details (To)</CardTitle>
                <CardDescription>Recipient/buyer information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>GSTIN (optional)</Label>
                    <Input 
                      value={formData.toGstin}
                      onChange={(e) => setFormData({...formData, toGstin: e.target.value.toUpperCase()})}
                      placeholder="URP for unregistered"
                    />
                  </div>
                  <div>
                    <Label>Trade Name *</Label>
                    <Input 
                      value={formData.toTradeName}
                      onChange={(e) => setFormData({...formData, toTradeName: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label>Address Line 1 *</Label>
                  <Input 
                    value={formData.toAddr1}
                    onChange={(e) => setFormData({...formData, toAddr1: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label>Place *</Label>
                    <Input 
                      value={formData.toPlace}
                      onChange={(e) => setFormData({...formData, toPlace: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Pincode *</Label>
                    <Input 
                      value={formData.toPincode}
                      onChange={(e) => setFormData({...formData, toPincode: e.target.value})}
                      maxLength={6}
                    />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Select 
                      value={formData.toStateCode} 
                      onValueChange={(v) => setFormData({...formData, toStateCode: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(stateCodes) && stateCodes.map((state: any) => (
                          <SelectItem key={state.code} value={state.code}>
                            {state.name} ({state.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Item Details</CardTitle>
                    <CardDescription>Add products to the E-way Bill</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Item {index + 1}</span>
                      {items.length > 1 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="col-span-2">
                        <Label>Product Name</Label>
                        <Input 
                          value={item.productName}
                          onChange={(e) => updateItem(index, 'productName', e.target.value)}
                          placeholder="Aavin Toned Milk"
                        />
                      </div>
                      <div>
                        <Label>HSN Code</Label>
                        <Select 
                          value={item.hsnCode}
                          onValueChange={(v) => updateItem(index, 'hsnCode', v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select HSN" />
                          </SelectTrigger>
                          <SelectContent>
                            {hsnCodes.map((hsn: any) => (
                              <SelectItem key={hsn.hsnCode} value={hsn.hsnCode}>
                                {hsn.hsnCode} - {hsn.description}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Unit</Label>
                        <Select 
                          value={item.unit}
                          onValueChange={(v) => updateItem(index, 'unit', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LTR">Litre</SelectItem>
                            <SelectItem value="KGS">Kilogram</SelectItem>
                            <SelectItem value="NOS">Numbers</SelectItem>
                            <SelectItem value="PAC">Packs</SelectItem>
                            <SelectItem value="BOX">Box</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <Label>Quantity</Label>
                        <Input 
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label>Taxable Value (₹)</Label>
                        <Input 
                          type="number"
                          value={item.taxableValue}
                          onChange={(e) => updateItem(index, 'taxableValue', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label>CGST %</Label>
                        <Input 
                          type="number"
                          value={item.cgstRate}
                          onChange={(e) => updateItem(index, 'cgstRate', parseFloat(e.target.value) || 0)}
                          disabled={formData.fromStateCode !== formData.toStateCode}
                        />
                      </div>
                      <div>
                        <Label>SGST %</Label>
                        <Input 
                          type="number"
                          value={item.sgstRate}
                          onChange={(e) => updateItem(index, 'sgstRate', parseFloat(e.target.value) || 0)}
                          disabled={formData.fromStateCode !== formData.toStateCode}
                        />
                      </div>
                      <div>
                        <Label>IGST %</Label>
                        <Input 
                          type="number"
                          value={item.igstRate}
                          onChange={(e) => updateItem(index, 'igstRate', parseFloat(e.target.value) || 0)}
                          disabled={formData.fromStateCode === formData.toStateCode}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Transport Details</CardTitle>
                <CardDescription>Vehicle and transporter information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Transport Mode</Label>
                    <Select 
                      value={formData.transMode}
                      onValueChange={(v) => setFormData({...formData, transMode: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Road</SelectItem>
                        <SelectItem value="2">Rail</SelectItem>
                        <SelectItem value="3">Air</SelectItem>
                        <SelectItem value="4">Ship</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Distance (KM)</Label>
                    <Input 
                      type="number"
                      value={formData.transDistance}
                      onChange={(e) => setFormData({...formData, transDistance: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label>Vehicle Number</Label>
                    <Input 
                      value={formData.vehicleNo}
                      onChange={(e) => setFormData({...formData, vehicleNo: e.target.value.toUpperCase()})}
                      placeholder="TN01AB1234"
                    />
                  </div>
                  <div>
                    <Label>Vehicle Type</Label>
                    <Select 
                      value={formData.vehicleType}
                      onValueChange={(v) => setFormData({...formData, vehicleType: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="R">Regular</SelectItem>
                        <SelectItem value="O">Over Dimensional Cargo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Transporter ID (GSTIN)</Label>
                    <Input 
                      value={formData.transporterId}
                      onChange={(e) => setFormData({...formData, transporterId: e.target.value.toUpperCase()})}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <Label>Transporter Name</Label>
                    <Input 
                      value={formData.transporterName}
                      onChange={(e) => setFormData({...formData, transporterName: e.target.value})}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Taxable Value</span>
                    <span>₹{items.reduce((sum, i) => sum + i.taxableValue, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>CGST</span>
                    <span>₹{totals.cgstValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>SGST</span>
                    <span>₹{totals.sgstValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>IGST</span>
                    <span>₹{totals.igstValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total Value</span>
                    <span>₹{totals.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {totals.totalValue < 50000 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                    E-way Bill is only required for consignments valued above ₹50,000
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <Button 
                    className="w-full"
                    variant="outline"
                    onClick={() => handleSubmit('draft')}
                    disabled={createMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save as Draft
                  </Button>
                  <Button 
                    className="w-full bg-[#4AB3E8] hover:bg-[#3a9fd4]"
                    onClick={() => handleSubmit('pending')}
                    disabled={createMutation.isPending || totals.totalValue < 50000}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {createMutation.isPending ? "Creating..." : "Create E-way Bill"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
