import { prisma } from "@/lib/db";
import { campoExtraReposPrisma } from "@/lib/domain/campos-extra";
import {
  atualizarWishlistComExtras,
  excluirWishlist,
  obterWishlistComExtras,
  wishlistRepoPrisma,
  type WishlistInputComExtras,
} from "@/lib/domain/wishlist";
import { apagarDono, depsFotos } from "@/lib/fotos";
import { HttpErro } from "@/lib/isolamento";
import { requireUser } from "@/lib/session";

const repo = wishlistRepoPrisma(prisma);
const extras = campoExtraReposPrisma(prisma);

type ContextoRota = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, contexto: ContextoRota) {
  try {
    const { id: usuarioId } = await requireUser();
    const { id } = await contexto.params;
    const item = await obterWishlistComExtras(usuarioId, id, repo, extras);
    return Response.json(item);
  } catch (erro) {
    return responderErro(erro);
  }
}

export async function PATCH(request: Request, contexto: ContextoRota) {
  try {
    const { id: usuarioId } = await requireUser();
    const { id } = await contexto.params;
    const item = await atualizarWishlistComExtras(
      usuarioId,
      id,
      await lerCorpo(request),
      repo,
      extras,
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
    await excluirWishlist(usuarioId, id, repo, (uid, donoId) =>
      apagarDono(uid, "WISHLIST", donoId, depsFotos(prisma)),
    );
    return new Response(null, { status: 204 });
  } catch (erro) {
    return responderErro(erro);
  }
}

async function lerCorpo(request: Request): Promise<WishlistInputComExtras> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    throw new HttpErro(400, "JSON inválido.");
  }
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new HttpErro(400, "JSON inválido.");
  }
  return payload as WishlistInputComExtras;
}

function responderErro(erro: unknown): Response {
  if (erro instanceof HttpErro) {
    return Response.json({ erro: erro.mensagem }, { status: erro.status });
  }
  throw erro;
}
