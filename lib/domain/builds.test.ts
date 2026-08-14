import { describe, expect, it } from "vitest";
import { HttpErro } from "../isolamento";
import {
  atualizarBuild,
  criarBuild,
  excluirBuild,
  listarBuilds,
  obterBuild,
  type Build,
  type BuildAtualizacao,
  type BuildDados,
  type BuildPeca,
  type BuildPecaDados,
  type BuildRepo,
} from "./builds";
import {
  criarItem,
  type Item,
  type ItemDados,
  type ItemRepo,
} from "./itens";

const USUARIO_A = "user-a";
const USUARIO_B = "user-b";

type BuildPecaLinha = BuildPecaDados & { id: string; buildId: string };

function criarItemRepo(iniciais: Item[] = []): ItemRepo & { itens: Item[] } {
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

function criarBuildRepo(): BuildRepo & {
  builds: Build[];
  pecas: BuildPecaLinha[];
} {
  const builds: Build[] = [];
  const pecas: BuildPecaLinha[] = [];
  let sequenciaBuild = 0;
  let sequenciaPeca = 0;

  function pecasDoBuild(buildId: string): BuildPeca[] {
    return pecas
      .filter((peca) => peca.buildId === buildId)
      .map(({ id, buildId: pecaBuildId, tipoPeca, nome, ficha, notas }) => ({
        id,
        buildId: pecaBuildId,
        tipoPeca,
        nome,
        ficha,
        notas,
      }));
  }

  function montar(build: Omit<Build, "pecas">): Build {
    return { ...build, pecas: pecasDoBuild(build.id) };
  }

  function gravarPecas(buildId: string, novas: BuildPecaDados[]) {
    for (let i = pecas.length - 1; i >= 0; i -= 1) {
      if (pecas[i]?.buildId === buildId) {
        pecas.splice(i, 1);
      }
    }
    for (const peca of novas) {
      sequenciaPeca += 1;
      pecas.push({
        id: `peca-${sequenciaPeca}`,
        buildId,
        tipoPeca: peca.tipoPeca,
        nome: peca.nome,
        ficha: peca.ficha,
        notas: peca.notas,
      });
    }
  }

  return {
    builds,
    pecas,
    async create(data: BuildDados) {
      sequenciaBuild += 1;
      const id = `build-${sequenciaBuild}`;
      const build: Omit<Build, "pecas"> = {
        id,
        usuarioId: data.usuarioId,
        nome: data.nome,
        descricao: data.descricao,
        notasPessoais: data.notasPessoais,
      };
      builds.push(build as Build);
      gravarPecas(id, data.pecas);
      return montar(build);
    },
    async findMany(usuarioId) {
      return builds
        .filter((build) => build.usuarioId === usuarioId)
        .map((build) => montar(build));
    },
    async findById(id) {
      const build = builds.find((encontrado) => encontrado.id === id);
      return build ? montar(build) : null;
    },
    async update(id, data: BuildAtualizacao) {
      const indice = builds.findIndex((build) => build.id === id);
      const atual = builds[indice];
      if (indice < 0 || !atual) {
        throw new Error(`Build ${id} não existe no repositório fake.`);
      }
      if (data.pecas !== undefined) {
        gravarPecas(id, data.pecas);
      }
      const atualizado: Omit<Build, "pecas"> = {
        id: atual.id,
        usuarioId: atual.usuarioId,
        nome: data.nome ?? atual.nome,
        descricao:
          data.descricao !== undefined ? data.descricao : atual.descricao,
        notasPessoais:
          data.notasPessoais !== undefined
            ? data.notasPessoais
            : atual.notasPessoais,
      };
      builds[indice] = atualizado as Build;
      return montar(atualizado);
    },
    async delete(id) {
      for (let i = pecas.length - 1; i >= 0; i -= 1) {
        if (pecas[i]?.buildId === id) {
          pecas.splice(i, 1);
        }
      }
      const indice = builds.findIndex((build) => build.id === id);
      if (indice >= 0) {
        builds.splice(indice, 1);
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

describe("criarBuild", () => {
  it("cria o build PC da sala com GPU vram_gb 8 e CPU, sem criar item (RN-07)", async () => {
    const builds = criarBuildRepo();
    const itens = criarItemRepo();

    const build = await criarBuild(
      USUARIO_A,
      {
        nome: "  PC da sala  ",
        descricao: "setup do living",
        notasPessoais: "cabos atrás do rack",
        pecas: [
          {
            tipoPeca: "GPU",
            nome: "RTX 3060",
            ficha: { marca: "NVIDIA", vram_gb: 8, clock_mhz: 1777 },
          },
          { tipoPeca: "CPU", nome: "Ryzen 5 5600", ficha: { nucleos: 6 } },
        ],
      },
      builds,
    );

    expect(build.nome).toBe("PC da sala");
    expect(build.usuarioId).toBe(USUARIO_A);
    expect(build.descricao).toBe("setup do living");
    expect(build.notasPessoais).toBe("cabos atrás do rack");
    expect(build.pecas).toHaveLength(2);

    const gpu = build.pecas.find((peca) => peca.tipoPeca === "GPU");
    expect(gpu?.nome).toBe("RTX 3060");
    expect(gpu?.ficha).toEqual({
      marca: "NVIDIA",
      vram_gb: 8,
      clock_mhz: 1777,
    });
    expect(gpu?.ficha.vram_gb).toBe(8);
    expect(gpu).not.toHaveProperty("itemId");

    const cpu = build.pecas.find((peca) => peca.tipoPeca === "CPU");
    expect(cpu?.nome).toBe("Ryzen 5 5600");
    expect(cpu?.ficha).toEqual({ nucleos: 6 });

    expect(itens.itens).toHaveLength(0);
    expect(builds.pecas).toHaveLength(2);
  });

  it("permite várias peças do mesmo tipo", async () => {
    const builds = criarBuildRepo();

    const build = await criarBuild(
      USUARIO_A,
      {
        nome: "Dual RAM",
        pecas: [
          { tipoPeca: "RAM", nome: "Kit A", ficha: { capacidade_gb: 16 } },
          { tipoPeca: "RAM", nome: "Kit B", ficha: { capacidade_gb: 16 } },
        ],
      },
      builds,
    );

    expect(build.pecas).toHaveLength(2);
    expect(build.pecas.every((peca) => peca.tipoPeca === "RAM")).toBe(true);
  });

  it("cria build só com nome e sem peças", async () => {
    const builds = criarBuildRepo();

    const build = await criarBuild(USUARIO_A, { nome: "Vazio" }, builds);

    expect(build.pecas).toEqual([]);
    expect(build.descricao).toBeNull();
    expect(build.notasPessoais).toBeNull();
  });

  it("rejeita nome vazio do build com 400 em pt-BR (RN-02)", async () => {
    const builds = criarBuildRepo();

    await expectHttpErro(
      criarBuild(USUARIO_A, { nome: "   " }, builds),
      400,
      /nome/i,
    );
    await expectHttpErro(criarBuild(USUARIO_A, {}, builds), 400, /nome/i);
    expect(builds.builds).toHaveLength(0);
  });

  it("rejeita nome com 201 caracteres com 400 citando nome", async () => {
    const builds = criarBuildRepo();

    await expectHttpErro(
      criarBuild(USUARIO_A, { nome: "a".repeat(201) }, builds),
      400,
      /nome/i,
    );
    expect(builds.builds).toHaveLength(0);
  });

  it("rejeita descricao com 4001 caracteres com 400", async () => {
    const builds = criarBuildRepo();

    await expectHttpErro(
      criarBuild(
        USUARIO_A,
        { nome: "PC da sala", descricao: "x".repeat(4001) },
        builds,
      ),
      400,
      /descricao/i,
    );
    expect(builds.builds).toHaveLength(0);
  });

  it("rejeita peça sem nome com 400", async () => {
    const builds = criarBuildRepo();

    await expectHttpErro(
      criarBuild(
        USUARIO_A,
        {
          nome: "PC da sala",
          pecas: [{ tipoPeca: "GPU", nome: "  ", ficha: { vram_gb: 8 } }],
        },
        builds,
      ),
      400,
      /nome/i,
    );
    expect(builds.builds).toHaveLength(0);
    expect(builds.pecas).toHaveLength(0);
  });

  it("rejeita peça com nome de 201 caracteres com 400", async () => {
    const builds = criarBuildRepo();

    await expectHttpErro(
      criarBuild(
        USUARIO_A,
        {
          nome: "PC da sala",
          pecas: [
            {
              tipoPeca: "GPU",
              nome: "a".repeat(201),
              ficha: { vram_gb: 8 },
            },
          ],
        },
        builds,
      ),
      400,
      /nome/i,
    );
    expect(builds.builds).toHaveLength(0);
    expect(builds.pecas).toHaveLength(0);
  });

  it("rejeita chave desconhecida na ficha da peça com 400 (RN-06)", async () => {
    const builds = criarBuildRepo();

    await expectHttpErro(
      criarBuild(
        USUARIO_A,
        {
          nome: "PC da sala",
          pecas: [
            {
              tipoPeca: "GPU",
              nome: "RTX 3060",
              ficha: { vram_gb: 8, wattage: 200 },
            },
          ],
        },
        builds,
      ),
      400,
      /ficha/i,
    );
    expect(builds.pecas).toHaveLength(0);
  });

  it("rejeita tipo de peça inválido, inclusive GADGET, com 400 (RN-07)", async () => {
    const builds = criarBuildRepo();

    await expectHttpErro(
      criarBuild(
        USUARIO_A,
        {
          nome: "PC da sala",
          pecas: [{ tipoPeca: "GADGET", nome: "Mouse" }],
        },
        builds,
      ),
      400,
      /tipo/i,
    );
    await expectHttpErro(
      criarBuild(
        USUARIO_A,
        {
          nome: "PC da sala",
          pecas: [{ tipoPeca: "PLACA_DE_VIDEO", nome: "GPU" }],
        },
        builds,
      ),
      400,
      /tipo/i,
    );
    expect(builds.builds).toHaveLength(0);
  });
});

describe("obterBuild / listarBuilds / atualizarBuild / excluirBuild", () => {
  it("GET devolve peças com ficha estruturada (vram_gb)", async () => {
    const builds = criarBuildRepo();
    const criado = await criarBuild(
      USUARIO_A,
      {
        nome: "PC da sala",
        pecas: [
          { tipoPeca: "GPU", nome: "RTX 3060", ficha: { vram_gb: 8 } },
          { tipoPeca: "CPU", nome: "Ryzen 5 5600" },
        ],
      },
      builds,
    );

    const obtido = await obterBuild(USUARIO_A, criado.id, builds);
    const gpu = obtido.pecas.find((peca) => peca.tipoPeca === "GPU");

    expect(obtido.nome).toBe("PC da sala");
    expect(gpu?.ficha).toEqual({ vram_gb: 8 });
    expect(typeof gpu?.ficha.vram_gb).toBe("number");
  });

  it("lista só os builds do usuário (RN-05)", async () => {
    const builds = criarBuildRepo();
    await criarBuild(USUARIO_A, { nome: "PC da sala" }, builds);
    await criarBuild(USUARIO_B, { nome: "PC do quarto" }, builds);

    const lista = await listarBuilds(USUARIO_A, builds);

    expect(lista).toHaveLength(1);
    expect(lista[0]?.nome).toBe("PC da sala");
    expect(lista.every((build) => build.usuarioId === USUARIO_A)).toBe(true);
  });

  it("get/patch/delete retornam 404 se o build é de outro usuário", async () => {
    const builds = criarBuildRepo();
    const alheio = await criarBuild(USUARIO_B, { nome: "PC do quarto" }, builds);

    await expectHttpErro(
      obterBuild(USUARIO_A, alheio.id, builds),
      404,
      /não encontrado/i,
    );
    await expectHttpErro(
      atualizarBuild(USUARIO_A, alheio.id, { nome: "Hack" }, builds),
      404,
      /não encontrado/i,
    );
    await expectHttpErro(
      excluirBuild(USUARIO_A, alheio.id, builds),
      404,
      /não encontrado/i,
    );

    expect(await obterBuild(USUARIO_B, alheio.id, builds)).toMatchObject({
      nome: "PC do quarto",
    });
  });

  it("o dono atualiza nome e substitui a lista de peças", async () => {
    const builds = criarBuildRepo();
    const criado = await criarBuild(
      USUARIO_A,
      {
        nome: "Inicial",
        pecas: [{ tipoPeca: "GPU", nome: "GTX 1660", ficha: { vram_gb: 6 } }],
      },
      builds,
    );

    const atualizado = await atualizarBuild(
      USUARIO_A,
      criado.id,
      {
        nome: "PC da sala",
        pecas: [
          { tipoPeca: "GPU", nome: "RTX 3060", ficha: { vram_gb: 8 } },
          { tipoPeca: "CPU", nome: "Ryzen 5 5600" },
        ],
      },
      builds,
    );

    expect(atualizado.nome).toBe("PC da sala");
    expect(atualizado.pecas).toHaveLength(2);
    expect(
      atualizado.pecas.find((peca) => peca.tipoPeca === "GPU")?.ficha,
    ).toEqual({ vram_gb: 8 });
    expect(builds.pecas).toHaveLength(2);
  });

  it("rejeita ficha inválida no PATCH e não altera as peças", async () => {
    const builds = criarBuildRepo();
    const criado = await criarBuild(
      USUARIO_A,
      {
        nome: "PC da sala",
        pecas: [{ tipoPeca: "GPU", nome: "RTX 3060", ficha: { vram_gb: 8 } }],
      },
      builds,
    );

    await expectHttpErro(
      atualizarBuild(
        USUARIO_A,
        criado.id,
        {
          pecas: [
            {
              tipoPeca: "GPU",
              nome: "RTX 3060",
              ficha: { vram_gb: 8, wattage: 200 },
            },
          ],
        },
        builds,
      ),
      400,
      /ficha/i,
    );

    expect(await obterBuild(USUARIO_A, criado.id, builds)).toMatchObject({
      pecas: [{ tipoPeca: "GPU", nome: "RTX 3060", ficha: { vram_gb: 8 } }],
    });
  });

  it("excluir build remove as peças em cascade", async () => {
    const builds = criarBuildRepo();
    const criado = await criarBuild(
      USUARIO_A,
      {
        nome: "PC da sala",
        pecas: [
          { tipoPeca: "GPU", nome: "RTX 3060", ficha: { vram_gb: 8 } },
          { tipoPeca: "CPU", nome: "Ryzen 5 5600" },
        ],
      },
      builds,
    );

    await excluirBuild(USUARIO_A, criado.id, builds);

    await expectHttpErro(
      obterBuild(USUARIO_A, criado.id, builds),
      404,
      /não encontrado/i,
    );
    expect(builds.builds).toHaveLength(0);
    expect(builds.pecas).toHaveLength(0);
  });

  it("excluir build limpa fotos do BUILD e de cada PECA", async () => {
    const builds = criarBuildRepo();
    const criado = await criarBuild(
      USUARIO_A,
      {
        nome: "PC da sala",
        pecas: [
          { tipoPeca: "GPU", nome: "RTX 3060", ficha: { vram_gb: 8 } },
          { tipoPeca: "CPU", nome: "Ryzen 5 5600" },
        ],
      },
      builds,
    );
    const limpezas: { donoTipo: string; donoId: string }[] = [];

    await excluirBuild(USUARIO_A, criado.id, builds, async (_uid, donoTipo, donoId) => {
      limpezas.push({ donoTipo, donoId });
    });

    expect(limpezas).toEqual([
      { donoTipo: "BUILD", donoId: criado.id },
      { donoTipo: "PECA", donoId: criado.pecas[0]?.id },
      { donoTipo: "PECA", donoId: criado.pecas[1]?.id },
    ]);
  });

  it("peça de build não vira gadget no inventário (RN-07)", async () => {
    const builds = criarBuildRepo();
    const itens = criarItemRepo();
    await criarItem(
      USUARIO_A,
      { nome: "iPhone", tipoColecao: "GADGET" },
      itens,
    );

    await criarBuild(
      USUARIO_A,
      {
        nome: "PC da sala",
        pecas: [{ tipoPeca: "GPU", nome: "RTX 3060", ficha: { vram_gb: 8 } }],
      },
      builds,
    );

    expect(itens.itens).toHaveLength(1);
    expect(itens.itens[0]?.tipoColecao).toBe("GADGET");
    expect(itens.itens[0]?.nome).toBe("iPhone");
    expect(builds.pecas[0]).not.toHaveProperty("itemId");
    expect(
      itens.itens.some((item) => item.nome === "RTX 3060"),
    ).toBe(false);
  });
});
