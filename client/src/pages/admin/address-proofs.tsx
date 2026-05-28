import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Shield, MapPin, Signal, AlertTriangle, CheckCircle, XCircle,
  RotateCcw, Eye, User, Mail, Clock, Hash, Loader2, Search, Filter
} from "lucide-react";

interface AddressProof {
  id: string | number;
  type: "delivery_point" | "user_address";
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  pointName: string;
  address: string;
  latitude: string | null;
  longitude: string | null;
  locationPhotoUrl: string | null;
  gpsAccuracy: string | null;
  accuracyGrade: string | null;
  locationSource: string | null;
  addressSource: string | null;
  isMockLocation: boolean | null;
  suspicionScore: number | null;
  capturedAt: string | null;
  proofStatus: string | null;
  proofHash: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  verifyNote: string | null;
  consentGiven: boolean | null;
  consentAt: string | null;
  createdAt: string | null;
}

function accuracyBadge(grade: string | null, accuracy: string | null) {
  const acc = accuracy ? `${Number(accuracy).toFixed(1)}m` : '';
  if (grade === 'good') return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs"><Signal className="h-3 w-3 mr-1" />{acc || '≤30m'}</Badge>;
  if (grade === 'ok') return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs"><Signal className="h-3 w-3 mr-1" />{acc || '≤50m'}</Badge>;
  if (grade === 'poor') return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs"><Signal className="h-3 w-3 mr-1" />{acc || '>50m'}</Badge>;
  return null;
}

function statusBadge(status: string | null) {
  if (status === 'verified') return <Badge className="bg-green-100 text-green-700 border-green-200">Verified</Badge>;
  if (status === 'rejected') return <Badge className="bg-red-100 text-red-700 border-red-200">Rejected</Badge>;
  if (status === 'rejected_need_retake') return <Badge className="bg-orange-100 text-orange-700 border-orange-200">Retake Needed</Badge>;
  return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Pending</Badge>;
}

export default function AddressProofs() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [photoDialog, setPhotoDialog] = useState<string | null>(null);
  const [actionDialog, setActionDialog] = useState<{ proof: AddressProof; action: string } | null>(null);
  const [verifyNote, setVerifyNote] = useState("");

  const queryParams = statusFilter !== "all" ? `?status=${statusFilter}` : "";
  const { data: proofs = [], isLoading } = useQuery<AddressProof[]>({
    queryKey: ["/api/admin/address-proofs", statusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/address-proofs${queryParams}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ proof, status, note }: { proof: AddressProof; status: string; note: string }) => {
      const endpoint = proof.type === 'delivery_point'
        ? `/api/admin/delivery-point/${proof.id}/proof-status`
        : `/api/admin/address/${proof.id}/proof-status`;
      const res = await apiRequest("PATCH", endpoint, { status, note });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/address-proofs"], exact: false });
      setActionDialog(null);
      setVerifyNote("");
      toast({ title: "Status updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    },
  });

  const filtered = proofs.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.userName?.toLowerCase().includes(q) ||
      p.userEmail?.toLowerCase().includes(q) ||
      p.pointName?.toLowerCase().includes(q) ||
      p.address?.toLowerCase().includes(q);
  });

  const counts = {
    all: proofs.length,
    pending: proofs.filter(p => p.proofStatus === 'pending').length,
    verified: proofs.filter(p => p.proofStatus === 'verified').length,
    rejected: proofs.filter(p => p.proofStatus === 'rejected' || p.proofStatus === 'rejected_need_retake').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            Address Proof Verification
          </h2>
          <p className="text-sm text-gray-500 mt-1">Review and verify customer location proofs</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { key: "all", label: "All", count: counts.all, color: "bg-gray-50 border-gray-200" },
          { key: "pending", label: "Pending", count: counts.pending, color: "bg-blue-50 border-blue-200" },
          { key: "verified", label: "Verified", count: counts.verified, color: "bg-green-50 border-green-200" },
          { key: "rejected", label: "Rejected", count: counts.rejected, color: "bg-red-50 border-red-200" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key === "rejected" ? "rejected" : tab.key)}
            className={`p-3 rounded-lg border text-left transition-all ${
              statusFilter === tab.key ? 'ring-2 ring-blue-400 ' + tab.color : tab.color + ' hover:shadow'
            }`}
          >
            <p className="text-2xl font-bold">{tab.count}</p>
            <p className="text-xs text-gray-600">{tab.label}</p>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, address..."
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="rejected_need_retake">Retake Needed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No address proofs found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((proof) => (
            <Card key={`${proof.type}-${proof.id}`} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex">
                  {proof.locationPhotoUrl && (
                    <div className="w-48 shrink-0 relative cursor-pointer" onClick={() => setPhotoDialog(proof.locationPhotoUrl)}>
                      <img src={proof.locationPhotoUrl} alt="Location proof" className="w-full h-full object-cover min-h-[160px]" />
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                        <Eye className="h-6 w-6 text-white opacity-0 hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  )}
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{proof.pointName}</h3>
                          <Badge variant="outline" className="text-[10px]">{proof.type === 'delivery_point' ? 'B2B' : 'Address'}</Badge>
                          {statusBadge(proof.proofStatus)}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><User className="h-3 w-3" />{proof.userName}</span>
                          <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{proof.userEmail}</span>
                          <Badge variant="outline" className="text-[10px]">{proof.userRole}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {proof.proofStatus !== 'verified' && (
                          <Button size="sm" variant="outline" className="text-xs h-7 text-green-600 border-green-300"
                            onClick={() => { setActionDialog({ proof, action: 'verified' }); setVerifyNote(''); }}>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verify
                          </Button>
                        )}
                        {proof.proofStatus !== 'rejected' && (
                          <Button size="sm" variant="outline" className="text-xs h-7 text-red-600 border-red-300"
                            onClick={() => { setActionDialog({ proof, action: 'rejected' }); setVerifyNote(''); }}>
                            <XCircle className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        )}
                        {proof.proofStatus !== 'rejected_need_retake' && (
                          <Button size="sm" variant="outline" className="text-xs h-7 text-orange-600 border-orange-300"
                            onClick={() => { setActionDialog({ proof, action: 'rejected_need_retake' }); setVerifyNote(''); }}>
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Retake
                          </Button>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-2 flex items-start gap-1">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      {proof.address || 'No address text'}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-2">
                      {accuracyBadge(proof.accuracyGrade, proof.gpsAccuracy)}
                      {proof.locationSource && (
                        <Badge variant="outline" className="text-xs">{proof.locationSource}</Badge>
                      )}
                      {proof.isMockLocation === true && (
                        <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />Mock Detected
                        </Badge>
                      )}
                      {proof.isMockLocation === null && (
                        <Badge variant="outline" className="text-xs text-gray-400">Mock: Unknown (PWA)</Badge>
                      )}
                      {Number(proof.suspicionScore) > 30 && (
                        <Badge className={`text-xs ${Number(proof.suspicionScore) > 50 ? 'bg-red-100 text-red-700 border-red-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}>
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Suspicion: {proof.suspicionScore}%
                        </Badge>
                      )}
                      {proof.consentGiven && (
                        <Badge variant="outline" className="text-xs text-green-600 border-green-200">Consent Given</Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400">
                      {proof.latitude && proof.longitude && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {Number(proof.latitude).toFixed(6)}, {Number(proof.longitude).toFixed(6)}
                        </span>
                      )}
                      {proof.capturedAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Captured: {new Date(proof.capturedAt).toLocaleString()}
                        </span>
                      )}
                      {proof.proofHash && (
                        <span className="flex items-center gap-1" title={proof.proofHash}>
                          <Hash className="h-3 w-3" />
                          Hash: {proof.proofHash.slice(0, 12)}...
                        </span>
                      )}
                    </div>

                    {proof.verifiedBy && (
                      <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                        <span>Reviewed by {proof.verifiedBy}</span>
                        {proof.verifiedAt && <span> on {new Date(proof.verifiedAt).toLocaleString()}</span>}
                        {proof.verifyNote && <p className="text-gray-600 mt-0.5 italic">"{proof.verifyNote}"</p>}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!photoDialog} onOpenChange={() => setPhotoDialog(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Location Proof Photo</DialogTitle>
          </DialogHeader>
          {photoDialog && (
            <img src={photoDialog} alt="Full size proof" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.action === 'verified' ? 'Verify Address Proof' :
               actionDialog?.action === 'rejected' ? 'Reject Address Proof' : 'Request Photo Retake'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">{actionDialog?.proof.pointName}</p>
              <p className="text-xs text-gray-500">{actionDialog?.proof.userName} — {actionDialog?.proof.address}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Note (optional)</label>
              <Textarea
                value={verifyNote}
                onChange={(e) => setVerifyNote(e.target.value)}
                placeholder={actionDialog?.action === 'rejected_need_retake'
                  ? "Explain what needs to be fixed (e.g., 'Photo too blurry, please retake in daylight')"
                  : "Add a verification note..."}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (actionDialog) {
                  updateStatusMutation.mutate({
                    proof: actionDialog.proof,
                    status: actionDialog.action,
                    note: verifyNote,
                  });
                }
              }}
              disabled={updateStatusMutation.isPending}
              className={
                actionDialog?.action === 'verified' ? 'bg-green-600 hover:bg-green-700' :
                actionDialog?.action === 'rejected' ? 'bg-red-600 hover:bg-red-700' :
                'bg-orange-600 hover:bg-orange-700'
              }
            >
              {updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {actionDialog?.action === 'verified' ? 'Verify' :
               actionDialog?.action === 'rejected' ? 'Reject' : 'Request Retake'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
