import Link from "next/link";
import { notFound } from "next/navigation";
import { FiltrosColecao } from "@/components/FiltrosColecao";
import { ListaItens } from "@/components/ListaItens";
import { colecaoPorSlug, parsearQueryLista } from "@/lib/query-filtros";

export const dynamic = "force-dynamic";

export default async function ColecaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ tipo: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { tipo } = await params;
  const colecao = colecaoPorSlug(tipo);
  if (!colecao) {
    notFound();
  }

  const { q, filtros } = parsearQueryLista(await searchParams);

  return (
    <main className="mx-auto w-full max-w-3xl min-w-0 px-4 py-6">
      <h1 className="text-xl font-semibold tracking-tight">{colecao.rotulo}</h1>

      {colecao.tipoColecao === "YUGIOH" ? (
        <nav className="mt-3 flex min-w-0 flex-wrap gap-2" aria-label="Yu-Gi-Oh!">
          <Link
            href="/colecoes/yugioh"
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white"
          >
            Cartas
          </Link>
          <Link
            href="/colecoes/yugioh/decks"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium"
          >
            Decks
          </Link>
        </nav>
      ) : null}

      {colecao.tipoColecao === "PC_BUILD" ? (
        <>
          <p className="mt-2 text-sm text-zinc-600">
            Lista de setups. O detalhe de cada build entra na tarefa T17.
          </p>
          <ListaItens modo="builds" />
        </>
      ) : (
        <>
          <div className="mt-3">
            <Link
              href={`/colecoes/${colecao.slug}/itens/novo`}
              className="inline-flex rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white"
            >
              Novo item
            </Link>
          </div>
          <div className="mt-4 min-w-0">
            <FiltrosColecao
              slug={colecao.slug}
              tipoColecao={colecao.tipoColecao}
              q={q}
              filtros={filtros}
            />
          </div>
          <ListaItens
            modo="colecao"
            tipoColecao={colecao.tipoColecao}
            q={q}
            filtros={filtros}
          />
        </>
      )}
    </main>
  );
}
