import Link from "next/link";
import { notFound } from "next/navigation";
import { FichaForm } from "@/components/FichaForm";
import type { TipoColecaoItem } from "@/lib/domain/colecoes";
import { colecaoPorSlug } from "@/lib/query-filtros";

export const dynamic = "force-dynamic";

export default async function NovoItemPage({
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
          ← {colecao.rotulo}
        </Link>
      </p>
      <h1 className="mt-3 text-xl font-semibold tracking-tight">Novo item</h1>
      <FichaForm tipoColecao={tipoColecao} slug={colecao.slug} />
    </main>
  );
}
