import Link from "next/link";
import { DeckForm } from "@/components/DeckForm";

export const dynamic = "force-dynamic";

export default function NovoDeckPage() {
  return (
    <main className="mx-auto w-full max-w-3xl min-w-0 px-4 py-6">
      <p className="text-sm">
        <Link
          href="/colecoes/yugioh/decks"
          className="font-medium text-zinc-700 underline"
        >
          ← Decks
        </Link>
      </p>
      <h1 className="mt-3 text-xl font-semibold tracking-tight">Novo deck</h1>
      <DeckForm />
    </main>
  );
}
