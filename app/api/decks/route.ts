import { prisma } from "@/lib/db";
import {
  criarDeck,
  deckRepoPrisma,
  listarDecks,
  type DeckInput,
} from "@/lib/domain/decks";
import { itemRepoPrisma } from "@/lib/domain/itens";
import { HttpErro } from "@/lib/isolamento";
import { requireUser } from "@/lib/session";

const decks = deckRepoPrisma(prisma);
const itens = itemRepoPrisma(prisma);

export async function GET() {
  try {
    const { id } = await requireUser();
    return Response.json(await listarDecks(id, decks));
  } catch (erro) {
    return responderErro(erro);
  }
}

export async function POST(request: Request) {
  try {
    const { id } = await requireUser();
    const deck = await criarDeck(id, await lerCorpo(request), decks, itens);
    return Response.json(deck, { status: 201 });
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
