import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { DeckForm } from "@/components/DeckForm";
import { prisma } from "@/lib/db";
import { deckRepoPrisma, obterDeck } from "@/lib/domain/decks";
import { HttpErro } from "@/lib/isolamento";

export const dynamic = "force-dynamic";

export default async function DeckPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const usuarioId = session?.user?.id;
  if (!usuarioId) {
    notFound();
  }

  const { id } = await params;
  let deck;
  try {
    deck = await obterDeck(usuarioId, id, deckRepoPrisma(prisma));
  } catch (erro) {
    if (erro instanceof HttpErro && erro.status === 404) {
      notFound();
    }
    throw erro;
  }

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
      <h1 className="mt-3 min-w-0 break-words text-xl font-semibold tracking-tight">
        {deck.nome}
      </h1>
      {deck.formato ? (
        <p className="mt-1 text-sm text-zinc-600">Formato: {deck.formato}</p>
      ) : null}
      <DeckForm
        key={deck.id}
        deckId={deck.id}
        inicial={{
          nome: deck.nome,
          formato: deck.formato,
          notas: deck.notas,
          cartas: deck.cartas,
        }}
      />
    </main>
  );
}
