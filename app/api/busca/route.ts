import { prisma } from "@/lib/db";
import {
  buscaRepoPrisma,
  buscarItens,
  parsearConsultaBusca,
} from "@/lib/domain/busca";
import { HttpErro } from "@/lib/isolamento";
import { requireUser } from "@/lib/session";

const repo = buscaRepoPrisma(prisma);

export async function GET(request: Request) {
  try {
    const { id } = await requireUser();
    const criterios = parsearConsultaBusca(new URL(request.url).searchParams);
    const resultados = await buscarItens(id, criterios, repo);
    return Response.json(resultados);
  } catch (erro) {
    return responderErro(erro);
  }
}

function responderErro(erro: unknown): Response {
  if (erro instanceof HttpErro) {
    return Response.json({ erro: erro.mensagem }, { status: erro.status });
  }
  throw erro;
}
