import ExifReader from 'exifreader';

export interface GeoPhotoData {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp?: string;
  hasGeoData: boolean;
}

function convertDMSToDD(dmsTag: any): number | null {
  if (!dmsTag) return null;
  if (typeof dmsTag.description === 'number') return dmsTag.description;
  if (typeof dmsTag.description === 'string') {
    const val = parseFloat(dmsTag.description);
    if (!isNaN(val)) return val;
  }
  if (Array.isArray(dmsTag.value)) {
    const parts = dmsTag.value;
    if (parts.length >= 3) {
      const deg = Array.isArray(parts[0]) ? parts[0][0] / parts[0][1] : parts[0];
      const min = Array.isArray(parts[1]) ? parts[1][0] / parts[1][1] : parts[1];
      const sec = Array.isArray(parts[2]) ? parts[2][0] / parts[2][1] : parts[2];
      return deg + min / 60 + sec / 3600;
    }
  }
  return null;
}

export async function extractGeoFromPhoto(file: File): Promise<GeoPhotoData | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const tags = ExifReader.load(arrayBuffer, { expanded: true });

    const gps = tags.gps;

    if (gps && gps.Latitude !== undefined && gps.Longitude !== undefined) {
      let timestamp: string | undefined;
      if (tags.exif?.DateTimeOriginal?.description) {
        timestamp = tags.exif.DateTimeOriginal.description;
      } else if (tags.exif?.DateTime?.description) {
        timestamp = tags.exif.DateTime.description;
      }

      return {
        latitude: gps.Latitude,
        longitude: gps.Longitude,
        altitude: gps.Altitude,
        timestamp,
        hasGeoData: true,
      };
    }

    const exif = tags.exif || tags;
    const latTag = (exif as any)?.GPSLatitude;
    const lngTag = (exif as any)?.GPSLongitude;
    const latRef = (exif as any)?.GPSLatitudeRef?.value?.[0] || (exif as any)?.GPSLatitudeRef?.description || 'N';
    const lngRef = (exif as any)?.GPSLongitudeRef?.value?.[0] || (exif as any)?.GPSLongitudeRef?.description || 'E';

    if (latTag && lngTag) {
      let lat = convertDMSToDD(latTag);
      let lng = convertDMSToDD(lngTag);

      if (lat !== null && lng !== null) {
        if (latRef === 'S') lat = -lat;
        if (lngRef === 'W') lng = -lng;

        let timestamp: string | undefined;
        const dtTag = (exif as any)?.DateTimeOriginal || (exif as any)?.DateTime;
        if (dtTag?.description) timestamp = dtTag.description;

        const altTag = (exif as any)?.GPSAltitude;
        let altitude: number | undefined;
        if (altTag) {
          altitude = typeof altTag.description === 'number' ? altTag.description : parseFloat(altTag.description);
        }

        return {
          latitude: lat,
          longitude: lng,
          altitude: isNaN(altitude as number) ? undefined : altitude,
          timestamp,
          hasGeoData: true,
        };
      }
    }

    return { latitude: 0, longitude: 0, hasGeoData: false };
  } catch (error) {
    console.error('EXIF extraction error:', error);
    return null;
  }
}
