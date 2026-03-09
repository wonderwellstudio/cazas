import type { Location } from '../data/locations';

export interface NormalizedLocation {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
}

export interface GlobeTarget {
  lat: number;
  lng: number;
  altitude: number;
}

export interface GlobePointDatum extends NormalizedLocation {
  altitude: number;
  radius: number;
  color: string;
}

const SPIKE_COLORS = ['#ffd166', '#ff8c42', '#ff4d6d', '#f72585'];
const MIN_POINT_ALTITUDE = 0.14;
const MAX_POINT_ALTITUDE = 0.42;
const POINT_RADIUS = 0.06;

function clampLatitude(lat: number): number {
  return Math.max(-90, Math.min(90, lat));
}

function normalizeLongitude(lng: number): number {
  const wrapped = ((lng + 180) % 360 + 360) % 360;
  return wrapped - 180;
}

export function normalizeLocation(location: Location): NormalizedLocation {
  return {
    id: location.id.trim().toLowerCase(),
    name: location.name.trim(),
    region: location.region.trim(),
    lat: clampLatitude(location.lat),
    lng: normalizeLongitude(location.lng),
  };
}

export function normalizeLocations(locations: Location[]): NormalizedLocation[] {
  return locations.map(normalizeLocation);
}

export function toGlobeTarget(
  location: NormalizedLocation,
  altitude = 1,
): GlobeTarget {
  return {
    lat: location.lat,
    lng: location.lng,
    altitude,
  };
}

export function toPointLayerData(
  locations: NormalizedLocation[],
): GlobePointDatum[] {
  return locations.map((location, index) => {
    const phase = (index * 0.91 + location.lat * 0.07 + location.lng * 0.02) % 1;
    const normalizedPhase = phase < 0 ? phase + 1 : phase;
    const altitude =
      MIN_POINT_ALTITUDE + (MAX_POINT_ALTITUDE - MIN_POINT_ALTITUDE) * normalizedPhase;

    return {
      ...location,
      altitude,
      radius: POINT_RADIUS,
      color: SPIKE_COLORS[index % SPIKE_COLORS.length],
    };
  });
}
