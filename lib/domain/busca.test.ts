import { describe, expect, it } from "vitest";
import { HttpErro } from "../isolamento";
import {
  buscarItens,
  parsearConsultaBusca,
  type BuscaRepo,
  type ItemBuscaLinha,
} from "./busca";

const USUARIO_A = "user-a";
const USUARIO_B = "user-b";

function item(parcial: Partial<ItemBuscaLinha> & Pick<ItemBuscaLinha, "id" | "nome" | "tipoColecao">): ItemBuscaLinha {
  return {
    usuarioId: USUARIO_A,
    descricao: null,
    tags: [],
    ficha: {},
    ...parcial,
  };
}

function criarRepo(
  linhas: ItemBuscaLinha[],
  opcoes?: { misturarWishlist?: boolean },
): BuscaRepo & { consultas: string[]; listarWishlist: () => Promise<ItemBuscaLinha[]> } {
  const consultas: string[] = [];
  const wishlist = linhas.filter((linha) => linha.origem === "wishlist");
  const itens = linhas.filter((linha) => linha.origem !== "wishlist");

  return {
    consultas,
    async listarDoUsuario(usuarioId, tipoColecao) {
      consultas.push("item");
      const base = opcoes?.misturarWishlist ? linhas : itens;
      return base.filter(
        (linha) =>
          linha.usuarioId === usuarioId &&
          (tipoColecao === undefined || linha.tipoColecao === tipoColecao),
      );
    },
    async listarWishlist() {
      consultas.push("wishlist");
      return wishlist;
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

const chicago = item({
  id: "tenis-chicago",
  nome: "Air Jordan 1 Chicago",
  tipoColecao: "TENIS",
  descricao: "Edição clássica de 1985",
  tags: ["grail", "OG"],
  ficha: {
    marca: "Nike",
    linha: "Air Jordan 1",
    colorway: "Chicago",
    sku: "DZ5485-612",
    tamanho: "42",
    ano: 1985,
    condicao: "USADO",
  },
});

const samba = item({
  id: "tenis-samba",
  nome: "Samba OG",
  tipoColecao: "TENIS",
  ficha: {
    marca: "Adidas",
    linha: "Samba",
    tamanho: "42",
    ano: 2023,
    condicao: "NOVO",
  },
});

const airForce = item({
  id: "tenis-af1",
  nome: "Air Force 1",
  tipoColecao: "TENIS",
  ficha: { marca: "Nike", tamanho: "40", ano: 2020, condicao: "NOVO" },
});

const macallan = item({
  id: "whisky-macallan",
  nome: "Macallan 12",
  tipoColecao: "WHISKY",
  ficha: {
    destilaria: "São José",
    idade_anos: 12,
    notas_degustacao: "baunilha e carvalho",
  },
});

const wishlistWhisky = item({
  id: "wish-whisky",
  nome: "Macallan 18 wishlist",
  tipoColecao: "WHISKY",
  origem: "wishlist",
  ficha: { destilaria: "Macallan" },
});

const blueEyes = item({
  id: "ygo-be",
  nome: "Blue-Eyes White Dragon",
  tipoColecao: "YUGIOH",
  ficha: { raridade: "Secret Rare", set_edicao: "LOB" },
});

const darkMagician = item({
  id: "ygo-dm",
  nome: "Dark Magician",
  tipoColecao: "YUGIOH",
  ficha: { raridade: "Ultra Rare", set_edicao: "LOB" },
});

describe("parsearConsultaBusca", () => {
  it("lê q, tipoColecao e filtro.<campo> da query string", () => {
    const params = new URLSearchParams(
      "q=chicago&tipoColecao=TENIS&filtro.tamanho=42&filtro.marca=Nike",
    );

    expect(parsearConsultaBusca(params)).toEqual({
      q: "chicago",
      tipoColecao: "TENIS",
      filtros: { tamanho: "42", marca: "Nike" },
    });
  });
});

describe("buscarItens RF-07", () => {
  it("encontra o tênis por colorway chicago (CA)", async () => {
    const repo = criarRepo([chicago, samba, macallan]);

    const resultados = await buscarItens(USUARIO_A, { q: "chicago" }, repo);

    expect(resultados.map((r) => r.id)).toEqual(["tenis-chicago"]);
    expect(resultados[0]).toMatchObject({
      id: "tenis-chicago",
      tipoColecao: "TENIS",
      nome: "Air Jordan 1 Chicago",
    });
    expect("capa" in resultados[0]!).toBe(true);
  });

  it("encontra o tênis pelo SKU da ficha (CA)", async () => {
    const repo = criarRepo([chicago, samba]);

    const resultados = await buscarItens(USUARIO_A, { q: "dz5485-612" }, repo);

    expect(resultados.map((r) => r.id)).toEqual(["tenis-chicago"]);
  });

  it("busca em nome, descricao e tags, sem acento e sem maiúsculas", async () => {
    const repo = criarRepo([chicago, macallan]);

    expect((await buscarItens(USUARIO_A, { q: "AIR JORDAN" }, repo)).map((r) => r.id)).toEqual([
      "tenis-chicago",
    ]);
    expect((await buscarItens(USUARIO_A, { q: "classica" }, repo)).map((r) => r.id)).toEqual([
      "tenis-chicago",
    ]);
    expect((await buscarItens(USUARIO_A, { q: "GRAIL" }, repo)).map((r) => r.id)).toEqual([
      "tenis-chicago",
    ]);
    expect((await buscarItens(USUARIO_A, { q: "sao jose" }, repo)).map((r) => r.id)).toEqual([
      "whisky-macallan",
    ]);
  });

  it("não busca campos de ficha que não são pesquisáveis", async () => {
    const soFichaNaoPesquisavel = item({
      id: "tenis-ano",
      nome: "Dunk Low",
      tipoColecao: "TENIS",
      ficha: { ano: 1985, condicao: "USADO", marca: "Nike" },
    });
    const repo = criarRepo([soFichaNaoPesquisavel]);

    expect(await buscarItens(USUARIO_A, { q: "1985" }, repo)).toEqual([]);
    expect(await buscarItens(USUARIO_A, { q: "USADO" }, repo)).toEqual([]);
  });

  it("busca global sem tipo e restringe à coleção quando tipoColecao vem", async () => {
    const repo = criarRepo([chicago, macallan]);

    const global = await buscarItens(USUARIO_A, { q: "a" }, repo);
    expect(global.map((r) => r.id).sort()).toEqual(["tenis-chicago", "whisky-macallan"]);

    const naColecao = await buscarItens(
      USUARIO_A,
      { q: "a", tipoColecao: "TENIS" },
      repo,
    );
    expect(naColecao.map((r) => r.id)).toEqual(["tenis-chicago"]);
  });
});

describe("buscarItens RF-08 e RN-12", () => {
  it("filtra tênis por tamanho AND marca (CA)", async () => {
    const repo = criarRepo([chicago, samba, airForce]);

    const resultados = await buscarItens(
      USUARIO_A,
      { tipoColecao: "TENIS", filtros: { tamanho: "42", marca: "Nike" } },
      repo,
    );

    expect(resultados.map((r) => r.id)).toEqual(["tenis-chicago"]);
  });

  it("filtra Yu-Gi-Oh! por raridade (CA)", async () => {
    const repo = criarRepo([blueEyes, darkMagician]);

    const resultados = await buscarItens(
      USUARIO_A,
      { tipoColecao: "YUGIOH", filtros: { raridade: "Secret" } },
      repo,
    );

    expect(resultados.map((r) => r.id)).toEqual(["ygo-be"]);
  });

  it("combina busca textual com filtros; texto contém, enum e inteiro são igualdade", async () => {
    const repo = criarRepo([chicago, samba, airForce]);

    const comTexto = await buscarItens(
      USUARIO_A,
      { q: "jordan", tipoColecao: "TENIS", filtros: { tamanho: "42" } },
      repo,
    );
    expect(comTexto.map((r) => r.id)).toEqual(["tenis-chicago"]);

    const enumIgual = await buscarItens(
      USUARIO_A,
      { tipoColecao: "TENIS", filtros: { condicao: "NOVO" } },
      repo,
    );
    expect(enumIgual.map((r) => r.id).sort()).toEqual(["tenis-af1", "tenis-samba"]);

    const anoExato = await buscarItens(
      USUARIO_A,
      { tipoColecao: "TENIS", filtros: { ano: "1985" } },
      repo,
    );
    expect(anoExato.map((r) => r.id)).toEqual(["tenis-chicago"]);
    expect(
      await buscarItens(USUARIO_A, { tipoColecao: "TENIS", filtros: { ano: "198" } }, repo),
    ).toEqual([]);
  });

  it("rejeita filtro em campo não filtrável ou desconhecido (RN-12)", async () => {
    const repo = criarRepo([chicago, macallan]);

    await expectHttpErro(
      buscarItens(USUARIO_A, { tipoColecao: "TENIS", filtros: { colorway: "Chicago" } }, repo),
      400,
      /filtr/i,
    );
    await expectHttpErro(
      buscarItens(USUARIO_A, { tipoColecao: "TENIS", filtros: { sku: "DZ5485-612" } }, repo),
      400,
      /filtr/i,
    );
    await expectHttpErro(
      buscarItens(
        USUARIO_A,
        { tipoColecao: "WHISKY", filtros: { notas_degustacao: "baunilha" } },
        repo,
      ),
      400,
      /filtr/i,
    );
    await expectHttpErro(
      buscarItens(USUARIO_A, { tipoColecao: "TENIS", filtros: { inexistente: "x" } }, repo),
      400,
      /filtr/i,
    );
  });
});

describe("buscarItens RN-01", () => {
  it("ignora linha de wishlist injetada no resultado do repo", async () => {
    const repo = criarRepo([macallan, wishlistWhisky], { misturarWishlist: true });

    const resultados = await buscarItens(
      USUARIO_A,
      { q: "macallan", tipoColecao: "WHISKY" },
      repo,
    );

    expect(resultados.map((r) => r.id)).toEqual(["whisky-macallan"]);
    expect(resultados.some((r) => r.id === "wish-whisky")).toBe(false);
  });

  it("nunca consulta wishlist — o repo só lista a tabela item", async () => {
    const repo = criarRepo([macallan, wishlistWhisky]);

    await buscarItens(USUARIO_A, { q: "macallan" }, repo);

    expect(repo.consultas).toEqual(["item"]);
    expect(repo.consultas).not.toContain("wishlist");
  });

  it("não devolve item de outro usuário mesmo se o repo misturar", async () => {
    const alheio = item({
      id: "tenis-outro",
      usuarioId: USUARIO_B,
      nome: "Air Jordan 1 Chicago",
      tipoColecao: "TENIS",
      ficha: { colorway: "Chicago" },
    });
    const repo: BuscaRepo = {
      async listarDoUsuario() {
        return [chicago, alheio];
      },
    };

    const resultados = await buscarItens(USUARIO_A, { q: "chicago" }, repo);
    expect(resultados.map((r) => r.id)).toEqual(["tenis-chicago"]);
  });
});
