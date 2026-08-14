import { describe, expect, it } from "vitest";
import { HttpErro } from "../isolamento";
import { buscarItens, type BuscaRepo } from "./busca";
import {
  criarItem,
  type Item,
  type ItemDados,
  type ItemRepo,
} from "./itens";
import { TIPOS_COLECAO_ITEM } from "./colecoes";
import {
  atualizarWishlist,
  comprarWishlist,
  criarWishlist,
  excluirWishlist,
  listarWishlist,
  obterWishlist,
  type ComprarExtras,
  type FotoCopiador,
  type ReposComprar,
  type UnidadeDeTrabalho,
  type WishlistAtualizacao,
  type WishlistDados,
  type WishlistItem,
  type WishlistRepo,
} from "./wishlist";
import type { CampoExtraValor, CampoExtraValorDados } from "./campos-extra";

const USUARIO_A = "user-a";
const USUARIO_B = "user-b";

const FICHA_PERFUME = {
  casa: "Dior",
  linha: "Sauvage",
  concentracao: "EDP",
  notas_topo: "bergamota",
  notas_coracao: "pimenta",
  notas_base: "ambroxan",
};

type FotoCopia = {
  id: string;
  donoTipo: "WISHLIST" | "ITEM";
  donoId: string;
  caminho: string;
  origemId?: string;
};

type EstadoComprar = {
  wishlists: WishlistItem[];
  itens: Item[];
  extras: CampoExtraValor[];
  fotos: FotoCopia[];
};

function criarWishlistRepo(
  iniciais: WishlistItem[] = [],
): WishlistRepo & { itens: WishlistItem[] } {
  const itens: WishlistItem[] = iniciais;
  let sequencia = iniciais.length;

  return {
    itens,
    async create(data: WishlistDados) {
      sequencia += 1;
      const agora = new Date("2026-08-13T12:00:00.000Z");
      const criado: WishlistItem = {
        ...data,
        id: `wish-${sequencia}`,
        createdAt: agora,
        updatedAt: agora,
      };
      itens.push(criado);
      return criado;
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
    async update(id, data: WishlistAtualizacao) {
      const indice = itens.findIndex((item) => item.id === id);
      const atual = itens[indice];
      if (indice < 0 || !atual) {
        throw new Error(`Wishlist ${id} não existe no repositório fake.`);
      }
      const atualizado: WishlistItem = {
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

function criarExtrasRepo(
  valores: CampoExtraValor[] = [],
): ComprarExtras & { itens: CampoExtraValor[] } {
  const itens = valores;
  let sequencia = valores.length;

  return {
    itens,
    async findManyByAlvo(alvoTipo, alvoId) {
      return itens.filter(
        (valor) => valor.alvoTipo === alvoTipo && valor.alvoId === alvoId,
      );
    },
    async upsert(data: CampoExtraValorDados) {
      const indice = itens.findIndex(
        (valor) =>
          valor.definicaoId === data.definicaoId &&
          valor.alvoTipo === data.alvoTipo &&
          valor.alvoId === data.alvoId,
      );
      if (indice >= 0) {
        const atualizado: CampoExtraValor = { ...itens[indice]!, ...data };
        itens[indice] = atualizado;
        return atualizado;
      }
      sequencia += 1;
      const criado: CampoExtraValor = { ...data, id: `extra-${sequencia}` };
      itens.push(criado);
      return criado;
    },
    async deleteByAlvo(alvoTipo, alvoId) {
      for (let i = itens.length - 1; i >= 0; i -= 1) {
        if (itens[i]?.alvoTipo === alvoTipo && itens[i]?.alvoId === alvoId) {
          itens.splice(i, 1);
        }
      }
    },
  };
}

function criarFotoCopiador(
  fotos: FotoCopia[],
  opcoes?: { falharAoCopiar?: boolean; disco?: Map<string, Uint8Array> },
): FotoCopiador {
  return {
    async copiarParaItem(_usuarioId, wishlistId, itemId) {
      if (opcoes?.falharAoCopiar) {
        throw new Error("falha ao copiar fotos");
      }
      const origem = fotos.filter(
        (foto) => foto.donoTipo === "WISHLIST" && foto.donoId === wishlistId,
      );
      const caminhosNovos: string[] = [];
      const caminhosOriginais: string[] = [];
      for (const foto of origem) {
        const caminhoNovo = `copia/${foto.caminho}`;
        caminhosNovos.push(caminhoNovo);
        caminhosOriginais.push(foto.caminho);
        const disco = opcoes?.disco;
        if (disco) {
          const bytes = disco.get(foto.caminho) ?? new Uint8Array();
          disco.set(caminhoNovo, new Uint8Array(bytes));
        }
        fotos.push({
          id: `copia-${foto.id}`,
          donoTipo: "ITEM",
          donoId: itemId,
          caminho: caminhoNovo,
          origemId: foto.id,
        });
      }
      return { caminhosNovos, caminhosOriginais };
    },
    async apagarWishlist(_usuarioId, wishlistId) {
      for (let i = fotos.length - 1; i >= 0; i -= 1) {
        if (
          fotos[i]?.donoTipo === "WISHLIST" &&
          fotos[i]?.donoId === wishlistId
        ) {
          fotos.splice(i, 1);
        }
      }
    },
    async apagarArquivos(caminhos) {
      const disco = opcoes?.disco;
      if (!disco) {
        return;
      }
      for (const caminho of caminhos) {
        disco.delete(caminho);
      }
    },
  };
}

function substituir<T>(alvo: T[], fonte: T[]): void {
  alvo.splice(0, alvo.length, ...fonte.map((item) => structuredClone(item)));
}

function criarMundo(opcoes?: { falharAoCopiarFotos?: boolean }): {
  estado: EstadoComprar;
  wishlist: WishlistRepo & { itens: WishlistItem[] };
  itens: ItemRepo & { itens: Item[] };
  extras: ComprarExtras & { itens: CampoExtraValor[] };
  fotos: FotoCopiador;
  uow: UnidadeDeTrabalho;
  uowComItens: (itens: ItemRepo) => UnidadeDeTrabalho;
  uowComFotos: (fotos: FotoCopiador) => UnidadeDeTrabalho;
} {
  const estado: EstadoComprar = {
    wishlists: [],
    itens: [],
    extras: [],
    fotos: [],
  };

  const wishlist = criarWishlistRepo(estado.wishlists);
  const itens = criarItemRepo(estado.itens);
  const extras = criarExtrasRepo(estado.extras);
  const fotos = criarFotoCopiador(estado.fotos, {
    falharAoCopiar: opcoes?.falharAoCopiarFotos,
  });

  function restaurar(snap: EstadoComprar): void {
    substituir(estado.wishlists, snap.wishlists);
    substituir(estado.itens, snap.itens);
    substituir(estado.extras, snap.extras);
    substituir(estado.fotos, snap.fotos);
  }

  function montarUow(repos: ReposComprar): UnidadeDeTrabalho {
    return {
      async executar(trabalho) {
        const snap = structuredClone(estado);
        try {
          return await trabalho(repos);
        } catch (erro) {
          restaurar(snap);
          throw erro;
        }
      },
    };
  }

  const repos: ReposComprar = { wishlist, itens, extras, fotos };

  return {
    estado,
    wishlist,
    itens,
    extras,
    fotos,
    uow: montarUow(repos),
    uowComItens: (itensOverride) =>
      montarUow({ ...repos, itens: itensOverride }),
    uowComFotos: (fotosOverride) =>
      montarUow({ ...repos, fotos: fotosOverride }),
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

describe("criarWishlist", () => {
  it("cria wishlist só com nome e tipoColecao (RN-02)", async () => {
    const repo = criarWishlistRepo();

    const wish = await criarWishlist(
      USUARIO_A,
      { nome: "  Sauvage  ", tipoColecao: "PERFUME" },
      repo,
    );

    expect(wish.nome).toBe("Sauvage");
    expect(wish.usuarioId).toBe(USUARIO_A);
    expect(wish.tipoColecao).toBe("PERFUME");
    expect(wish.ficha).toEqual({});
    expect(wish.descricao).toBeNull();
    expect(wish.notasPessoais).toBeNull();
    expect(wish.tags).toEqual([]);
    expect(wish).not.toHaveProperty("dataAquisicao");
    expect(wish).not.toHaveProperty("precoPago");
    expect(repo.itens).toHaveLength(1);
  });

  it("aceita os 7 tipos de item e recusa PC_BUILD com 400", async () => {
    const repo = criarWishlistRepo();

    for (const tipo of TIPOS_COLECAO_ITEM) {
      const wish = await criarWishlist(
        USUARIO_A,
        { nome: tipo, tipoColecao: tipo },
        repo,
      );
      expect(wish.tipoColecao).toBe(tipo);
    }
    expect(repo.itens).toHaveLength(7);

    await expectHttpErro(
      criarWishlist(
        USUARIO_A,
        { nome: "PC da sala", tipoColecao: "PC_BUILD" },
        repo,
      ),
      400,
      /tipo/i,
    );
    expect(repo.itens).toHaveLength(7);
  });

  it("rejeita nome vazio com 400 em pt-BR", async () => {
    const repo = criarWishlistRepo();

    await expectHttpErro(
      criarWishlist(USUARIO_A, { nome: "   ", tipoColecao: "PERFUME" }, repo),
      400,
      /nome/i,
    );
    await expectHttpErro(
      criarWishlist(USUARIO_A, { tipoColecao: "PERFUME" }, repo),
      400,
      /nome/i,
    );
    expect(repo.itens).toHaveLength(0);
  });

  it("rejeita tipoColecao ausente ou inválido com 400 em pt-BR", async () => {
    const repo = criarWishlistRepo();

    await expectHttpErro(
      criarWishlist(USUARIO_A, { nome: "Sauvage" }, repo),
      400,
      /tipo/i,
    );
    await expectHttpErro(
      criarWishlist(
        USUARIO_A,
        { nome: "Sauvage", tipoColecao: "INVALIDO" },
        repo,
      ),
      400,
      /tipo/i,
    );
    expect(repo.itens).toHaveLength(0);
  });

  it("rejeita ficha inválida com 400 em pt-BR e não persiste", async () => {
    const repo = criarWishlistRepo();

    await expectHttpErro(
      criarWishlist(
        USUARIO_A,
        {
          nome: "Sauvage",
          tipoColecao: "PERFUME",
          ficha: { casa: "Dior", batch_code: "X" },
        },
        repo,
      ),
      400,
      /ficha/i,
    );
    expect(repo.itens).toHaveLength(0);
  });

  it("rejeita nome com 201 caracteres com 400 citando nome", async () => {
    const repo = criarWishlistRepo();

    await expectHttpErro(
      criarWishlist(
        USUARIO_A,
        { nome: "a".repeat(201), tipoColecao: "PERFUME" },
        repo,
      ),
      400,
      /nome/i,
    );
    expect(repo.itens).toHaveLength(0);
  });

  it("aceita nome com 200 caracteres (RF-H09)", async () => {
    const repo = criarWishlistRepo();
    const nome = "a".repeat(200);

    const wish = await criarWishlist(
      USUARIO_A,
      { nome, tipoColecao: "PERFUME" },
      repo,
    );

    expect(wish.nome).toBe(nome);
    expect(wish.tipoColecao).toBe("PERFUME");
    expect(repo.itens).toHaveLength(1);
  });

  it("rejeita descricao ou notasPessoais com 4001 caracteres com 400", async () => {
    const repo = criarWishlistRepo();

    await expectHttpErro(
      criarWishlist(
        USUARIO_A,
        {
          nome: "Sauvage",
          tipoColecao: "PERFUME",
          descricao: "x".repeat(4001),
        },
        repo,
      ),
      400,
      /descricao/i,
    );
    await expectHttpErro(
      criarWishlist(
        USUARIO_A,
        {
          nome: "Sauvage",
          tipoColecao: "PERFUME",
          notasPessoais: "x".repeat(4001),
        },
        repo,
      ),
      400,
      /notasPessoais/i,
    );
    expect(repo.itens).toHaveLength(0);
  });

  it("ignora dataAquisicao e precoPago no input", async () => {
    const repo = criarWishlistRepo();

    const wish = await criarWishlist(
      USUARIO_A,
      {
        nome: "Sauvage",
        tipoColecao: "PERFUME",
        dataAquisicao: "2026-01-01",
        precoPago: 899,
      },
      repo,
    );

    expect(wish).not.toHaveProperty("dataAquisicao");
    expect(wish).not.toHaveProperty("precoPago");
  });
});

describe("listarWishlist", () => {
  it("filtra por usuarioId e tipoColecao (RN-05)", async () => {
    const repo = criarWishlistRepo();

    await criarWishlist(
      USUARIO_A,
      { nome: "Sauvage", tipoColecao: "PERFUME" },
      repo,
    );
    await criarWishlist(
      USUARIO_A,
      { nome: "Jordan 1", tipoColecao: "TENIS" },
      repo,
    );
    await criarWishlist(
      USUARIO_B,
      { nome: "Chanel N°5", tipoColecao: "PERFUME" },
      repo,
    );

    const lista = await listarWishlist(
      USUARIO_A,
      { tipoColecao: "PERFUME" },
      repo,
    );

    expect(lista).toHaveLength(1);
    expect(lista[0]?.nome).toBe("Sauvage");
    expect(lista.every((item) => item.usuarioId === USUARIO_A)).toBe(true);
    expect(lista.every((item) => item.tipoColecao === "PERFUME")).toBe(true);
  });
});

describe("obterWishlist / atualizarWishlist / excluirWishlist", () => {
  it("get/patch/delete retornam 404 se a wishlist é de outro usuário", async () => {
    const repo = criarWishlistRepo();
    const alheia = await criarWishlist(
      USUARIO_B,
      { nome: "Chanel N°5", tipoColecao: "PERFUME" },
      repo,
    );

    await expectHttpErro(
      obterWishlist(USUARIO_A, alheia.id, repo),
      404,
      /não encontrado/i,
    );
    await expectHttpErro(
      atualizarWishlist(USUARIO_A, alheia.id, { nome: "Hack" }, repo),
      404,
      /não encontrado/i,
    );
    await expectHttpErro(
      excluirWishlist(USUARIO_A, alheia.id, repo),
      404,
      /não encontrado/i,
    );

    expect(await obterWishlist(USUARIO_B, alheia.id, repo)).toMatchObject({
      nome: "Chanel N°5",
    });
  });

  it("get/patch/delete retornam 404 se a wishlist não existe", async () => {
    const repo = criarWishlistRepo();

    await expectHttpErro(
      obterWishlist(USUARIO_A, "wish-inexistente", repo),
      404,
      /não encontrado/i,
    );
    await expectHttpErro(
      atualizarWishlist(USUARIO_A, "wish-inexistente", { nome: "X" }, repo),
      404,
      /não encontrado/i,
    );
    await expectHttpErro(
      excluirWishlist(USUARIO_A, "wish-inexistente", repo),
      404,
      /não encontrado/i,
    );
  });

  it("o dono atualiza e exclui a própria wishlist", async () => {
    const repo = criarWishlistRepo();
    const criado = await criarWishlist(
      USUARIO_A,
      { nome: "Sauvage", tipoColecao: "PERFUME" },
      repo,
    );

    const atualizado = await atualizarWishlist(
      USUARIO_A,
      criado.id,
      { nome: "Sauvage Elixir", ficha: FICHA_PERFUME },
      repo,
    );

    expect(atualizado.nome).toBe("Sauvage Elixir");
    expect(atualizado.ficha).toEqual(FICHA_PERFUME);

    await excluirWishlist(USUARIO_A, criado.id, repo);

    await expectHttpErro(
      obterWishlist(USUARIO_A, criado.id, repo),
      404,
      /não encontrado/i,
    );
    expect(repo.itens).toHaveLength(0);
  });
});

describe("comprarWishlist RF-10", () => {
  it("1 perfume na wishlist → comprar → 1 item, wishlist 0", async () => {
    const mundo = criarMundo();
    const wish = await criarWishlist(
      USUARIO_A,
      {
        nome: "Sauvage",
        tipoColecao: "PERFUME",
        descricao: "Quero o EDP",
        notasPessoais: "presente",
        tags: ["grail"],
        ficha: FICHA_PERFUME,
      },
      mundo.wishlist,
    );

    mundo.estado.extras.push({
      id: "extra-1",
      definicaoId: "def-lote",
      alvoTipo: "WISHLIST",
      alvoId: wish.id,
      valorTexto: "batch-A",
      valorNumero: null,
    });
    mundo.estado.fotos.push({
      id: "foto-wish-1",
      donoTipo: "WISHLIST",
      donoId: wish.id,
      caminho: `${USUARIO_A}/foto-wish-1.jpg`,
    });

    const item = await comprarWishlist(USUARIO_A, wish.id, mundo.uow);

    expect(item.tipoColecao).toBe("PERFUME");
    expect(item.nome).toBe("Sauvage");
    expect(item.descricao).toBe("Quero o EDP");
    expect(item.notasPessoais).toBe("presente");
    expect(item.tags).toEqual(["grail"]);
    expect(item.ficha).toEqual(FICHA_PERFUME);
    expect(item.dataAquisicao).toBeNull();
    expect(item.precoPago).toBeNull();
    expect(item.usuarioId).toBe(USUARIO_A);

    expect(mundo.estado.itens).toHaveLength(1);
    expect(mundo.estado.wishlists).toHaveLength(0);

    const extrasItem = mundo.estado.extras.filter(
      (extra) => extra.alvoTipo === "ITEM" && extra.alvoId === item.id,
    );
    expect(extrasItem).toEqual([
      expect.objectContaining({
        definicaoId: "def-lote",
        valorTexto: "batch-A",
        valorNumero: null,
      }),
    ]);
    expect(
      mundo.estado.extras.filter((extra) => extra.alvoTipo === "WISHLIST"),
    ).toHaveLength(0);

    const fotosItem = mundo.estado.fotos.filter(
      (foto) => foto.donoTipo === "ITEM" && foto.donoId === item.id,
    );
    expect(fotosItem).toHaveLength(1);
    expect(fotosItem[0]?.id).not.toBe("foto-wish-1");
    expect(fotosItem[0]?.caminho).not.toBe(`${USUARIO_A}/foto-wish-1.jpg`);
    expect(fotosItem[0]?.origemId).toBe("foto-wish-1");
    expect(
      mundo.estado.fotos.filter((foto) => foto.donoTipo === "WISHLIST"),
    ).toHaveLength(0);
  });

  it("comprar wishlist de outro usuário retorna 404 e não cria item", async () => {
    const mundo = criarMundo();
    const alheia = await criarWishlist(
      USUARIO_B,
      { nome: "Chanel N°5", tipoColecao: "PERFUME" },
      mundo.wishlist,
    );

    await expectHttpErro(
      comprarWishlist(USUARIO_A, alheia.id, mundo.uow),
      404,
      /não encontrado/i,
    );
    expect(mundo.estado.wishlists).toHaveLength(1);
    expect(mundo.estado.itens).toHaveLength(0);
  });
});

describe("comprarWishlist RN-11 atômico", () => {
  it("se criar item falha, wishlist permanece e nenhum item é criado", async () => {
    const mundo = criarMundo();
    const wish = await criarWishlist(
      USUARIO_A,
      { nome: "Sauvage", tipoColecao: "PERFUME" },
      mundo.wishlist,
    );

    const itensQueFalham: ItemRepo = {
      ...mundo.itens,
      async create() {
        throw new Error("falha ao criar item");
      },
    };

    await expect(
      comprarWishlist(USUARIO_A, wish.id, mundo.uowComItens(itensQueFalham)),
    ).rejects.toThrow(/falha ao criar item/);

    expect(mundo.estado.wishlists).toHaveLength(1);
    expect(mundo.estado.wishlists[0]?.id).toBe(wish.id);
    expect(mundo.estado.itens).toHaveLength(0);
  });

  it("se a cópia de fotos falha no meio, não deixa item órfão nem apaga a wishlist", async () => {
    const mundo = criarMundo();
    const wish = await criarWishlist(
      USUARIO_A,
      {
        nome: "Sauvage",
        tipoColecao: "PERFUME",
        ficha: FICHA_PERFUME,
      },
      mundo.wishlist,
    );
    mundo.estado.fotos.push({
      id: "foto-wish-1",
      donoTipo: "WISHLIST",
      donoId: wish.id,
      caminho: `${USUARIO_A}/foto-wish-1.jpg`,
    });

    const fotosQueFalham = criarFotoCopiador(mundo.estado.fotos, {
      falharAoCopiar: true,
    });

    await expect(
      comprarWishlist(USUARIO_A, wish.id, mundo.uowComFotos(fotosQueFalham)),
    ).rejects.toThrow(/falha ao copiar fotos/);

    expect(mundo.estado.wishlists).toHaveLength(1);
    expect(mundo.estado.wishlists[0]?.id).toBe(wish.id);
    expect(mundo.estado.itens).toHaveLength(0);
    expect(mundo.estado.fotos).toEqual([
      expect.objectContaining({
        id: "foto-wish-1",
        donoTipo: "WISHLIST",
        donoId: wish.id,
      }),
    ]);
  });

  it("rollback após copiar no disco preserva originais e limpa as cópias", async () => {
    const original = `${USUARIO_A}/foto-wish-1.jpg`;
    const disco = new Map<string, Uint8Array>([
      [original, new Uint8Array([1, 2, 3])],
    ]);
    const mundo = criarMundo();
    const wish = await criarWishlist(
      USUARIO_A,
      { nome: "Sauvage", tipoColecao: "PERFUME" },
      mundo.wishlist,
    );
    mundo.estado.fotos.push({
      id: "foto-wish-1",
      donoTipo: "WISHLIST",
      donoId: wish.id,
      caminho: original,
    });

    const fotos = criarFotoCopiador(mundo.estado.fotos, { disco });
    const uow: UnidadeDeTrabalho = {
      async executar(trabalho) {
        const snap = structuredClone(mundo.estado);
        try {
          await trabalho({
            wishlist: mundo.wishlist,
            itens: mundo.itens,
            extras: mundo.extras,
            fotos,
          });
          throw new Error("rollback após copiar fotos");
        } catch (erro) {
          substituir(mundo.estado.wishlists, snap.wishlists);
          substituir(mundo.estado.itens, snap.itens);
          substituir(mundo.estado.extras, snap.extras);
          substituir(mundo.estado.fotos, snap.fotos);
          throw erro;
        }
      },
    };

    await expect(
      comprarWishlist(USUARIO_A, wish.id, uow),
    ).rejects.toThrow(/rollback após copiar fotos/);

    expect(disco.has(original)).toBe(true);
    expect([...disco.keys()].filter((caminho) => caminho !== original)).toEqual(
      [],
    );
    expect(mundo.estado.wishlists).toHaveLength(1);
    expect(mundo.estado.itens).toHaveLength(0);
  });

  it("após commit, apaga arquivos originais e mantém as cópias", async () => {
    const original = `${USUARIO_A}/foto-wish-1.jpg`;
    const disco = new Map<string, Uint8Array>([
      [original, new Uint8Array([1, 2, 3])],
    ]);
    const mundo = criarMundo();
    const wish = await criarWishlist(
      USUARIO_A,
      { nome: "Sauvage", tipoColecao: "PERFUME" },
      mundo.wishlist,
    );
    mundo.estado.fotos.push({
      id: "foto-wish-1",
      donoTipo: "WISHLIST",
      donoId: wish.id,
      caminho: original,
    });

    const fotos = criarFotoCopiador(mundo.estado.fotos, { disco });
    const item = await comprarWishlist(
      USUARIO_A,
      wish.id,
      mundo.uowComFotos(fotos),
    );

    expect(disco.has(original)).toBe(false);
    expect([...disco.keys()]).toEqual([`copia/${original}`]);
    expect(mundo.estado.wishlists).toHaveLength(0);
    expect(mundo.estado.itens).toEqual([
      expect.objectContaining({ id: item.id }),
    ]);
  });
});

describe("regressão T09 / RN-01", () => {
  it("buscarItens não devolve wishlist — só a tabela item", async () => {
    const mundo = criarMundo();
    const wish = await criarWishlist(
      USUARIO_A,
      { nome: "Sauvage wishlist", tipoColecao: "PERFUME" },
      mundo.wishlist,
    );
    await criarItem(
      USUARIO_A,
      { nome: "Sauvage", tipoColecao: "PERFUME" },
      mundo.itens,
    );

    const consultas: string[] = [];
    const repoBusca: BuscaRepo = {
      async listarDoUsuario(usuarioId, tipoColecao) {
        consultas.push("item");
        return mundo.itens.findMany({ usuarioId, tipoColecao });
      },
    };

    const resultados = await buscarItens(
      USUARIO_A,
      { q: "Sauvage", tipoColecao: "PERFUME" },
      repoBusca,
    );

    expect(consultas).toEqual(["item"]);
    expect(consultas).not.toContain("wishlist");
    expect(resultados).toHaveLength(1);
    expect(resultados[0]?.nome).toBe("Sauvage");
    expect(resultados.some((r) => r.id === wish.id)).toBe(false);
    expect(mundo.itens.itens.some((item) => item.id === wish.id)).toBe(false);
    expect(mundo.wishlist.itens).toHaveLength(1);
  });
});
