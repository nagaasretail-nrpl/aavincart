import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface DistrictUnion {
  id: string;
  value: string;
  label: string;
  lat: number;
  lng: number;
}

export const DISTRICT_UNIONS: DistrictUnion[] = [
  { id: "merchant-2",  value: "coimbatore",  label: "Coimbatore Union",           lat: 11.0168, lng: 76.9558 },
  { id: "merchant-3",  value: "salem",        label: "Salem Union",                lat: 11.6643, lng: 78.1460 },
  { id: "merchant-4",  value: "madurai",      label: "Madurai Union",              lat: 9.9252,  lng: 78.1198 },
  { id: "merchant-5",  value: "trichy",       label: "Trichy Union",               lat: 10.7905, lng: 78.7047 },
  { id: "merchant-6",  value: "thanjavur",    label: "Thanjavur Union",            lat: 10.7870, lng: 79.1378 },
  { id: "merchant-7",  value: "erode",        label: "Erode Union",                lat: 11.3410, lng: 77.7172 },
  { id: "merchant-8",  value: "tirunelveli",  label: "Tirunelveli Union",          lat: 8.7139,  lng: 77.7567 },
  { id: "merchant-9",  value: "vellore",      label: "Vellore Union",              lat: 12.9165, lng: 79.1325 },
  { id: "merchant-10", value: "villupuram",   label: "Villupuram Union",           lat: 11.9401, lng: 79.4861 },
  { id: "merchant-11", value: "kancheepuram", label: "Kanchipuram-Thiruvallur Union", lat: 12.8342, lng: 79.7036 },
  { id: "merchant-12", value: "tiruvannamalai", label: "Thiruvannamalai Union",   lat: 12.2253, lng: 79.0747 },
  { id: "merchant-13", value: "cuddalore",    label: "Cuddalore Union",            lat: 11.7480, lng: 79.7714 },
  { id: "merchant-15", value: "dindigul",     label: "Dindigul Union",             lat: 10.3673, lng: 77.9803 },
  { id: "merchant-16", value: "theni",        label: "Theni Union",                lat: 10.0104, lng: 77.4768 },
  { id: "merchant-17", value: "virudhunagar", label: "Virudhunagar Union",         lat: 9.5681,  lng: 77.9624 },
  { id: "merchant-19", value: "sivagangai",   label: "Sivagangai Union",           lat: 9.8433,  lng: 78.4809 },
  { id: "merchant-20", value: "thoothukudi",  label: "Thoothukudi Union",          lat: 8.7578,  lng: 78.1348 },
  { id: "merchant-21", value: "kanyakumari",  label: "Kanyakumari Union",          lat: 8.0883,  lng: 77.5385 },
  { id: "merchant-22", value: "namakkal",     label: "Namakkal Union",             lat: 11.2189, lng: 78.1674 },
  { id: "merchant-23", value: "dharmapuri",   label: "Dharmapuri Union",           lat: 12.1357, lng: 78.1602 },
  { id: "merchant-24", value: "krishnagiri",  label: "Krishnagiri Union",          lat: 12.5186, lng: 78.2137 },
  { id: "merchant-25", value: "tirupur",      label: "Tirupur Union",              lat: 11.1085, lng: 77.3411 },
  { id: "merchant-26", value: "karur",        label: "Karur Union",                lat: 10.9601, lng: 78.0766 },
  { id: "merchant-28", value: "kallakurichi", label: "Kallakurichi Union",         lat: 11.7400, lng: 78.9600 },
  { id: "merchant-29", value: "nilgiris",     label: "Nilgiris Union",             lat: 11.4102, lng: 76.6950 },
  { id: "merchant-30", value: "pudukkottai",  label: "Pudukkottai Union",          lat: 10.3833, lng: 78.8001 },
  { id: "merchant-31", value: "thirupathur",  label: "Thirupathur Union",          lat: 12.5011, lng: 78.5686 },
  { id: "FED-MAD-01", value: "madhavaram", label: "Madhavaram Dairy", lat: 13.1482, lng: 80.2313 },
  { id: "FED-AMB-01", value: "ambattur", label: "Ambattur Dairy", lat: 13.1143, lng: 80.1548 },
  { id: "FED-SHL-01", value: "sholinganallur", label: "Sholinganallur Dairy", lat: 12.9017, lng: 80.2279 },
  { id: "FED-PROD-01", value: "products", label: "Products Dairy (Ambattur)", lat: 13.1143, lng: 80.1548 },
];

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function findNearestUnion(lat: number, lng: number): DistrictUnion {
  let nearest = DISTRICT_UNIONS[0];
  let minDistance = Infinity;
  
  for (const union of DISTRICT_UNIONS) {
    const distance = getDistanceKm(lat, lng, union.lat, union.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = union;
    }
  }
  return nearest;
}

interface LocationContextType {
  detectedLocation: { lat: number; lng: number } | null;
  detectedAddress: string;
  detectedUnion: DistrictUnion | null;
  isDetecting: boolean;
  locationError: string | null;
  refreshLocation: () => void;
  setManualUnion: (unionId: string) => void;
  isManualSelection: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [detectedLocation, setDetectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [detectedAddress, setDetectedAddress] = useState<string>('');
  const [detectedUnion, setDetectedUnion] = useState<DistrictUnion | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isManualSelection, setIsManualSelection] = useState(false);

  const setManualUnion = (unionId: string) => {
    const union = DISTRICT_UNIONS.find(u => u.id === unionId);
    if (union) {
      setDetectedUnion(union);
      setDetectedAddress(union.label);
      setIsManualSelection(true);
      setLocationError(null);
      setIsDetecting(false);
      // Save to localStorage to persist across page loads
      localStorage.setItem('selectedUnionId', unionId);
    }
  };

  const detectLocation = () => {
    setIsDetecting(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported");
      setIsDetecting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setDetectedLocation({ lat: latitude, lng: longitude });
        
        const nearestUnion = findNearestUnion(latitude, longitude);
        setDetectedUnion(nearestUnion);
        setDetectedAddress(nearestUnion.label);
        setIsDetecting(false);
      },
      (error) => {
        console.log("Geolocation error:", error.message);
        setLocationError("Could not detect location");
        setIsDetecting(false);
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  // Migrate any legacy UNI-* IDs stored in localStorage to the new merchant-* IDs
  const legacyToMerchant: Record<string, string> = {
    'UNI-CBE-01': 'merchant-2',  'UNI-SLM-01': 'merchant-3',
    'UNI-MDU-01': 'merchant-4',  'UNI-TRY-01': 'merchant-5',
    'UNI-TNJ-01': 'merchant-6',  'UNI-ERO-01': 'merchant-7',
    'UNI-TNV-01': 'merchant-8',  'UNI-VLR-01': 'merchant-9',
    'UNI-VPM-01': 'merchant-10', 'UNI-KTU-01': 'merchant-11',
    'UNI-TVM-01': 'merchant-12', 'UNI-CUD-01': 'merchant-13',
    'UNI-DGL-01': 'merchant-15', 'UNI-THN-01': 'merchant-16',
    'UNI-VNR-01': 'merchant-17', 'UNI-SVG-01': 'merchant-19',
    'UNI-TUT-01': 'merchant-20', 'UNI-KYK-01': 'merchant-21',
    'UNI-NKL-01': 'merchant-22', 'UNI-DPI-01': 'merchant-23',
    'UNI-KGI-01': 'merchant-24', 'UNI-TPR-01': 'merchant-25',
    'UNI-KRR-01': 'merchant-26', 'UNI-KAL-01': 'merchant-28',
    'UNI-NGR-01': 'merchant-29', 'UNI-PUD-01': 'merchant-30',
    'UNI-TPT-01': 'merchant-31',
  };

  useEffect(() => {
    // Check if user previously selected a union manually
    let savedUnionId = localStorage.getItem('selectedUnionId');
    // Migrate legacy UNI-* IDs to merchant-* IDs
    if (savedUnionId && legacyToMerchant[savedUnionId]) {
      savedUnionId = legacyToMerchant[savedUnionId];
      localStorage.setItem('selectedUnionId', savedUnionId);
    }
    if (savedUnionId) {
      const savedUnion = DISTRICT_UNIONS.find(u => u.id === savedUnionId);
      if (savedUnion) {
        setDetectedUnion(savedUnion);
        setDetectedAddress(savedUnion.label);
        setIsManualSelection(true);
        setIsDetecting(false);
        return; // Skip geolocation if user has a saved preference
      }
    }
    
    // Otherwise, try to detect location
    detectLocation();
  }, []);

  const refreshLocation = () => {
    detectLocation();
  };

  return (
    <LocationContext.Provider value={{
      detectedLocation,
      detectedAddress,
      detectedUnion,
      isDetecting,
      locationError,
      refreshLocation,
      setManualUnion,
      isManualSelection,
    }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
}
