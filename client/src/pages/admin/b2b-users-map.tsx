import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "./layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  MapPin, ArrowLeft, Filter, Search, Loader2, X, Camera, Users, Eye, EyeOff, Layers
} from "lucide-react";
import { useLocation } from "wouter";

interface MapUser {
  id: string;
  name: string;
  phone: string;
  businessCode?: string;
  businessType: string;
  tier: string;
  unionId?: string;
  unionName: string;
  lat: number;
  lng: number;
  locationSource: 'geotag_photo' | 'saved_address' | 'user_profile';
  photoUrl: string | null;
  status: string;
}

const TIER_CONFIG: Record<string, { label: string; color: string; markerColor: string }> = {
  WHOLESALE_DEALER: { label: 'WSD', color: 'bg-purple-100 text-purple-700', markerColor: '#7c3aed' },
  DEALER: { label: 'Dealer', color: 'bg-red-100 text-red-700', markerColor: '#dc2626' },
  RETAILER: { label: 'Retailer', color: 'bg-green-100 text-green-700', markerColor: '#16a34a' },
  MPCS: { label: 'MPCS', color: 'bg-teal-100 text-teal-700', markerColor: '#0d9488' },
  HOTEL: { label: 'Hotel', color: 'bg-amber-100 text-amber-700', markerColor: '#d97706' },
  INSTITUTION: { label: 'Institution', color: 'bg-blue-100 text-blue-700', markerColor: '#2563eb' },
  PRIVATE_PARLOUR: { label: 'Pvt Parlour', color: 'bg-pink-100 text-pink-700', markerColor: '#db2777' },
  UNION_PARLOUR: { label: 'Union Parlour', color: 'bg-indigo-100 text-indigo-700', markerColor: '#4f46e5' },
  INTER_UNION: { label: 'Inter Union', color: 'bg-cyan-100 text-cyan-700', markerColor: '#0891b2' },
  FEDERATION: { label: 'Federation', color: 'bg-orange-100 text-orange-700', markerColor: '#ea580c' },
  MRP: { label: 'MRP', color: 'bg-gray-100 text-gray-700', markerColor: '#6b7280' },
};

let cachedApiKey = "";
let mapsLoaded = false;
let mapsLoading = false;
const callbacks: (() => void)[] = [];

async function loadMapsApi(): Promise<boolean> {
  if (mapsLoaded) return true;
  if (!cachedApiKey) {
    try {
      const res = await fetch('/api/config/maps');
      const data = await res.json();
      cachedApiKey = data.mapsApiKey || '';
    } catch { return false; }
  }
  if (!cachedApiKey) return false;
  return new Promise((resolve) => {
    if ((window as any).google?.maps) { mapsLoaded = true; resolve(true); return; }
    callbacks.push(() => resolve(true));
    if (mapsLoading) return;
    mapsLoading = true;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${cachedApiKey}&libraries=places&callback=__initGMapB2B`;
    script.async = true;
    (window as any).__initGMapB2B = () => { mapsLoaded = true; mapsLoading = false; callbacks.forEach(cb => cb()); callbacks.length = 0; };
    document.head.appendChild(script);
  });
}

export default function AdminB2BUsersMap() {
  const [, navigate] = useLocation();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [mapsReady, setMapsReady] = useState(false);
  const [selectedTiers, setSelectedTiers] = useState<Set<string>>(new Set(Object.keys(TIER_CONFIG)));
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<MapUser | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showLegend, setShowLegend] = useState(true);

  const { data: mapUsers = [], isLoading } = useQuery<MapUser[]>({
    queryKey: ['/api/admin/b2b-users-map'],
  });

  useEffect(() => {
    loadMapsApi().then(ok => setMapsReady(ok));
  }, []);

  const filteredUsers = mapUsers.filter(u => {
    if (!selectedTiers.has(u.tier)) return false;
    if (selectedSource !== 'all' && u.locationSource !== selectedSource) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (u.name || '').toLowerCase().includes(q) || (u.phone || '').includes(q)
        || (u.businessCode || '').toLowerCase().includes(q) || (u.unionName || '').toLowerCase().includes(q);
    }
    return true;
  });

  const createMarkerIcon = useCallback((color: string, hasPhoto: boolean) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.27 21.73 0 14 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="14" cy="14" r="6" fill="white"/>
      ${hasPhoto ? '<circle cx="14" cy="14" r="3" fill="' + color + '"/>' : ''}
    </svg>`;
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new google.maps.Size(28, 36),
      anchor: new google.maps.Point(14, 36),
    };
  }, []);

  useEffect(() => {
    if (!mapsReady || !mapRef.current || !(window as any).google?.maps) return;

    if (!mapInstance.current) {
      mapInstance.current = new google.maps.Map(mapRef.current, {
        center: { lat: 11.0, lng: 78.0 },
        zoom: 7,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [
          { featureType: "poi", stylers: [{ visibility: "off" }] },
          { featureType: "transit", stylers: [{ visibility: "off" }] },
        ],
      });
      infoWindowRef.current = new google.maps.InfoWindow();
    }

    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let hasPoints = false;

    filteredUsers.forEach(user => {
      const config = TIER_CONFIG[user.tier] || TIER_CONFIG.MRP;
      const marker = new google.maps.Marker({
        position: { lat: user.lat, lng: user.lng },
        map: mapInstance.current!,
        icon: createMarkerIcon(config.markerColor, user.locationSource === 'geotag_photo'),
        title: user.name,
      });

      marker.addListener('click', () => {
        setSelectedUser(user);
        const photoHtml = user.photoUrl
          ? `<div style="margin-top:6px"><img src="${user.photoUrl}" style="width:180px;height:100px;object-fit:cover;border-radius:6px;border:1px solid #ddd" /></div>`
          : '';
        const sourceIcon = user.locationSource === 'geotag_photo' ? '📸' : user.locationSource === 'saved_address' ? '📍' : '👤';
        infoWindowRef.current?.setContent(`
          <div style="font-family:system-ui;max-width:220px;padding:4px">
            <p style="font-weight:700;font-size:13px;margin:0 0 4px">${user.name}</p>
            <p style="font-size:11px;color:#666;margin:0 0 2px">${config.label} ${sourceIcon}</p>
            ${user.phone ? `<p style="font-size:11px;color:#666;margin:0 0 2px">📞 ${user.phone}</p>` : ''}
            ${user.unionName ? `<p style="font-size:11px;color:#888;margin:0 0 2px">🏭 ${user.unionName}</p>` : ''}
            <p style="font-size:10px;color:#aaa;margin:0">${user.lat.toFixed(5)}, ${user.lng.toFixed(5)}</p>
            ${photoHtml}
          </div>
        `);
        infoWindowRef.current?.open(mapInstance.current!, marker);
      });

      markersRef.current.push(marker);
      bounds.extend({ lat: user.lat, lng: user.lng });
      hasPoints = true;
    });

    if (hasPoints && mapInstance.current) {
      mapInstance.current.fitBounds(bounds);
      const listener = google.maps.event.addListener(mapInstance.current, 'idle', () => {
        if (mapInstance.current!.getZoom()! > 15) mapInstance.current!.setZoom(15);
        google.maps.event.removeListener(listener);
      });
    }
  }, [mapsReady, filteredUsers, createMarkerIcon]);

  const toggleTier = (tier: string) => {
    setSelectedTiers(prev => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier); else next.add(tier);
      return next;
    });
  };

  const selectAllTiers = () => setSelectedTiers(new Set(Object.keys(TIER_CONFIG)));
  const clearAllTiers = () => setSelectedTiers(new Set());

  const tierCounts: Record<string, number> = {};
  mapUsers.forEach(u => { tierCounts[u.tier] = (tierCounts[u.tier] || 0) + 1; });
  const sourceCounts = { all: mapUsers.length, geotag_photo: 0, saved_address: 0, user_profile: 0 };
  mapUsers.forEach(u => { sourceCounts[u.locationSource as keyof typeof sourceCounts]++; });

  return (
    <AdminLayout>
    <div className="flex flex-col bg-gray-50" style={{ height: 'calc(100vh - 64px)' }}>
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 z-20">
        <div className="flex-1">
          <h1 className="text-base font-bold">B2B Users Map</h1>
          <p className="text-xs text-gray-500">
            {filteredUsers.length} of {mapUsers.length} users shown on map
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowFilters(!showFilters)} className="text-xs gap-1">
          <Filter className="h-3.5 w-3.5" />
          Filters
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowLegend(!showLegend)} className="text-xs gap-1">
          <Layers className="h-3.5 w-3.5" />
        </Button>
      </div>

      {showFilters && (
        <div className="bg-white border-b px-4 py-3 z-10 space-y-3 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, phone, code, union..."
              className="h-9 pl-9 text-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-gray-600">Pricing Tier</p>
              <div className="flex gap-1.5">
                <button onClick={selectAllTiers} className="text-[10px] text-blue-600 hover:underline">All</button>
                <button onClick={clearAllTiers} className="text-[10px] text-red-600 hover:underline">None</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(TIER_CONFIG).map(([key, cfg]) => {
                const count = tierCounts[key] || 0;
                if (count === 0) return null;
                const active = selectedTiers.has(key);
                return (
                  <button key={key} onClick={() => toggleTier(key)}
                    className={`px-2 py-1 rounded-full text-[11px] font-medium border transition-all ${
                      active ? cfg.color + ' border-current' : 'bg-gray-50 text-gray-400 border-gray-200'
                    }`}>
                    <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: active ? cfg.markerColor : '#d1d5db' }} />
                    {cfg.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1.5">Location Source</p>
            <div className="flex gap-1.5">
              {[
                { key: 'all', label: 'All', icon: <Users className="h-3 w-3" /> },
                { key: 'geotag_photo', label: 'Photo GPS', icon: <Camera className="h-3 w-3" /> },
                { key: 'saved_address', label: 'Saved Address', icon: <MapPin className="h-3 w-3" /> },
              ].map(s => (
                <button key={s.key} onClick={() => setSelectedSource(s.key)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                    selectedSource === s.key ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-gray-50 text-gray-500 border-gray-200'
                  }`}>
                  {s.icon}
                  {s.label} ({sourceCounts[s.key as keyof typeof sourceCounts] || 0})
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-white/80 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Loading B2B users...</p>
            </div>
          </div>
        )}

        {!mapsReady && !isLoading && (
          <div className="absolute inset-0 z-10 bg-gray-100 flex items-center justify-center">
            <div className="text-center px-8">
              <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-1">Google Maps not available</p>
              <p className="text-xs text-gray-400">Configure your API key in Admin &gt; API Settings</p>
            </div>
          </div>
        )}

        <div ref={mapRef} className="w-full h-full" />

        {showLegend && (
          <div className="absolute bottom-4 left-4 bg-white rounded-xl shadow-lg border p-3 z-10 max-w-[180px]">
            <p className="text-[10px] font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Legend</p>
            <div className="space-y-1">
              {Object.entries(TIER_CONFIG).map(([key, cfg]) => {
                const count = tierCounts[key] || 0;
                if (count === 0) return null;
                return (
                  <div key={key} className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.markerColor }} />
                    <span className="text-[10px] text-gray-600">{cfg.label}</span>
                    <span className="text-[10px] text-gray-400 ml-auto">{count}</span>
                  </div>
                );
              })}
              <div className="border-t border-gray-100 pt-1 mt-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-gray-400 flex-shrink-0 flex items-center justify-center">
                    <span className="w-1 h-1 rounded-full bg-white" />
                  </span>
                  <span className="text-[10px] text-gray-500">= Has photo proof</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedUser && (
          <div className="absolute bottom-4 right-4 bg-white rounded-xl shadow-lg border p-3 z-10 w-64">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-bold text-sm">{selectedUser.name}</p>
                <Badge className={`text-[10px] ${TIER_CONFIG[selectedUser.tier]?.color || 'bg-gray-100 text-gray-700'}`}>
                  {TIER_CONFIG[selectedUser.tier]?.label || selectedUser.tier}
                </Badge>
              </div>
              <button onClick={() => setSelectedUser(null)} className="p-0.5 rounded hover:bg-gray-100">
                <X className="h-3.5 w-3.5 text-gray-400" />
              </button>
            </div>
            {selectedUser.phone && <p className="text-xs text-gray-500 mb-0.5">Phone: {selectedUser.phone}</p>}
            {selectedUser.unionName && <p className="text-xs text-gray-500 mb-0.5">Union: {selectedUser.unionName}</p>}
            {selectedUser.businessCode && <p className="text-xs text-gray-400 mb-0.5 font-mono">Code: {selectedUser.businessCode}</p>}
            <p className="text-[10px] text-gray-400 flex items-center gap-1">
              {selectedUser.locationSource === 'geotag_photo' ? (
                <><Camera className="h-3 w-3" /> Photo GPS</>
              ) : selectedUser.locationSource === 'saved_address' ? (
                <><MapPin className="h-3 w-3" /> Saved Address</>
              ) : (
                <><Users className="h-3 w-3" /> Profile</>
              )}
            </p>
            {selectedUser.photoUrl && (
              <img src={selectedUser.photoUrl} alt="Location" className="w-full h-24 object-cover rounded-lg border mt-2" />
            )}
          </div>
        )}
      </div>
    </div>
    </AdminLayout>
  );
}
