import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { BuildForm } from "@/components/BuildForm";
import { PecaView } from "@/components/PecaForm";
import { prisma } from "@/lib/db";
import { buildRepoPrisma, obterBuild } from "@/lib/domain/builds";
import { depsFotos } from "@/lib/fotos";
import { HttpErro } from "@/lib/isolamento";

export const dynamic = "force-dynamic";

export default async function BuildPage({
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
  let build;
  try {
    build = await obterBuild(usuarioId, id, buildRepoPrisma(prisma));
  } catch (erro) {
    if (erro instanceof HttpErro && erro.status === 404) {
      notFound();
    }
    throw erro;
  }

  const fotos = depsFotos(prisma).repo;
  const fotosBuild = await fotos.findManyByDono("BUILD", build.id);
  const fotosPecasEntries = await Promise.all(
    build.pecas.map(async (peca) => {
      const lista = await fotos.findManyByDono("PECA", peca.id);
      return [peca.id, lista.map((foto) => ({ id: foto.id, isCapa: foto.isCapa }))] as const;
    }),
  );

  return (
    <main className="mx-auto w-full max-w-3xl min-w-0 px-4 py-6">
      <p className="text-sm">
        <Link
          href="/colecoes/pc-builds"
          className="font-medium text-zinc-700 underline"
        >
          ← Setups PC
        </Link>
      </p>
      <h1 className="mt-3 min-w-0 break-words text-xl font-semibold tracking-tight">
        {build.nome}
      </h1>
      {build.descricao ? (
        <p className="mt-2 break-words text-sm text-zinc-700">{build.descricao}</p>
      ) : null}
      {build.notasPessoais ? (
        <p className="mt-1 break-words text-sm text-zinc-600">
          {build.notasPessoais}
        </p>
      ) : null}

      <section className="mt-6 min-w-0">
        <h2 className="text-sm font-semibold tracking-tight">Peças</h2>
        {build.pecas.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600">
            Nenhuma peça neste setup. Edite abaixo para adicionar.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {build.pecas.map((peca) => (
              <PecaView key={peca.id} peca={peca} />
            ))}
          </div>
        )}
      </section>

      <BuildForm
        key={build.id}
        buildId={build.id}
        inicial={{
          nome: build.nome,
          descricao: build.descricao,
          notasPessoais: build.notasPessoais,
          pecas: build.pecas,
        }}
        fotosBuild={fotosBuild.map((foto) => ({
          id: foto.id,
          isCapa: foto.isCapa,
        }))}
        fotosPecas={Object.fromEntries(fotosPecasEntries)}
      />
    </main>
  );
}
