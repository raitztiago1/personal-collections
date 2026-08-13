import { HttpErro } from "../isolamento";
import { TIPOS_COLECAO_ITEM, type TipoColecaoItem } from "./colecoes";
import {
  METADADOS_FICHA_ITEM,
  schemasFichaItem,
  type FlagsCampoFicha,
} from "./fichas-item";
import { itemRepoPrisma } from "./itens";

/**
 * Linha de inventário para busca. O repo deve ler só a tabela `item`
 * (nunca `wishlist_item`, decks ou builds). `origem` existe para o
 * domínio descartar wishlist se um repo incorreto a misturar (RN-01).
 */
export type ItemBuscaLinha = {
  id: string;
  usuarioId: string;
  tipoColecao: TipoColecaoItem;
  nome: string;
  descricao: string | null;
  tags: string[];
  ficha: Record<string, unknown>;
  origem?: string;
};

export type BuscaRepo = {
  /** Consulta apenas a tabela `item` do usuário. */
  listarDoUsuario(
    usuarioId: string,
    tipoColecao?: TipoColecaoItem,
  ): Promise<ItemBuscaLinha[]>;
};

export type CriteriosBusca = {
  q?: string;
  tipoColecao?: string;
  filtros?: Record<string, string>;
};

export type ResultadoBusca = {
  id: string;
  tipoColecao: TipoColecaoItem;
  nome: string;
  capa: string | null;
};

export function parsearConsultaBusca(searchParams: URLSearchParams): CriteriosBusca {
  const q = searchParams.get("q");
  const tipoColecao = searchParams.get("tipoColecao");
  const filtros: Record<string, string> = {};

  for (const [chave, valor] of searchParams.entries()) {
    if (!chave.startsWith("filtro.")) {
      continue;
    }
    const campo = chave.slice("filtro.".length);
    if (campo.length === 0 || valor === "") {
      continue;
    }
    filtros[campo] = valor;
  }

  return {
    ...(q ? { q } : {}),
    ...(tipoColecao ? { tipoColecao } : {}),
    ...(Object.keys(filtros).length > 0 ? { filtros } : {}),
  };
}

export async function buscarItens(
  usuarioId: string,
  criterios: CriteriosBusca,
  repo: BuscaRepo,
): Promise<ResultadoBusca[]> {
  const tipoColecao = tipoColecaoOpcional(criterios.tipoColecao);
  validarFiltros(tipoColecao, criterios.filtros);

  const linhas = await repo.listarDoUsuario(usuarioId, tipoColecao);
  const q = criterios.q?.trim() ?? "";

  return linhas
    .filter((linha) => eItemDoInventario(usuarioId, linha))
    .filter((linha) => (q === "" ? true : correspondeTexto(linha, q)))
    .filter((linha) => correspondeFiltros(linha, criterios.filtros))
    .map(paraResultado);
}

/** Adapter Prisma: lista só `item` — wishlist/decks/builds ficam de fora. */
export function buscaRepoPrisma(prisma: { item: object }): BuscaRepo {
  const itens = itemRepoPrisma(prisma);
  return {
    async listarDoUsuario(usuarioId, tipoColecao) {
      return itens.findMany({ usuarioId, tipoColecao });
    },
  };
}

function eItemDoInventario(usuarioId: string, linha: ItemBuscaLinha): boolean {
  if (linha.usuarioId !== usuarioId) {
    return false;
  }
  if (linha.origem === "wishlist") {
    return false;
  }
  if (linha.origem !== undefined && linha.origem !== "item") {
    return false;
  }
  return eTipoColecaoItem(linha.tipoColecao);
}

function correspondeTexto(linha: ItemBuscaLinha, q: string): boolean {
  const needle = dobrar(q);
  return textosPesquisaveis(linha).some((texto) => dobrar(texto).includes(needle));
}

function textosPesquisaveis(linha: ItemBuscaLinha): string[] {
  const textos = [linha.nome, ...linha.tags];
  if (linha.descricao) {
    textos.push(linha.descricao);
  }

  const meta = metadadosDoTipo(linha.tipoColecao);
  for (const [campo, flags] of Object.entries(meta)) {
    if (!flags.pesquisavel) {
      continue;
    }
    const valor = linha.ficha[campo];
    if (valor === undefined || valor === null) {
      continue;
    }
    textos.push(String(valor));
  }
  return textos;
}

function correspondeFiltros(
  linha: ItemBuscaLinha,
  filtros: Record<string, string> | undefined,
): boolean {
  if (!filtros) {
    return true;
  }
  return Object.entries(filtros).every(([campo, esperado]) =>
    correspondeFiltro(linha, campo, esperado),
  );
}

function correspondeFiltro(
  linha: ItemBuscaLinha,
  campo: string,
  esperado: string,
): boolean {
  const valor = linha.ficha[campo];
  if (valor === undefined || valor === null) {
    return false;
  }

  const tipo = tipoComparacaoFiltro(linha.tipoColecao, campo);
  if (tipo === "inteiro") {
    const numero = Number(esperado);
    return Number.isFinite(numero) && valor === numero;
  }
  if (tipo === "enum") {
    return String(valor) === esperado;
  }
  return dobrar(String(valor)).includes(dobrar(esperado));
}

function tipoComparacaoFiltro(
  tipoColecao: TipoColecaoItem,
  campo: string,
): "texto" | "enum" | "inteiro" {
  const shape = schemasFichaItem[tipoColecao].shape as Record<
    string,
    { type: string; unwrap?: () => { type: string } }
  >;
  const schema = shape[campo];
  const tipo =
    schema?.type === "optional" && typeof schema.unwrap === "function"
      ? schema.unwrap().type
      : schema?.type;

  if (tipo === "enum") {
    return "enum";
  }
  if (tipo === "int" || tipo === "number") {
    return "inteiro";
  }
  return "texto";
}

function validarFiltros(
  tipoColecao: TipoColecaoItem | undefined,
  filtros: Record<string, string> | undefined,
): void {
  if (!filtros || Object.keys(filtros).length === 0) {
    return;
  }
  if (!tipoColecao) {
    throw new HttpErro(400, "Informe o tipo da coleção para aplicar filtros.");
  }

  const meta = metadadosDoTipo(tipoColecao);
  for (const campo of Object.keys(filtros)) {
    if (!meta[campo]?.filtravel) {
      throw new HttpErro(400, `O campo '${campo}' não é filtrável.`);
    }
  }
}

function metadadosDoTipo(
  tipo: TipoColecaoItem,
): Record<string, FlagsCampoFicha> {
  return METADADOS_FICHA_ITEM[tipo] as Record<string, FlagsCampoFicha>;
}

function tipoColecaoOpcional(valor: unknown): TipoColecaoItem | undefined {
  if (valor === undefined || valor === null || valor === "") {
    return undefined;
  }
  if (!eTipoColecaoItem(valor)) {
    throw new HttpErro(400, "Tipo de coleção inválido.");
  }
  return valor;
}

function eTipoColecaoItem(valor: unknown): valor is TipoColecaoItem {
  return (
    typeof valor === "string" &&
    (TIPOS_COLECAO_ITEM as readonly string[]).includes(valor)
  );
}

function paraResultado(linha: ItemBuscaLinha): ResultadoBusca {
  return {
    id: linha.id,
    tipoColecao: linha.tipoColecao,
    nome: linha.nome,
    capa: null,
  };
}

function dobrar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}
