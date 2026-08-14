import Link from "next/link";
import { ListaItens } from "@/components/ListaItens";

export const dynamic = "force-dynamic";

export default function PcBuildsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl min-w-0 px-4 py-6">
      <h1 className="text-xl font-semibold tracking-tight">Setups PC</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Lista de setups com peças tipadas. Gadgets avulsos ficam na coleção
        Gadgets.
      </p>
      <div className="mt-3">
        <Link
          href="/colecoes/pc-builds/novo"
          className="inline-flex rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white"
        >
          Novo setup
        </Link>
      </div>
      <ListaItens modo="builds" />
    </main>
  );
}
