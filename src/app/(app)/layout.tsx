import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { ToastProvider } from "@/components/Toast";
import { sessaoAtual } from "@/lib/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const s = await sessaoAtual();
  if (!s) redirect("/login");
  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar user={s.u} isAdmin={s.a} />
        <main className="min-w-0 flex-1 overflow-auto">{children}</main>
      </div>
    </ToastProvider>
  );
}
