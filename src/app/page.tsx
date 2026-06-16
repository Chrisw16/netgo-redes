import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-2xl font-semibold">NetGo Redes</h1>
        <p className="mt-1 text-gray-600">
          Documentação da infraestrutura de rede — postes, cabos, CTOs, CEOs e fusões.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/planta"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Abrir Planta (mapa)
        </Link>
        <Link
          href="/api/diag"
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Diagnóstico
        </Link>
      </div>
    </main>
  );
}
