import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppHeader } from "@/components/AppHeader";

export const dynamic = "force-dynamic";

export default async function MainLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const nome = session.user.name?.trim() || session.user.email || "Usuário";

  return (
    <div className="flex min-h-dvh w-full min-w-0 flex-col overflow-x-hidden">
      <AppHeader nome={nome} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
