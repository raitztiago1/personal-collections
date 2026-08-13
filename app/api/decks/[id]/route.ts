import { prisma } from "@/lib/db";
import {
  atualizarDeck,
  deckRepoPrisma,
  excluirDeck,
  obterDeck,
  type DeckInput,
} from "@/lib/domain/decks";
import { itemRepoPrisma } from "@/lib/domain/itens";
import { HttpErro } from "@/lib/isolamento";
import { requireUser } from "@/lib/session";

const decks = deckRepoPrisma(prisma);
const itens = itemRepoPrisma(prisma);

type ContextoRota = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, contexto: ContextoRota) {
  try {
    const { id: usuarioId } = await requireUser();
    const { id } = await contexto.params;
    return Response.json(await obterDeck(usuarioId, id, decks));
  } catch (erro) {
    return responderErro(erro);
  }
}

export async function PATCH(request: Request, contexto: ContextoRota) {
  try {
    const { id: usuarioId } = await requireUser();
    const { id } = await contexto.params;
    const deck = await atualizarDeck(
      usuarioId,
      id,
      await lerCorpo(request),
      decks,
      itens,
    );
    return Response.json(deck);
  } catch (erro) {
    return responderErro(erro);
  }
}

export async function DELETE(_request: Request, contexto: ContextoRota) {
  try {
    const { id: usuarioId } = await requireUser();
    const { id } = await contexto.params;
    await excluirDeck(usuarioId, id, decks);
    return new Response(null, { status: 204 });
  } catch (erro) {
    return responderErro(erro);
  }
}

async function lerCorpo(request: Request): Promise<DeckInput> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    throw new HttpErro(400, "JSON inválido.");
  }
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new HttpErro(400, "JSON inválido.");
  }
  return payload as DeckInput;
}

function responderErro(erro: unknown): Response {
  if (erro instanceof HttpErro) {
    return Response.json({ erro: erro.mensagem }, { status: erro.status });
  }
  throw erro;
}
