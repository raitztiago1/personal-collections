import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { FichaForm } from "@/components/FichaForm";
import { FichaView } from "@/components/FichaView";
import { prisma } from "@/lib/db";
import { campoExtraReposPrisma } from "@/lib/domain/campos-extra";
import type { TipoColecaoItem } from "@/lib/domain/colecoes";
import {
  obterWishlistComExtras,
  wishlistRepoPrisma,
} from "@/lib/domain/wishlist";
import { depsFotos } from "@/lib/fotos";
import { HttpErro } from "@/lib/isolamento";
import { colecaoPorSlug } from "@/lib/query-filtros";

export const dynamic = "force-dynamic";

export default async function WishlistItemPage({
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

  let wish;
  try {
    wish = await obterWishlistComExtras(
      usuarioId,
      id,
      wishlistRepoPrisma(prisma),
      campoExtraReposPrisma(prisma),
    );
  } catch (erro) {
    if (erro instanceof HttpErro && erro.status === 404) {
      notFound();
    }
    throw erro;
  }

  if (wish.tipoColecao !== tipoColecao) {
    notFound();
  }

  const fotos = await depsFotos(prisma).repo.findManyByDono(
    "WISHLIST",
    wish.id,
  );

  return (
    <main className="mx-auto w-full max-w-3xl min-w-0 px-4 py-6">
      <p className="text-sm">
        <Link
          href={`/colecoes/${colecao.slug}/wishlist`}
          className="font-medium text-zinc-700 underline"
        >
          ← Wishlist · {colecao.rotulo}
        </Link>
      </p>
      <h1 className="mt-3 min-w-0 break-words text-xl font-semibold tracking-tight">
        {wish.nome}
      </h1>

      <FichaView
        tipoColecao={wish.tipoColecao}
        ficha={wish.ficha}
        descricao={wish.descricao}
        notasPessoais={wish.notasPessoais}
        tags={wish.tags}
        extras={wish.extras}
      />

      <FichaForm
        key={wish.id}
        tipoColecao={wish.tipoColecao}
        slug={colecao.slug}
        itemId={wish.id}
        modo="wishlist"
        inicial={{
          nome: wish.nome,
          descricao: wish.descricao,
          notasPessoais: wish.notasPessoais,
          dataAquisicao: null,
          precoPago: null,
          tags: wish.tags,
          ficha: wish.ficha,
        }}
        extrasIniciais={wish.extras}
        fotosIniciais={fotos.map((foto) => ({
          id: foto.id,
          isCapa: foto.isCapa,
        }))}
      />
    </main>
  );
}
