import { prisma } from "@/lib/db";
import {
  atualizarItem,
  excluirItem,
  itemRepoPrisma,
  obterItem,
  type ItemInput,
} from "@/lib/domain/itens";
import { HttpErro } from "@/lib/isolamento";
import { requireUser } from "@/lib/session";

const repo = itemRepoPrisma(prisma);

type ContextoRota = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, contexto: ContextoRota) {
  try {
    const { id: usuarioId } = await requireUser();
    const { id } = await contexto.params;
    const item = await obterItem(usuarioId, id, repo);
    return Response.json(item);
  } catch (erro) {
    return responderErro(erro);
  }
}

export async function PATCH(request: Request, contexto: ContextoRota) {
  try {
    const { id: usuarioId } = await requireUser();
    const { id } = await contexto.params;
    const item = await atualizarItem(
      usuarioId,
      id,
      await lerCorpo(request),
      repo,
    );
    return Response.json(item);
  } catch (erro) {
    return responderErro(erro);
  }
}

export async function DELETE(_request: Request, contexto: ContextoRota) {
  try {
    const { id: usuarioId } = await requireUser();
    const { id } = await contexto.params;
    await excluirItem(usuarioId, id, repo);
    return new Response(null, { status: 204 });
  } catch (erro) {
    return responderErro(erro);
  }
}

async function lerCorpo(request: Request): Promise<ItemInput> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    throw new HttpErro(400, "JSON inválido.");
  }
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new HttpErro(400, "JSON inválido.");
  }
  return payload as ItemInput;
}

function responderErro(erro: unknown): Response {
  if (erro instanceof HttpErro) {
    return Response.json({ erro: erro.mensagem }, { status: erro.status });
  }
  throw erro;
}
