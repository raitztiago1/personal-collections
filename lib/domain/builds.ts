import { ZodError } from "zod";
import { assertDono, HttpErro } from "../isolamento";
import { schemasFichaPeca, type TipoPeca } from "./fichas-peca";
import { validarFichaPeca } from "./validar-ficha";

export type { TipoPeca };

export type DonoFotoBuild = "BUILD" | "PECA";

export type BuildPecaDados = {
  tipoPeca: TipoPeca;
  nome: string;
  ficha: Record<string, unknown>;
  notas: string | null;
};

export type BuildPeca = BuildPecaDados & {
  id: string;
  buildId: string;
};

export type BuildDados = {
  usuarioId: string;
  nome: string;
  descricao: string | null;
  notasPessoais: string | null;
  pecas: BuildPecaDados[];
};

export type Build = Omit<BuildDados, "pecas"> & {
  id: string;
  pecas: BuildPeca[];
};

export type BuildAtualizacao = {
  nome?: string;
  descricao?: string | null;
  notasPessoais?: string | null;
  pecas?: BuildPecaDados[];
};

export type BuildInput = {
  nome?: unknown;
  descricao?: unknown;
  notasPessoais?: unknown;
  pecas?: unknown;
};

export type BuildRepo = {
  create(data: BuildDados): Promise<Build>;
  findMany(usuarioId: string): Promise<Build[]>;
  findById(id: string): Promise<Build | null>;
  update(id: string, data: BuildAtualizacao): Promise<Build>;
  delete(id: string): Promise<void>;
};

export type LimparFotosBuild = (
  usuarioId: string,
  donoTipo: DonoFotoBuild,
  donoId: string,
) => Promise<void>;

type BuildPecaLinha = {
  id: string;
  buildId: string;
  tipoPeca: string;
  nome: string;
  ficha: unknown;
  notas: string | null;
};

type BuildLinha = {
  id: string;
  usuarioId: string;
  nome: string;
  descricao: string | null;
  notasPessoais: string | null;
  pecas?: BuildPecaLinha[];
};

type PrismaBuildDelegate = {
  create(args: {
    data: {
      usuarioId: string;
      nome: string;
      descricao: string | null;
      notasPessoais: string | null;
      pecas: { create: Omit<BuildPecaDados, never>[] };
    };
    include: { pecas: true };
  }): Promise<BuildLinha>;
  findMany(args: {
    where: { usuarioId: string };
    include?: { pecas: true };
    orderBy?: { nome: "asc" | "desc" };
  }): Promise<BuildLinha[]>;
  findUnique(args: {
    where: { id: string };
    include: { pecas: true };
  }): Promise<BuildLinha | null>;
  update(args: {
    where: { id: string };
    data: {
      nome?: string;
      descricao?: string | null;
      notasPessoais?: string | null;
      pecas?: {
        deleteMany: Record<string, never>;
        create: BuildPecaDados[];
      };
    };
    include: { pecas: true };
  }): Promise<BuildLinha>;
  delete(args: { where: { id: string } }): Promise<unknown>;
};

export function buildRepoPrisma(prisma: { build: object }): BuildRepo {
  const tabela = prisma.build as PrismaBuildDelegate;
  return {
    async create(data) {
      return mapearBuild(
        await tabela.create({
          data: {
            usuarioId: data.usuarioId,
            nome: data.nome,
            descricao: data.descricao,
            notasPessoais: data.notasPessoais,
            pecas: { create: data.pecas },
          },
          include: { pecas: true },
        }),
      );
    },
    async findMany(usuarioId) {
      const linhas = await tabela.findMany({
        where: { usuarioId },
        include: { pecas: true },
        orderBy: { nome: "asc" },
      });
      return linhas.map(mapearBuild);
    },
    async findById(id) {
      const linha = await tabela.findUnique({
        where: { id },
        include: { pecas: true },
      });
      return linha ? mapearBuild(linha) : null;
    },
    async update(id, data) {
      return mapearBuild(
        await tabela.update({
          where: { id },
          data: {
            ...(data.nome !== undefined ? { nome: data.nome } : {}),
            ...(data.descricao !== undefined ? { descricao: data.descricao } : {}),
            ...(data.notasPessoais !== undefined
              ? { notasPessoais: data.notasPessoais }
              : {}),
            ...(data.pecas !== undefined
              ? {
                  pecas: {
                    deleteMany: {},
                    create: data.pecas,
                  },
                }
              : {}),
          },
          include: { pecas: true },
        }),
      );
    },
    async delete(id) {
      await tabela.delete({ where: { id } });
    },
  };
}

export async function criarBuild(
  usuarioId: string,
  input: BuildInput,
  builds: BuildRepo,
): Promise<Build> {
  return builds.create({
    usuarioId,
    nome: exigirNome(input.nome),
    descricao: textoOpcional(input.descricao, "descricao") ?? null,
    notasPessoais: textoOpcional(input.notasPessoais, "notasPessoais") ?? null,
    pecas: validarPecas(input.pecas),
  });
}

export async function listarBuilds(
  usuarioId: string,
  builds: BuildRepo,
): Promise<Build[]> {
  return builds.findMany(usuarioId);
}

export async function obterBuild(
  usuarioId: string,
  id: string,
  builds: BuildRepo,
): Promise<Build> {
  return carregarDoDono(usuarioId, id, builds);
}

export async function atualizarBuild(
  usuarioId: string,
  id: string,
  input: BuildInput,
  builds: BuildRepo,
): Promise<Build> {
  await carregarDoDono(usuarioId, id, builds);
  const patch: BuildAtualizacao = {};

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
  if (input.pecas !== undefined) {
    patch.pecas = validarPecas(input.pecas);
  }

  if (Object.keys(patch).length === 0) {
    return obterBuild(usuarioId, id, builds);
  }
  return builds.update(id, patch);
}

export async function excluirBuild(
  usuarioId: string,
  id: string,
  builds: BuildRepo,
  limparFotos?: LimparFotosBuild,
): Promise<void> {
  const build = await carregarDoDono(usuarioId, id, builds);
  if (limparFotos) {
    await limparFotos(usuarioId, "BUILD", id);
    for (const peca of build.pecas) {
      await limparFotos(usuarioId, "PECA", peca.id);
    }
  }
  await builds.delete(id);
}

async function carregarDoDono(
  usuarioId: string,
  id: string,
  builds: BuildRepo,
): Promise<Build> {
  const build = await builds.findById(id);
  if (!build) {
    throw new HttpErro(404, "Recurso não encontrado.");
  }
  assertDono(usuarioId, build.usuarioId);
  return build;
}

function validarPecas(bruto: unknown): BuildPecaDados[] {
  if (bruto === undefined || bruto === null) {
    return [];
  }
  if (!Array.isArray(bruto)) {
    throw new HttpErro(400, "As peças devem ser uma lista.");
  }
  return bruto.map(lerPeca);
}

function lerPeca(entrada: unknown): BuildPecaDados {
  if (entrada === null || typeof entrada !== "object" || Array.isArray(entrada)) {
    throw new HttpErro(400, "Cada peça deve ser um objeto.");
  }
  const bruto = entrada as {
    tipoPeca?: unknown;
    nome?: unknown;
    ficha?: unknown;
    notas?: unknown;
  };
  const tipoPeca = exigirTipoPeca(bruto.tipoPeca);
  return {
    tipoPeca,
    nome: exigirNome(bruto.nome),
    ficha: validarFichaDaPeca(tipoPeca, bruto.ficha),
    notas: textoOpcional(bruto.notas, "notas") ?? null,
  };
}

function exigirTipoPeca(valor: unknown): TipoPeca {
  if (valor === undefined || valor === null || valor === "") {
    throw new HttpErro(400, "Informe o tipo da peça.");
  }
  if (!eTipoPeca(valor)) {
    throw new HttpErro(400, "Tipo de peça inválido.");
  }
  return valor;
}

function eTipoPeca(valor: unknown): valor is TipoPeca {
  return typeof valor === "string" && valor in schemasFichaPeca;
}

function validarFichaDaPeca(
  tipoPeca: TipoPeca,
  json: unknown,
): Record<string, unknown> {
  const bruto = json === undefined ? {} : json;
  try {
    return validarFichaPeca(tipoPeca, bruto) as Record<string, unknown>;
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

function exigirNome(valor: unknown): string {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new HttpErro(400, "O nome é obrigatório.");
  }
  return valor.trim();
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

function mapearBuild(linha: BuildLinha): Build {
  return {
    id: linha.id,
    usuarioId: linha.usuarioId,
    nome: linha.nome,
    descricao: linha.descricao,
    notasPessoais: linha.notasPessoais,
    pecas: (linha.pecas ?? []).map(mapearPeca),
  };
}

function mapearPeca(linha: BuildPecaLinha): BuildPeca {
  if (!eTipoPeca(linha.tipoPeca)) {
    throw new HttpErro(400, "Tipo de peça inválido.");
  }
  return {
    id: linha.id,
    buildId: linha.buildId,
    tipoPeca: linha.tipoPeca,
    nome: linha.nome,
    ficha: fichaComoObjeto(linha.ficha),
    notas: linha.notas,
  };
}

function fichaComoObjeto(ficha: unknown): Record<string, unknown> {
  if (ficha === null || typeof ficha !== "object" || Array.isArray(ficha)) {
    return {};
  }
  return ficha as Record<string, unknown>;
}
