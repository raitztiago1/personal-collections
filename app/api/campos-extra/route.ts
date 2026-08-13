import { prisma } from "@/lib/db";
import {
  campoExtraReposPrisma,
  criarCampoExtra,
  listarCamposExtra,
  type CampoExtraDefInput,
} from "@/lib/domain/campos-extra";
import { HttpErro } from "@/lib/isolamento";
import { requireUser } from "@/lib/session";

const extras = campoExtraReposPrisma(prisma);

export async function GET(request: Request) {
  try {
    const { id } = await requireUser();
    const tipoColecao = new URL(request.url).searchParams.get("tipoColecao");
    const definicoes = await listarCamposExtra(
      id,
      { tipoColecao: tipoColecao ?? undefined },
      extras.defs,
    );
    return Response.json(definicoes);
  } catch (erro) {
    return responderErro(erro);
  }
}

export async function POST(request: Request) {
  try {
    const { id } = await requireUser();
    const definicao = await criarCampoExtra(
      id,
      await lerCorpo(request),
      extras.defs,
    );
    return Response.json(definicao, { status: 201 });
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
