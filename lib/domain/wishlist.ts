import path from "node:path";
import { ZodError } from "zod";
import { depsFotos, type FotoDeps } from "../fotos";
import { assertDono, HttpErro } from "../isolamento";
import {
  campoExtraReposPrisma,
  type CampoExtraRepos,
  type CampoExtraValor,
  type CampoExtraValorDados,
  type ExtraDoItem,
} from "./campos-extra";
import { TIPOS_COLECAO_ITEM, type TipoColecaoItem } from "./colecoes";
import { itemRepoPrisma, type Item, type ItemRepo } from "./itens";
import { validarFicha } from "./validar-ficha";

export type WishlistDados = {
  usuarioId: string;
  tipoColecao: TipoColecaoItem;
  nome: string;
  descricao: string | null;
  notasPessoais: string | null;
  tags: string[];
  ficha: Record<string, unknown>;
};

export type WishlistItem = WishlistDados & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

export type WishlistAtualizacao = Partial<
  Omit<WishlistDados, "usuarioId" | "tipoColecao">
>;

export type WishlistInput = {
  tipoColecao?: unknown;
  nome?: unknown;
  descricao?: unknown;
  notasPessoais?: unknown;
  tags?: unknown;
  ficha?: unknown;
  dataAquisicao?: unknown;
  precoPago?: unknown;
};

export type WishlistInputComExtras = WishlistInput & { extras?: unknown };

export type WishlistComExtras = WishlistItem & { extras: ExtraDoItem[] };

export type WishlistRepo = {
  create(data: WishlistDados): Promise<WishlistItem>;
  findMany(filtro: {
    usuarioId: string;
    tipoColecao?: TipoColecaoItem;
  }): Promise<WishlistItem[]>;
  findById(id: string): Promise<WishlistItem | null>;
  update(id: string, data: WishlistAtualizacao): Promise<WishlistItem>;
  delete(id: string): Promise<void>;
};

export type ResultadoCopiaFotos = {
  caminhosNovos: string[];
  caminhosOriginais: string[];
};

export type FotoCopiador = {
  copiarParaItem(
    usuarioId: string,
    wishlistId: string,
    itemId: string,
  ): Promise<ResultadoCopiaFotos>;
  apagarWishlist(usuarioId: string, wishlistId: string): Promise<void>;
  apagarArquivos(caminhos: string[]): Promise<void>;
};

export type ComprarExtras = {
  findManyByAlvo(
    alvoTipo: "WISHLIST" | "ITEM",
    alvoId: string,
  ): Promise<CampoExtraValor[]>;
  upsert(data: CampoExtraValorDados): Promise<CampoExtraValor>;
  deleteByAlvo(
    alvoTipo: "WISHLIST" | "ITEM",
    alvoId: string,
  ): Promise<void>;
};

export type ReposComprar = {
  wishlist: WishlistRepo;
  itens: ItemRepo;
  extras: ComprarExtras;
  fotos: FotoCopiador;
};

export type UnidadeDeTrabalho = {
  executar<T>(trabalho: (repos: ReposComprar) => Promise<T>): Promise<T>;
};

type WishlistLinha = {
  id: string;
  usuarioId: string;
  tipoColecao: string;
  nome: string;
  descricao: string | null;
  notasPessoais: string | null;
  tags: string[];
  ficha: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaWishlistDelegate = {
  create(args: { data: WishlistDados }): Promise<WishlistLinha>;
  findMany(args: {
    where: { usuarioId: string; tipoColecao?: TipoColecaoItem };
    orderBy?: { createdAt: "asc" | "desc" };
  }): Promise<WishlistLinha[]>;
  findUnique(args: { where: { id: string } }): Promise<WishlistLinha | null>;
  update(args: {
    where: { id: string };
    data: WishlistAtualizacao;
  }): Promise<WishlistLinha>;
  delete(args: { where: { id: string } }): Promise<unknown>;
};

type PrismaCampoExtraValorDelegate = {
  deleteMany(args: {
    where: { alvoTipo: "WISHLIST" | "ITEM"; alvoId: string };
  }): Promise<unknown>;
};

type PrismaComprarTx = {
  item: object;
  wishlistItem: object;
  campoExtraDef: object;
  campoExtraValor: object;
  foto: object;
  build: object;
  buildPeca: object;
};

type PrismaComprar = {
  $transaction<T>(fn: (tx: PrismaComprarTx) => Promise<T>): Promise<T>;
};

export function wishlistRepoPrisma(prisma: {
  wishlistItem: object;
}): WishlistRepo {
  const tabela = prisma.wishlistItem as PrismaWishlistDelegate;
  return {
    async create(data) {
      return mapearWishlist(await tabela.create({ data }));
    },
    async findMany(filtro) {
      const linhas = await tabela.findMany({
        where: {
          usuarioId: filtro.usuarioId,
          ...(filtro.tipoColecao ? { tipoColecao: filtro.tipoColecao } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
      return linhas.map(mapearWishlist);
    },
    async findById(id) {
      const linha = await tabela.findUnique({ where: { id } });
      return linha ? mapearWishlist(linha) : null;
    },
    async update(id, data) {
      return mapearWishlist(await tabela.update({ where: { id }, data }));
    },
    async delete(id) {
      await tabela.delete({ where: { id } });
    },
  };
}

export function comprarExtrasPrisma(prisma: {
  campoExtraDef: object;
  campoExtraValor: object;
}): ComprarExtras {
  const { valores } = campoExtraReposPrisma(prisma);
  const tabela = prisma.campoExtraValor as PrismaCampoExtraValorDelegate;
  return {
    findManyByAlvo: (alvoTipo, alvoId) =>
      valores.findManyByAlvo(alvoTipo, alvoId),
    upsert: (data) => valores.upsert(data),
    async deleteByAlvo(alvoTipo, alvoId) {
      await tabela.deleteMany({ where: { alvoTipo, alvoId } });
    },
  };
}

export function fotoCopiadorPrisma(deps: FotoDeps): FotoCopiador {
  return {
    async copiarParaItem(usuarioId, wishlistId, itemId) {
      const fotos = await deps.repo.findManyByDono("WISHLIST", wishlistId);
      const caminhosNovos: string[] = [];
      const caminhosOriginais: string[] = [];
      await deps.fs.mkdir(path.join(deps.uploadDir, usuarioId));
      try {
        for (const foto of fotos) {
          const bytes = await deps.fs.readFile(
            path.join(deps.uploadDir, foto.caminho),
          );
          const id = crypto.randomUUID();
          const ext = path.extname(foto.caminho);
          const caminho = `${usuarioId}/${id}${ext}`;
          await deps.fs.writeFile(path.join(deps.uploadDir, caminho), bytes);
          caminhosNovos.push(caminho);
          caminhosOriginais.push(foto.caminho);
          await deps.repo.create({
            id,
            usuarioId,
            donoTipo: "ITEM",
            donoId: itemId,
            caminho,
            mime: foto.mime,
            ordem: foto.ordem,
            isCapa: foto.isCapa,
          });
        }
        return { caminhosNovos, caminhosOriginais };
      } catch (erro) {
        await apagarArquivosDisco(deps, caminhosNovos);
        throw erro;
      }
    },
    async apagarWishlist(usuarioId, wishlistId) {
      const fotos = await deps.repo.findManyByDono("WISHLIST", wishlistId);
      for (const foto of fotos) {
        if (foto.usuarioId !== usuarioId) {
          continue;
        }
        await deps.repo.delete(foto.id);
      }
    },
    async apagarArquivos(caminhos) {
      await apagarArquivosDisco(deps, caminhos);
    },
  };
}

async function apagarArquivosDisco(
  deps: Pick<FotoDeps, "fs" | "uploadDir">,
  caminhos: string[],
): Promise<void> {
  for (const caminho of caminhos) {
    try {
      await deps.fs.unlink(path.join(deps.uploadDir, caminho));
    } catch (erro) {
      if (
        typeof erro === "object" &&
        erro !== null &&
        "code" in erro &&
        (erro as { code: unknown }).code === "ENOENT"
      ) {
        continue;
      }
      throw erro;
    }
  }
}

export function uowComprarPrisma(
  prisma: PrismaComprar,
  uploadDir?: string,
): UnidadeDeTrabalho {
  return {
    executar(trabalho) {
      return prisma.$transaction((tx) =>
        trabalho({
          wishlist: wishlistRepoPrisma(tx),
          itens: itemRepoPrisma(tx),
          extras: comprarExtrasPrisma(tx),
          fotos: fotoCopiadorPrisma(depsFotos(tx, uploadDir)),
        }),
      );
    },
  };
}

export async function criarWishlist(
  usuarioId: string,
  input: WishlistInput,
  repo: WishlistRepo,
): Promise<WishlistItem> {
  const tipoColecao = exigirTipoColecaoItem(input.tipoColecao);
  return repo.create(montarDados(usuarioId, tipoColecao, input));
}

export async function listarWishlist(
  usuarioId: string,
  filtro: { tipoColecao?: unknown },
  repo: WishlistRepo,
): Promise<WishlistItem[]> {
  const tipoColecao = tipoColecaoOpcional(filtro.tipoColecao);
  return repo.findMany({ usuarioId, tipoColecao });
}

export async function obterWishlist(
  usuarioId: string,
  id: string,
  repo: WishlistRepo,
): Promise<WishlistItem> {
  return carregarDoDono(usuarioId, id, repo);
}

export async function obterWishlistComExtras(
  usuarioId: string,
  id: string,
  repo: WishlistRepo,
  extras: CampoExtraRepos,
): Promise<WishlistComExtras> {
  const wish = await obterWishlist(usuarioId, id, repo);
  return anexarExtras(wish, extras);
}

export async function atualizarWishlist(
  usuarioId: string,
  id: string,
  input: WishlistInput,
  repo: WishlistRepo,
): Promise<WishlistItem> {
  const atual = await carregarDoDono(usuarioId, id, repo);
  const patch = montarPatch(atual.tipoColecao, input);
  if (Object.keys(patch).length === 0) {
    return atual;
  }
  return repo.update(id, patch);
}

export async function atualizarWishlistComExtras(
  usuarioId: string,
  id: string,
  input: WishlistInputComExtras,
  repo: WishlistRepo,
  extras: CampoExtraRepos,
): Promise<WishlistComExtras> {
  const atual = await obterWishlist(usuarioId, id, repo);
  if (input.extras !== undefined) {
    await persistirExtrasWishlist(usuarioId, atual, input.extras, extras);
  }
  const wish = await atualizarWishlist(usuarioId, id, input, repo);
  return anexarExtras(wish, extras);
}

export async function excluirWishlist(
  usuarioId: string,
  id: string,
  repo: WishlistRepo,
  limparFotos?: (usuarioId: string, donoId: string) => Promise<void>,
): Promise<void> {
  await carregarDoDono(usuarioId, id, repo);
  if (limparFotos) {
    await limparFotos(usuarioId, id);
  }
  await repo.delete(id);
}

export async function comprarWishlist(
  usuarioId: string,
  id: string,
  uow: UnidadeDeTrabalho,
): Promise<Item> {
  let caminhosNovos: string[] = [];
  let caminhosOriginais: string[] = [];
  let fotos: FotoCopiador | undefined;
  try {
    const item = await uow.executar(async (repos) => {
      fotos = repos.fotos;
      const wish = await carregarDoDono(usuarioId, id, repos.wishlist);
      const criado = await repos.itens.create({
        usuarioId: wish.usuarioId,
        tipoColecao: wish.tipoColecao,
        nome: wish.nome,
        descricao: wish.descricao,
        notasPessoais: wish.notasPessoais,
        dataAquisicao: null,
        precoPago: null,
        tags: [...wish.tags],
        ficha: { ...wish.ficha },
      });

      const extrasOrigem = await repos.extras.findManyByAlvo(
        "WISHLIST",
        wish.id,
      );
      for (const extra of extrasOrigem) {
        await repos.extras.upsert({
          definicaoId: extra.definicaoId,
          alvoTipo: "ITEM",
          alvoId: criado.id,
          valorTexto: extra.valorTexto,
          valorNumero: extra.valorNumero,
        });
      }

      const copia = await repos.fotos.copiarParaItem(
        usuarioId,
        wish.id,
        criado.id,
      );
      caminhosNovos = copia.caminhosNovos;
      caminhosOriginais = copia.caminhosOriginais;
      await repos.fotos.apagarWishlist(usuarioId, wish.id);
      await repos.extras.deleteByAlvo("WISHLIST", wish.id);
      await repos.wishlist.delete(wish.id);
      return criado;
    });
    await fotos?.apagarArquivos(caminhosOriginais);
    return item;
  } catch (erro) {
    try {
      await fotos?.apagarArquivos(caminhosNovos);
    } catch {
      // não mascara a falha da transação
    }
    throw erro;
  }
}

async function carregarDoDono(
  usuarioId: string,
  id: string,
  repo: WishlistRepo,
): Promise<WishlistItem> {
  const wish = await repo.findById(id);
  if (!wish) {
    throw new HttpErro(404, "Recurso não encontrado.");
  }
  assertDono(usuarioId, wish.usuarioId);
  return wish;
}

async function anexarExtras(
  wish: WishlistItem,
  extras: CampoExtraRepos,
): Promise<WishlistComExtras> {
  const defs = await extras.defs.findMany({
    usuarioId: wish.usuarioId,
    tipoColecao: wish.tipoColecao,
  });
  const valores = await extras.valores.findManyByAlvo("WISHLIST", wish.id);
  const porDef = new Map(valores.map((valor) => [valor.definicaoId, valor]));
  return {
    ...wish,
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

async function persistirExtrasWishlist(
  usuarioId: string,
  wish: WishlistItem,
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
    const def = await extras.defs.findById(entrada.definicaoId);
    if (!def) {
      throw new HttpErro(404, "Recurso não encontrado.");
    }
    assertDono(usuarioId, def.usuarioId);
    if (def.tipoColecao !== wish.tipoColecao) {
      throw new HttpErro(400, "Este campo extra não pertence a esta coleção.");
    }
    const { valorTexto, valorNumero } = lerValor(def.tipoValor, entrada);
    await extras.valores.upsert({
      definicaoId: def.id,
      alvoTipo: "WISHLIST",
      alvoId: wish.id,
      valorTexto,
      valorNumero,
    });
  }
}

function lerValor(
  tipoValor: ExtraDoItem["tipoValor"],
  entrada: { valorTexto?: unknown; valorNumero?: unknown },
): { valorTexto: string | null; valorNumero: number | null } {
  if (tipoValor === "TEXTO") {
    return {
      valorTexto: textoValorExtra(entrada.valorTexto),
      valorNumero: null,
    };
  }
  return {
    valorTexto: null,
    valorNumero: numeroValorExtra(entrada.valorNumero),
  };
}

function textoValorExtra(valor: unknown): string | null {
  if (valor === undefined || valor === null) {
    return null;
  }
  if (typeof valor !== "string") {
    throw new HttpErro(400, "O valor do campo extra deve ser texto.");
  }
  const texto = valor.trim();
  return texto === "" ? null : texto;
}

function numeroValorExtra(valor: unknown): number | null {
  if (valor === undefined || valor === null || valor === "") {
    return null;
  }
  if (typeof valor !== "number" || !Number.isFinite(valor)) {
    throw new HttpErro(400, "O valor numérico do campo extra é inválido.");
  }
  return valor;
}

function montarDados(
  usuarioId: string,
  tipoColecao: TipoColecaoItem,
  input: WishlistInput,
): WishlistDados {
  return {
    usuarioId,
    tipoColecao,
    nome: exigirNome(input.nome),
    descricao: textoOpcional(input.descricao, "descricao") ?? null,
    notasPessoais: textoOpcional(input.notasPessoais, "notasPessoais") ?? null,
    tags: tagsOpcional(input.tags) ?? [],
    ficha: validarFichaItem(tipoColecao, input.ficha),
  };
}

function montarPatch(
  tipoColecao: TipoColecaoItem,
  input: WishlistInput,
): WishlistAtualizacao {
  const patch: WishlistAtualizacao = {};

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

function tagsOpcional(valor: unknown): string[] | undefined {
  if (valor === undefined) {
    return undefined;
  }
  if (!Array.isArray(valor) || valor.some((tag) => typeof tag !== "string")) {
    throw new HttpErro(400, "As tags devem ser uma lista de textos.");
  }
  return valor.map((tag) => tag.trim()).filter((tag) => tag.length > 0);
}

function mapearWishlist(linha: WishlistLinha): WishlistItem {
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
