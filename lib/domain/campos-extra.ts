import { assertDono, HttpErro } from "../isolamento";
import { TIPOS_COLECAO_ITEM, type TipoColecao } from "./colecoes";
import {
  atualizarItem,
  obterItem,
  type Item,
  type ItemInput,
  type ItemRepo,
} from "./itens";

const TIPOS_COLECAO_OR_BUILD: readonly TipoColecao[] = [
  ...TIPOS_COLECAO_ITEM,
  "PC_BUILD",
];

const TIPOS_VALOR = ["TEXTO", "NUMERO"] as const;

export type TipoValorExtra = (typeof TIPOS_VALOR)[number];

export type AlvoExtra = "ITEM" | "WISHLIST" | "BUILD";

export type CampoExtraDefDados = {
  usuarioId: string;
  tipoColecao: TipoColecao;
  nome: string;
  tipoValor: TipoValorExtra;
};

export type CampoExtraDef = CampoExtraDefDados & { id: string };

export type CampoExtraDefAtualizacao = Partial<
  Pick<CampoExtraDefDados, "nome" | "tipoValor">
>;

export type CampoExtraDefInput = {
  tipoColecao?: unknown;
  nome?: unknown;
  tipoValor?: unknown;
};

export type CampoExtraDefRepo = {
  create(data: CampoExtraDefDados): Promise<CampoExtraDef>;
  findMany(filtro: {
    usuarioId: string;
    tipoColecao: TipoColecao;
  }): Promise<CampoExtraDef[]>;
  findById(id: string): Promise<CampoExtraDef | null>;
  findByNome(
    usuarioId: string,
    tipoColecao: TipoColecao,
    nome: string,
  ): Promise<CampoExtraDef | null>;
  update(id: string, data: CampoExtraDefAtualizacao): Promise<CampoExtraDef>;
  delete(id: string): Promise<void>;
};

export type CampoExtraValorDados = {
  definicaoId: string;
  alvoTipo: AlvoExtra;
  alvoId: string;
  valorTexto: string | null;
  valorNumero: number | null;
};

export type CampoExtraValor = CampoExtraValorDados & { id: string };

export type CampoExtraValorRepo = {
  findManyByAlvo(alvoTipo: AlvoExtra, alvoId: string): Promise<CampoExtraValor[]>;
  upsert(data: CampoExtraValorDados): Promise<CampoExtraValor>;
};

export type CampoExtraRepos = {
  defs: CampoExtraDefRepo;
  valores: CampoExtraValorRepo;
};

export type ExtraDoItem = {
  definicaoId: string;
  nome: string;
  tipoValor: TipoValorExtra;
  valorTexto: string | null;
  valorNumero: number | null;
};

export type ItemComExtras = Item & { extras: ExtraDoItem[] };

export type ItemInputComExtras = ItemInput & { extras?: unknown };

type CampoExtraDefLinha = {
  id: string;
  usuarioId: string;
  tipoColecao: string;
  nome: string;
  tipoValor: string;
};

type CampoExtraValorLinha = {
  id: string;
  definicaoId: string;
  alvoTipo: string;
  alvoId: string;
  valorTexto: string | null;
  valorNumero: { toString(): string } | number | string | null;
};

type PrismaCampoExtraDefDelegate = {
  create(args: { data: CampoExtraDefDados }): Promise<CampoExtraDefLinha>;
  findMany(args: {
    where: { usuarioId: string; tipoColecao: TipoColecao };
    orderBy?: { nome: "asc" | "desc" };
  }): Promise<CampoExtraDefLinha[]>;
  findUnique(args: {
    where:
      | { id: string }
      | {
          usuarioId_tipoColecao_nome: {
            usuarioId: string;
            tipoColecao: TipoColecao;
            nome: string;
          };
        };
  }): Promise<CampoExtraDefLinha | null>;
  update(args: {
    where: { id: string };
    data: CampoExtraDefAtualizacao;
  }): Promise<CampoExtraDefLinha>;
  delete(args: { where: { id: string } }): Promise<unknown>;
};

type PrismaCampoExtraValorDelegate = {
  findMany(args: {
    where: { alvoTipo: AlvoExtra; alvoId: string };
  }): Promise<CampoExtraValorLinha[]>;
  upsert(args: {
    where: {
      definicaoId_alvoTipo_alvoId: {
        definicaoId: string;
        alvoTipo: AlvoExtra;
        alvoId: string;
      };
    };
    create: CampoExtraValorDados;
    update: Pick<CampoExtraValorDados, "valorTexto" | "valorNumero">;
  }): Promise<CampoExtraValorLinha>;
};

const ERRO_NOME_DUPLICADO =
  "Já existe um campo extra com este nome nesta coleção.";

export function campoExtraReposPrisma(prisma: {
  campoExtraDef: object;
  campoExtraValor: object;
}): CampoExtraRepos {
  const defs = prisma.campoExtraDef as PrismaCampoExtraDefDelegate;
  const valores = prisma.campoExtraValor as PrismaCampoExtraValorDelegate;
  return {
    defs: {
      async create(data) {
        try {
          return mapearDef(await defs.create({ data }));
        } catch (erro) {
          lancarSeUnicidade(erro);
          throw erro;
        }
      },
      async findMany(filtro) {
        const linhas = await defs.findMany({
          where: filtro,
          orderBy: { nome: "asc" },
        });
        return linhas.map(mapearDef);
      },
      async findById(id) {
        const linha = await defs.findUnique({ where: { id } });
        return linha ? mapearDef(linha) : null;
      },
      async findByNome(usuarioId, tipoColecao, nome) {
        const linha = await defs.findUnique({
          where: {
            usuarioId_tipoColecao_nome: { usuarioId, tipoColecao, nome },
          },
        });
        return linha ? mapearDef(linha) : null;
      },
      async update(id, data) {
        try {
          return mapearDef(await defs.update({ where: { id }, data }));
        } catch (erro) {
          lancarSeUnicidade(erro);
          throw erro;
        }
      },
      async delete(id) {
        await defs.delete({ where: { id } });
      },
    },
    valores: {
      async findManyByAlvo(alvoTipo, alvoId) {
        const linhas = await valores.findMany({
          where: { alvoTipo, alvoId },
        });
        return linhas.map(mapearValor);
      },
      async upsert(data) {
        return mapearValor(
          await valores.upsert({
            where: {
              definicaoId_alvoTipo_alvoId: {
                definicaoId: data.definicaoId,
                alvoTipo: data.alvoTipo,
                alvoId: data.alvoId,
              },
            },
            create: data,
            update: {
              valorTexto: data.valorTexto,
              valorNumero: data.valorNumero,
            },
          }),
        );
      },
    },
  };
}

export async function criarCampoExtra(
  usuarioId: string,
  input: CampoExtraDefInput,
  repo: CampoExtraDefRepo,
): Promise<CampoExtraDef> {
  const tipoColecao = exigirTipoColecaoOrBuild(input.tipoColecao);
  const nome = exigirNome(input.nome);
  const tipoValor = exigirTipoValor(input.tipoValor);
  await garantirNomeLivre(usuarioId, tipoColecao, nome, repo);
  return repo.create({ usuarioId, tipoColecao, nome, tipoValor });
}

export async function listarCamposExtra(
  usuarioId: string,
  filtro: { tipoColecao?: unknown },
  repo: CampoExtraDefRepo,
): Promise<CampoExtraDef[]> {
  const tipoColecao = exigirTipoColecaoOrBuild(filtro.tipoColecao);
  return repo.findMany({ usuarioId, tipoColecao });
}

export async function atualizarCampoExtra(
  usuarioId: string,
  id: string,
  input: CampoExtraDefInput,
  repo: CampoExtraDefRepo,
): Promise<CampoExtraDef> {
  const atual = await carregarDefDoDono(usuarioId, id, repo);
  const patch: CampoExtraDefAtualizacao = {};
  if (input.nome !== undefined) {
    patch.nome = exigirNome(input.nome);
  }
  if (input.tipoValor !== undefined) {
    patch.tipoValor = exigirTipoValor(input.tipoValor);
  }
  if (patch.nome !== undefined && patch.nome !== atual.nome) {
    await garantirNomeLivre(usuarioId, atual.tipoColecao, patch.nome, repo);
  }
  if (Object.keys(patch).length === 0) {
    return atual;
  }
  return repo.update(id, patch);
}

export async function excluirCampoExtra(
  usuarioId: string,
  id: string,
  repo: CampoExtraDefRepo,
): Promise<void> {
  await carregarDefDoDono(usuarioId, id, repo);
  await repo.delete(id);
}

export async function obterItemComExtras(
  usuarioId: string,
  id: string,
  itemRepo: ItemRepo,
  extras: CampoExtraRepos,
): Promise<ItemComExtras> {
  const item = await obterItem(usuarioId, id, itemRepo);
  return anexarExtras(item, extras);
}

export async function atualizarItemComExtras(
  usuarioId: string,
  id: string,
  input: ItemInputComExtras,
  itemRepo: ItemRepo,
  extras: CampoExtraRepos,
): Promise<ItemComExtras> {
  const atual = await obterItem(usuarioId, id, itemRepo);
  if (input.extras !== undefined) {
    await persistirExtrasDoItem(usuarioId, atual, input.extras, extras);
  }
  const item = await atualizarItem(usuarioId, id, input, itemRepo);
  return anexarExtras(item, extras);
}

async function anexarExtras(
  item: Item,
  extras: CampoExtraRepos,
): Promise<ItemComExtras> {
  const defs = await extras.defs.findMany({
    usuarioId: item.usuarioId,
    tipoColecao: item.tipoColecao,
  });
  const valores = await extras.valores.findManyByAlvo("ITEM", item.id);
  const porDef = new Map(valores.map((valor) => [valor.definicaoId, valor]));
  return {
    ...item,
    extras: defs.map((def) => {
      const valor = porDef.get(def.id);
      return {
        definicaoId: def.id,
        nome: def.nome,
        tipoValor: def.tipoValor,
        valorTexto: valor?.valorTexto ?? null,
        valorNumero: valor?.valorNumero ?? null,
      };
    }),
  };
}

async function persistirExtrasDoItem(
  usuarioId: string,
  item: Item,
  extrasBrutos: unknown,
  extras: CampoExtraRepos,
): Promise<void> {
  if (!Array.isArray(extrasBrutos)) {
    throw new HttpErro(400, "Os campos extras devem ser uma lista.");
  }
  for (const bruto of extrasBrutos) {
    if (bruto === null || typeof bruto !== "object" || Array.isArray(bruto)) {
      throw new HttpErro(400, "Cada campo extra deve ser um objeto.");
    }
    const entrada = bruto as {
      definicaoId?: unknown;
      valorTexto?: unknown;
      valorNumero?: unknown;
    };
    if (typeof entrada.definicaoId !== "string" || entrada.definicaoId === "") {
      throw new HttpErro(400, "Informe a definição do campo extra.");
    }
    const def = await carregarDefDoDono(
      usuarioId,
      entrada.definicaoId,
      extras.defs,
    );
    if (def.tipoColecao !== item.tipoColecao) {
      throw new HttpErro(400, "Este campo extra não pertence a esta coleção.");
    }
    const { valorTexto, valorNumero } = lerValor(def.tipoValor, entrada);
    await extras.valores.upsert({
      definicaoId: def.id,
      alvoTipo: "ITEM",
      alvoId: item.id,
      valorTexto,
      valorNumero,
    });
  }
}

function lerValor(
  tipoValor: TipoValorExtra,
  entrada: { valorTexto?: unknown; valorNumero?: unknown },
): { valorTexto: string | null; valorNumero: number | null } {
  if (tipoValor === "TEXTO") {
    return {
      valorTexto: textoOpcional(entrada.valorTexto),
      valorNumero: null,
    };
  }
  return {
    valorTexto: null,
    valorNumero: numeroOpcional(entrada.valorNumero),
  };
}

function textoOpcional(valor: unknown): string | null {
  if (valor === undefined || valor === null) {
    return null;
  }
  if (typeof valor !== "string") {
    throw new HttpErro(400, "O valor do campo extra deve ser texto.");
  }
  const texto = valor.trim();
  return texto === "" ? null : texto;
}

function numeroOpcional(valor: unknown): number | null {
  if (valor === undefined || valor === null || valor === "") {
    return null;
  }
  if (typeof valor !== "number" || !Number.isFinite(valor)) {
    throw new HttpErro(400, "O valor numérico do campo extra é inválido.");
  }
  return valor;
}

async function garantirNomeLivre(
  usuarioId: string,
  tipoColecao: TipoColecao,
  nome: string,
  repo: CampoExtraDefRepo,
): Promise<void> {
  const existente = await repo.findByNome(usuarioId, tipoColecao, nome);
  if (existente) {
    throw new HttpErro(409, ERRO_NOME_DUPLICADO);
  }
}

async function carregarDefDoDono(
  usuarioId: string,
  id: string,
  repo: CampoExtraDefRepo,
): Promise<CampoExtraDef> {
  const def = await repo.findById(id);
  if (!def) {
    throw new HttpErro(404, "Recurso não encontrado.");
  }
  assertDono(usuarioId, def.usuarioId);
  return def;
}

function exigirNome(valor: unknown): string {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new HttpErro(400, "O nome é obrigatório.");
  }
  return valor.trim();
}

function exigirTipoColecaoOrBuild(valor: unknown): TipoColecao {
  if (valor === undefined || valor === null || valor === "") {
    throw new HttpErro(400, "Informe o tipo da coleção.");
  }
  if (!eTipoColecaoOrBuild(valor)) {
    throw new HttpErro(400, "Tipo de coleção inválido.");
  }
  return valor;
}

function exigirTipoValor(valor: unknown): TipoValorExtra {
  if (valor === undefined || valor === null || valor === "") {
    throw new HttpErro(400, "Informe o tipo de valor.");
  }
  if (!eTipoValor(valor)) {
    throw new HttpErro(400, "Tipo de valor inválido.");
  }
  return valor;
}

function eTipoColecaoOrBuild(valor: unknown): valor is TipoColecao {
  return (
    typeof valor === "string" &&
    (TIPOS_COLECAO_OR_BUILD as readonly string[]).includes(valor)
  );
}

function eTipoValor(valor: unknown): valor is TipoValorExtra {
  return (
    typeof valor === "string" &&
    (TIPOS_VALOR as readonly string[]).includes(valor)
  );
}

function mapearDef(linha: CampoExtraDefLinha): CampoExtraDef {
  if (!eTipoColecaoOrBuild(linha.tipoColecao)) {
    throw new HttpErro(400, "Tipo de coleção inválido.");
  }
  if (!eTipoValor(linha.tipoValor)) {
    throw new HttpErro(400, "Tipo de valor inválido.");
  }
  return {
    id: linha.id,
    usuarioId: linha.usuarioId,
    tipoColecao: linha.tipoColecao,
    nome: linha.nome,
    tipoValor: linha.tipoValor,
  };
}

function mapearValor(linha: CampoExtraValorLinha): CampoExtraValor {
  if (!eAlvoExtra(linha.alvoTipo)) {
    throw new HttpErro(400, "Tipo de alvo inválido.");
  }
  return {
    id: linha.id,
    definicaoId: linha.definicaoId,
    alvoTipo: linha.alvoTipo,
    alvoId: linha.alvoId,
    valorTexto: linha.valorTexto,
    valorNumero:
      linha.valorNumero === null || linha.valorNumero === undefined
        ? null
        : Number(linha.valorNumero),
  };
}

function eAlvoExtra(valor: unknown): valor is AlvoExtra {
  return valor === "ITEM" || valor === "WISHLIST" || valor === "BUILD";
}

function lancarSeUnicidade(erro: unknown): void {
  if (
    typeof erro === "object" &&
    erro !== null &&
    "code" in erro &&
    (erro as { code: unknown }).code === "P2002"
  ) {
    throw new HttpErro(409, ERRO_NOME_DUPLICADO);
  }
}
