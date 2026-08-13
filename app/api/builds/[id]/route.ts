import { prisma } from "@/lib/db";
import {
  atualizarBuild,
  buildRepoPrisma,
  excluirBuild,
  obterBuild,
  type BuildInput,
} from "@/lib/domain/builds";
import { apagarDono, depsFotos } from "@/lib/fotos";
import { HttpErro } from "@/lib/isolamento";
import { requireUser } from "@/lib/session";

const builds = buildRepoPrisma(prisma);

type ContextoRota = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, contexto: ContextoRota) {
  try {
    const { id: usuarioId } = await requireUser();
    const { id } = await contexto.params;
    return Response.json(await obterBuild(usuarioId, id, builds));
  } catch (erro) {
    return responderErro(erro);
  }
}

export async function PATCH(request: Request, contexto: ContextoRota) {
  try {
    const { id: usuarioId } = await requireUser();
    const { id } = await contexto.params;
    const build = await atualizarBuild(
      usuarioId,
      id,
      await lerCorpo(request),
      builds,
    );
    return Response.json(build);
  } catch (erro) {
    return responderErro(erro);
  }
}

export async function DELETE(_request: Request, contexto: ContextoRota) {
  try {
    const { id: usuarioId } = await requireUser();
    const { id } = await contexto.params;
    await excluirBuild(usuarioId, id, builds, (uid, donoTipo, donoId) =>
      apagarDono(uid, donoTipo, donoId, depsFotos(prisma)),
    );
    return new Response(null, { status: 204 });
  } catch (erro) {
    return responderErro(erro);
  }
}

async function lerCorpo(request: Request): Promise<BuildInput> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    throw new HttpErro(400, "JSON inválido.");
  }
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new HttpErro(400, "JSON inválido.");
  }
  return payload as BuildInput;
}

function responderErro(erro: unknown): Response {
  if (erro instanceof HttpErro) {
    return Response.json({ erro: erro.mensagem }, { status: erro.status });
  }
  throw erro;
}
