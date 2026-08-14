import Link from "next/link";
import { notFound } from "next/navigation";
import { ListaItens } from "@/components/ListaItens";
import type { TipoColecaoItem } from "@/lib/domain/colecoes";
import { colecaoPorSlug } from "@/lib/query-filtros";

export const dynamic = "force-dynamic";

export default async function WishlistColecaoPage({
  params,
}: {
  params: Promise<{ tipo: string }>;
}) {
  const { tipo } = await params;
  const colecao = colecaoPorSlug(tipo);
  if (!colecao || colecao.tipoColecao === "PC_BUILD") {
    notFound();
  }

  const tipoColecao = colecao.tipoColecao as TipoColecaoItem;

  return (
    <main className="mx-auto w-full max-w-3xl min-w-0 px-4 py-6">
      <p className="text-sm">
        <Link
          href={`/colecoes/${colecao.slug}`}
          className="font-medium text-zinc-700 underline"
        >
          ← Inventário · {colecao.rotulo}
        </Link>
      </p>
      <h1 className="mt-3 text-xl font-semibold tracking-tight">
        Wishlist · {colecao.rotulo}
      </h1>
      <p className="mt-1 text-sm text-zinc-600">
        Itens que você quer. Não entram no inventário até “Já comprei”.
      </p>
      <div className="mt-3">
        <Link
          href={`/colecoes/${colecao.slug}/wishlist/novo`}
          className="inline-flex rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white"
        >
          Nova wishlist
        </Link>
      </div>
      <ListaItens
        modo="wishlist"
        tipoColecao={tipoColecao}
        slug={colecao.slug}
      />
    </main>
  );
}
