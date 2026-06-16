/**
 * Normaliza o `map_ll` do SGP (`netcore_splitter.map_ll`), que vem como texto
 * bagunçado: separador vírgula/barra/ponto-e-vírgula, sinal de menos faltando,
 * às vezes em DMS. Força o hemisfério do RN (lat/lng negativos) e valida a faixa.
 *
 * Reaproveitado do netgo-bi (lib/queries/rede-cto.ts). Útil para IMPORTAR as
 * ~27% de CTOs que já têm coordenada no SGP como ponto de partida do cto_geo.
 *
 * Retorna null quando não dá para extrair um par lat/lng confiável.
 */
export function parseLL(raw: string | null): { lat: number; lng: number } | null {
  if (!raw) return null;
  const s = raw.trim();
  if (s === "" || s.includes("°") || s.includes("'")) return null; // descarta DMS
  const norm = s.replace(/\//g, ",").replace(/;/g, ",");
  const parts = norm.split(",").map((x) => x.trim()).filter((x) => x !== "");
  if (parts.length < 2) return null;
  let lat = Number.parseFloat(parts[0]);
  let lng = Number.parseFloat(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  lat = -Math.abs(lat); // RN: sul/oeste
  lng = -Math.abs(lng);
  if (Math.abs(lat) < 4 || Math.abs(lat) > 8) return null;
  if (Math.abs(lng) < 33 || Math.abs(lng) > 39) return null;
  return { lat, lng };
}
