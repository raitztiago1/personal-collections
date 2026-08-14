import Link from "next/link";
import { ListaItens } from "@/components/ListaItens";

export const dynamic = "force-dynamic";

export default function DecksPage() {
  return (
    <main className="mx-auto w-full max-w-3xl min-w-0 px-4 py-6">
      <h1 className="text-xl font-semibold tracking-tight">Yu-Gi-Oh!</h1>
      <nav className="mt-3 flex min-w-0 flex-wrap gap-2" aria-label="Yu-Gi-Oh!">
        <Link
          href="/colecoes/yugioh"
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium"
        >
          Cartas
        </Link>
        <Link
          href="/colecoes/yugioh/decks"
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white"
        >
          Decks
        </Link>
      </nav>
      <p className="mt-3 text-sm text-zinc-600">
        Decks só usam cartas do seu inventário. Gadgets e peças de PC ficam em
        outras coleções.
      </p>
      <div className="mt-3">
        <Link
          href="/colecoes/yugioh/decks/novo"
          className="inline-flex rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white"
        >
          Novo deck
        </Link>
      </div>
      <ListaItens modo="decks" />
    </main>
  );
}
