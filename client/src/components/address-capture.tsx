import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MapPin, Navigation, Search, Loader2, X, LocateFixed, ChevronDown, ChevronUp, Camera, ImageIcon, AlertCircle, Check, Shield
} from "lucide-react";
import { extractGeoFromPhoto, type GeoPhotoData } from "@/lib/exif-utils";
import LocationProofCapture, { type ProofData } from "@/components/location-proof-capture";

interface AddressCaptureProps {
  value: string;
  onChange: (address: string) => void;
  onCoordinatesChange?: (lat: number | null, lng: number | null) => void;
  onPhotoUrlChange?: (url: string | null) => void;
  onProofDataChange?: (data: ProofData) => void;
  latitude?: number | null;
  longitude?: number | null;
  placeholder?: string;
  label?: string;
  error?: string;
  showPhotoMode?: boolean;
  userRole?: string;
}

let cachedApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
let googleMapsLoaded = false;
let googleMapsLoading = false;
const loadCallbacks: (() => void)[] = [];
let apiKeyFetched = false;

async function fetchApiKey(): Promise<string> {
  if (apiKeyFetched && cachedApiKey) return cachedApiKey;
  try {
    const res = await fetch('/api/config/maps');
    const data = await res.json();
    if (data.mapsApiKey) {
      cachedApiKey = data.mapsApiKey;
    }
  } catch {}
  apiKeyFetched = true;
  return cachedApiKey;
}

function loadGoogleMaps(apiKey?: string): Promise<void> {
  return new Promise((resolve) => {
    if (googleMapsLoaded || (window as any).google?.maps?.places) {
      googleMapsLoaded = true;
      resolve();
      return;
    }
    loadCallbacks.push(resolve);
    if (googleMapsLoading) return;
    const key = apiKey || cachedApiKey;
    if (!key) {
      resolve();
      return;
    }
    googleMapsLoading = true;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&callback=__initGoogleMaps`;
    script.async = true;
    script.defer = true;
    (window as any).__initGoogleMaps = () => {
      googleMapsLoaded = true;
      googleMapsLoading = false;
      loadCallbacks.forEach(cb => cb());
      loadCallbacks.length = 0;
    };
    document.head.appendChild(script);
  });
}

export default function AddressCapture({
  value,
  onChange,
  onCoordinatesChange,
  onPhotoUrlChange,
  latitude,
  longitude,
  placeholder = "Enter delivery address",
  label = "Delivery Address",
  error,
  showPhotoMode = true,
  onProofDataChange,
  userRole,
}: AddressCaptureProps) {
  const [mode, setMode] = useState<"type" | "gps" | "map" | "photo" | "proof">("type");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mapsReady, setMapsReady] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: latitude || 11.0, lng: longitude || 78.0 });
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoGeoData, setPhotoGeoData] = useState<GeoPhotoData | null>(null);
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [deviceGpsUsed, setDeviceGpsUsed] = useState(false);
  const [deviceGpsCoords, setDeviceGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [deviceGpsFailed, setDeviceGpsFailed] = useState(false);

  useEffect(() => {
    fetchApiKey().then((key) => {
      if (key) {
        loadGoogleMaps(key).then(() => {
          setMapsReady(true);
          if ((window as any).google?.maps?.places) {
            autocompleteService.current = new google.maps.places.AutocompleteService();
          }
        });
      }
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (showMap && mapRef.current && mapsReady && (window as any).google?.maps) {
      const center = { lat: latitude || mapCenter.lat, lng: longitude || mapCenter.lng };
      const map = new google.maps.Map(mapRef.current, {
        center,
        zoom: 14,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      mapInstance.current = map;
      
      const marker = new google.maps.Marker({
        position: center,
        map,
        draggable: true,
        title: "Delivery Location",
      });
      markerRef.current = marker;

      const hiddenDiv = document.createElement("div");
      placesService.current = new google.maps.places.PlacesService(hiddenDiv);

      marker.addListener("dragend", () => {
        const pos = marker.getPosition();
        if (pos) {
          reverseGeocode(pos.lat(), pos.lng());
        }
      });

      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          marker.setPosition(e.latLng);
          reverseGeocode(e.latLng.lat(), e.latLng.lng());
        }
      });
    }
  }, [showMap, mapsReady]);

  const reverseGeocode = useCallback((lat: number, lng: number) => {
    onCoordinatesChange?.(lat, lng);
    setMapCenter({ lat, lng });
    if ((window as any).google?.maps) {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          onChange(results[0].formatted_address);
        } else {
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
            .then(r => r.json())
            .then(data => {
              onChange(data.display_name || `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`);
            })
            .catch(() => {
              onChange(`Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`);
            });
        }
      });
    } else {
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
        .then(r => r.json())
        .then(data => {
          onChange(data.display_name || `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`);
        })
        .catch(() => {
          onChange(`Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`);
        });
    }
  }, [onChange, onCoordinatesChange]);

  const handleInputChange = (text: string) => {
    onChange(text);
    if (text.length > 2 && autocompleteService.current && mapsReady) {
      autocompleteService.current.getPlacePredictions(
        {
          input: text,
          componentRestrictions: { country: "in" },
          types: ["geocode", "establishment"],
        },
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSuggestions(predictions);
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
          }
        }
      );
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (prediction: google.maps.places.AutocompletePrediction) => {
    onChange(prediction.description);
    setShowSuggestions(false);
    setSuggestions([]);

    if ((window as any).google?.maps?.places) {
      const hiddenDiv = document.createElement("div");
      const svc = new google.maps.places.PlacesService(hiddenDiv);
      svc.getDetails(
        { placeId: prediction.place_id, fields: ["geometry"] },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            onCoordinatesChange?.(lat, lng);
            setMapCenter({ lat, lng });
          }
        }
      );
    }
  };

  const captureGPS = () => {
    if (!navigator.geolocation) {
      setGpsError("GPS is not available on this device");
      return;
    }
    setGpsLoading(true);
    setGpsError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        onCoordinatesChange?.(lat, lng);
        setMapCenter({ lat, lng });
        setGpsLoading(false);

        if (mapsReady && (window as any).google?.maps) {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === "OK" && results && results[0]) {
              onChange(results[0].formatted_address);
            } else {
              onChange(`Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`);
            }
          });
        } else {
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
            .then(r => r.json())
            .then(data => {
              if (data.display_name) {
                onChange(data.display_name);
              } else {
                onChange(`Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`);
              }
            })
            .catch(() => {
              onChange(`Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`);
            });
        }
      },
      (err) => {
        setGpsLoading(false);
        setGpsError(err.code === 1 ? "Location permission denied. Please allow access." :
          err.code === 2 ? "Location unavailable. Please try again." :
          "Location request timed out. Please try again.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const uploadPhotoToStorage = useCallback(async (file: File) => {
    try {
      setPhotoUploading(true);
      const urlRes = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `location-photo-${Date.now()}-${file.name}`,
          size: file.size,
          contentType: file.type || "image/jpeg",
        }),
      });
      if (urlRes.ok) {
        const { uploadURL, objectPath } = await urlRes.json();
        await fetch(uploadURL, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "image/jpeg" },
        });
        const publicUrl = `/objects/${objectPath}`;
        onPhotoUrlChange?.(publicUrl);
        setPhotoUploaded(true);
      }
    } catch {
    } finally {
      setPhotoUploading(false);
    }
  }, [onPhotoUrlChange]);

  const captureDeviceGpsForPhoto = useCallback(() => {
    if (!navigator.geolocation) {
      setDeviceGpsFailed(true);
      setDeviceGpsUsed(false);
      setDeviceGpsCoords(null);
      onCoordinatesChange?.(null, null);
      setPhotoProcessing(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        setDeviceGpsUsed(true);
        setDeviceGpsCoords({ lat, lng });
        setDeviceGpsFailed(false);
        onCoordinatesChange?.(lat, lng);
        setMapCenter({ lat, lng });
        reverseGeocode(lat, lng);
        setPhotoProcessing(false);
      },
      () => {
        setDeviceGpsFailed(true);
        setDeviceGpsUsed(false);
        setDeviceGpsCoords(null);
        onCoordinatesChange?.(null, null);
        setPhotoProcessing(false);
      },
      { timeout: 15000, enableHighAccuracy: true }
    );
  }, [onCoordinatesChange, reverseGeocode]);

  const handlePhotoSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoProcessing(true);
    setPhotoError("");
    setPhotoUploaded(false);
    setDeviceGpsUsed(false);
    setDeviceGpsCoords(null);
    setDeviceGpsFailed(false);
    setPhotoPreview(URL.createObjectURL(file));

    try {
      const geoData = await extractGeoFromPhoto(file);
      setPhotoGeoData(geoData);

      await uploadPhotoToStorage(file);

      if (!geoData || !geoData.hasGeoData) {
        setPhotoError("");
        captureDeviceGpsForPhoto();
        return;
      }

      onCoordinatesChange?.(geoData.latitude, geoData.longitude);
      setMapCenter({ lat: geoData.latitude, lng: geoData.longitude });
      reverseGeocode(geoData.latitude, geoData.longitude);
      setPhotoProcessing(false);
    } catch (err) {
      setPhotoError("Could not read photo data. Please try another image.");
      setPhotoProcessing(false);
    }
  }, [onCoordinatesChange, onPhotoUrlChange, reverseGeocode, uploadPhotoToStorage, captureDeviceGpsForPhoto]);

  const clearPhoto = useCallback(() => {
    setPhotoPreview(null);
    setPhotoGeoData(null);
    setPhotoError("");
    setPhotoUploaded(false);
    setDeviceGpsUsed(false);
    setDeviceGpsCoords(null);
    setDeviceGpsFailed(false);
    onPhotoUrlChange?.(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  }, [onPhotoUrlChange]);

  return (
    <div className="space-y-2" ref={wrapperRef}>
      <Label className="flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        {label}
      </Label>

      <div className="flex gap-1 mb-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "type" ? "default" : "outline"}
          onClick={() => setMode("type")}
          className="text-xs flex-1"
        >
          <Search className="h-3 w-3 mr-1" />
          Type
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "gps" ? "default" : "outline"}
          onClick={() => { setMode("gps"); captureGPS(); }}
          className="text-xs flex-1"
        >
          <LocateFixed className="h-3 w-3 mr-1" />
          GPS
        </Button>
        {mapsReady && (
          <Button
            type="button"
            size="sm"
            variant={mode === "map" ? "default" : "outline"}
            onClick={() => { setMode("map"); setShowMap(true); }}
            className="text-xs flex-1"
          >
            <Navigation className="h-3 w-3 mr-1" />
            Map
          </Button>
        )}
        {showPhotoMode && (
          <Button
            type="button"
            size="sm"
            variant={mode === "photo" ? "default" : "outline"}
            onClick={() => setMode("photo")}
            className="text-xs flex-1"
          >
            <Camera className="h-3 w-3 mr-1" />
            Photo
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant={mode === "proof" ? "default" : "outline"}
          onClick={() => setMode("proof")}
          className="text-xs flex-1"
        >
          <Shield className="h-3 w-3 mr-1" />
          Proof
        </Button>
      </div>

      {mode === "type" && (
        <div className="relative">
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={mapsReady ? "Start typing for Google suggestions..." : placeholder}
            className={error ? "border-red-500" : ""}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {suggestions.map((s) => (
                <button
                  key={s.place_id}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-start gap-2 border-b border-gray-50 dark:border-gray-700 last:border-0"
                  onClick={() => selectSuggestion(s)}
                >
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" />
                  <span>{s.description}</span>
                </button>
              ))}
              <div className="px-3 py-1 text-[10px] text-gray-400 text-right">Powered by Google</div>
            </div>
          )}
        </div>
      )}

      {mode === "gps" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            {gpsLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="text-sm text-blue-700 dark:text-blue-300">Getting your location...</span>
              </>
            ) : gpsError ? (
              <div className="flex items-center justify-between w-full">
                <span className="text-sm text-red-600">{gpsError}</span>
                <Button type="button" size="sm" variant="outline" onClick={captureGPS}>Retry</Button>
              </div>
            ) : value ? (
              <>
                <LocateFixed className="h-5 w-5 text-green-600" />
                <span className="text-sm text-green-700 dark:text-green-300">Location captured</span>
              </>
            ) : (
              <>
                <LocateFixed className="h-5 w-5 text-blue-600" />
                <span className="text-sm text-blue-700 dark:text-blue-300">Click GPS button to capture location</span>
              </>
            )}
          </div>
          {value && (
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Address from GPS"
              rows={2}
              className="text-sm"
            />
          )}
        </div>
      )}

      {mode === "map" && showMap && (
        <div className="space-y-2">
          {mapsReady ? (
            <>
              <div ref={mapRef} className="w-full h-56 rounded-lg border border-gray-200 dark:border-gray-700" />
              <p className="text-xs text-gray-500">Click on map or drag the pin to set delivery location</p>
            </>
          ) : (
            <div className="w-full h-56 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
              <p className="text-sm text-gray-500">Google Maps not available. Use GPS or type your address.</p>
            </div>
          )}
          {value && (
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Selected address"
              rows={2}
              className="text-sm"
            />
          )}
        </div>
      )}

      {mode === "photo" && (
        <div className="space-y-3">
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoSelect}
            className="hidden"
          />

          {!photoPreview && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="w-full border-2 border-dashed border-blue-300 rounded-xl p-6 text-center hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
              >
                <Camera className="h-10 w-10 text-blue-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-blue-600">Take or Upload Photo</p>
                <p className="text-xs text-gray-400 mt-1">Photo saved as location proof. GPS extracted if available.</p>
              </button>
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5">
                <p className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>For auto-fill, use <strong>GPS Map Camera</strong> app to take photos with embedded location. Otherwise, enter address manually below.</span>
                </p>
              </div>
            </div>
          )}

          {photoProcessing && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span className="text-sm text-blue-700 dark:text-blue-300">Capturing location from photo / device GPS...</span>
            </div>
          )}

          {photoPreview && (
            <div className="relative">
              <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <img src={photoPreview} alt="Location photo" className="w-full h-40 object-cover" />
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                >
                  <X className="h-4 w-4" />
                </button>

                {(photoGeoData?.hasGeoData || deviceGpsUsed) && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white px-3 py-2">
                    <div className="flex items-center gap-1.5 text-xs">
                      <MapPin className="h-3 w-3 text-green-400" />
                      <span>
                        {photoGeoData?.hasGeoData
                          ? `${photoGeoData.latitude.toFixed(6)}, ${photoGeoData.longitude.toFixed(6)}`
                          : deviceGpsCoords
                            ? `${deviceGpsCoords.lat.toFixed(6)}, ${deviceGpsCoords.lng.toFixed(6)}`
                            : ""}
                      </span>
                      {deviceGpsUsed && !photoGeoData?.hasGeoData && (
                        <span className="text-[10px] text-blue-300 ml-1">(Device GPS)</span>
                      )}
                    </div>
                    {photoGeoData?.hasGeoData && photoGeoData.timestamp && (
                      <p className="text-[10px] text-gray-300 mt-0.5">Captured: {photoGeoData.timestamp}</p>
                    )}
                  </div>
                )}
              </div>

              {photoUploading && (
                <div className="flex items-center gap-2 mt-2 text-xs text-blue-600">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Saving photo as location proof...</span>
                </div>
              )}

              {photoUploaded && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-green-600">
                  <Check className="h-3 w-3" />
                  <span>Photo saved as location proof</span>
                </div>
              )}

              {!photoGeoData?.hasGeoData && !photoProcessing && deviceGpsUsed && (
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-2.5 mt-2">
                  <p className="text-xs text-green-700 dark:text-green-300 flex items-start gap-1.5">
                    <Check className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>Location captured from device GPS. Photo saved as proof. Address auto-filled below.</span>
                  </p>
                </div>
              )}

              {!photoGeoData?.hasGeoData && !photoProcessing && !deviceGpsUsed && deviceGpsFailed && (
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5 mt-2">
                  <p className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>No GPS data in photo and device location unavailable. Photo saved as proof — please enter address manually below.</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {photoError && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-xs text-red-600 dark:text-red-400 flex items-start gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>{photoError}</span>
              </p>
              <Button type="button" size="sm" variant="outline" onClick={() => { clearPhoto(); photoInputRef.current?.click(); }}
                className="mt-2 text-xs h-7">
                Try Another Photo
              </Button>
            </div>
          )}

          {photoPreview && !photoProcessing && (
            <div className="space-y-1.5">
              {photoGeoData?.hasGeoData ? (
                <div className="flex items-center gap-1.5 text-xs text-green-600">
                  <Check className="h-3.5 w-3.5" />
                  <span className="font-medium">Address auto-filled from photo GPS</span>
                </div>
              ) : deviceGpsUsed ? (
                <div className="flex items-center gap-1.5 text-xs text-green-600">
                  <Check className="h-3.5 w-3.5" />
                  <span className="font-medium">Address auto-filled from device GPS</span>
                </div>
              ) : (
                <p className="text-xs font-medium text-gray-600">Enter delivery address with pincode:</p>
              )}
              <Textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Full address with street, area, city, and pincode"
                rows={3}
                className="text-sm"
              />
              {!photoGeoData?.hasGeoData && (
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => { captureGPS(); }}
                    className="text-xs h-7 gap-1">
                    <LocateFixed className="h-3 w-3" />
                    Use GPS
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => { clearPhoto(); photoInputRef.current?.click(); }}
                    className="text-xs h-7 gap-1">
                    <Camera className="h-3 w-3" />
                    Try Another Photo
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {mode === "proof" && (
        <LocationProofCapture
          userRole={userRole}
          existingLat={latitude}
          existingLng={longitude}
          onCancel={() => setMode("type")}
          onProofCaptured={(data) => {
            const parts = [data.street, data.city, data.state, data.pincode].filter(Boolean);
            const address = data.address || parts.join(', ');
            if (address) onChange(address);
            onCoordinatesChange?.(data.lat, data.lng);
            if (data.photoUrl) onPhotoUrlChange?.(data.photoUrl);
            onProofDataChange?.(data);
            setMode("type");
          }}
        />
      )}

      {latitude && longitude && (
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <Navigation className="h-3 w-3" />
          {Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}
        </p>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
