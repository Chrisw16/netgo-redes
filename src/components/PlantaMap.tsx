"use client";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
  Tooltip,
  useMapEvents,
} from "react-leaflet";
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

export interface LinhaMapa {
  id: number;
  codigo: string | null;
  coords: [number, number][];
}

export interface CamadaLinha {
  chave: string;
  cor: string;
  itens: LinhaMapa[];
}

export interface MapaProps {
  camadas: CamadaMapa[];
  linhas?: CamadaLinha[];
  /** Camada de PONTOS com prioridade de clique / por cima e destacada. */
  pontoAtivo?: string | null;
  /** Camada de LINHAS destacada. */
  linhaAtiva?: string | null;
  selecionado?: { camada: string; id: number } | null;
  pending?: { lat: number; lng: number } | null;
  /** Linha em construção (desenho do cabo), tracejada. */
  pendingLine?: [number, number][] | null;
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

const CENTRO: [number, number] = [-5.79, -35.21];

export default function PlantaMap({
  camadas,
  linhas,
  pontoAtivo,
  linhaAtiva,
  selecionado,
  pending,
  pendingLine,
  onMapClick,
  onSelect,
}: MapaProps) {
  const ordenadas = [...camadas].sort((a, b) =>
    a.chave === pontoAtivo ? 1 : b.chave === pontoAtivo ? -1 : 0,
  );

  return (
    <MapContainer center={CENTRO} zoom={12} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <ClickCapture onClick={onMapClick} />

      {/* Linhas (cabos) — desenhadas embaixo dos pontos */}
      {(linhas ?? []).flatMap((cam) => {
        const ehAtiva = cam.chave === linhaAtiva;
        return cam.itens
          .filter((l) => l.coords.length >= 2)
          .map((l) => {
            const sel = selecionado?.camada === cam.chave && selecionado?.id === l.id;
            return (
              <Polyline
                key={`${cam.chave}-${l.id}`}
                positions={l.coords}
                pathOptions={{
                  color: sel ? "#2f6bff" : cam.cor,
                  weight: sel ? 6 : ehAtiva ? 5 : 3,
                  opacity: 0.9,
                }}
                eventHandlers={{ click: () => onSelect?.(cam.chave, l.id) }}
              >
                <Tooltip>{l.codigo || "(sem código)"}</Tooltip>
              </Polyline>
            );
          });
      })}

      {/* Pontos (CTOs, postes) */}
      {ordenadas.flatMap((cam) => {
        const ehAtiva = cam.chave === pontoAtivo;
        return cam.pontos
          .filter((p) => p.lat != null && p.lng != null)
          .map((p) => {
            const sel = selecionado?.camada === cam.chave && selecionado?.id === p.id;
            return (
              <CircleMarker
                key={`${cam.chave}-${p.id}`}
                center={[p.lat as number, p.lng as number]}
                radius={sel ? 9 : ehAtiva ? 7 : 5}
                pathOptions={{
                  color: sel ? "#2f6bff" : ehAtiva ? "#ffffff" : cam.cor,
                  fillColor: cam.cor,
                  fillOpacity: ehAtiva || sel ? 0.95 : 0.7,
                  weight: ehAtiva || sel ? 2.5 : 1,
                }}
                eventHandlers={{ click: () => onSelect?.(cam.chave, p.id) }}
              >
                <Tooltip>{p.codigo || "(sem código)"}</Tooltip>
              </CircleMarker>
            );
          });
      })}

      {/* Linha em construção (desenho do cabo) */}
      {pendingLine && pendingLine.length >= 2 && (
        <Polyline
          positions={pendingLine}
          pathOptions={{ color: "#dc2626", weight: 4, opacity: 0.9, dashArray: "6 6" }}
        />
      )}
      {pendingLine?.map(([lat, lng], i) => (
        <CircleMarker
          key={`pl-${i}`}
          center={[lat, lng]}
          radius={4}
          pathOptions={{ color: "#dc2626", fillColor: "#dc2626", fillOpacity: 1, weight: 1 }}
        />
      ))}

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
