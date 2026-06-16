"use client";

import { MapContainer, TileLayer, CircleMarker, Tooltip, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Cto } from "@/lib/cto";

function ClickCapture({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export interface PlantaMapProps {
  ctos: Cto[];
  selectedId: number | null;
  pending: { lat: number; lng: number } | null;
  onMapClick: (lat: number, lng: number) => void;
  onSelectCto: (id: number) => void;
}

// Natal/RN — centro aproximado da operação.
const CENTRO: [number, number] = [-5.79, -35.21];

export default function PlantaMap({
  ctos,
  selectedId,
  pending,
  onMapClick,
  onSelectCto,
}: PlantaMapProps) {
  return (
    <MapContainer center={CENTRO} zoom={12} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <ClickCapture onClick={onMapClick} />

      {ctos
        .filter((c) => c.lat != null && c.lng != null)
        .map((c) => (
          <CircleMarker
            key={c.id}
            center={[c.lat as number, c.lng as number]}
            radius={7}
            pathOptions={{
              color: c.id === selectedId ? "#2563eb" : "#16a34a",
              fillColor: c.id === selectedId ? "#2563eb" : "#16a34a",
              fillOpacity: 0.85,
              weight: 2,
            }}
            eventHandlers={{ click: () => onSelectCto(c.id) }}
          >
            <Tooltip>{c.codigo}</Tooltip>
          </CircleMarker>
        ))}

      {pending && (
        <CircleMarker
          center={[pending.lat, pending.lng]}
          radius={9}
          pathOptions={{ color: "#dc2626", fillColor: "#dc2626", fillOpacity: 0.9, weight: 2 }}
        >
          <Tooltip permanent>nova CTO aqui</Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  );
}
