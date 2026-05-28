import { useState } from "react";
import { useForm } from "react-hook-form";
import AdminLayout from './layout';
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import type { PricingTier } from "@shared/schema";

interface MerchantFormData {
  restaurantName: string;
  restaurantSlug: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  logo: string;
  headerImage: string;
  description: string;
  shortDescription: string;
  cuisine: string;
  onlineServices: string;
  posServices: string;
  tablesideServices: string;
  tags: string;
  deliveryDistanceCovered: string;
  distanceUnit: string;
  isPublished: boolean;
  status: string;
  pricingTierCode: string;
}

export default function MerchantAdd() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isPublished, setIsPublished] = useState(false);
  const [selectedTier, setSelectedTier] = useState("MRP");

  const { data: pricingTiers } = useQuery<PricingTier[]>({
    queryKey: ["/api/pricing-tiers"],
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<MerchantFormData>({
    defaultValues: {
      restaurantName: "",
      restaurantSlug: "",
      contactName: "",
      contactPhone: "",
      contactEmail: "",
      logo: "",
      headerImage: "",
      description: "",
      shortDescription: "",
      cuisine: "",
      onlineServices: "",
      posServices: "",
      tablesideServices: "",
      tags: "",
      deliveryDistanceCovered: "0.00",
      distanceUnit: "miles",
      isPublished: false,
      status: "pending",
      pricingTierCode: "MRP",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: MerchantFormData) => {
      const slug = data.restaurantSlug || data.restaurantName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const username = data.contactEmail.split('@')[0] + '_merchant';
      return apiRequest("POST", "/api/admin/merchants", {
        merchantUuid: crypto.randomUUID(),
        restaurantName: data.restaurantName,
        restaurantSlug: slug,
        restaurantPhone: data.contactPhone,
        contactName: data.contactName,
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail,
        username: username,
        password: 'password123',
        logo: data.logo || '',
        headerImage: data.headerImage || '',
        description: data.description || '',
        shortDescription: data.shortDescription || '',
        deliveryDistanceCovered: data.deliveryDistanceCovered || "0.00",
        status: data.status,
        isFeatured: isPublished ? 1 : 0,
        pricingTierCode: selectedTier,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/merchants"] });
      toast({ title: "Success", description: "District Union created successfully" });
      setLocation("/admin/merchant");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: MerchantFormData) => {
    createMutation.mutate(data);
  };

  const generateSlug = () => {
    const name = watch("restaurantName");
    if (name) {
      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      setValue("restaurantSlug", slug);
    }
  };

  return (
    <AdminLayout>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">All District Unions » Add new</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="restaurantName">District Union Name</Label>
                <Input
                  id="restaurantName"
                  placeholder="District Union Name"
                  {...register("restaurantName", { required: true })}
                  onBlur={generateSlug}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="restaurantSlug">Union Slug</Label>
                <Input
                  id="restaurantSlug"
                  placeholder="Union Slug"
                  {...register("restaurantSlug")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name</Label>
              <Input
                id="contactName"
                placeholder="Contact Name"
                {...register("contactName", { required: true })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  placeholder="Contact Phone"
                  {...register("contactPhone", { required: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="Contact email"
                  {...register("contactEmail", { required: true })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">Logo</Label>
              <div className="flex gap-2">
                <Input
                  id="logo"
                  placeholder="Logo"
                  {...register("logo")}
                  className="flex-1"
                />
                <Button type="button" className="bg-teal-500 hover:bg-teal-600">
                  Browse
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Recommended image size: 600x600 pixels.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="headerImage">Header</Label>
              <div className="flex gap-2">
                <Input
                  id="headerImage"
                  placeholder="Header"
                  {...register("headerImage")}
                  className="flex-1"
                />
                <Button type="button" className="bg-teal-500 hover:bg-teal-600">
                  Browse
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Recommended image size: 1400x600 pixels.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">About</Label>
              <Textarea
                id="description"
                placeholder=""
                {...register("description")}
                className="min-h-[150px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shortDescription">Short About</Label>
              <Textarea
                id="shortDescription"
                placeholder=""
                {...register("shortDescription")}
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cuisine">Cuisine</Label>
              <Input
                id="cuisine"
                placeholder=""
                {...register("cuisine")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="onlineServices">Online Services</Label>
              <Input
                id="onlineServices"
                placeholder=""
                {...register("onlineServices")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="posServices">
                POS Services <span className="text-muted-foreground text-sm">(if empty will use online services instead)</span>
              </Label>
              <Input
                id="posServices"
                placeholder=""
                {...register("posServices")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tablesideServices">
                Tableside Services <span className="text-muted-foreground text-sm">(if empty will use online services instead)</span>
              </Label>
              <Input
                id="tablesideServices"
                placeholder=""
                {...register("tablesideServices")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                placeholder=""
                {...register("tags")}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deliveryDistanceCovered">Delivery Distance Covered</Label>
                <Input
                  id="deliveryDistanceCovered"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register("deliveryDistanceCovered")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="distanceUnit">&nbsp;</Label>
                <Select defaultValue="miles" onValueChange={(val) => setValue("distanceUnit", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Miles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="miles">Miles</SelectItem>
                    <SelectItem value="km">Kilometers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isPublished"
                checked={isPublished}
                onCheckedChange={setIsPublished}
              />
              <Label htmlFor="isPublished">Published Union</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select defaultValue="pending" onValueChange={(val) => setValue("status", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pending for approval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending for approval</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pricingTier">Pricing Tier</Label>
              <Select value={selectedTier} onValueChange={setSelectedTier}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pricing tier" />
                </SelectTrigger>
                <SelectContent>
                  {pricingTiers?.map((tier) => (
                    <SelectItem key={tier.id} value={tier.tierCode}>
                      {tier.tierName} {tier.formula !== 'MRP' && tier.formula !== tier.tierCode ? `(${tier.formula})` : ''}
                    </SelectItem>
                  )) || (
                    <SelectItem value="MRP">MRP (Default)</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">Determines pricing for this merchant's orders</p>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-6"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
    </AdminLayout>
  );
}
