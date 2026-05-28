import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Navigation, Map, Search, Loader2, X } from 'lucide-react';

interface AddressResult {
  formatted_address: string;
  lat?: number;
  lng?: number;
  place_id?: string;
  components?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
  };
}

interface AddressInputProps {
  value: string;
  onChange: (address: string, details?: AddressResult) => void;
  placeholder?: string;
  hasError?: boolean;
  label?: string;
}

interface Prediction {
  id: string;
  description: string;
  main_text: string;
  secondary_text: string;
}

export default function AddressInput({ value, onChange, placeholder, hasError, label }: AddressInputProps) {
  const [mode, setMode] = useState<'type' | 'gps' | 'map'>('type');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingGps, setIsLoadingGps] = useState(false);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mapApiKey, setMapApiKey] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [gpsError, setGpsError] = useState('');

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const predictionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/config/maps')
      .then(r => r.json())
      .then(data => {
        if (data.mapsApiKey) setMapApiKey(data.mapsApiKey);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        predictionsRef.current && !predictionsRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowPredictions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchPlaces = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setPredictions([]);
      return;
    }
    setIsLoadingSearch(true);
    try {
      const res = await fetch('/api/interfacemerchant/getlocationAutocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query }),
      });
      const data = await res.json();
      if (data.code === 1 && data.details?.data) {
        setPredictions(data.details.data);
        setShowPredictions(true);
      }
    } catch {
      setPredictions([]);
    } finally {
      setIsLoadingSearch(false);
    }
  }, []);

  const handleInputChange = (val: string) => {
    setSearchQuery(val);
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPlaces(val), 350);
  };

  const selectPrediction = async (prediction: Prediction) => {
    setShowPredictions(false);
    setSearchQuery(prediction.description);
    onChange(prediction.description);

    try {
      const res = await fetch('/api/interfacemerchant/getLocationDetails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place_id: prediction.id }),
      });
      const data = await res.json();
      if (data.code === 1 && data.details?.address_details) {
        const d = data.details.address_details;
        onChange(d.formatted_address || prediction.description, {
          formatted_address: d.formatted_address,
          lat: d.lat,
          lng: d.lng,
          place_id: d.place_id,
          components: d.address,
        });
        setSearchQuery(d.formatted_address || prediction.description);
      }
    } catch {}
  };

  const handleGpsCapture = async () => {
    setIsLoadingGps(true);
    setGpsError('');

    if (!navigator.geolocation) {
      setGpsError('GPS not available on this device');
      setIsLoadingGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch('/api/interfacemerchant/reverseGeocoding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: latitude, lng: longitude }),
          });
          const data = await res.json();
          if (data.code === 1 && data.details?.address_details) {
            const d = data.details.address_details;
            onChange(d.formatted_address, {
              formatted_address: d.formatted_address,
              lat: d.lat,
              lng: d.lng,
              place_id: d.place_id,
              components: d.address,
            });
            setSearchQuery(d.formatted_address);
          } else {
            try {
              const osmRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
              const osmData = await osmRes.json();
              if (osmData.display_name) {
                const addr = osmData.address || {};
                onChange(osmData.display_name, {
                  formatted_address: osmData.display_name,
                  lat: latitude,
                  lng: longitude,
                  components: {
                    street: addr.road || '',
                    city: addr.city || addr.town || addr.village || '',
                    state: addr.state || '',
                    country: addr.country || '',
                    postal_code: addr.postcode || '',
                  },
                });
                setSearchQuery(osmData.display_name);
              } else {
                setGpsError('Could not determine address from location');
              }
            } catch {
              setGpsError('Could not determine address from location');
            }
          }
        } catch {
          setGpsError('Failed to get address. Please try again.');
        } finally {
          setIsLoadingGps(false);
        }
      },
      (error) => {
        setIsLoadingGps(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGpsError('Location access denied. Please enable location in browser settings.');
            break;
          case error.POSITION_UNAVAILABLE:
            setGpsError('Location unavailable. Please try again.');
            break;
          case error.TIMEOUT:
            setGpsError('Location request timed out. Please try again.');
            break;
          default:
            setGpsError('Failed to get location.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const loadGoogleMapsScript = useCallback(() => {
    if (!mapApiKey) return;
    if ((window as any).google?.maps) {
      setMapLoaded(true);
      return;
    }
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => setMapLoaded(true));
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${mapApiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);
  }, [mapApiKey]);

  const initMap = useCallback(() => {
    if (!mapRef.current || !mapLoaded || !(window as any).google?.maps) return;

    const defaultCenter = { lat: 11.0168, lng: 76.9558 };

    const map = new google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 14,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      ],
    });

    const marker = new google.maps.Marker({
      position: defaultCenter,
      map,
      draggable: true,
      animation: google.maps.Animation.DROP,
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    const reverseGeocode = async (lat: number, lng: number) => {
      try {
        const res = await fetch('/api/interfacemerchant/reverseGeocoding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng }),
        });
        const data = await res.json();
        if (data.code === 1 && data.details?.address_details) {
          const d = data.details.address_details;
          onChange(d.formatted_address, {
            formatted_address: d.formatted_address,
            lat: d.lat,
            lng: d.lng,
            place_id: d.place_id,
            components: d.address,
          });
          setSearchQuery(d.formatted_address);
        }
      } catch {}
    };

    marker.addListener('dragend', () => {
      const pos = marker.getPosition();
      if (pos) reverseGeocode(pos.lat(), pos.lng());
    });

    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        marker.setPosition(e.latLng);
        reverseGeocode(e.latLng.lat(), e.latLng.lng());
      }
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          map.setCenter(loc);
          marker.setPosition(loc);
          reverseGeocode(loc.lat, loc.lng);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }
  }, [mapLoaded, onChange]);

  useEffect(() => {
    if (showMap) {
      loadGoogleMapsScript();
    }
  }, [showMap, loadGoogleMapsScript]);

  useEffect(() => {
    if (showMap && mapLoaded) {
      setTimeout(() => {
        initMap();
        if (mapInstanceRef.current) {
          google.maps.event.trigger(mapInstanceRef.current, 'resize');
        }
      }, 200);
    }
  }, [showMap, mapLoaded, initMap]);

  useEffect(() => {
    if (!showMap && value && !searchQuery) {
      setSearchQuery(value);
    }
  }, [value]);

  return (
    <div className="space-y-2">
      {label && (
        <label className={`block text-xs font-medium ${hasError ? 'text-red-500' : 'text-gray-500'}`}>
          {label} {hasError && <span>(Required)</span>}
        </label>
      )}

      <div className="flex gap-1.5 mb-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGpsCapture}
          disabled={isLoadingGps}
          className="flex-1 h-8 text-xs gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
        >
          {isLoadingGps ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Navigation className="h-3.5 w-3.5" />
          )}
          Use My Location
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setShowMap(!showMap);
            setGpsError('');
          }}
          className={`flex-1 h-8 text-xs gap-1.5 ${showMap ? 'bg-green-50 border-green-300 text-green-700' : 'border-green-200 text-green-700 hover:bg-green-50'}`}
        >
          <Map className="h-3.5 w-3.5" />
          {showMap ? 'Hide Map' : 'Pick from Map'}
        </Button>
      </div>

      {gpsError && (
        <div className="text-xs text-red-500 bg-red-50 rounded-md px-3 py-1.5 flex items-center gap-1.5">
          <MapPin className="h-3 w-3 shrink-0" />
          {gpsError}
        </div>
      )}

      <div
        className="rounded-lg overflow-hidden border border-gray-200 shadow-sm transition-all duration-300 ease-in-out"
        style={{
          maxHeight: showMap ? '240px' : '0px',
          opacity: showMap ? 1 : 0,
          marginBottom: showMap ? '8px' : '0px',
          borderWidth: showMap ? '1px' : '0px',
        }}
      >
        <div
          ref={mapRef}
          className="w-full"
          style={{ height: '200px' }}
        />
        <div className="bg-gray-50 px-3 py-1.5 text-[10px] text-gray-500 text-center">
          Click or drag the pin to select your delivery location
        </div>
      </div>

      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder || 'Search address, area, or landmark...'}
            value={searchQuery}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => {
              if (predictions.length > 0) setShowPredictions(true);
            }}
            className={`pl-9 pr-8 h-10 text-sm ${hasError ? 'border-red-400' : ''}`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                onChange('');
                setPredictions([]);
                setShowPredictions(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {isLoadingSearch && (
            <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-gray-400" />
          )}
        </div>

        {showPredictions && predictions.length > 0 && (
          <div
            ref={predictionsRef}
            className="absolute z-50 w-full mt-1 bg-white rounded-lg border border-gray-200 shadow-lg max-h-48 overflow-y-auto"
          >
            {predictions.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPrediction(p)}
                className="w-full text-left px-3 py-2.5 hover:bg-orange-50 transition-colors border-b border-gray-50 last:border-0"
              >
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.main_text}</p>
                    <p className="text-xs text-gray-500 truncate">{p.secondary_text}</p>
                  </div>
                </div>
              </button>
            ))}
            <div className="px-3 py-1.5 bg-gray-50 flex items-center justify-center">
              <img
                src="https://maps.googleapis.com/maps/api/staticmap?size=1x1&key=none"
                alt=""
                className="hidden"
              />
              <span className="text-[9px] text-gray-400">Powered by Google</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
