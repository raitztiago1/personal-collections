import { prisma } from "@/lib/db";
import {
  buildRepoPrisma,
  criarBuild,
  listarBuilds,
  type BuildInput,
} from "@/lib/domain/builds";
import { HttpErro } from "@/lib/isolamento";
import { requireUser } from "@/lib/session";

const builds = buildRepoPrisma(prisma);

export async function GET() {
  try {
    const { id } = await requireUser();
    return Response.json(await listarBuilds(id, builds));
  } catch (erro) {
    return responderErro(erro);
  }
}

export async function POST(request: Request) {
  try {
    const { id } = await requireUser();
    const build = await criarBuild(id, await lerCorpo(request), builds);
    return Response.json(build, { status: 201 });
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
