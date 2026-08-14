import { describe, expect, it } from "vitest";
import { HttpErro } from "../isolamento";
import {
  atualizarDeck,
  criarDeck,
  decksQueUsamCarta,
  excluirDeck,
  garantirItemPodeSerExcluido,
  listarDecks,
  obterDeck,
  type Deck,
  type DeckAtualizacao,
  type DeckCarta,
  type DeckDados,
  type DeckRepo,
} from "./decks";
import {
  criarItem,
  excluirItem,
  type Item,
  type ItemDados,
  type ItemRepo,
} from "./itens";

const USUARIO_A = "user-a";
const USUARIO_B = "user-b";

type DeckCartaLinha = DeckCarta & { deckId: string };

function criarItemRepo(iniciais: Item[] = []): ItemRepo & { itens: Item[] } {
  const itens: Item[] = iniciais;
  let sequencia = iniciais.length;

  return {
    itens,
    async create(data: ItemDados) {
      sequencia += 1;
      const agora = new Date("2026-08-13T12:00:00.000Z");
      const item: Item = {
        ...data,
        id: `item-${sequencia}`,
        createdAt: agora,
        updatedAt: agora,
      };
      itens.push(item);
      return item;
    },
    async findMany(filtro) {
      return itens.filter(
        (item) =>
          item.usuarioId === filtro.usuarioId &&
          (filtro.tipoColecao === undefined ||
            item.tipoColecao === filtro.tipoColecao),
      );
    },
    async findById(id) {
      return itens.find((item) => item.id === id) ?? null;
    },
    async update(id, data) {
      const indice = itens.findIndex((item) => item.id === id);
      const atual = itens[indice];
      if (indice < 0 || !atual) {
        throw new Error(`Item ${id} não existe no repositório fake.`);
      }
      const atualizado: Item = {
        ...atual,
        ...data,
        updatedAt: new Date("2026-08-13T13:00:00.000Z"),
      };
      itens[indice] = atualizado;
      return atualizado;
    },
    async delete(id) {
      const indice = itens.findIndex((item) => item.id === id);
      if (indice >= 0) {
        itens.splice(indice, 1);
      }
    },
  };
}

function criarDeckRepo(): DeckRepo & {
  decks: Deck[];
  cartas: DeckCartaLinha[];
} {
  const decks: Deck[] = [];
  const cartas: DeckCartaLinha[] = [];
  let sequencia = 0;

  function cartasDoDeck(deckId: string): DeckCarta[] {
    return cartas
      .filter((carta) => carta.deckId === deckId)
      .map(({ itemId, quantidade }) => ({ itemId, quantidade }));
  }

  function montar(deck: Omit<Deck, "cartas">): Deck {
    return { ...deck, cartas: cartasDoDeck(deck.id) };
  }

  return {
    decks,
    cartas,
    async create(data: DeckDados) {
      sequencia += 1;
      const id = `deck-${sequencia}`;
      const deck: Omit<Deck, "cartas"> = {
        id,
        usuarioId: data.usuarioId,
        nome: data.nome,
        formato: data.formato,
        notas: data.notas,
      };
      decks.push(deck as Deck);
      for (const carta of data.cartas) {
        cartas.push({ deckId: id, ...carta });
      }
      return montar(deck);
    },
    async findMany(usuarioId) {
      return decks
        .filter((deck) => deck.usuarioId === usuarioId)
        .map((deck) => montar(deck));
    },
    async findById(id) {
      const deck = decks.find((d) => d.id === id);
      return deck ? montar(deck) : null;
    },
    async update(id, data: DeckAtualizacao) {
      const indice = decks.findIndex((deck) => deck.id === id);
      const atual = decks[indice];
      if (indice < 0 || !atual) {
        throw new Error(`Deck ${id} não existe no repositório fake.`);
      }
      if (data.cartas !== undefined) {
        for (let i = cartas.length - 1; i >= 0; i -= 1) {
          if (cartas[i]?.deckId === id) {
            cartas.splice(i, 1);
          }
        }
        for (const carta of data.cartas) {
          cartas.push({ deckId: id, ...carta });
        }
      }
      const atualizado: Omit<Deck, "cartas"> = {
        id: atual.id,
        usuarioId: atual.usuarioId,
        nome: data.nome ?? atual.nome,
        formato: data.formato !== undefined ? data.formato : atual.formato,
        notas: data.notas !== undefined ? data.notas : atual.notas,
      };
      decks[indice] = atualizado as Deck;
      return montar(atualizado);
    },
    async delete(id) {
      for (let i = cartas.length - 1; i >= 0; i -= 1) {
        if (cartas[i]?.deckId === id) {
          cartas.splice(i, 1);
        }
      }
      const indice = decks.findIndex((deck) => deck.id === id);
      if (indice >= 0) {
        decks.splice(indice, 1);
      }
    },
    async findNomesPorItem(usuarioId, itemId) {
      const ids = new Set(
        cartas.filter((carta) => carta.itemId === itemId).map((c) => c.deckId),
      );
      return decks
        .filter((deck) => deck.usuarioId === usuarioId && ids.has(deck.id))
        .map((deck) => ({ id: deck.id, nome: deck.nome }));
    },
  };
}

async function expectHttpErro(
  acao: Promise<unknown>,
  status: number,
  mensagem: RegExp,
): Promise<HttpErro> {
  try {
    await acao;
    throw new Error("Esperava HttpErro, mas a ação resolveu.");
  } catch (erro) {
    expect(erro).toBeInstanceOf(HttpErro);
    const http = erro as HttpErro;
    expect(http.status).toBe(status);
    expect(http.mensagem).toMatch(mensagem);
    return http;
  }
}

async function cartaYugioh(
  itens: ItemRepo,
  usuarioId: string,
  nome: string,
  quantidade?: number,
): Promise<Item> {
  return criarItem(
    usuarioId,
    {
      nome,
      tipoColecao: "YUGIOH",
      ficha:
        quantidade === undefined
          ? { codigo: "LOB-001" }
          : { codigo: "LOB-001", quantidade },
    },
    itens,
  );
}

describe("criarDeck", () => {
  it("cria deck só com nome e sem cartas", async () => {
    const decks = criarDeckRepo();
    const itens = criarItemRepo();

    const deck = await criarDeck(
      USUARIO_A,
      { nome: "  Goat Format  " },
      decks,
      itens,
    );

    expect(deck.nome).toBe("Goat Format");
    expect(deck.usuarioId).toBe(USUARIO_A);
    expect(deck.formato).toBeNull();
    expect(deck.notas).toBeNull();
    expect(deck.cartas).toEqual([]);
    expect(decks.decks).toHaveLength(1);
  });

  it("aceita 2 cópias quando o estoque da carta é 2 (RN-04)", async () => {
    const decks = criarDeckRepo();
    const itens = criarItemRepo();
    const carta = await cartaYugioh(itens, USUARIO_A, "Blue-Eyes", 2);

    const deck = await criarDeck(
      USUARIO_A,
      {
        nome: "Blue-Eyes",
        formato: "TCG",
        notas: "boss",
        cartas: [{ itemId: carta.id, quantidade: 2 }],
      },
      decks,
      itens,
    );

    expect(deck.cartas).toEqual([{ itemId: carta.id, quantidade: 2 }]);
    expect(deck.formato).toBe("TCG");
    expect(deck.notas).toBe("boss");
  });

  it("rejeita 3 cópias quando o estoque da carta é 2 (RN-04)", async () => {
    const decks = criarDeckRepo();
    const itens = criarItemRepo();
    const carta = await cartaYugioh(itens, USUARIO_A, "Blue-Eyes", 2);

    await expectHttpErro(
      criarDeck(
        USUARIO_A,
        {
          nome: "Blue-Eyes",
          cartas: [{ itemId: carta.id, quantidade: 3 }],
        },
        decks,
        itens,
      ),
      400,
      /quantidade/i,
    );
    expect(decks.decks).toHaveLength(0);
    expect(decks.cartas).toHaveLength(0);
  });

  it("trata quantidade ausente na ficha como 1 (RN-04)", async () => {
    const decks = criarDeckRepo();
    const itens = criarItemRepo();
    const carta = await cartaYugioh(itens, USUARIO_A, "Pot of Greed");

    const deck = await criarDeck(
      USUARIO_A,
      {
        nome: "Goat",
        cartas: [{ itemId: carta.id, quantidade: 1 }],
      },
      decks,
      itens,
    );
    expect(deck.cartas).toEqual([{ itemId: carta.id, quantidade: 1 }]);

    await expectHttpErro(
      criarDeck(
        USUARIO_A,
        {
          nome: "Excesso",
          cartas: [{ itemId: carta.id, quantidade: 2 }],
        },
        decks,
        itens,
      ),
      400,
      /quantidade/i,
    );
  });

  it("rejeita item que não é YUGIOH com 400 (RN-03)", async () => {
    const decks = criarDeckRepo();
    const itens = criarItemRepo();
    const perfume = await criarItem(
      USUARIO_A,
      { nome: "Sauvage", tipoColecao: "PERFUME" },
      itens,
    );

    await expectHttpErro(
      criarDeck(
        USUARIO_A,
        {
          nome: "Inválido",
          cartas: [{ itemId: perfume.id, quantidade: 1 }],
        },
        decks,
        itens,
      ),
      400,
      /yu-gi-oh|yugioh|tipo/i,
    );
    expect(decks.decks).toHaveLength(0);
  });

  it("rejeita carta de outro usuário com 404 (RN-03)", async () => {
    const decks = criarDeckRepo();
    const itens = criarItemRepo();
    const alheia = await cartaYugioh(itens, USUARIO_B, "Dark Magician", 3);

    await expectHttpErro(
      criarDeck(
        USUARIO_A,
        {
          nome: "Roubo",
          cartas: [{ itemId: alheia.id, quantidade: 1 }],
        },
        decks,
        itens,
      ),
      404,
      /não encontrado/i,
    );
    expect(decks.decks).toHaveLength(0);
  });

  it("rejeita carta inexistente com 404", async () => {
    const decks = criarDeckRepo();
    const itens = criarItemRepo();

    await expectHttpErro(
      criarDeck(
        USUARIO_A,
        {
          nome: "Vazio",
          cartas: [{ itemId: "item-inexistente", quantidade: 1 }],
        },
        decks,
        itens,
      ),
      404,
      /não encontrado/i,
    );
  });

  it("rejeita nome com 201 caracteres com 400 citando nome", async () => {
    const decks = criarDeckRepo();
    const itens = criarItemRepo();

    await expectHttpErro(
      criarDeck(USUARIO_A, { nome: "a".repeat(201) }, decks, itens),
      400,
      /nome/i,
    );
    expect(decks.decks).toHaveLength(0);
  });

  it("rejeita notas com 4001 caracteres com 400", async () => {
    const decks = criarDeckRepo();
    const itens = criarItemRepo();

    await expectHttpErro(
      criarDeck(
        USUARIO_A,
        { nome: "Goat Format", notas: "x".repeat(4001) },
        decks,
        itens,
      ),
      400,
      /notas/i,
    );
    expect(decks.decks).toHaveLength(0);
  });

  it("rejeita formato com 4001 caracteres com 400", async () => {
    const decks = criarDeckRepo();
    const itens = criarItemRepo();

    await expectHttpErro(
      criarDeck(
        USUARIO_A,
        { nome: "Goat Format", formato: "x".repeat(4001) },
        decks,
        itens,
      ),
      400,
      /formato/i,
    );
    expect(decks.decks).toHaveLength(0);
  });

  it("rejeita nome vazio com 400 em pt-BR", async () => {
    const decks = criarDeckRepo();
    const itens = criarItemRepo();

    await expectHttpErro(
      criarDeck(USUARIO_A, { nome: "   " }, decks, itens),
      400,
      /nome/i,
    );
    await expectHttpErro(criarDeck(USUARIO_A, {}, decks, itens), 400, /nome/i);
  });
});

describe("listarDecks / obterDeck / atualizarDeck / excluirDeck", () => {
  it("lista só os decks do usuário (RN-05)", async () => {
    const decks = criarDeckRepo();
    const itens = criarItemRepo();
    await criarDeck(USUARIO_A, { nome: "Goat" }, decks, itens);
    await criarDeck(USUARIO_B, { nome: "Beatdown" }, decks, itens);

    const lista = await listarDecks(USUARIO_A, decks);

    expect(lista).toHaveLength(1);
    expect(lista[0]?.nome).toBe("Goat");
    expect(lista.every((deck) => deck.usuarioId === USUARIO_A)).toBe(true);
  });

  it("get/patch/delete retornam 404 se o deck é de outro usuário", async () => {
    const decks = criarDeckRepo();
    const itens = criarItemRepo();
    const alheio = await criarDeck(USUARIO_B, { nome: "Beatdown" }, decks, itens);

    await expectHttpErro(
      obterDeck(USUARIO_A, alheio.id, decks),
      404,
      /não encontrado/i,
    );
    await expectHttpErro(
      atualizarDeck(USUARIO_A, alheio.id, { nome: "Hack" }, decks, itens),
      404,
      /não encontrado/i,
    );
    await expectHttpErro(
      excluirDeck(USUARIO_A, alheio.id, decks),
      404,
      /não encontrado/i,
    );

    expect(await obterDeck(USUARIO_B, alheio.id, decks)).toMatchObject({
      nome: "Beatdown",
    });
  });

  it("o dono atualiza nome e substitui a lista de cartas", async () => {
    const decks = criarDeckRepo();
    const itens = criarItemRepo();
    const blueEyes = await cartaYugioh(itens, USUARIO_A, "Blue-Eyes", 3);
    const magician = await cartaYugioh(itens, USUARIO_A, "Dark Magician", 2);
    const criado = await criarDeck(
      USUARIO_A,
      {
        nome: "Inicial",
        cartas: [{ itemId: blueEyes.id, quantidade: 1 }],
      },
      decks,
      itens,
    );

    const atualizado = await atualizarDeck(
      USUARIO_A,
      criado.id,
      {
        nome: "Final",
        formato: "Goat",
        cartas: [{ itemId: magician.id, quantidade: 2 }],
      },
      decks,
      itens,
    );

    expect(atualizado.nome).toBe("Final");
    expect(atualizado.formato).toBe("Goat");
    expect(atualizado.cartas).toEqual([
      { itemId: magician.id, quantidade: 2 },
    ]);
    expect(decks.cartas).toHaveLength(1);
    expect(decks.cartas[0]?.itemId).toBe(magician.id);
  });

  it("rejeita substituição de cartas acima do estoque e não altera o deck", async () => {
    const decks = criarDeckRepo();
    const itens = criarItemRepo();
    const carta = await cartaYugioh(itens, USUARIO_A, "Blue-Eyes", 2);
    const criado = await criarDeck(
      USUARIO_A,
      {
        nome: "Blue-Eyes",
        cartas: [{ itemId: carta.id, quantidade: 2 }],
      },
      decks,
      itens,
    );

    await expectHttpErro(
      atualizarDeck(
        USUARIO_A,
        criado.id,
        { cartas: [{ itemId: carta.id, quantidade: 3 }] },
        decks,
        itens,
      ),
      400,
      /quantidade/i,
    );

    expect(await obterDeck(USUARIO_A, criado.id, decks)).toMatchObject({
      cartas: [{ itemId: carta.id, quantidade: 2 }],
    });
  });

  it("excluir deck remove as linhas de deck_carta", async () => {
    const decks = criarDeckRepo();
    const itens = criarItemRepo();
    const carta = await cartaYugioh(itens, USUARIO_A, "Blue-Eyes", 2);
    const criado = await criarDeck(
      USUARIO_A,
      {
        nome: "Blue-Eyes",
        cartas: [{ itemId: carta.id, quantidade: 2 }],
      },
      decks,
      itens,
    );

    await excluirDeck(USUARIO_A, criado.id, decks);

    await expectHttpErro(
      obterDeck(USUARIO_A, criado.id, decks),
      404,
      /não encontrado/i,
    );
    expect(decks.decks).toHaveLength(0);
    expect(decks.cartas).toHaveLength(0);
  });
});

describe("RN-09 excluir item em deck", () => {
  it("excluir carta em deck falha 409 com nomes dos decks em pt-BR", async () => {
    const decks = criarDeckRepo();
    const itens = criarItemRepo();
    const carta = await cartaYugioh(itens, USUARIO_A, "Blue-Eyes", 3);
    await criarDeck(
      USUARIO_A,
      {
        nome: "Goat Format",
        cartas: [{ itemId: carta.id, quantidade: 1 }],
      },
      decks,
      itens,
    );
    await criarDeck(
      USUARIO_A,
      {
        nome: "Beatdown",
        cartas: [{ itemId: carta.id, quantidade: 2 }],
      },
      decks,
      itens,
    );

    const erro = await expectHttpErro(
      excluirItem(USUARIO_A, carta.id, itens, undefined, (uid, itemId) =>
        garantirItemPodeSerExcluido(uid, itemId, decks),
      ),
      409,
      /não é possível excluir/i,
    );

    expect(erro.mensagem).toMatch(/Goat Format/);
    expect(erro.mensagem).toMatch(/Beatdown/);
    expect(itens.itens).toHaveLength(1);
    expect(await decksQueUsamCarta(USUARIO_A, carta.id, decks)).toEqual([
      "Goat Format",
      "Beatdown",
    ]);
  });

  it("permite excluir a carta depois de tirá-la dos decks", async () => {
    const decks = criarDeckRepo();
    const itens = criarItemRepo();
    const carta = await cartaYugioh(itens, USUARIO_A, "Blue-Eyes", 2);
    const deck = await criarDeck(
      USUARIO_A,
      {
        nome: "Goat Format",
        cartas: [{ itemId: carta.id, quantidade: 1 }],
      },
      decks,
      itens,
    );

    await excluirDeck(USUARIO_A, deck.id, decks);

    await excluirItem(USUARIO_A, carta.id, itens, undefined, (uid, itemId) =>
      garantirItemPodeSerExcluido(uid, itemId, decks),
    );

    expect(itens.itens).toHaveLength(0);
  });
});
