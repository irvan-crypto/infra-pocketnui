export interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'origin' | 'plant';
}

// Koordinat pelabuhan asal
export const ORIGIN_PORTS: Location[] = [
  {
    id: 'biringkassi',
    name: 'Pelabuhan Biringkassi',
    lat: -4.8175,
    lng: 119.4833,
    type: 'origin',
  },
  {
    id: 'tuban',
    name: 'Pelabuhan Tuban',
    lat: -6.7816,
    lng: 111.8964,
    type: 'origin',
  },
];

export const PORTS = ORIGIN_PORTS;

// Koordinat Packing Plant
export const PLANTS: Location[] = [
  { id: 'bitung', name: 'PP. Bitung', lat: 1.4428, lng: 125.1962, type: 'plant' },
  { id: 'palu', name: 'PP. Palu', lat: -0.6901, lng: 119.8290, type: 'plant' },
  { id: 'mamuju', name: 'PP. Mamuju', lat: -2.4824, lng: 119.1238, type: 'plant' },
  { id: 'kendari', name: 'PP. Kendari', lat: -4.1592, lng: 122.7006, type: 'plant' },
  { id: 'samarinda', name: 'PP. Samarinda', lat: -0.5584, lng: 117.1748, type: 'plant' },
  { id: 'balikpapan', name: 'PP. Balikpapan', lat: -1.1558, lng: 116.7822, type: 'plant' },
  { id: 'banjarmasin', name: 'PP. Banjarmasin', lat: -3.3019, lng: 114.5681, type: 'plant' },
  { id: 'lembar', name: 'PP. Lembar', lat: -8.6708, lng: 116.0720, type: 'plant' },
  { id: 'ambon', name: 'PP. Ambon', lat: -3.7014, lng: 128.1634, type: 'plant' },
  { id: 'oba', name: 'PP. Oba', lat: 0.7122, lng: 127.5488, type: 'plant' },
  { id: 'sorong', name: 'PP. Sorong', lat: -1.0301, lng: 131.2416, type: 'plant' },
];

export const ALL_LOCATIONS: Location[] = [...ORIGIN_PORTS, ...PLANTS];

export function getLocationById(id: string): Location | undefined {
  return ALL_LOCATIONS.find((loc) => loc.id === id);
}

export function getLocationByName(name: string): Location | undefined {
  return ALL_LOCATIONS.find(
    (loc) => loc.name.toLowerCase() === name.toLowerCase()
  );
}