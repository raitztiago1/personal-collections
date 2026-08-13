import { prisma } from "@/lib/db";
import {
  atualizarCampoExtra,
  campoExtraReposPrisma,
  excluirCampoExtra,
  type CampoExtraDefInput,
} from "@/lib/domain/campos-extra";
import { HttpErro } from "@/lib/isolamento";
import { requireUser } from "@/lib/session";

const extras = campoExtraReposPrisma(prisma);

type ContextoRota = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, contexto: ContextoRota) {
  try {
    const { id: usuarioId } = await requireUser();
    const { id } = await contexto.params;
    const definicao = await atualizarCampoExtra(
      usuarioId,
      id,
      await lerCorpo(request),
      extras.defs,
    );
    return Response.json(definicao);
  } catch (erro) {
    return responderErro(erro);
  }
}

export async function DELETE(_request: Request, contexto: ContextoRota) {
  try {
    const { id: usuarioId } = await requireUser();
    const { id } = await contexto.params;
    await excluirCampoExtra(usuarioId, id, extras.defs);
    return new Response(null, { status: 204 });
  } catch (erro) {
    return responderErro(erro);
  }
}

async function lerCorpo(request: Request): Promise<CampoExtraDefInput> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    throw new HttpErro(400, "JSON inválido.");
  }
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new HttpErro(400, "JSON inválido.");
  }
  return payload as CampoExtraDefInput;
}

function responderErro(erro: unknown): Response {
  if (erro instanceof HttpErro) {
    return Response.json({ erro: erro.mensagem }, { status: erro.status });
  }
  throw erro;
}
