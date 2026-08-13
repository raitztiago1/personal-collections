import { ZodError } from "zod";
import { assertDono, HttpErro } from "../isolamento";
import { TIPOS_COLECAO_ITEM, type TipoColecaoItem } from "./colecoes";
import { validarFicha } from "./validar-ficha";

export type ItemDados = {
  usuarioId: string;
  tipoColecao: TipoColecaoItem;
  nome: string;
  descricao: string | null;
  notasPessoais: string | null;
  dataAquisicao: Date | null;
  precoPago: number | null;
  tags: string[];
  ficha: Record<string, unknown>;
};

export type Item = ItemDados & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ItemAtualizacao = Partial<
  Omit<ItemDados, "usuarioId" | "tipoColecao">
>;

export type ItemInput = {
  tipoColecao?: unknown;
  nome?: unknown;
  descricao?: unknown;
  notasPessoais?: unknown;
  dataAquisicao?: unknown;
  precoPago?: unknown;
  tags?: unknown;
  ficha?: unknown;
};

export type ItemRepo = {
  create(data: ItemDados): Promise<Item>;
  findMany(filtro: {
    usuarioId: string;
    tipoColecao?: TipoColecaoItem;
  }): Promise<Item[]>;
  findById(id: string): Promise<Item | null>;
  update(id: string, data: ItemAtualizacao): Promise<Item>;
  delete(id: string): Promise<void>;
};

type ItemLinha = {
  id: string;
  usuarioId: string;
  tipoColecao: string;
  nome: string;
  descricao: string | null;
  notasPessoais: string | null;
  dataAquisicao: Date | null;
  precoPago: { toString(): string } | number | string | null;
  tags: string[];
  ficha: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaItemDelegate = {
  create(args: { data: ItemDados }): Promise<ItemLinha>;
  findMany(args: {
    where: { usuarioId: string; tipoColecao?: TipoColecaoItem };
    orderBy?: { createdAt: "asc" | "desc" };
  }): Promise<ItemLinha[]>;
  findUnique(args: { where: { id: string } }): Promise<ItemLinha | null>;
  update(args: {
    where: { id: string };
    data: ItemAtualizacao;
  }): Promise<ItemLinha>;
  delete(args: { where: { id: string } }): Promise<unknown>;
};

export function itemRepoPrisma(prisma: { item: object }): ItemRepo {
  const tabela = prisma.item as PrismaItemDelegate;
  return {
    async create(data) {
      return mapearItem(await tabela.create({ data }));
    },
    async findMany(filtro) {
      const linhas = await tabela.findMany({
        where: {
          usuarioId: filtro.usuarioId,
          ...(filtro.tipoColecao ? { tipoColecao: filtro.tipoColecao } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
      return linhas.map(mapearItem);
    },
    async findById(id) {
      const linha = await tabela.findUnique({ where: { id } });
      return linha ? mapearItem(linha) : null;
    },
    async update(id, data) {
      return mapearItem(await tabela.update({ where: { id }, data }));
    },
    async delete(id) {
      await tabela.delete({ where: { id } });
    },
  };
}

export async function criarItem(
  usuarioId: string,
  input: ItemInput,
  repo: ItemRepo,
): Promise<Item> {
  const tipoColecao = exigirTipoColecaoItem(input.tipoColecao);
  const dados = montarDados(usuarioId, tipoColecao, input);
  return repo.create(dados);
}

export async function listarItens(
  usuarioId: string,
  filtro: { tipoColecao?: unknown },
  repo: ItemRepo,
): Promise<Item[]> {
  const tipoColecao = tipoColecaoOpcional(filtro.tipoColecao);
  return repo.findMany({ usuarioId, tipoColecao });
}

export async function obterItem(
  usuarioId: string,
  id: string,
  repo: ItemRepo,
): Promise<Item> {
  return carregarDoDono(usuarioId, id, repo);
}

export async function atualizarItem(
  usuarioId: string,
  id: string,
  input: ItemInput,
  repo: ItemRepo,
): Promise<Item> {
  const atual = await carregarDoDono(usuarioId, id, repo);
  const patch = montarPatch(atual.tipoColecao, input);
  if (Object.keys(patch).length === 0) {
    return atual;
  }
  return repo.update(id, patch);
}

export async function excluirItem(
  usuarioId: string,
  id: string,
  repo: ItemRepo,
): Promise<void> {
  await carregarDoDono(usuarioId, id, repo);
  await repo.delete(id);
}

async function carregarDoDono(
  usuarioId: string,
  id: string,
  repo: ItemRepo,
): Promise<Item> {
  const item = await repo.findById(id);
  if (!item) {
    throw new HttpErro(404, "Recurso não encontrado.");
  }
  assertDono(usuarioId, item.usuarioId);
  return item;
}

function montarDados(
  usuarioId: string,
  tipoColecao: TipoColecaoItem,
  input: ItemInput,
): ItemDados {
  return {
    usuarioId,
    tipoColecao,
    nome: exigirNome(input.nome),
    descricao: textoOpcional(input.descricao, "descricao") ?? null,
    notasPessoais: textoOpcional(input.notasPessoais, "notasPessoais") ?? null,
    dataAquisicao: dataOpcional(input.dataAquisicao) ?? null,
    precoPago: numeroOpcional(input.precoPago) ?? null,
    tags: tagsOpcional(input.tags) ?? [],
    ficha: validarFichaItem(tipoColecao, input.ficha),
  };
}

function montarPatch(
  tipoColecao: TipoColecaoItem,
  input: ItemInput,
): ItemAtualizacao {
  const patch: ItemAtualizacao = {};

  if (input.nome !== undefined) {
    patch.nome = exigirNome(input.nome);
  }
  if (input.descricao !== undefined) {
    patch.descricao = textoOpcional(input.descricao, "descricao") ?? null;
  }
  if (input.notasPessoais !== undefined) {
    patch.notasPessoais =
      textoOpcional(input.notasPessoais, "notasPessoais") ?? null;
  }
  if (input.dataAquisicao !== undefined) {
    patch.dataAquisicao = dataOpcional(input.dataAquisicao) ?? null;
  }
  if (input.precoPago !== undefined) {
    patch.precoPago = numeroOpcional(input.precoPago) ?? null;
  }
  if (input.tags !== undefined) {
    patch.tags = tagsOpcional(input.tags) ?? [];
  }
  if (input.ficha !== undefined) {
    patch.ficha = validarFichaItem(tipoColecao, input.ficha);
  }

  return patch;
}

function exigirNome(valor: unknown): string {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new HttpErro(400, "O nome é obrigatório.");
  }
  return valor.trim();
}

function exigirTipoColecaoItem(valor: unknown): TipoColecaoItem {
  if (valor === undefined || valor === null || valor === "") {
    throw new HttpErro(400, "Informe o tipo da coleção.");
  }
  if (!eTipoColecaoItem(valor)) {
    throw new HttpErro(400, "Tipo de coleção inválido.");
  }
  return valor;
}

function tipoColecaoOpcional(valor: unknown): TipoColecaoItem | undefined {
  if (valor === undefined || valor === null || valor === "") {
    return undefined;
  }
  return exigirTipoColecaoItem(valor);
}

function eTipoColecaoItem(valor: unknown): valor is TipoColecaoItem {
  return (
    typeof valor === "string" &&
    (TIPOS_COLECAO_ITEM as readonly string[]).includes(valor)
  );
}

function validarFichaItem(
  tipo: TipoColecaoItem,
  json: unknown,
): Record<string, unknown> {
  const bruto = json === undefined ? {} : json;
  try {
    return validarFicha(tipo, bruto) as Record<string, unknown>;
  } catch (erro) {
    if (eErroZod(erro)) {
      throw new HttpErro(400, mensagemFichaInvalida(erro));
    }
    throw erro;
  }
}

function eErroZod(erro: unknown): erro is ZodError {
  if (erro instanceof ZodError) {
    return true;
  }
  return (
    typeof erro === "object" &&
    erro !== null &&
    "issues" in erro &&
    Array.isArray((erro as { issues: unknown }).issues)
  );
}

function mensagemFichaInvalida(erro: ZodError): string {
  const issue = erro.issues[0];
  if (!issue) {
    return "Ficha inválida.";
  }
  if (issue.path.length > 0) {
    return `Ficha inválida no campo '${issue.path.join(".")}'.`;
  }
  return "Ficha inválida.";
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

function dataOpcional(valor: unknown): Date | null | undefined {
  if (valor === undefined) {
    return undefined;
  }
  if (valor === null || valor === "") {
    return null;
  }
  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) {
      throw new HttpErro(400, "A data de aquisição é inválida.");
    }
    return valor;
  }
  if (typeof valor !== "string") {
    throw new HttpErro(400, "A data de aquisição é inválida.");
  }
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) {
    throw new HttpErro(400, "A data de aquisição é inválida.");
  }
  return data;
}

function numeroOpcional(valor: unknown): number | null | undefined {
  if (valor === undefined) {
    return undefined;
  }
  if (valor === null || valor === "") {
    return null;
  }
  if (typeof valor !== "number" || !Number.isFinite(valor)) {
    throw new HttpErro(400, "O preço pago é inválido.");
  }
  return valor;
}

function tagsOpcional(valor: unknown): string[] | undefined {
  if (valor === undefined) {
    return undefined;
  }
  if (!Array.isArray(valor) || valor.some((tag) => typeof tag !== "string")) {
    throw new HttpErro(400, "As tags devem ser uma lista de textos.");
  }
  return valor.map((tag) => tag.trim()).filter((tag) => tag.length > 0);
}

function mapearItem(linha: ItemLinha): Item {
  if (!eTipoColecaoItem(linha.tipoColecao)) {
    throw new HttpErro(400, "Tipo de coleção inválido.");
  }
  return {
    id: linha.id,
    usuarioId: linha.usuarioId,
    tipoColecao: linha.tipoColecao,
    nome: linha.nome,
    descricao: linha.descricao,
    notasPessoais: linha.notasPessoais,
    dataAquisicao: linha.dataAquisicao,
    precoPago:
      linha.precoPago === null || linha.precoPago === undefined
        ? null
        : Number(linha.precoPago),
    tags: linha.tags,
    ficha: fichaComoObjeto(linha.ficha),
    createdAt: linha.createdAt,
    updatedAt: linha.updatedAt,
  };
}

function fichaComoObjeto(valor: unknown): Record<string, unknown> {
  if (valor !== null && typeof valor === "object" && !Array.isArray(valor)) {
    return valor as Record<string, unknown>;
  }
  return {};
}
