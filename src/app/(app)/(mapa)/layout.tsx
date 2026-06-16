import type { ReactNode } from "react";
import MapaShell from "@/components/MapaShell";

// Layout compartilhado das abas que usam o mapa (Mapa da Planta, CTOs, Postes…).
// O mapa vive aqui e PERSISTE ao trocar de aba — só o painel à esquerda muda.
export default function MapaLayout({ children }: { children: ReactNode }) {
  return <MapaShell>{children}</MapaShell>;
}
