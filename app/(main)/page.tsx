import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  COLECOES,
  type KindColecao,
  type TipoColecaoItem,
} from "@/lib/domain/colecoes";

export const dynamic = "force-dynamic";

function rotuloContagem(kind: KindColecao, quantidade: number): string {
  if (kind === "composition") {
    return quantidade === 1 ? "1 setup" : `${quantidade} setups`;
  }
  return quantidade === 1 ? "1 item" : `${quantidade} itens`;
}

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const usuarioId = session.user.id;
  const [grupos, setups] = await Promise.all([
    prisma.item.groupBy({
      by: ["tipoColecao"],
      where: { usuarioId },
      _count: { _all: true },
    }),
    prisma.build.count({ where: { usuarioId } }),
  ]);

  const porTipo = Object.fromEntries(
    grupos.map((grupo) => [grupo.tipoColecao, grupo._count._all]),
  ) as Partial<Record<TipoColecaoItem, number>>;

  return (
    <main className="mx-auto w-full max-w-3xl min-w-0 px-4 py-6">
      <h1 className="text-xl font-semibold tracking-tight">Coleções</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Escolha uma coleção para consultar o acervo.
      </p>
      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {COLECOES.map((colecao) => {
          const quantidade =
            colecao.kind === "composition"
              ? setups
              : (porTipo[colecao.tipoColecao as TipoColecaoItem] ?? 0);

          return (
            <li key={colecao.slug} className="min-w-0">
              <Link
                href={`/colecoes/${colecao.slug}`}
                className="block min-w-0 rounded-xl border border-zinc-200 bg-white p-4"
              >
                <span className="block truncate font-medium">
                  {colecao.rotulo}
                </span>
                <span className="mt-1 block text-sm text-zinc-600">
                  {rotuloContagem(colecao.kind, quantidade)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
