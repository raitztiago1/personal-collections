import { describe, expect, it } from "vitest";
import { HttpErro } from "../isolamento";
import {
  atualizarItem,
  criarItem,
  excluirItem,
  listarItens,
  obterItem,
  type Item,
  type ItemDados,
  type ItemRepo,
} from "./itens";

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

function criarRepoEmMemoria(iniciais: Item[] = []): ItemRepo & {
  itens: Item[];
} {
  const itens: Item[] = [...iniciais];
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

describe("criarItem", () => {
  it("cria item só com nome e tipoColecao (RN-02)", async () => {
    const repo = criarRepoEmMemoria();

    const item = await criarItem(
      USUARIO_A,
      { nome: "  Sauvage  ", tipoColecao: "PERFUME" },
      repo,
    );

    expect(item.nome).toBe("Sauvage");
    expect(item.usuarioId).toBe(USUARIO_A);
    expect(item.tipoColecao).toBe("PERFUME");
    expect(item.ficha).toEqual({});
    expect(item.descricao).toBeNull();
    expect(item.notasPessoais).toBeNull();
    expect(item.tags).toEqual([]);
    expect(repo.itens).toHaveLength(1);
  });

  it("rejeita nome vazio com 400 em pt-BR", async () => {
    const repo = criarRepoEmMemoria();

    await expectHttpErro(
      criarItem(USUARIO_A, { nome: "   ", tipoColecao: "PERFUME" }, repo),
      400,
      /nome/i,
    );
    await expectHttpErro(
      criarItem(USUARIO_A, { tipoColecao: "PERFUME" }, repo),
      400,
      /nome/i,
    );
    expect(repo.itens).toHaveLength(0);
  });

  it("rejeita tipoColecao ausente ou inválido com 400 em pt-BR", async () => {
    const repo = criarRepoEmMemoria();

    await expectHttpErro(
      criarItem(USUARIO_A, { nome: "Sauvage" }, repo),
      400,
      /tipo/i,
    );
    await expectHttpErro(
      criarItem(
        USUARIO_A,
        { nome: "PC da sala", tipoColecao: "PC_BUILD" },
        repo,
      ),
      400,
      /tipo/i,
    );
    expect(repo.itens).toHaveLength(0);
  });

  it("rejeita ficha inválida com 400 em pt-BR e não persiste", async () => {
    const repo = criarRepoEmMemoria();

    const erro = await expectHttpErro(
      criarItem(
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

    expect(erro.mensagem.length).toBeGreaterThan(0);
    expect(repo.itens).toHaveLength(0);
  });

  it("persiste perfume com notas e devolve ficha estruturada", async () => {
    const repo = criarRepoEmMemoria();

    const criado = await criarItem(
      USUARIO_A,
      {
        nome: "Sauvage",
        tipoColecao: "PERFUME",
        ficha: FICHA_PERFUME,
      },
      repo,
    );

    const lido = await obterItem(USUARIO_A, criado.id, repo);

    expect(lido.ficha).toEqual(FICHA_PERFUME);
    expect(lido.ficha).toMatchObject({
      casa: "Dior",
      notas_topo: "bergamota",
      notas_coracao: "pimenta",
      notas_base: "ambroxan",
    });
  });

  it("rejeita nome com 201 caracteres com 400 citando nome", async () => {
    const repo = criarRepoEmMemoria();

    await expectHttpErro(
      criarItem(
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
    const repo = criarRepoEmMemoria();
    const nome = "a".repeat(200);

    const item = await criarItem(
      USUARIO_A,
      { nome, tipoColecao: "PERFUME" },
      repo,
    );

    expect(item.nome).toBe(nome);
    expect(item.tipoColecao).toBe("PERFUME");
    expect(repo.itens).toHaveLength(1);
  });

  it("rejeita 31 tags com 400", async () => {
    const repo = criarRepoEmMemoria();
    const tags = Array.from({ length: 31 }, (_, i) => `tag-${i}`);

    await expectHttpErro(
      criarItem(
        USUARIO_A,
        { nome: "Sauvage", tipoColecao: "PERFUME", tags },
        repo,
      ),
      400,
      /tag/i,
    );
    expect(repo.itens).toHaveLength(0);
  });
});

describe("listarItens", () => {
  it("filtra por usuarioId e tipoColecao (RN-05)", async () => {
    const repo = criarRepoEmMemoria();

    await criarItem(
      USUARIO_A,
      { nome: "Sauvage", tipoColecao: "PERFUME" },
      repo,
    );
    await criarItem(
      USUARIO_A,
      { nome: "Jordan 1", tipoColecao: "TENIS" },
      repo,
    );
    await criarItem(
      USUARIO_B,
      { nome: "Chanel N°5", tipoColecao: "PERFUME" },
      repo,
    );

    const lista = await listarItens(
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

describe("obterItem / atualizarItem / excluirItem", () => {
  it("get/patch/delete retornam 404 se o item é de outro usuário", async () => {
    const repo = criarRepoEmMemoria();
    const alheio = await criarItem(
      USUARIO_B,
      { nome: "Chanel N°5", tipoColecao: "PERFUME" },
      repo,
    );

    await expectHttpErro(
      obterItem(USUARIO_A, alheio.id, repo),
      404,
      /não encontrado/i,
    );
    await expectHttpErro(
      atualizarItem(USUARIO_A, alheio.id, { nome: "Hack" }, repo),
      404,
      /não encontrado/i,
    );
    await expectHttpErro(
      excluirItem(USUARIO_A, alheio.id, repo),
      404,
      /não encontrado/i,
    );

    expect(await obterItem(USUARIO_B, alheio.id, repo)).toMatchObject({
      nome: "Chanel N°5",
    });
  });

  it("get/patch/delete retornam 404 se o item não existe", async () => {
    const repo = criarRepoEmMemoria();

    await expectHttpErro(
      obterItem(USUARIO_A, "item-inexistente", repo),
      404,
      /não encontrado/i,
    );
    await expectHttpErro(
      atualizarItem(USUARIO_A, "item-inexistente", { nome: "X" }, repo),
      404,
      /não encontrado/i,
    );
    await expectHttpErro(
      excluirItem(USUARIO_A, "item-inexistente", repo),
      404,
      /não encontrado/i,
    );
  });

  it("o dono atualiza e exclui o próprio item", async () => {
    const repo = criarRepoEmMemoria();
    const criado = await criarItem(
      USUARIO_A,
      { nome: "Sauvage", tipoColecao: "PERFUME" },
      repo,
    );

    const atualizado = await atualizarItem(
      USUARIO_A,
      criado.id,
      { nome: "Sauvage Elixir", ficha: FICHA_PERFUME },
      repo,
    );

    expect(atualizado.nome).toBe("Sauvage Elixir");
    expect(atualizado.ficha).toEqual(FICHA_PERFUME);

    await excluirItem(USUARIO_A, criado.id, repo);

    await expectHttpErro(
      obterItem(USUARIO_A, criado.id, repo),
      404,
      /não encontrado/i,
    );
    expect(repo.itens).toHaveLength(0);
  });

  it("rejeita ficha inválida no patch com 400", async () => {
    const repo = criarRepoEmMemoria();
    const criado = await criarItem(
      USUARIO_A,
      { nome: "Sauvage", tipoColecao: "PERFUME" },
      repo,
    );

    await expectHttpErro(
      atualizarItem(
        USUARIO_A,
        criado.id,
        { ficha: { destilaria: "Macallan" } },
        repo,
      ),
      400,
      /ficha/i,
    );
    expect(await obterItem(USUARIO_A, criado.id, repo)).toMatchObject({
      ficha: {},
    });
  });
});
