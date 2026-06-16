import { appQuery } from "@/lib/appdb";

export interface Stats {
  ctos: number;
  ctosGeo: number;
  postes: number;
  ceos: number;
  cabos: number;
  caboKm: number;
}

export async function getStats(): Promise<Stats> {
  const [r] = await appQuery<{
    ctos: number;
    ctos_geo: number;
    postes: number;
    ceos: number;
    cabos: number;
    cabo_m: number;
  }>(`SELECT
        (SELECT COUNT(*) FROM cto)::int                          AS ctos,
        (SELECT COUNT(*) FROM cto WHERE geom IS NOT NULL)::int   AS ctos_geo,
        (SELECT COUNT(*) FROM poste)::int                        AS postes,
        (SELECT COUNT(*) FROM ceo)::int                          AS ceos,
        (SELECT COUNT(*) FROM cabo)::int                         AS cabos,
        (SELECT COALESCE(SUM(comprimento_m), 0) FROM cabo)::float8 AS cabo_m`);
  return {
    ctos: r.ctos,
    ctosGeo: r.ctos_geo,
    postes: r.postes,
    ceos: r.ceos,
    cabos: r.cabos,
    caboKm: r.cabo_m / 1000,
  };
}
