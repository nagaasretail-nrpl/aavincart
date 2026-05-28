import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Phone, MapPin, FileText, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

const B2B_ROLES = ['dealer', 'wholesale_dealer', 'wsd', 'retailer', 'inter_union', 'federation', 'agent', 'fmd'];

interface ProfileFields {
  phone: string;
  businessAddress: string;
  panNumber: string;
  aadhaarNumber: string;
  gstNumber: string;
}

export default function ProfileCompletionModal() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<ProfileFields>({
    phone: '',
    businessAddress: '',
    panNumber: '',
    aadhaarNumber: '',
    gstNumber: '',
  });

  useEffect(() => {
    if (!user || dismissed) return;
    if (!B2B_ROLES.includes(user.role)) return;

    const isStaffView = sessionStorage.getItem('staffSession') || sessionStorage.getItem('staffViewMode');
    if (isStaffView) return;

    const sessionKey = `profile_dismissed_${user.id}`;
    if (sessionStorage.getItem(sessionKey)) return;

    const missingCritical = !user.phone || !user.email?.includes('@') || user.email?.endsWith('@b2b.aavincart.com');
    if (missingCritical) {
      setFields({
        phone: user.phone || '',
        businessAddress: '',
        panNumber: user.panNumber || '',
        aadhaarNumber: '',
        gstNumber: user.gstNumber || '',
      });
      const timer = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [user, dismissed]);

  const handleDismiss = () => {
    setOpen(false);
    setDismissed(true);
    if (user) {
      sessionStorage.setItem(`profile_dismissed_${user.id}`, 'true');
    }
    if (window.location.pathname === '/login' || window.location.pathname === '/login/') {
      setLocation('/');
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const updates: any = {};
      if (fields.phone && fields.phone !== user.phone) updates.phone = fields.phone;
      if (fields.businessAddress) updates.businessAddress = fields.businessAddress;
      if (fields.panNumber && fields.panNumber !== user.panNumber) updates.panNumber = fields.panNumber;
      if (fields.aadhaarNumber) updates.aadhaarNumber = fields.aadhaarNumber;
      if (fields.gstNumber && fields.gstNumber !== user.gstNumber) updates.gstNumber = fields.gstNumber;

      if (Object.keys(updates).length === 0) {
        toast({ title: 'No Changes', description: 'No new information to save' });
        handleDismiss();
        return;
      }

      const res = await apiRequest('PUT', '/api/user/profile', updates);
      const data = await res.json();

      if (data.success) {
        toast({ title: 'Profile Updated', description: 'Your details have been saved successfully' });
        if (data.user) {
          setUser({ ...user, ...data.user });
        }
        await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      }
      handleDismiss();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to save profile details', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!user || !B2B_ROLES.includes(user.role)) return null;

  const missingFields = [];
  if (!user.phone) missingFields.push('Phone Number');
  if (!user.gstNumber) missingFields.push('GSTIN');
  if (!user.panNumber) missingFields.push('PAN Number');

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Complete Your Profile
          </DialogTitle>
          <DialogDescription>
            Please provide your details for compliance and communication. You can skip for now and fill later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {missingFields.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {missingFields.map(f => (
                <Badge key={f} className="bg-orange-100 text-orange-700 text-xs">{f} missing</Badge>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <Label className="text-sm flex items-center gap-1"><Phone className="h-3 w-3" /> Phone Number</Label>
              <Input
                value={fields.phone}
                onChange={e => setFields(f => ({ ...f, phone: e.target.value }))}
                placeholder="10-digit mobile number"
                maxLength={10}
              />
            </div>

            <div>
              <Label className="text-sm flex items-center gap-1"><MapPin className="h-3 w-3" /> Business Address</Label>
              <Input
                value={fields.businessAddress}
                onChange={e => setFields(f => ({ ...f, businessAddress: e.target.value }))}
                placeholder="Full business address"
              />
            </div>

            <div>
              <Label className="text-sm flex items-center gap-1"><FileText className="h-3 w-3" /> PAN Number</Label>
              <Input
                value={fields.panNumber}
                onChange={e => setFields(f => ({ ...f, panNumber: e.target.value.toUpperCase() }))}
                placeholder="AAAAA9999A"
                maxLength={10}
              />
            </div>

            <div>
              <Label className="text-sm flex items-center gap-1"><FileText className="h-3 w-3" /> Aadhaar Number</Label>
              <Input
                value={fields.aadhaarNumber}
                onChange={e => setFields(f => ({ ...f, aadhaarNumber: e.target.value.replace(/\D/g, '') }))}
                placeholder="12-digit Aadhaar number"
                maxLength={12}
              />
            </div>

            <div>
              <Label className="text-sm flex items-center gap-1"><FileText className="h-3 w-3" /> GSTIN</Label>
              <Input
                value={fields.gstNumber}
                onChange={e => setFields(f => ({ ...f, gstNumber: e.target.value.toUpperCase() }))}
                placeholder="15-digit GST number"
                maxLength={15}
              />
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={handleDismiss} disabled={saving}>
              Skip for Now
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700">
              {saving ? 'Saving...' : 'Save Details'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
