import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { FichaForm } from "@/components/FichaForm";
import { FichaView } from "@/components/FichaView";
import { prisma } from "@/lib/db";
import type { TipoColecaoItem } from "@/lib/domain/colecoes";
import { itemRepoPrisma, obterItem } from "@/lib/domain/itens";
import { depsFotos } from "@/lib/fotos";
import { HttpErro } from "@/lib/isolamento";
import { colecaoPorSlug } from "@/lib/query-filtros";

export const dynamic = "force-dynamic";

export default async function ItemPage({
  params,
}: {
  params: Promise<{ tipo: string; id: string }>;
}) {
  const session = await auth();
  const usuarioId = session?.user?.id;
  if (!usuarioId) {
    notFound();
  }

  const { tipo, id } = await params;
  const colecao = colecaoPorSlug(tipo);
  if (!colecao || colecao.tipoColecao === "PC_BUILD") {
    notFound();
  }

  const tipoColecao = colecao.tipoColecao as TipoColecaoItem;

  let item;
  try {
    item = await obterItem(usuarioId, id, itemRepoPrisma(prisma));
  } catch (erro) {
    if (erro instanceof HttpErro && erro.status === 404) {
      notFound();
    }
    throw erro;
  }

  if (item.tipoColecao !== tipoColecao) {
    notFound();
  }

  const fotos = await depsFotos(prisma).repo.findManyByDono("ITEM", item.id);
  const dataAquisicao = item.dataAquisicao
    ? item.dataAquisicao.toISOString().slice(0, 10)
    : null;

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
      <h1 className="mt-3 min-w-0 break-words text-xl font-semibold tracking-tight">
        {item.nome}
      </h1>

      <FichaView
        tipoColecao={item.tipoColecao}
        ficha={item.ficha}
        descricao={item.descricao}
        notasPessoais={item.notasPessoais}
        dataAquisicao={dataAquisicao}
        precoPago={item.precoPago}
        tags={item.tags}
      />

      <FichaForm
        key={item.id}
        tipoColecao={item.tipoColecao}
        slug={colecao.slug}
        itemId={item.id}
        inicial={{
          nome: item.nome,
          descricao: item.descricao,
          notasPessoais: item.notasPessoais,
          dataAquisicao,
          precoPago: item.precoPago,
          tags: item.tags,
          ficha: item.ficha,
        }}
        fotosIniciais={fotos.map((foto) => ({
          id: foto.id,
          isCapa: foto.isCapa,
        }))}
      />
    </main>
  );
}
