import { describe, expect, it } from "vitest";
import { HttpErro } from "../isolamento";
import {
  atualizarCampoExtra,
  atualizarItemComExtras,
  criarCampoExtra,
  excluirCampoExtra,
  listarCamposExtra,
  obterItemComExtras,
  type CampoExtraDef,
  type CampoExtraDefDados,
  type CampoExtraDefRepo,
  type CampoExtraValor,
  type CampoExtraValorDados,
  type CampoExtraValorRepo,
} from "./campos-extra";
import {
  criarItem,
  type Item,
  type ItemDados,
  type ItemRepo,
} from "./itens";

const USUARIO_A = "user-a";
const USUARIO_B = "user-b";

function criarRepoItensEmMemoria(iniciais: Item[] = []): ItemRepo & {
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

function criarReposExtraEmMemoria(iniciais: {
  defs?: CampoExtraDef[];
  valores?: CampoExtraValor[];
} = []): {
  defs: CampoExtraDefRepo & { itens: CampoExtraDef[] };
  valores: CampoExtraValorRepo & { itens: CampoExtraValor[] };
} {
  const defs: CampoExtraDef[] = [...(iniciais.defs ?? [])];
  const valores: CampoExtraValor[] = [...(iniciais.valores ?? [])];
  let sequenciaDef = defs.length;
  let sequenciaValor = valores.length;

  const repoDefs: CampoExtraDefRepo & { itens: CampoExtraDef[] } = {
    itens: defs,
    async create(data: CampoExtraDefDados) {
      sequenciaDef += 1;
      const def: CampoExtraDef = { ...data, id: `def-${sequenciaDef}` };
      defs.push(def);
      return def;
    },
    async findMany(filtro) {
      return defs.filter(
        (def) =>
          def.usuarioId === filtro.usuarioId &&
          def.tipoColecao === filtro.tipoColecao,
      );
    },
    async findById(id) {
      return defs.find((def) => def.id === id) ?? null;
    },
    async findByNome(usuarioId, tipoColecao, nome) {
      return (
        defs.find(
          (def) =>
            def.usuarioId === usuarioId &&
            def.tipoColecao === tipoColecao &&
            def.nome === nome,
        ) ?? null
      );
    },
    async update(id, data) {
      const indice = defs.findIndex((def) => def.id === id);
      const atual = defs[indice];
      if (indice < 0 || !atual) {
        throw new Error(`Definição ${id} não existe no repositório fake.`);
      }
      const atualizada: CampoExtraDef = { ...atual, ...data };
      defs[indice] = atualizada;
      return atualizada;
    },
    async delete(id) {
      const indice = defs.findIndex((def) => def.id === id);
      if (indice >= 0) {
        defs.splice(indice, 1);
      }
      for (let i = valores.length - 1; i >= 0; i -= 1) {
        if (valores[i]?.definicaoId === id) {
          valores.splice(i, 1);
        }
      }
    },
  };

  const repoValores: CampoExtraValorRepo & { itens: CampoExtraValor[] } = {
    itens: valores,
    async findManyByAlvo(alvoTipo, alvoId) {
      return valores.filter(
        (valor) => valor.alvoTipo === alvoTipo && valor.alvoId === alvoId,
      );
    },
    async upsert(data: CampoExtraValorDados) {
      const indice = valores.findIndex(
        (valor) =>
          valor.definicaoId === data.definicaoId &&
          valor.alvoTipo === data.alvoTipo &&
          valor.alvoId === data.alvoId,
      );
      if (indice >= 0) {
        const atualizado: CampoExtraValor = {
          ...valores[indice]!,
          valorTexto: data.valorTexto,
          valorNumero: data.valorNumero,
        };
        valores[indice] = atualizado;
        return atualizado;
      }
      sequenciaValor += 1;
      const criado: CampoExtraValor = { ...data, id: `val-${sequenciaValor}` };
      valores.push(criado);
      return criado;
    },
  };

  return { defs: repoDefs, valores: repoValores };
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

describe("criarCampoExtra / listarCamposExtra", () => {
  it("cria definição TEXTO 'batch code' para PERFUME", async () => {
    const extras = criarReposExtraEmMemoria();

    const def = await criarCampoExtra(
      USUARIO_A,
      { tipoColecao: "PERFUME", nome: "  batch code  ", tipoValor: "TEXTO" },
      extras.defs,
    );

    expect(def).toMatchObject({
      usuarioId: USUARIO_A,
      tipoColecao: "PERFUME",
      nome: "batch code",
      tipoValor: "TEXTO",
    });
    expect(def.id).toBeTruthy();
    expect(extras.defs.itens).toHaveLength(1);
  });

  it("cria definição NUMERO", async () => {
    const extras = criarReposExtraEmMemoria();

    const def = await criarCampoExtra(
      USUARIO_A,
      { tipoColecao: "WHISKY", nome: "idade", tipoValor: "NUMERO" },
      extras.defs,
    );

    expect(def.tipoValor).toBe("NUMERO");
  });

  it("aceita PC_BUILD como tipoColecao da definição", async () => {
    const extras = criarReposExtraEmMemoria();

    const def = await criarCampoExtra(
      USUARIO_A,
      { tipoColecao: "PC_BUILD", nome: "voltagem", tipoValor: "NUMERO" },
      extras.defs,
    );

    expect(def.tipoColecao).toBe("PC_BUILD");
  });

  it("lista só as definições do usuário e da coleção", async () => {
    const extras = criarReposExtraEmMemoria();

    await criarCampoExtra(
      USUARIO_A,
      { tipoColecao: "PERFUME", nome: "batch code", tipoValor: "TEXTO" },
      extras.defs,
    );
    await criarCampoExtra(
      USUARIO_A,
      { tipoColecao: "TENIS", nome: "caixa", tipoValor: "TEXTO" },
      extras.defs,
    );
    await criarCampoExtra(
      USUARIO_B,
      { tipoColecao: "PERFUME", nome: "batch code", tipoValor: "TEXTO" },
      extras.defs,
    );

    const lista = await listarCamposExtra(
      USUARIO_A,
      { tipoColecao: "PERFUME" },
      extras.defs,
    );

    expect(lista).toHaveLength(1);
    expect(lista[0]?.nome).toBe("batch code");
    expect(lista[0]?.usuarioId).toBe(USUARIO_A);
  });

  it("rejeita nome duplicado na mesma coleção do usuário com 409 em pt-BR", async () => {
    const extras = criarReposExtraEmMemoria();
    await criarCampoExtra(
      USUARIO_A,
      { tipoColecao: "PERFUME", nome: "batch code", tipoValor: "TEXTO" },
      extras.defs,
    );

    const erro = await expectHttpErro(
      criarCampoExtra(
        USUARIO_A,
        { tipoColecao: "PERFUME", nome: "batch code", tipoValor: "TEXTO" },
        extras.defs,
      ),
      409,
      /já existe/i,
    );

    expect(erro.mensagem.length).toBeGreaterThan(0);
    expect(extras.defs.itens).toHaveLength(1);
  });

  it("permite o mesmo nome em outra coleção ou outro usuário", async () => {
    const extras = criarReposExtraEmMemoria();

    await criarCampoExtra(
      USUARIO_A,
      { tipoColecao: "PERFUME", nome: "batch code", tipoValor: "TEXTO" },
      extras.defs,
    );
    await criarCampoExtra(
      USUARIO_A,
      { tipoColecao: "WHISKY", nome: "batch code", tipoValor: "TEXTO" },
      extras.defs,
    );
    await criarCampoExtra(
      USUARIO_B,
      { tipoColecao: "PERFUME", nome: "batch code", tipoValor: "TEXTO" },
      extras.defs,
    );

    expect(extras.defs.itens).toHaveLength(3);
  });

  it("rejeita tipoColecao, tipoValor ou nome inválidos com 400 em pt-BR", async () => {
    const extras = criarReposExtraEmMemoria();

    await expectHttpErro(
      criarCampoExtra(
        USUARIO_A,
        { tipoColecao: "PERFUME", nome: "   ", tipoValor: "TEXTO" },
        extras.defs,
      ),
      400,
      /nome/i,
    );
    await expectHttpErro(
      criarCampoExtra(
        USUARIO_A,
        { nome: "batch code", tipoValor: "TEXTO" },
        extras.defs,
      ),
      400,
      /tipo/i,
    );
    await expectHttpErro(
      criarCampoExtra(
        USUARIO_A,
        { tipoColecao: "INVALIDO", nome: "batch code", tipoValor: "TEXTO" },
        extras.defs,
      ),
      400,
      /tipo/i,
    );
    await expectHttpErro(
      criarCampoExtra(
        USUARIO_A,
        { tipoColecao: "PERFUME", nome: "batch code", tipoValor: "BOOLEAN" },
        extras.defs,
      ),
      400,
      /tipo/i,
    );
    expect(extras.defs.itens).toHaveLength(0);
  });

  it("rejeita nome com 201 caracteres com 400 citando nome", async () => {
    const extras = criarReposExtraEmMemoria();

    await expectHttpErro(
      criarCampoExtra(
        USUARIO_A,
        {
          tipoColecao: "PERFUME",
          nome: "a".repeat(201),
          tipoValor: "TEXTO",
        },
        extras.defs,
      ),
      400,
      /nome/i,
    );
    expect(extras.defs.itens).toHaveLength(0);
  });
});

describe("atualizarCampoExtra / excluirCampoExtra", () => {
  it("o dono renomeia a definição; outro usuário recebe 404", async () => {
    const extras = criarReposExtraEmMemoria();
    const def = await criarCampoExtra(
      USUARIO_A,
      { tipoColecao: "PERFUME", nome: "batch code", tipoValor: "TEXTO" },
      extras.defs,
    );

    const atualizada = await atualizarCampoExtra(
      USUARIO_A,
      def.id,
      { nome: "código do lote" },
      extras.defs,
    );
    expect(atualizada.nome).toBe("código do lote");

    await expectHttpErro(
      atualizarCampoExtra(USUARIO_B, def.id, { nome: "hack" }, extras.defs),
      404,
      /não encontrado/i,
    );
    await expectHttpErro(
      excluirCampoExtra(USUARIO_B, def.id, extras.defs),
      404,
      /não encontrado/i,
    );
    expect(await listarCamposExtra(USUARIO_A, { tipoColecao: "PERFUME" }, extras.defs)).toHaveLength(
      1,
    );
  });

  it("renomear para um nome já usado na coleção retorna 409", async () => {
    const extras = criarReposExtraEmMemoria();
    await criarCampoExtra(
      USUARIO_A,
      { tipoColecao: "PERFUME", nome: "batch code", tipoValor: "TEXTO" },
      extras.defs,
    );
    const outra = await criarCampoExtra(
      USUARIO_A,
      { tipoColecao: "PERFUME", nome: "concentração", tipoValor: "TEXTO" },
      extras.defs,
    );

    await expectHttpErro(
      atualizarCampoExtra(
        USUARIO_A,
        outra.id,
        { nome: "batch code" },
        extras.defs,
      ),
      409,
      /já existe/i,
    );
  });

  it("get/patch/delete retornam 404 se a definição não existe", async () => {
    const extras = criarReposExtraEmMemoria();

    await expectHttpErro(
      atualizarCampoExtra(
        USUARIO_A,
        "def-inexistente",
        { nome: "x" },
        extras.defs,
      ),
      404,
      /não encontrado/i,
    );
    await expectHttpErro(
      excluirCampoExtra(USUARIO_A, "def-inexistente", extras.defs),
      404,
      /não encontrado/i,
    );
  });
});

describe("extras no GET/PATCH do item", () => {
  it("grava extra 'batch code' no PERFUME e devolve no GET do item", async () => {
    const itens = criarRepoItensEmMemoria();
    const extras = criarReposExtraEmMemoria();
    const def = await criarCampoExtra(
      USUARIO_A,
      { tipoColecao: "PERFUME", nome: "batch code", tipoValor: "TEXTO" },
      extras.defs,
    );
    const item = await criarItem(
      USUARIO_A,
      { nome: "Sauvage", tipoColecao: "PERFUME" },
      itens,
    );

    const atualizado = await atualizarItemComExtras(
      USUARIO_A,
      item.id,
      { extras: [{ definicaoId: def.id, valorTexto: "8N01" }] },
      itens,
      extras,
    );
    const lido = await obterItemComExtras(USUARIO_A, item.id, itens, extras);

    expect(atualizado.extras).toEqual([
      {
        definicaoId: def.id,
        nome: "batch code",
        tipoValor: "TEXTO",
        valorTexto: "8N01",
        valorNumero: null,
      },
    ]);
    expect(lido.extras).toEqual(atualizado.extras);
  });

  it("rejeita valorTexto com 4001 caracteres com 400", async () => {
    const itens = criarRepoItensEmMemoria();
    const extras = criarReposExtraEmMemoria();
    const def = await criarCampoExtra(
      USUARIO_A,
      { tipoColecao: "PERFUME", nome: "batch code", tipoValor: "TEXTO" },
      extras.defs,
    );
    const item = await criarItem(
      USUARIO_A,
      { nome: "Sauvage", tipoColecao: "PERFUME" },
      itens,
    );

    await expectHttpErro(
      atualizarItemComExtras(
        USUARIO_A,
        item.id,
        { extras: [{ definicaoId: def.id, valorTexto: "x".repeat(4001) }] },
        itens,
        extras,
      ),
      400,
      /valorTexto/i,
    );
    expect(extras.valores.itens).toHaveLength(0);
  });

  it("permite valor vazio no extra de texto e de número", async () => {
    const itens = criarRepoItensEmMemoria();
    const extras = criarReposExtraEmMemoria();
    const texto = await criarCampoExtra(
      USUARIO_A,
      { tipoColecao: "PERFUME", nome: "batch code", tipoValor: "TEXTO" },
      extras.defs,
    );
    const numero = await criarCampoExtra(
      USUARIO_A,
      { tipoColecao: "PERFUME", nome: "ml restantes", tipoValor: "NUMERO" },
      extras.defs,
    );
    const item = await criarItem(
      USUARIO_A,
      { nome: "Sauvage", tipoColecao: "PERFUME" },
      itens,
    );

    const atualizado = await atualizarItemComExtras(
      USUARIO_A,
      item.id,
      {
        extras: [
          { definicaoId: texto.id, valorTexto: "" },
          { definicaoId: numero.id, valorNumero: null },
        ],
      },
      itens,
      extras,
    );

    expect(atualizado.extras).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          definicaoId: texto.id,
          valorTexto: null,
          valorNumero: null,
        }),
        expect.objectContaining({
          definicaoId: numero.id,
          valorTexto: null,
          valorNumero: null,
        }),
      ]),
    );
  });

  it("extra NUMERO grava em valorNumero", async () => {
    const itens = criarRepoItensEmMemoria();
    const extras = criarReposExtraEmMemoria();
    const def = await criarCampoExtra(
      USUARIO_A,
      { tipoColecao: "WHISKY", nome: "idade", tipoValor: "NUMERO" },
      extras.defs,
    );
    const item = await criarItem(
      USUARIO_A,
      { nome: "Macallan", tipoColecao: "WHISKY" },
      itens,
    );

    const atualizado = await atualizarItemComExtras(
      USUARIO_A,
      item.id,
      { extras: [{ definicaoId: def.id, valorNumero: 18.5 }] },
      itens,
      extras,
    );

    expect(atualizado.extras).toEqual([
      {
        definicaoId: def.id,
        nome: "idade",
        tipoValor: "NUMERO",
        valorTexto: null,
        valorNumero: 18.5,
      },
    ]);
  });

  it("GET do item inclui definições ainda sem valor preenchido", async () => {
    const itens = criarRepoItensEmMemoria();
    const extras = criarReposExtraEmMemoria();
    const def = await criarCampoExtra(
      USUARIO_A,
      { tipoColecao: "PERFUME", nome: "batch code", tipoValor: "TEXTO" },
      extras.defs,
    );
    const item = await criarItem(
      USUARIO_A,
      { nome: "Sauvage", tipoColecao: "PERFUME" },
      itens,
    );

    const lido = await obterItemComExtras(USUARIO_A, item.id, itens, extras);

    expect(lido.extras).toEqual([
      {
        definicaoId: def.id,
        nome: "batch code",
        tipoValor: "TEXTO",
        valorTexto: null,
        valorNumero: null,
      },
    ]);
  });

  it("excluir a definição remove o valor no GET do item", async () => {
    const itens = criarRepoItensEmMemoria();
    const extras = criarReposExtraEmMemoria();
    const def = await criarCampoExtra(
      USUARIO_A,
      { tipoColecao: "PERFUME", nome: "batch code", tipoValor: "TEXTO" },
      extras.defs,
    );
    const item = await criarItem(
      USUARIO_A,
      { nome: "Sauvage", tipoColecao: "PERFUME" },
      itens,
    );
    await atualizarItemComExtras(
      USUARIO_A,
      item.id,
      { extras: [{ definicaoId: def.id, valorTexto: "8N01" }] },
      itens,
      extras,
    );

    await excluirCampoExtra(USUARIO_A, def.id, extras.defs);

    expect(extras.defs.itens).toHaveLength(0);
    expect(extras.valores.itens).toHaveLength(0);
    const lido = await obterItemComExtras(USUARIO_A, item.id, itens, extras);
    expect(lido.extras).toEqual([]);
  });

  it("não grava extra de outro usuário nem de outra coleção", async () => {
    const itens = criarRepoItensEmMemoria();
    const extras = criarReposExtraEmMemoria();
    const defB = await criarCampoExtra(
      USUARIO_B,
      { tipoColecao: "PERFUME", nome: "batch code", tipoValor: "TEXTO" },
      extras.defs,
    );
    const defTenis = await criarCampoExtra(
      USUARIO_A,
      { tipoColecao: "TENIS", nome: "caixa", tipoValor: "TEXTO" },
      extras.defs,
    );
    const item = await criarItem(
      USUARIO_A,
      { nome: "Sauvage", tipoColecao: "PERFUME" },
      itens,
    );

    await expectHttpErro(
      atualizarItemComExtras(
        USUARIO_A,
        item.id,
        { extras: [{ definicaoId: defB.id, valorTexto: "x" }] },
        itens,
        extras,
      ),
      404,
      /não encontrado/i,
    );
    await expectHttpErro(
      atualizarItemComExtras(
        USUARIO_A,
        item.id,
        { extras: [{ definicaoId: defTenis.id, valorTexto: "x" }] },
        itens,
        extras,
      ),
      400,
      /coleção/i,
    );
  });
});
