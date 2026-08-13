import { assertDono, HttpErro } from "../isolamento";
import type { Item, ItemRepo } from "./itens";

export type DeckCarta = {
  itemId: string;
  quantidade: number;
};

export type DeckDados = {
  usuarioId: string;
  nome: string;
  formato: string | null;
  notas: string | null;
  cartas: DeckCarta[];
};

export type Deck = DeckDados & {
  id: string;
};

export type DeckAtualizacao = {
  nome?: string;
  formato?: string | null;
  notas?: string | null;
  cartas?: DeckCarta[];
};

export type DeckInput = {
  nome?: unknown;
  formato?: unknown;
  notas?: unknown;
  cartas?: unknown;
};

export type DeckRepo = {
  create(data: DeckDados): Promise<Deck>;
  findMany(usuarioId: string): Promise<Deck[]>;
  findById(id: string): Promise<Deck | null>;
  update(id: string, data: DeckAtualizacao): Promise<Deck>;
  delete(id: string): Promise<void>;
  findNomesPorItem(
    usuarioId: string,
    itemId: string,
  ): Promise<{ id: string; nome: string }[]>;
};

type DeckCartaLinha = {
  itemId: string;
  quantidade: number;
};

type DeckLinha = {
  id: string;
  usuarioId: string;
  nome: string;
  formato: string | null;
  notas: string | null;
  cartas?: DeckCartaLinha[];
};

type PrismaDeckDelegate = {
  create(args: {
    data: {
      usuarioId: string;
      nome: string;
      formato: string | null;
      notas: string | null;
      cartas: { create: DeckCartaLinha[] };
    };
    include: { cartas: true };
  }): Promise<DeckLinha>;
  findMany(args: {
    where: {
      usuarioId: string;
      cartas?: { some: { itemId: string } };
    };
    include?: { cartas: true };
    select?: { id: true; nome: true };
    orderBy?: { nome: "asc" | "desc" };
  }): Promise<DeckLinha[]>;
  findUnique(args: {
    where: { id: string };
    include: { cartas: true };
  }): Promise<DeckLinha | null>;
  update(args: {
    where: { id: string };
    data: {
      nome?: string;
      formato?: string | null;
      notas?: string | null;
      cartas?: {
        deleteMany: Record<string, never>;
        create: DeckCartaLinha[];
      };
    };
    include: { cartas: true };
  }): Promise<DeckLinha>;
  delete(args: { where: { id: string } }): Promise<unknown>;
};

export function deckRepoPrisma(prisma: { deck: object }): DeckRepo {
  const tabela = prisma.deck as PrismaDeckDelegate;
  return {
    async create(data) {
      return mapearDeck(
        await tabela.create({
          data: {
            usuarioId: data.usuarioId,
            nome: data.nome,
            formato: data.formato,
            notas: data.notas,
            cartas: { create: data.cartas },
          },
          include: { cartas: true },
        }),
      );
    },
    async findMany(usuarioId) {
      const linhas = await tabela.findMany({
        where: { usuarioId },
        include: { cartas: true },
        orderBy: { nome: "asc" },
      });
      return linhas.map(mapearDeck);
    },
    async findById(id) {
      const linha = await tabela.findUnique({
        where: { id },
        include: { cartas: true },
      });
      return linha ? mapearDeck(linha) : null;
    },
    async update(id, data) {
      return mapearDeck(
        await tabela.update({
          where: { id },
          data: {
            ...(data.nome !== undefined ? { nome: data.nome } : {}),
            ...(data.formato !== undefined ? { formato: data.formato } : {}),
            ...(data.notas !== undefined ? { notas: data.notas } : {}),
            ...(data.cartas !== undefined
              ? {
                  cartas: {
                    deleteMany: {},
                    create: data.cartas,
                  },
                }
              : {}),
          },
          include: { cartas: true },
        }),
      );
    },
    async delete(id) {
      await tabela.delete({ where: { id } });
    },
    async findNomesPorItem(usuarioId, itemId) {
      const linhas = await tabela.findMany({
        where: { usuarioId, cartas: { some: { itemId } } },
        select: { id: true, nome: true },
      });
      return linhas.map((linha) => ({ id: linha.id, nome: linha.nome }));
    },
  };
}

export async function criarDeck(
  usuarioId: string,
  input: DeckInput,
  decks: DeckRepo,
  itens: ItemRepo,
): Promise<Deck> {
  const cartas = await validarCartas(usuarioId, input.cartas, itens);
  return decks.create({
    usuarioId,
    nome: exigirNome(input.nome),
    formato: textoOpcional(input.formato, "formato") ?? null,
    notas: textoOpcional(input.notas, "notas") ?? null,
    cartas,
  });
}

export async function listarDecks(
  usuarioId: string,
  decks: DeckRepo,
): Promise<Deck[]> {
  return decks.findMany(usuarioId);
}

export async function obterDeck(
  usuarioId: string,
  id: string,
  decks: DeckRepo,
): Promise<Deck> {
  return carregarDoDono(usuarioId, id, decks);
}

export async function atualizarDeck(
  usuarioId: string,
  id: string,
  input: DeckInput,
  decks: DeckRepo,
  itens: ItemRepo,
): Promise<Deck> {
  await carregarDoDono(usuarioId, id, decks);
  const patch: DeckAtualizacao = {};

  if (input.nome !== undefined) {
    patch.nome = exigirNome(input.nome);
  }
  if (input.formato !== undefined) {
    patch.formato = textoOpcional(input.formato, "formato") ?? null;
  }
  if (input.notas !== undefined) {
    patch.notas = textoOpcional(input.notas, "notas") ?? null;
  }
  if (input.cartas !== undefined) {
    patch.cartas = await validarCartas(usuarioId, input.cartas, itens);
  }

  if (Object.keys(patch).length === 0) {
    return obterDeck(usuarioId, id, decks);
  }
  return decks.update(id, patch);
}

export async function excluirDeck(
  usuarioId: string,
  id: string,
  decks: DeckRepo,
): Promise<void> {
  await carregarDoDono(usuarioId, id, decks);
  await decks.delete(id);
}

export async function decksQueUsamCarta(
  usuarioId: string,
  itemId: string,
  decks: DeckRepo,
): Promise<string[]> {
  const encontrados = await decks.findNomesPorItem(usuarioId, itemId);
  return encontrados.map((deck) => deck.nome);
}

export async function garantirItemPodeSerExcluido(
  usuarioId: string,
  itemId: string,
  decks: DeckRepo,
): Promise<void> {
  const nomes = await decksQueUsamCarta(usuarioId, itemId, decks);
  if (nomes.length === 0) {
    return;
  }
  throw new HttpErro(
    409,
    `Não é possível excluir este item porque ele está nos decks: ${nomes.join(", ")}.`,
  );
}

async function carregarDoDono(
  usuarioId: string,
  id: string,
  decks: DeckRepo,
): Promise<Deck> {
  const deck = await decks.findById(id);
  if (!deck) {
    throw new HttpErro(404, "Recurso não encontrado.");
  }
  assertDono(usuarioId, deck.usuarioId);
  return deck;
}

async function validarCartas(
  usuarioId: string,
  bruto: unknown,
  itens: ItemRepo,
): Promise<DeckCarta[]> {
  if (bruto === undefined || bruto === null) {
    return [];
  }
  if (!Array.isArray(bruto)) {
    throw new HttpErro(400, "As cartas devem ser uma lista.");
  }

  const cartas: DeckCarta[] = [];
  const vistos = new Set<string>();

  for (const entrada of bruto) {
    const carta = lerCarta(entrada);
    if (vistos.has(carta.itemId)) {
      throw new HttpErro(400, "A mesma carta não pode aparecer duas vezes no deck.");
    }
    vistos.add(carta.itemId);
    await validarCartaDoInventario(usuarioId, carta, itens);
    cartas.push(carta);
  }

  return cartas;
}

function lerCarta(entrada: unknown): DeckCarta {
  if (entrada === null || typeof entrada !== "object" || Array.isArray(entrada)) {
    throw new HttpErro(400, "Cada carta deve ser um objeto.");
  }
  const bruto = entrada as { itemId?: unknown; quantidade?: unknown };
  if (typeof bruto.itemId !== "string" || bruto.itemId.trim() === "") {
    throw new HttpErro(400, "Informe o item da carta.");
  }
  if (
    typeof bruto.quantidade !== "number" ||
    !Number.isInteger(bruto.quantidade)
  ) {
    throw new HttpErro(400, "A quantidade da carta deve ser um inteiro.");
  }
  if (bruto.quantidade < 1) {
    throw new HttpErro(400, "A quantidade da carta deve ser no mínimo 1.");
  }
  return { itemId: bruto.itemId, quantidade: bruto.quantidade };
}

async function validarCartaDoInventario(
  usuarioId: string,
  carta: DeckCarta,
  itens: ItemRepo,
): Promise<void> {
  const item = await carregarItemDoDono(usuarioId, carta.itemId, itens);
  if (item.tipoColecao !== "YUGIOH") {
    throw new HttpErro(400, "Só é possível adicionar cartas Yu-Gi-Oh! ao deck.");
  }
  const estoque = estoqueDaCarta(item);
  if (carta.quantidade > estoque) {
    throw new HttpErro(
      400,
      "A quantidade no deck não pode ser maior que a quantidade da carta no inventário.",
    );
  }
}

async function carregarItemDoDono(
  usuarioId: string,
  id: string,
  itens: ItemRepo,
): Promise<Item> {
  const item = await itens.findById(id);
  if (!item) {
    throw new HttpErro(404, "Recurso não encontrado.");
  }
  assertDono(usuarioId, item.usuarioId);
  return item;
}

function estoqueDaCarta(item: Item): number {
  const quantidade = item.ficha.quantidade;
  if (typeof quantidade === "number" && Number.isInteger(quantidade) && quantidade >= 1) {
    return quantidade;
  }
  return 1;
}

function exigirNome(valor: unknown): string {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new HttpErro(400, "O nome é obrigatório.");
  }
  return valor.trim();
}

function textoOpcional(valor: unknown, campo: string): string | null | undefined {
  if (valor === undefined) {
    return undefined;
  }
  if (valor === null) {
    return null;
  }
  if (typeof valor !== "string") {
    throw new HttpErro(400, `O campo ${campo} deve ser texto.`);
  }
  const texto = valor.trim();
  return texto === "" ? null : texto;
}

function mapearDeck(linha: DeckLinha): Deck {
  return {
    id: linha.id,
    usuarioId: linha.usuarioId,
    nome: linha.nome,
    formato: linha.formato,
    notas: linha.notas,
    cartas: (linha.cartas ?? []).map((carta) => ({
      itemId: carta.itemId,
      quantidade: carta.quantidade,
    })),
  };
}
