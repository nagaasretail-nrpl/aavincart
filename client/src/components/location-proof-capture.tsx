import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import {
  MapPin, Camera, Loader2, CheckCircle, AlertTriangle,
  X, Shield, Clock, Signal, Upload, Eye
} from "lucide-react";

export interface ProofData {
  photoUrl: string | null;
  lat: number;
  lng: number;
  accuracy: number;
  accuracyGrade: "good" | "ok" | "poor";
  address: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  capturedAt: string;
  locationSource: string;
  isMockLocation: boolean | null;
  suspicionScore: number;
  proofHash: string;
  consentGiven: boolean;
}

interface Props {
  onProofCaptured: (data: ProofData) => void;
  onCancel: () => void;
  userRole?: string;
  existingLat?: number | null;
  existingLng?: number | null;
}

type Phase = "gps" | "camera" | "processing" | "preview";

function computeAccuracyGrade(accuracy: number): "good" | "ok" | "poor" {
  if (accuracy <= 30) return "good";
  if (accuracy <= 50) return "ok";
  return "poor";
}

function gradeColor(grade: string) {
  if (grade === "good") return "bg-green-100 text-green-700 border-green-200";
  if (grade === "ok") return "bg-yellow-100 text-yellow-700 border-yellow-200";
  return "bg-red-100 text-red-700 border-red-200";
}

function computeSuspicionScore(readings: Array<{ accuracy: number; lat: number; lng: number; timestamp: number }>): number {
  let score = 0;
  if (readings.length < 2) return score;

  for (let i = 1; i < readings.length; i++) {
    const prev = readings[i - 1];
    const curr = readings[i];
    const accDiff = Math.abs(curr.accuracy - prev.accuracy);
    if (accDiff > 200) score += 30;
    else if (accDiff > 100) score += 15;

    const timeDiffSec = (curr.timestamp - prev.timestamp) / 1000;
    if (timeDiffSec > 0) {
      const R = 6371000;
      const dLat = (curr.lat - prev.lat) * Math.PI / 180;
      const dLng = (curr.lng - prev.lng) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(prev.lat*Math.PI/180)*Math.cos(curr.lat*Math.PI/180)*Math.sin(dLng/2)**2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const speed = dist / timeDiffSec;
      if (speed > 100) score += 25;
    }
  }

  const allNetwork = readings.every(r => r.accuracy > 100);
  if (allNetwork) score += 10;

  return Math.min(score, 100);
}

async function resizeAndCompress(file: File, maxWidth = 1280, quality = 0.75): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width;
      let h = img.height;
      if (w > maxWidth) {
        h = Math.round(h * maxWidth / w);
        w = maxWidth;
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to compress image"));
      }, "image/jpeg", quality);
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

async function burnWatermark(imageBlob: Blob, data: {
  lat: number; lng: number; address: string; accuracy: number; grade: string; timestamp: string;
}): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      const padding = 12;
      const lineHeight = 18;
      const lines = [
        `${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}`,
        data.address.length > 50 ? data.address.substring(0, 50) + "…" : data.address,
        `${data.timestamp}`,
        `Accuracy: ${data.accuracy.toFixed(0)}m (${data.grade})`,
      ];
      const boxHeight = padding * 2 + lines.length * lineHeight + 4;
      const boxY = img.height - boxHeight;

      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, boxY, img.width, boxHeight);

      ctx.font = "bold 14px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "top";
      lines.forEach((line, i) => {
        ctx.fillText(line, padding, boxY + padding + i * lineHeight);
      });

      const gradeColor = data.grade === "good" ? "#22c55e" : data.grade === "ok" ? "#eab308" : "#ef4444";
      ctx.fillStyle = gradeColor;
      ctx.beginPath();
      ctx.arc(img.width - 20, boxY + padding + 8, 6, 0, Math.PI * 2);
      ctx.fill();

      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create watermarked image"));
      }, "image/jpeg", 0.85);
    };
    img.onerror = () => reject(new Error("Failed to load image for watermark"));
    img.src = URL.createObjectURL(imageBlob);
  });
}

async function computeHash(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function LocationProofCapture({ onProofCaptured, onCancel, userRole, existingLat, existingLng }: Props) {
  const { toast } = useToast();
  const { uploadFile, isUploading } = useUpload();
  const [phase, setPhase] = useState<Phase>("gps");
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsLat, setGpsLat] = useState<number | null>(existingLat || null);
  const [gpsLng, setGpsLng] = useState<number | null>(existingLng || null);
  const [gpsSource, setGpsSource] = useState<string>("gps");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [bestReading, setBestReading] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [allReadings, setAllReadings] = useState<Array<{ accuracy: number; lat: number; lng: number; timestamp: number }>>([]);

  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [watermarkedBlob, setWatermarkedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [proofHash, setProofHash] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);

  const [geocodeResult, setGeocodeResult] = useState<any>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef(Date.now());

  const isB2B = userRole && !['customer', 'mrp', 'b2c', 'consumer'].includes(userRole.toLowerCase());

  const currentThreshold = elapsedSec < 25 ? 30 : elapsedSec < 40 ? 50 : 200;
  const currentGrade = gpsAccuracy ? computeAccuracyGrade(gpsAccuracy) : null;
  const gpsLocked = gpsAccuracy !== null && gpsAccuracy <= currentThreshold;

  useEffect(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    if (!navigator.geolocation) {
      setGpsError("Geolocation not supported by this browser");
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const reading = { lat: latitude, lng: longitude, accuracy, timestamp: Date.now() };

        setAllReadings(prev => [...prev, reading]);
        setGpsAccuracy(accuracy);
        setGpsLat(latitude);
        setGpsLng(longitude);
        setGpsSource(accuracy <= 50 ? "gps" : "network");
        setGpsError(null);

        setBestReading(prev => {
          if (!prev || accuracy < prev.accuracy) return { lat: latitude, lng: longitude, accuracy };
          return prev;
        });
      },
      (err) => {
        if (err.code === 1) setGpsError("Location permission denied. Please enable location access.");
        else if (err.code === 2) setGpsError("Location unavailable. Try moving to an open area.");
        else setGpsError("GPS timeout. Please wait...");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleGpsAccepted = useCallback(() => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    const final = bestReading || (gpsLat && gpsLng && gpsAccuracy ? { lat: gpsLat, lng: gpsLng, accuracy: gpsAccuracy } : null);
    if (!final) return;

    setGpsLat(final.lat);
    setGpsLng(final.lng);
    setGpsAccuracy(final.accuracy);
    setPhase("camera");
  }, [bestReading, gpsLat, gpsLng, gpsAccuracy]);

  const handlePhotoSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhase("processing");

    try {
      const compressed = await resizeAndCompress(file, 1280, 0.75);
      setPhotoBlob(compressed);

      setIsGeocoding(true);
      let geoData: any = { formatted: '', street: '', city: '', state: '', pincode: '', country: 'India' };
      try {
        const res = await fetch('/api/geocode/reverse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: gpsLat, lng: gpsLng }),
        });
        geoData = await res.json();
      } catch (e) {
        console.error('Geocode failed:', e);
      }
      setGeocodeResult(geoData);
      setIsGeocoding(false);

      const now = new Date();
      const timestamp = now.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const grade = computeAccuracyGrade(gpsAccuracy || 999);
      const addressShort = geoData.formatted || geoData.street || `${gpsLat?.toFixed(4)}, ${gpsLng?.toFixed(4)}`;

      const watermarked = await burnWatermark(compressed, {
        lat: gpsLat!, lng: gpsLng!, address: addressShort,
        accuracy: gpsAccuracy!, grade, timestamp,
      });
      setWatermarkedBlob(watermarked);
      setPreviewUrl(URL.createObjectURL(watermarked));

      const hash = await computeHash(watermarked);
      setProofHash(hash);

      setPhase("preview");
    } catch (err: any) {
      toast({ title: "Error processing photo", description: err.message, variant: "destructive" });
      setPhase("camera");
    }
  }, [gpsLat, gpsLng, gpsAccuracy, toast]);

  const handleSkipPhoto = useCallback(async () => {
    setPhase("processing");
    setIsGeocoding(true);
    let geoData: any = { formatted: '', street: '', city: '', state: '', pincode: '', country: 'India' };
    try {
      const res = await fetch('/api/geocode/reverse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: gpsLat, lng: gpsLng }),
      });
      geoData = await res.json();
    } catch (e) { console.error('Geocode failed:', e); }
    setGeocodeResult(geoData);
    setIsGeocoding(false);
    setPhase("preview");
  }, [gpsLat, gpsLng]);

  const handleSubmit = useCallback(async () => {
    if (!consentChecked) {
      toast({ title: "Consent required", description: "Please accept the consent checkbox", variant: "destructive" });
      return;
    }

    let photoUrl: string | null = null;
    if (watermarkedBlob) {
      const file = new File([watermarkedBlob], `proof-${Date.now()}.jpg`, { type: "image/jpeg" });
      const result = await uploadFile(file);
      if (result) {
        photoUrl = result.objectPath;
      } else {
        toast({ title: "Upload failed", description: "Could not upload proof photo", variant: "destructive" });
        return;
      }
    }

    const suspicionScore = computeSuspicionScore(allReadings);
    const grade = computeAccuracyGrade(gpsAccuracy || 999);

    onProofCaptured({
      photoUrl,
      lat: gpsLat!,
      lng: gpsLng!,
      accuracy: gpsAccuracy!,
      accuracyGrade: grade,
      address: geocodeResult?.formatted || '',
      street: geocodeResult?.street || '',
      city: geocodeResult?.city || '',
      state: geocodeResult?.state || '',
      pincode: geocodeResult?.pincode || '',
      country: geocodeResult?.country || 'India',
      capturedAt: new Date().toISOString(),
      locationSource: gpsSource,
      isMockLocation: null,
      suspicionScore,
      proofHash: proofHash || '',
      consentGiven: true,
    });
  }, [consentChecked, watermarkedBlob, uploadFile, allReadings, gpsAccuracy, gpsLat, gpsLng, geocodeResult, gpsSource, proofHash, onProofCaptured, toast]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold text-gray-800">Location Proof Capture</span>
        </div>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
      </div>

      {phase === "gps" && (
        <div className="p-4 space-y-4">
          <div className="text-center">
            <Signal className={`h-10 w-10 mx-auto mb-2 ${gpsLocked ? 'text-green-500' : gpsError ? 'text-red-500' : 'text-blue-500 animate-pulse'}`} />
            <h3 className="text-base font-semibold text-gray-800">
              {gpsLocked ? 'GPS Locked!' : gpsError ? 'GPS Error' : 'Getting GPS Lock…'}
            </h3>
            <div className="flex items-center justify-center gap-2 mt-1">
              <Clock className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-sm text-gray-500">{elapsedSec}s elapsed</span>
            </div>
          </div>

          {gpsError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {gpsError}
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Accuracy</span>
              {gpsAccuracy !== null && (
                <Badge className={`text-xs ${gradeColor(computeAccuracyGrade(gpsAccuracy))}`}>
                  {gpsAccuracy.toFixed(0)}m — {computeAccuracyGrade(gpsAccuracy).toUpperCase()}
                </Badge>
              )}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  !gpsAccuracy ? 'bg-gray-300 w-0' :
                  gpsAccuracy <= 30 ? 'bg-green-500' :
                  gpsAccuracy <= 50 ? 'bg-yellow-500' :
                  gpsAccuracy <= 100 ? 'bg-orange-500' : 'bg-red-500'
                }`}
                style={{ width: `${gpsAccuracy ? Math.max(5, 100 - Math.min(gpsAccuracy, 200) / 2) : 0}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-gray-400">
              <span>Poor (&gt;50m)</span>
              <span>OK (≤50m)</span>
              <span>Good (≤30m)</span>
            </div>
          </div>

          {elapsedSec > 10 && gpsAccuracy && gpsAccuracy > 50 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
              <p className="font-medium mb-1">Tips to improve accuracy:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Go near a window or step outside</li>
                <li>Turn on High Accuracy in phone settings</li>
                <li>Wait 10–15 more seconds for GPS lock</li>
              </ul>
            </div>
          )}

          {elapsedSec >= 25 && gpsAccuracy && gpsAccuracy > 30 && gpsAccuracy <= 50 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              Accuracy is OK ({gpsAccuracy.toFixed(0)}m). You can proceed, but the location may not be exact.
            </div>
          )}

          {gpsLat && gpsLng && (
            <div className="text-center text-xs text-gray-400">
              {gpsLat.toFixed(6)}, {gpsLng.toFixed(6)}
            </div>
          )}

          <Button
            onClick={handleGpsAccepted}
            disabled={!gpsLocked}
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold"
          >
            {gpsLocked ? (
              <><CheckCircle className="h-4 w-4 mr-2" /> GPS Locked — Continue</>
            ) : (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Waiting for GPS…</>
            )}
          </Button>
        </div>
      )}

      {phase === "camera" && (
        <div className="p-4 space-y-4">
          <div className="text-center">
            <Camera className="h-10 w-10 mx-auto mb-2 text-blue-500" />
            <h3 className="text-base font-semibold text-gray-800">Take Location Photo</h3>
            <p className="text-xs text-gray-500 mt-1">Photograph your shop front or delivery location</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-800">GPS Locked</p>
              <p className="text-xs text-green-600">{gpsLat?.toFixed(6)}, {gpsLng?.toFixed(6)} · {gpsAccuracy?.toFixed(0)}m accuracy</p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoSelected}
          />

          <Button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-base"
          >
            <Camera className="h-5 w-5 mr-2" /> Open Camera
          </Button>

          {!isB2B && (
            <Button
              onClick={handleSkipPhoto}
              variant="ghost"
              className="w-full text-sm text-gray-500 hover:text-gray-700"
            >
              Skip photo (GPS only)
            </Button>
          )}
        </div>
      )}

      {phase === "processing" && (
        <div className="p-8 text-center space-y-3">
          <Loader2 className="h-10 w-10 mx-auto text-blue-500 animate-spin" />
          <h3 className="text-base font-semibold text-gray-800">Processing…</h3>
          <p className="text-xs text-gray-500">
            {isGeocoding ? "Getting address from coordinates…" : "Compressing and watermarking photo…"}
          </p>
        </div>
      )}

      {phase === "preview" && (
        <div className="p-4 space-y-4">
          <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Eye className="h-4 w-4 text-blue-600" /> Review & Submit
          </h3>

          {previewUrl && (
            <div className="rounded-xl overflow-hidden border border-gray-200">
              <img src={previewUrl} alt="Location proof" className="w-full max-h-64 object-cover" />
            </div>
          )}

          <div className="space-y-2">
            <div className="bg-gray-50 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Coordinates</span>
                <span className="text-xs font-mono font-medium">{gpsLat?.toFixed(6)}, {gpsLng?.toFixed(6)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Accuracy</span>
                <Badge className={`text-xs ${gradeColor(currentGrade || "poor")}`}>
                  {gpsAccuracy?.toFixed(0)}m — {(currentGrade || "poor").toUpperCase()}
                </Badge>
              </div>
              {geocodeResult?.formatted && (
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs text-gray-500 flex-shrink-0">Address</span>
                  <span className="text-xs font-medium text-right">{geocodeResult.formatted}</span>
                </div>
              )}
              {geocodeResult?.city && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">City/State</span>
                  <span className="text-xs font-medium">{geocodeResult.city}, {geocodeResult.state}</span>
                </div>
              )}
              {geocodeResult?.pincode && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Pincode</span>
                  <span className="text-xs font-medium">{geocodeResult.pincode}</span>
                </div>
              )}
              {proofHash && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Proof Hash</span>
                  <span className="text-[10px] font-mono text-gray-400">{proofHash.substring(0, 16)}…</span>
                </div>
              )}
            </div>

            {computeSuspicionScore(allReadings) > 30 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                Unusual GPS behavior detected. This will be flagged for review.
              </div>
            )}
          </div>

          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
            <Checkbox
              id="consent"
              checked={consentChecked}
              onCheckedChange={(v) => setConsentChecked(v === true)}
              className="mt-0.5"
            />
            <label htmlFor="consent" className="text-xs text-blue-800 cursor-pointer leading-relaxed">
              I consent to store this photo and location for delivery verification purposes. This data will be used to verify my business location.
            </label>
          </div>

          <div className="flex gap-2">
            <Button onClick={onCancel} variant="outline" className="flex-1 h-11 rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!consentChecked || isUploading}
              className="flex-1 h-11 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold"
            >
              {isUploading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" /> Submit Proof</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
