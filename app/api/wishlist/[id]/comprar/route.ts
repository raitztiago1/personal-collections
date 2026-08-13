import { prisma } from "@/lib/db";
import {
  comprarWishlist,
  uowComprarPrisma,
} from "@/lib/domain/wishlist";
import { HttpErro } from "@/lib/isolamento";
import { requireUser } from "@/lib/session";

const uow = uowComprarPrisma(prisma);

type ContextoRota = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, contexto: ContextoRota) {
  try {
    const { id: usuarioId } = await requireUser();
    const { id } = await contexto.params;
    const item = await comprarWishlist(usuarioId, id, uow);
    return Response.json(item, { status: 201 });
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
