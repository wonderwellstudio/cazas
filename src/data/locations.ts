export interface Location {
  id: string;
  name: string;
  location: string;
  description: string;
  bedrooms: number;
  bathrooms: number;
  imageUrl: string;
  region: string;
  lat: number;
  lng: number;
}

export interface FlightOrigin {
  name: string;
  lat: number;
  lng: number;
}

export const LOCATIONS: Location[] = [
  {
    id: 'casa-nopal-mx',
    name: 'Casa Nopal',
    location: 'San Miguel de Allende, Mexico',
    description: 'Colonial adobe with modern interior restoration',
    bedrooms: 4,
    bathrooms: 4,
    imageUrl:
      'https://images.unsplash.com/photo-1464890100898-a385f744067f?auto=format&fit=crop&w=1400&q=80',
    region: 'Mexico',
    lat: 20.915,
    lng: -100.743,
  },
  {
    id: 'casa-pacifica-mx',
    name: 'Casa Pacifica',
    location: 'Sayulita, Mexico',
    description: 'Coastal retreat with warm stone textures and courtyard light',
    bedrooms: 3,
    bathrooms: 2,
    imageUrl:
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=80',
    region: 'Mexico',
    lat: 20.868,
    lng: -105.441,
  },
  {
    id: 'villa-selva-mx',
    name: 'Villa Selva',
    location: 'Tulum, Mexico',
    description: 'Jungle-framed sanctuary built around an open-air plunge pool',
    bedrooms: 5,
    bathrooms: 5,
    imageUrl:
      'https://images.unsplash.com/photo-1600047509358-9dc75507daeb?auto=format&fit=crop&w=1400&q=80',
    region: 'Mexico',
    lat: 20.211,
    lng: -87.4654,
  },
  {
    id: 'casa-alba-mx',
    name: 'Casa Alba',
    location: 'Los Cabos, Mexico',
    description: 'Sea-facing estate with shaded terraces and sunset dining decks',
    bedrooms: 4,
    bathrooms: 3,
    imageUrl:
      'https://images.unsplash.com/photo-1613545325278-f24b0cae1224?auto=format&fit=crop&w=1400&q=80',
    region: 'Mexico',
    lat: 22.8905,
    lng: -109.9167,
  },
  {
    id: 'casa-luna-mx',
    name: 'Casa Luna',
    location: 'Mexico City, Mexico',
    description: 'Urban penthouse with curated art walls and rooftop garden views',
    bedrooms: 3,
    bathrooms: 3,
    imageUrl:
      'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1400&q=80',
    region: 'Mexico',
    lat: 19.4326,
    lng: -99.1332,
  },
  {
    id: 'casa-luz-pt',
    name: 'Casa Luz',
    location: 'Lisbon, Portugal',
    description: 'Historic townhouse revived with airy galleries and quiet courtyards',
    bedrooms: 4,
    bathrooms: 3,
    imageUrl:
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=80',
    region: 'Portugal',
    lat: 38.7223,
    lng: -9.1393,
  },
  {
    id: 'quinta-atlantica-pt',
    name: 'Quinta Atlantica',
    location: 'Cascais, Portugal',
    description: 'Cliffside modern villa with Atlantic panoramas and cedar interiors',
    bedrooms: 5,
    bathrooms: 4,
    imageUrl:
      'https://images.unsplash.com/photo-1605146769289-440113cc3d00?auto=format&fit=crop&w=1400&q=80',
    region: 'Portugal',
    lat: 38.6979,
    lng: -9.4215,
  },
  {
    id: 'casa-ribeira-pt',
    name: 'Casa Ribeira',
    location: 'Porto, Portugal',
    description: 'Riverside residence blending old-stone envelopes and contemporary calm',
    bedrooms: 3,
    bathrooms: 3,
    imageUrl:
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1400&q=80',
    region: 'Portugal',
    lat: 41.1579,
    lng: -8.6291,
  },
  {
    id: 'villa-solara-pt',
    name: 'Villa Solara',
    location: 'Faro, Portugal',
    description: 'Algarve retreat with limestone patios and fragrant citrus gardens',
    bedrooms: 4,
    bathrooms: 4,
    imageUrl:
      'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1400&q=80',
    region: 'Portugal',
    lat: 37.0194,
    lng: -7.9304,
  },
  {
    id: 'casa-douro-pt',
    name: 'Casa Douro',
    location: 'Coimbra, Portugal',
    description: 'Hillside home with private library loft and vineyard-facing decks',
    bedrooms: 4,
    bathrooms: 3,
    imageUrl:
      'https://images.unsplash.com/photo-1600607687644-c7171b42498f?auto=format&fit=crop&w=1400&q=80',
    region: 'Portugal',
    lat: 40.2033,
    lng: -8.4103,
  },
  {
    id: 'villa-kyma-gr',
    name: 'Villa Kyma',
    location: 'Mykonos, Greece',
    description: 'Aegean cliff retreat with whitewashed arches and wind-swept terraces',
    bedrooms: 5,
    bathrooms: 5,
    imageUrl:
      'https://images.unsplash.com/photo-1612965607446-25e1332775ae?auto=format&fit=crop&w=1400&q=80',
    region: 'Greece',
    lat: 37.4467,
    lng: 25.3289,
  },
  {
    id: 'casa-thira-gr',
    name: 'Casa Thira',
    location: 'Santorini, Greece',
    description: 'Caldera-view hideaway with carved suites and blue-horizon decks',
    bedrooms: 3,
    bathrooms: 3,
    imageUrl:
      'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1400&q=80',
    region: 'Greece',
    lat: 36.3932,
    lng: 25.4615,
  },
  {
    id: 'villa-lyra-gr',
    name: 'Villa Lyra',
    location: 'Athens, Greece',
    description: 'Acropolis-adjacent townhouse balancing marble craft and modern ease',
    bedrooms: 4,
    bathrooms: 3,
    imageUrl:
      'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=1400&q=80',
    region: 'Greece',
    lat: 37.9838,
    lng: 23.7275,
  },
  {
    id: 'casa-crete-gr',
    name: 'Casa Crete',
    location: 'Heraklion, Greece',
    description: 'Olive-grove estate with shaded pergolas and sea-breeze courtyards',
    bedrooms: 4,
    bathrooms: 4,
    imageUrl:
      'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1400&q=80',
    region: 'Greece',
    lat: 35.3387,
    lng: 25.1442,
  },
  {
    id: 'casa-thess-gr',
    name: 'Casa Thess',
    location: 'Thessaloniki, Greece',
    description: 'Harborfront apartment with soft brass finishes and panoramic lounges',
    bedrooms: 3,
    bathrooms: 2,
    imageUrl:
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=80',
    region: 'Greece',
    lat: 40.6401,
    lng: 22.9444,
  },
  {
    id: 'palazzo-luce-it',
    name: 'Palazzo Luce',
    location: 'Rome, Italy',
    description: 'Historic palazzo residence with fresco ceilings and garden salon',
    bedrooms: 4,
    bathrooms: 4,
    imageUrl:
      'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=80',
    region: 'Italy',
    lat: 41.9028,
    lng: 12.4964,
  },
  {
    id: 'villa-brera-it',
    name: 'Villa Brera',
    location: 'Milan, Italy',
    description: 'Design-forward city villa with sculptural interiors and courtyard light',
    bedrooms: 3,
    bathrooms: 3,
    imageUrl:
      'https://images.unsplash.com/photo-1600607687126-8a3414349a51?auto=format&fit=crop&w=1400&q=80',
    region: 'Italy',
    lat: 45.4642,
    lng: 9.19,
  },
  {
    id: 'casa-firenze-it',
    name: 'Casa Firenze',
    location: 'Florence, Italy',
    description: 'Renaissance-era apartment restored with contemporary warmth',
    bedrooms: 3,
    bathrooms: 2,
    imageUrl:
      'https://images.unsplash.com/photo-1600047509358-9dc75507daeb?auto=format&fit=crop&w=1400&q=80',
    region: 'Italy',
    lat: 43.7696,
    lng: 11.2558,
  },
  {
    id: 'villa-vesuvio-it',
    name: 'Villa Vesuvio',
    location: 'Naples, Italy',
    description: 'Bay-view home with layered stone terraces and citrus courtyard',
    bedrooms: 5,
    bathrooms: 4,
    imageUrl:
      'https://images.unsplash.com/photo-1600585153490-76fb20a32601?auto=format&fit=crop&w=1400&q=80',
    region: 'Italy',
    lat: 40.8518,
    lng: 14.2681,
  },
  {
    id: 'palazzo-laguna-it',
    name: 'Palazzo Laguna',
    location: 'Venice, Italy',
    description: 'Canal-edge residence with private dock and silk-toned interiors',
    bedrooms: 4,
    bathrooms: 3,
    imageUrl:
      'https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?auto=format&fit=crop&w=1400&q=80',
    region: 'Italy',
    lat: 45.4408,
    lng: 12.3155,
  },
];

export const PRIMARY_TARGET_ID = 'casa-nopal-mx';

const GLOBAL_FLIGHT_ORIGINS: FlightOrigin[] = [
  { name: 'New York', lat: 40.7128, lng: -74.006 },
  { name: 'Toronto', lat: 43.6532, lng: -79.3832 },
  { name: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
  { name: 'Chicago', lat: 41.8781, lng: -87.6298 },
  { name: 'Sao Paulo', lat: -23.5505, lng: -46.6333 },
  { name: 'Buenos Aires', lat: -34.6037, lng: -58.3816 },
  { name: 'London', lat: 51.5072, lng: -0.1276 },
  { name: 'Paris', lat: 48.8566, lng: 2.3522 },
  { name: 'Madrid', lat: 40.4168, lng: -3.7038 },
  { name: 'Dubai', lat: 25.2048, lng: 55.2708 },
  { name: 'Doha', lat: 25.2854, lng: 51.531 },
  { name: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { name: 'Tokyo', lat: 35.6764, lng: 139.65 },
  { name: 'Seoul', lat: 37.5665, lng: 126.978 },
  { name: 'Sydney', lat: -33.8688, lng: 151.2093 },
  { name: 'Johannesburg', lat: -26.2041, lng: 28.0473 },
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getLocationFlightOrigins(locationId: string): FlightOrigin[] {
  const total = GLOBAL_FLIGHT_ORIGINS.length;
  if (total === 0) {
    return [];
  }

  const desiredCount = Math.min(7, total);
  const seed = hashString(locationId.trim().toLowerCase());
  const scored = GLOBAL_FLIGHT_ORIGINS.map((origin, index) => ({
    origin,
    // Deterministic pseudo-random ordering per location id.
    score: (seed ^ ((index + 1) * 2654435761)) >>> 0,
  }));

  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, desiredCount).map((entry) => entry.origin);
}
