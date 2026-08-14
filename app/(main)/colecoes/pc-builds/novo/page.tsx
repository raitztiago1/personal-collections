import Link from "next/link";
import { BuildForm } from "@/components/BuildForm";

export const dynamic = "force-dynamic";

export default function NovoBuildPage() {
  return (
    <main className="mx-auto w-full max-w-3xl min-w-0 px-4 py-6">
      <p className="text-sm">
        <Link
          href="/colecoes/pc-builds"
          className="font-medium text-zinc-700 underline"
        >
          ← Setups PC
        </Link>
      </p>
      <h1 className="mt-3 text-xl font-semibold tracking-tight">Novo setup</h1>
      <BuildForm />
    </main>
  );
}
