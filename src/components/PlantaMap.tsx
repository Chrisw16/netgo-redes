"use client";

import { MapContainer, TileLayer, CircleMarker, Tooltip, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export interface PontoMapa {
  id: number;
  lat: number | null;
  lng: number | null;
  codigo: string | null;
}

export interface CamadaMapa {
  chave: string;
  pontos: PontoMapa[];
  cor: string;
}

export interface MapaProps {
  camadas: CamadaMapa[];
  selecionado?: { camada: string; id: number } | null;
  pending?: { lat: number; lng: number } | null;
  onMapClick?: (lat: number, lng: number) => void;
  onSelect?: (camada: string, id: number) => void;
}

function ClickCapture({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Natal/RN — centro aproximado da operação.
const CENTRO: [number, number] = [-5.79, -35.21];

export default function PlantaMap({
  camadas,
  selecionado,
  pending,
  onMapClick,
  onSelect,
}: MapaProps) {
  return (
    <MapContainer center={CENTRO} zoom={12} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <ClickCapture onClick={onMapClick} />

      {camadas.flatMap((cam) =>
        cam.pontos
          .filter((p) => p.lat != null && p.lng != null)
          .map((p) => {
            const ativo = selecionado?.camada === cam.chave && selecionado?.id === p.id;
            return (
              <CircleMarker
                key={`${cam.chave}-${p.id}`}
                center={[p.lat as number, p.lng as number]}
                radius={ativo ? 9 : 7}
                pathOptions={{
                  color: ativo ? "#2f6bff" : cam.cor,
                  fillColor: ativo ? "#2f6bff" : cam.cor,
                  fillOpacity: 0.85,
                  weight: 2,
                }}
                eventHandlers={{ click: () => onSelect?.(cam.chave, p.id) }}
              >
                <Tooltip>{p.codigo || "(sem código)"}</Tooltip>
              </CircleMarker>
            );
          }),
      )}

      {pending && (
        <CircleMarker
          center={[pending.lat, pending.lng]}
          radius={9}
          pathOptions={{ color: "#dc2626", fillColor: "#dc2626", fillOpacity: 0.9, weight: 2 }}
        >
          <Tooltip permanent>novo aqui</Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  );
}
