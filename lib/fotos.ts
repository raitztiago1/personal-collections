import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertDono, HttpErro } from "./isolamento";

export const MIMES_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const TAMANHO_MAX_BYTES = 10 * 1024 * 1024;
export const MAX_FOTOS_POR_DONO = 12;

const EXTENSAO_POR_MIME: Record<(typeof MIMES_PERMITIDOS)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const DONOS = ["ITEM", "WISHLIST", "BUILD", "PECA"] as const;

export type DonoFotoTipo = (typeof DONOS)[number];

export type Foto = {
  id: string;
  usuarioId: string;
  donoTipo: DonoFotoTipo;
  donoId: string;
  caminho: string;
  mime: string;
  ordem: number;
  isCapa: boolean;
};

export type FotoDados = Foto;

export type FotoRepo = {
  create(data: FotoDados): Promise<Foto>;
  findById(id: string): Promise<Foto | null>;
  findManyByDono(donoTipo: DonoFotoTipo, donoId: string): Promise<Foto[]>;
  countByDono(donoTipo: DonoFotoTipo, donoId: string): Promise<number>;
  update(id: string, data: Partial<Pick<Foto, "isCapa" | "ordem">>): Promise<Foto>;
  unsetCapa(donoTipo: DonoFotoTipo, donoId: string): Promise<void>;
  delete(id: string): Promise<void>;
  deleteByDono(donoTipo: DonoFotoTipo, donoId: string): Promise<Foto[]>;
};

export type FotoFs = {
  mkdir(dir: string): Promise<void>;
  writeFile(caminho: string, dados: Uint8Array): Promise<void>;
  readFile(caminho: string): Promise<Uint8Array>;
  unlink(caminho: string): Promise<void>;
};

export type DonoRecurso = {
  usuarioId: string;
};

export type DonoRepo = {
  findItem(id: string): Promise<DonoRecurso | null>;
  findWishlist(id: string): Promise<DonoRecurso | null>;
  findBuild(id: string): Promise<DonoRecurso | null>;
  findPeca(id: string): Promise<{ buildId: string } | null>;
};

export type FotoDeps = {
  repo: FotoRepo;
  fs: FotoFs;
  uploadDir: string;
  donos: DonoRepo;
};

export type FotoUploadInput = {
  donoTipo?: unknown;
  donoId?: unknown;
  isCapa?: unknown;
  arquivo: { bytes: Uint8Array; mime: string };
};

type PrismaFotoDelegate = {
  create(args: { data: FotoDados }): Promise<Foto>;
  findUnique(args: { where: { id: string } }): Promise<Foto | null>;
  findMany(args: {
    where: { donoTipo: DonoFotoTipo; donoId: string };
    orderBy?: { ordem: "asc" | "desc" };
  }): Promise<Foto[]>;
  count(args: {
    where: { donoTipo: DonoFotoTipo; donoId: string };
  }): Promise<number>;
  update(args: {
    where: { id: string };
    data: Partial<Pick<Foto, "isCapa" | "ordem">>;
  }): Promise<Foto>;
  updateMany(args: {
    where: { donoTipo: DonoFotoTipo; donoId: string; isCapa: boolean };
    data: { isCapa: boolean };
  }): Promise<unknown>;
  delete(args: { where: { id: string } }): Promise<unknown>;
  deleteMany(args: {
    where: { donoTipo: DonoFotoTipo; donoId: string };
  }): Promise<unknown>;
};

export function diretorioUpload(
  env: { UPLOAD_DIR?: string } = { UPLOAD_DIR: process.env.UPLOAD_DIR },
): string {
  const valor = env.UPLOAD_DIR?.trim();
  return valor ? valor : "data/uploads";
}

export function fotoFsDisco(): FotoFs {
  return {
    async mkdir(dir) {
      await mkdir(dir, { recursive: true });
    },
    async writeFile(caminho, dados) {
      await writeFile(caminho, dados);
    },
    async readFile(caminho) {
      return new Uint8Array(await readFile(caminho));
    },
    async unlink(caminho) {
      await unlink(caminho);
    },
  };
}

export function fotoRepoPrisma(prisma: { foto: object }): FotoRepo {
  const tabela = prisma.foto as PrismaFotoDelegate;
  return {
    async create(data) {
      return tabela.create({ data });
    },
    async findById(id) {
      return tabela.findUnique({ where: { id } });
    },
    async findManyByDono(donoTipo, donoId) {
      return tabela.findMany({
        where: { donoTipo, donoId },
        orderBy: { ordem: "asc" },
      });
    },
    async countByDono(donoTipo, donoId) {
      return tabela.count({ where: { donoTipo, donoId } });
    },
    async update(id, data) {
      return tabela.update({ where: { id }, data });
    },
    async unsetCapa(donoTipo, donoId) {
      await tabela.updateMany({
        where: { donoTipo, donoId, isCapa: true },
        data: { isCapa: false },
      });
    },
    async delete(id) {
      await tabela.delete({ where: { id } });
    },
    async deleteByDono(donoTipo, donoId) {
      const fotos = await tabela.findMany({ where: { donoTipo, donoId } });
      await tabela.deleteMany({ where: { donoTipo, donoId } });
      return fotos;
    },
  };
}

type PrismaDonoDelegate = {
  findUnique(args: {
    where: { id: string };
  }): Promise<{ usuarioId: string } | null>;
};

type PrismaPecaDelegate = {
  findUnique(args: {
    where: { id: string };
  }): Promise<{ buildId: string } | null>;
};

export function donoRepoPrisma(prisma: {
  item: object;
  wishlistItem: object;
  build: object;
  buildPeca: object;
}): DonoRepo {
  const item = prisma.item as PrismaDonoDelegate;
  const wishlistItem = prisma.wishlistItem as PrismaDonoDelegate;
  const build = prisma.build as PrismaDonoDelegate;
  const buildPeca = prisma.buildPeca as PrismaPecaDelegate;
  return {
    findItem(id) {
      return item.findUnique({ where: { id } });
    },
    findWishlist(id) {
      return wishlistItem.findUnique({ where: { id } });
    },
    findBuild(id) {
      return build.findUnique({ where: { id } });
    },
    findPeca(id) {
      return buildPeca.findUnique({ where: { id } });
    },
  };
}

export function depsFotos(
  prisma: {
    foto: object;
    item: object;
    wishlistItem: object;
    build: object;
    buildPeca: object;
  },
  uploadDir = diretorioUpload(),
): FotoDeps {
  return {
    repo: fotoRepoPrisma(prisma),
    fs: fotoFsDisco(),
    uploadDir,
    donos: donoRepoPrisma(prisma),
  };
}

export async function enviarFoto(
  usuarioId: string,
  input: FotoUploadInput,
  deps: FotoDeps,
): Promise<Foto> {
  const donoTipo = exigirDonoTipo(input.donoTipo);
  const donoId = exigirDonoId(input.donoId);
  const mime = exigirMime(input.arquivo.mime);
  const bytes = input.arquivo.bytes;
  if (bytes.byteLength > TAMANHO_MAX_BYTES) {
    throw new HttpErro(400, "O arquivo excede 10 MB.");
  }
  await assertDonoRecurso(usuarioId, donoTipo, donoId, deps.donos);

  const quantidade = await deps.repo.countByDono(donoTipo, donoId);
  if (quantidade >= MAX_FOTOS_POR_DONO) {
    throw new HttpErro(400, "Limite de 12 fotos por dono atingido.");
  }

  const id = crypto.randomUUID();
  const ext = EXTENSAO_POR_MIME[mime];
  const caminho = `${usuarioId}/${id}.${ext}`;
  const isCapa = interpretarCapa(input.isCapa);
  const ordem = quantidade;

  await deps.fs.mkdir(path.join(deps.uploadDir, usuarioId));
  await deps.fs.writeFile(path.join(deps.uploadDir, caminho), bytes);

  try {
    if (isCapa) {
      await deps.repo.unsetCapa(donoTipo, donoId);
    }
    return await deps.repo.create({
      id,
      usuarioId,
      donoTipo,
      donoId,
      caminho,
      mime,
      ordem,
      isCapa,
    });
  } catch (erro) {
    await removerArquivo(deps, caminho);
    throw erro;
  }
}

export async function marcarCapa(
  usuarioId: string,
  fotoId: string,
  deps: FotoDeps,
): Promise<Foto> {
  const foto = await carregarDoDono(usuarioId, fotoId, deps.repo);
  await deps.repo.unsetCapa(foto.donoTipo, foto.donoId);
  return deps.repo.update(foto.id, { isCapa: true });
}

export async function apagarFoto(
  usuarioId: string,
  fotoId: string,
  deps: FotoDeps,
): Promise<void> {
  const foto = await carregarDoDono(usuarioId, fotoId, deps.repo);
  await removerArquivo(deps, foto.caminho);
  await deps.repo.delete(foto.id);
}

export async function apagarDono(
  usuarioId: string,
  donoTipo: DonoFotoTipo,
  donoId: string,
  deps: FotoDeps,
): Promise<void> {
  const fotos = await deps.repo.findManyByDono(donoTipo, donoId);
  for (const foto of fotos) {
    if (foto.usuarioId !== usuarioId) {
      continue;
    }
    await removerArquivo(deps, foto.caminho);
    await deps.repo.delete(foto.id);
  }
}

export async function servirFoto(
  usuarioId: string | null | undefined,
  fotoId: string,
  deps: FotoDeps,
): Promise<{ bytes: Uint8Array; mime: string }> {
  if (!usuarioId) {
    throw new HttpErro(401, "Não autenticado.");
  }
  const foto = await carregarDoDono(usuarioId, fotoId, deps.repo);
  const bytes = await deps.fs.readFile(path.join(deps.uploadDir, foto.caminho));
  return { bytes, mime: foto.mime };
}

export async function respostaGetFoto(
  usuarioId: string | null | undefined,
  fotoId: string,
  deps: FotoDeps,
): Promise<Response> {
  try {
    const arquivo = await servirFoto(usuarioId, fotoId, deps);
    return new Response(new Uint8Array(arquivo.bytes), {
      status: 200,
      headers: { "Content-Type": arquivo.mime },
    });
  } catch (erro) {
    return responderErroFoto(erro);
  }
}

export function responderErroFoto(erro: unknown): Response {
  if (erro instanceof HttpErro) {
    return Response.json({ erro: erro.mensagem }, { status: erro.status });
  }
  throw erro;
}

export async function assertDonoRecurso(
  usuarioId: string,
  donoTipo: DonoFotoTipo,
  donoId: string,
  donos: DonoRepo,
): Promise<void> {
  if (donoTipo === "PECA") {
    const peca = await donos.findPeca(donoId);
    if (!peca) {
      throw new HttpErro(404, "Recurso não encontrado.");
    }
    const build = await donos.findBuild(peca.buildId);
    if (!build) {
      throw new HttpErro(404, "Recurso não encontrado.");
    }
    assertDono(usuarioId, build.usuarioId);
    return;
  }

  const recurso =
    donoTipo === "ITEM"
      ? await donos.findItem(donoId)
      : donoTipo === "WISHLIST"
        ? await donos.findWishlist(donoId)
        : await donos.findBuild(donoId);
  if (!recurso) {
    throw new HttpErro(404, "Recurso não encontrado.");
  }
  assertDono(usuarioId, recurso.usuarioId);
}

async function carregarDoDono(
  usuarioId: string,
  fotoId: string,
  repo: FotoRepo,
): Promise<Foto> {
  const foto = await repo.findById(fotoId);
  if (!foto) {
    throw new HttpErro(404, "Recurso não encontrado.");
  }
  assertDono(usuarioId, foto.usuarioId);
  return foto;
}

async function removerArquivo(deps: FotoDeps, caminhoRelativo: string) {
  try {
    await deps.fs.unlink(path.join(deps.uploadDir, caminhoRelativo));
  } catch (erro) {
    if (eErroEnoent(erro)) {
      return;
    }
    throw erro;
  }
}

function exigirDonoTipo(valor: unknown): DonoFotoTipo {
  if (typeof valor === "string" && (DONOS as readonly string[]).includes(valor)) {
    return valor as DonoFotoTipo;
  }
  throw new HttpErro(400, "Tipo de dono inválido.");
}

function exigirDonoId(valor: unknown): string {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new HttpErro(400, "O dono é obrigatório.");
  }
  return valor.trim();
}

function exigirMime(valor: string): (typeof MIMES_PERMITIDOS)[number] {
  if ((MIMES_PERMITIDOS as readonly string[]).includes(valor)) {
    return valor as (typeof MIMES_PERMITIDOS)[number];
  }
  throw new HttpErro(400, "Tipo de imagem não permitido. Use jpeg, png ou webp.");
}

function interpretarCapa(valor: unknown): boolean {
  return valor === true || valor === "true";
}

function eErroEnoent(erro: unknown): boolean {
  return (
    typeof erro === "object" &&
    erro !== null &&
    "code" in erro &&
    (erro as { code: unknown }).code === "ENOENT"
  );
}
