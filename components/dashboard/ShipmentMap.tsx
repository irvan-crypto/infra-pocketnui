"use client";

import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn, formatDateIndonesian } from "@/lib/utils";
import { SHIP_STATUS_LABELS, SHIP_STATUS_COLORS, SHIP_STATUS_ICONS, type ShipStatusKey } from "@/lib/app-config";
import { PORTS, PLANTS, type Location } from "@/lib/coordinates";
import { getSeaRoute, estimateRouteHours, pointAlongRoute } from "@/lib/sea-routes";

// Fix Leaflet default icon issue
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon.src,
  shadowUrl: iconShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Small deterministic offset for ships at same port/plant to avoid overlap
function getPortOffset(id: string, baseLat: number, baseLng: number): [number, number] {
  // Simple hash -> 0..1
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xFFFFFFFF;
  }
  // Use two different seeds for lat and lng offset
  const latSeed = ((hash >> 0) & 0xFFFF) / 0xFFFF;
  const lngSeed = ((hash >> 16) & 0xFFFF) / 0xFFFF;
  // Offset 200 m - 1 km agar icon kapal (+label 48px) tidak menumpuk dengan marker
  // pelabuhan/plant (28px), namun tetap dekat kawasan pelabuhan/plant.
  // 200 m ≈ 0.0018°, 1 km ≈ 0.009°.
  const minOffset = 0.0018;
  const spread = 0.0072; // maxOffset = minOffset + spread ≈ 0.009 (1 km)
  // Arah acak 0..2π, jarak acak minOffset..(minOffset+spread)
  const angle = latSeed * Math.PI * 2;
  const dist = minOffset + lngSeed * spread;
  const latOffset = Math.sin(angle) * dist;
  const lngOffset = Math.cos(angle) * dist;
  return [baseLat + latOffset, baseLng + lngOffset];
}

// Custom ship icon with animation and optional label (nama kapal)
const createShipIcon = (status: ShipStatusKey, isAnimating: boolean = false, label?: string) => {
  const color = status === "td_pelabuhan" ? "#8b5cf6" :
                status === "ta_pp" ? "#10b981" :
                status === "ta_tiba" ? "#3b82f6" :
                status === "sandar" ? "#f59e0b" :
                status === "muat" ? "#f97316" : "#6b7280";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="14" fill="${color}" opacity="0.2" />
      <circle cx="16" cy="16" r="10" fill="${color}" opacity="0.5" />
      <circle cx="16" cy="16" r="6" fill="${color}" stroke="white" stroke-width="2" />
      ${isAnimating ? `<circle cx="16" cy="16" r="16" fill="none" stroke="${color}" stroke-width="2" opacity="0.6">
        <animate attributeName="r" from="12" to="20" dur="1.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.8" to="0" dur="1.5s" repeatCount="indefinite" />
      </circle>` : ""}
      <text x="16" y="19" font-size="10" text-anchor="middle" fill="white" font-weight="bold">🚢</text>
    </svg>
  `;

  const labelHtml = label
    ? `<div class="ship-name-container" style="--ship-color: ${color}">
        <div class="ship-name-label">${label}</div>
      </div>`
    : "";

  // Total tinggi = 25px (label di atas) + 48px (icon). Anchor di tengah icon.
  const totalHeight = label ? 73 : 48;

  return L.divIcon({
    html: `<div class="ship-marker-inner">
      ${labelHtml}
      ${svg}
    </div>`,
    className: "ship-marker",
    iconSize: [label ? 120 : 48, totalHeight],
    iconAnchor: [label ? 60 : 24, label ? 49 : 24], // anchor di tengah icon kapal
    popupAnchor: [0, -26],
  });
};

interface Shipment {
  id: string;
  nama_kapal: string;
  nama_vendor: string;
  type_muatan: string;
  muatan_ton: number;
  tujuan_pp: string;
  pelabuhan_asal: string;
  ta_tiba: string | null;
  sandar: string | null;
  muat: string | null;
  selesai_muat: string | null;
  td_pelabuhan: string | null;
  ta_pp: string | null;
}

interface ShipmentMapProps {
  shipments: Shipment[];
}

function getLatestStatus(shipment: Shipment): { status: ShipStatusKey; timestamp: string | null } {
  const statusFields: { key: ShipStatusKey; value: string | null }[] = [
    { key: "ta_tiba", value: shipment.ta_tiba },
    { key: "sandar", value: shipment.sandar },
    { key: "muat", value: shipment.muat },
    { key: "selesai_muat", value: shipment.selesai_muat },
    { key: "td_pelabuhan", value: shipment.td_pelabuhan },
    { key: "ta_pp", value: shipment.ta_pp },
  ];

  let latest: { key: ShipStatusKey; value: string | null } | null = null;
  let latestDate: Date | null = null;

  for (const field of statusFields) {
    if (field.value) {
      const date = new Date(field.value);
      if (!latestDate || date > latestDate) {
        latestDate = date;
        latest = field;
      }
    }
  }

  if (latest) {
    return { status: latest.key, timestamp: latest.value };
  }
  return { status: "ta_tiba", timestamp: null };
}

function getShipPosition(shipment: Shipment): { lat: number; lng: number } | null {
  const { status, timestamp } = getLatestStatus(shipment);

  if (status === "td_pelabuhan") {
    const seaRoute = getSeaRoute(shipment.pelabuhan_asal, shipment.tujuan_pp);
    if (seaRoute && seaRoute.length >= 2) {
      // Progress = jam berlayar sejak "td_pelabuhan" ÷ estimasi total durasi
      const totalHours = estimateRouteHours(seaRoute);
      const elapsedHours = timestamp
        ? (Date.now() - new Date(timestamp).getTime()) / 3_600_000
        : 0;
      const progress = totalHours > 0 ? elapsedHours / totalHours : 0.5;
      const [lat, lng] = pointAlongRoute(seaRoute, progress);
      return { lat, lng };
    }
    const origin = PORTS.find(p => p.name === shipment.pelabuhan_asal);
    const destination = PLANTS.find(p => p.name === shipment.tujuan_pp);
    if (origin && destination) {
      return {
        lat: (origin.lat + destination.lat) / 2,
        lng: (origin.lng + destination.lng) / 2,
      };
    }
    return null;
  }

  if (status === "ta_tiba" || status === "sandar" || status === "muat" || status === "selesai_muat") {
    const origin = PORTS.find(p => p.name === shipment.pelabuhan_asal);
    if (origin) {
      const [lat, lng] = getPortOffset(shipment.id, origin.lat, origin.lng);
      return { lat, lng };
    }
    return null;
  }

  if (status === "ta_pp") {
    const destination = PLANTS.find(p => p.name === shipment.tujuan_pp);
    if (destination) {
      const [lat, lng] = getPortOffset(shipment.id, destination.lat, destination.lng);
      return { lat, lng };
    }
    return null;
  }

  return null;
}

function ShipMarker({ shipment }: { shipment: Shipment }) {
  const { status, timestamp } = getLatestStatus(shipment);
  const position = getShipPosition(shipment);
  const isAnimating = status === "td_pelabuhan";

  if (!position) return null;

  const icon = createShipIcon(status, isAnimating, shipment.nama_kapal);
  const statusLabel = SHIP_STATUS_LABELS[status] || status;
  const statusColor = SHIP_STATUS_COLORS[status] || "bg-gray-100 text-gray-800";
  const statusIcon = SHIP_STATUS_ICONS[status] || "🚢";

  // Info perjalanan (progress + ETA) khusus saat kapal di laut
  let travelInfo: { percent: number; eta: string | null; totalHours: number } | null = null;
  if (status === "td_pelabuhan") {
    const seaRoute = getSeaRoute(shipment.pelabuhan_asal, shipment.tujuan_pp);
    if (seaRoute && seaRoute.length >= 2 && timestamp) {
      const totalHours = estimateRouteHours(seaRoute);
      const elapsedHours = (Date.now() - new Date(timestamp).getTime()) / 3_600_000;
      const percent = Math.min(Math.max(elapsedHours / totalHours, 0), 1) * 100;
      const etaDate = new Date(new Date(timestamp).getTime() + totalHours * 3_600_000);
      travelInfo = {
        percent,
        totalHours,
        eta: formatDateIndonesian(etaDate.toISOString()),
      };
    }
  }

  return (
    <Marker position={[position.lat, position.lng]} icon={icon}>
      <Popup className="ship-popup">
        <div className="p-2 min-w-[200px]">
          <div className="font-bold text-sm">{shipment.nama_kapal}</div>
          <div className="text-xs text-gray-500">{shipment.nama_vendor}</div>
          <div className="mt-1 flex items-center gap-1">
            <span>{statusIcon}</span>
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColor)}>
              {statusLabel}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Muatan: {shipment.muatan_ton.toLocaleString("id-ID")} ton
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {shipment.pelabuhan_asal} → {shipment.tujuan_pp}
          </div>
          {timestamp && (
            <div className="text-xs text-gray-400 mt-1">
              {formatDateIndonesian(timestamp)}
            </div>
          )}
          {travelInfo && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <div className="text-xs text-gray-500 mb-1">
                Progress: <span className="font-semibold text-violet-600">{travelInfo.percent.toFixed(0)}%</span>
                <span className="text-gray-400"> / ~{travelInfo.totalHours.toFixed(0)} jam</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500" style={{ width: `${travelInfo.percent}%` }} />
              </div>
              {travelInfo.eta && (
                <div className="text-xs text-gray-400 mt-1">
                  ETA PP: <span className="font-medium text-emerald-600">{travelInfo.eta}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

function ShipmentRoute({ shipment }: { shipment: Shipment }) {
  const positions = useMemo<[number, number][]>(() => {
    // Prioritas 1: jalur laut (menyusuri selat/laut, tidak menembus daratan)
    const seaRoute = getSeaRoute(shipment.pelabuhan_asal, shipment.tujuan_pp);
    if (seaRoute && seaRoute.length >= 2) return seaRoute;

    // Fallback: garis lurus bila rute laut belum terdaftar
    const origin = PORTS.find((p) => p.name === shipment.pelabuhan_asal);
    const destination = PLANTS.find((p) => p.name === shipment.tujuan_pp);
    if (!origin || !destination) return [];
    return [
      [origin.lat, origin.lng],
      [destination.lat, destination.lng],
    ];
  }, [shipment.pelabuhan_asal, shipment.tujuan_pp]);

  if (positions.length < 2) return null;

  return (
    <Polyline
      positions={positions}
      pathOptions={{
        color: "#c084fc",
        weight: 1.5,
        opacity: 0.9,
        dashArray: "8 8",
        lineCap: "round",
        lineJoin: "round",
      }}
      className="route-line"
    />
  );
}

function FitBounds() {
  const map = useMap();

  const bounds = useMemo(() => {
    const allLocations = [...PORTS, ...PLANTS];
    if (allLocations.length === 0) return null;
    const first = [allLocations[0].lat, allLocations[0].lng] as [number, number];
    const rest = allLocations.slice(1).map(l => [l.lat, l.lng] as [number, number]);
    return L.latLngBounds([first, ...rest]);
  }, []);

  useEffect(() => {
    if (!bounds) return;
    map.fitBounds(bounds, { padding: [15, 15], maxZoom: 7 });
  }, [bounds, map]);

  return null;
}

export default function ShipmentMap({ shipments }: ShipmentMapProps) {
  const [center] = useState<[number, number]>([-3.0, 118.0]); // Center of Indonesia
  const [isClient, setIsClient] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Re-render tiap 60 detik agar posisi kapal bergerak mengikuti waktu nyata
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!isClient) {
    return <div className="h-[600px] w-full bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">Loading peta...</div>;
  }

  return (
    <div className="w-full h-[600px] rounded-xl overflow-hidden border border-gray-200 shadow-sm relative isolate z-0">
      <MapContainer
        center={center}
        zoom={5}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        attributionControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          subdomains="abc"
          maxZoom={19}
        />

        {/* Port Markers */}
        {PORTS.map((port) => (
          <Marker
            key={port.name}
            position={[port.lat, port.lng]}
            icon={L.divIcon({
              html: `<div class="w-7 h-7 bg-blue-600 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-xs font-bold">⛴</div>`,
              className: "port-marker",
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            })}
          >
            <Popup>
              <div className="font-bold text-sm">{port.name}</div>
              <div className="text-xs text-gray-500">Pelabuhan Asal</div>
            </Popup>
          </Marker>
        ))}

        {/* Plant Markers */}
        {PLANTS.map((plant) => (
          <Marker
            key={plant.name}
            position={[plant.lat, plant.lng]}
            icon={L.divIcon({
              html: `<div class="w-7 h-7 bg-green-600 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-xs font-bold">🏭</div>`,
              className: "plant-marker",
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            })}
          >
            <Popup>
              <div className="font-bold text-sm">{plant.name}</div>
              <div className="text-xs text-gray-500">Packing Plant</div>
            </Popup>
          </Marker>
        ))}

        {/* Route Lines: Pelabuhan Asal -> Packing Plant Tujuan */}
        {shipments.map((shipment) => (
          <ShipmentRoute key={`route-${shipment.id}`} shipment={shipment} />
        ))}

        {/* Ship Markers */}
        {shipments.map((shipment) => (
          <ShipMarker key={shipment.id} shipment={shipment} />
        ))}

        <FitBounds />
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3 text-xs border border-gray-200 z-[1000]">
        <div className="font-semibold text-gray-700 mb-1">Legenda</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-blue-600 rounded-full"></span> Pelabuhan Asal</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-green-600 rounded-full"></span> Packing Plant</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-amber-500 rounded-full"></span> Kapal (aktif)</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-gray-400 rounded-full opacity-60"></span> Kapal (selesai)</div>

      </div>
    </div>
  );
}