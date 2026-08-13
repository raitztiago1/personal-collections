import { prisma } from "@/lib/db";
import {
  criarItem,
  itemRepoPrisma,
  listarItens,
  type ItemInput,
} from "@/lib/domain/itens";
import { HttpErro } from "@/lib/isolamento";
import { requireUser } from "@/lib/session";

const repo = itemRepoPrisma(prisma);

export async function GET(request: Request) {
  try {
    const { id } = await requireUser();
    const tipoColecao = new URL(request.url).searchParams.get("tipoColecao");
    const itens = await listarItens(
      id,
      { tipoColecao: tipoColecao ?? undefined },
      repo,
    );
    return Response.json(itens);
  } catch (erro) {
    return responderErro(erro);
  }
}

export async function POST(request: Request) {
  try {
    const { id } = await requireUser();
    const item = await criarItem(id, await lerCorpo(request), repo);
    return Response.json(item, { status: 201 });
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
