import {
  COLECOES,
  type DefinicaoColecao,
  type TipoColecaoItem,
} from "./domain/colecoes";
import { parsearConsultaBusca } from "./domain/busca";
import { METADADOS_FICHA_ITEM, schemasFichaItem } from "./domain/fichas-item";

export type CampoFiltroUI = {
  campo: string;
  rotulo: string;
  tipo: "texto" | "enum" | "inteiro";
  opcoes?: { valor: string; rotulo: string }[];
};

export type ValorChaveLista = {
  rotulo: string;
  valor: string;
};

const CAMPOS_CHAVE: Record<TipoColecaoItem, readonly [string, string]> = {
  TENIS: ["marca", "tamanho"],
  WHISKY: ["destilaria", "idade_anos"],
  PERFUME: ["casa", "concentracao"],
  YUGIOH: ["raridade", "set_edicao"],
  MANGA: ["obra", "volume"],
  LIVRO: ["autor", "editora"],
  GADGET: ["marca", "tipo_aparelho"],
};

const ROTULOS_CAMPO: Record<string, string> = {
  marca: "Marca",
  linha: "Linha",
  colorway: "Colorway",
  sku: "SKU",
  tamanho: "Tamanho",
  ano: "Ano",
  condicao: "Condição",
  colaboracao: "Colaboração",
  destilaria: "Destilaria",
  regiao: "Região",
  idade_anos: "Idade (anos)",
  abv: "ABV",
  tipo_barril: "Tipo de barril",
  engarrafador: "Engarrafador",
  volume_ml: "Volume (ml)",
  nivel_restante: "Nível restante",
  notas_degustacao: "Notas de degustação",
  nota_pessoal: "Nota pessoal",
  casa: "Casa",
  concentracao: "Concentração",
  perfumista: "Perfumista",
  notas_topo: "Notas de topo",
  notas_coracao: "Notas de coração",
  notas_base: "Notas de base",
  ocasiao: "Ocasião",
  restante: "Restante",
  set_edicao: "Set / edição",
  codigo: "Código",
  raridade: "Raridade",
  idioma: "Idioma",
  quantidade: "Quantidade",
  tipo_carta: "Tipo de carta",
  atributo: "Atributo",
  nivel: "Nível",
  atk: "ATK",
  def: "DEF",
  obra: "Obra",
  volume: "Volume",
  autor: "Autor",
  artista: "Artista",
  editora: "Editora",
  status_obra: "Status da obra",
  isbn: "ISBN",
  edicao: "Edição",
  formato: "Formato",
  status_leitura: "Status de leitura",
  tipo_aparelho: "Tipo de aparelho",
  modelo: "Modelo",
  capacidade: "Capacidade",
  acessorios: "Acessórios",
};

const ROTULOS_VALOR: Record<string, string> = {
  NOVO: "Novo",
  USADO: "Usado",
  DANIFICADO: "Danificado",
  OFICIAL: "Oficial",
  INDEPENDENTE: "Independente",
  CHEIO: "Cheio",
  MAIORIA: "Maioria",
  METADE: "Metade",
  POUCO: "Pouco",
  VAZIO: "Vazio",
  EDC: "EDC",
  EDT: "EDT",
  EDP: "EDP",
  PARFUM: "Parfum",
  EXTRAT: "Extrait",
  OUTRO: "Outro",
  MINT: "Mint",
  NM: "NM",
  LP: "LP",
  MP: "MP",
  HP: "HP",
  EM_ANDAMENTO: "Em andamento",
  COMPLETA: "Completa",
  HIATO: "Hiato",
  CAPA_DURA: "Capa dura",
  BROCHURA: "Brochura",
  BOLSO: "Bolso",
  EBOOK: "E-book",
  NAO_LIDO: "Não lido",
  LENDO: "Lendo",
  LIDO: "Lido",
};

type SchemaCampo = {
  type: string;
  unwrap?: () => SchemaCampo;
  options?: unknown[];
};

export function colecaoPorSlug(slug: string): DefinicaoColecao | undefined {
  return COLECOES.find((colecao) => colecao.slug === slug);
}

export function slugPorTipoColecao(tipo: TipoColecaoItem): string {
  const colecao = COLECOES.find((item) => item.tipoColecao === tipo);
  if (!colecao) {
    throw new Error(`Coleção sem slug para o tipo ${tipo}`);
  }
  return colecao.slug;
}

export function rotuloTipoColecao(tipo: TipoColecaoItem): string {
  return colecaoPorSlug(slugPorTipoColecao(tipo))?.rotulo ?? tipo;
}

export function hrefItemColecao(tipo: TipoColecaoItem, id: string): string {
  return `/colecoes/${slugPorTipoColecao(tipo)}/itens/${id}`;
}

export function montarQueryBusca(opts: {
  q?: string;
  tipoColecao?: string;
  filtros?: Record<string, string>;
}): string {
  const partes: string[] = [];
  const q = opts.q?.trim() ?? "";
  if (q) {
    partes.push(`q=${encodeURIComponent(q)}`);
  }
  if (opts.tipoColecao) {
    partes.push(`tipoColecao=${encodeURIComponent(opts.tipoColecao)}`);
  }
  for (const [campo, valor] of Object.entries(opts.filtros ?? {})) {
    if (valor.trim() === "") {
      continue;
    }
    partes.push(
      `filtro.${encodeURIComponent(campo)}=${encodeURIComponent(valor.trim())}`,
    );
  }
  return partes.join("&");
}

export function parsearQueryLista(
  origem:
    | URLSearchParams
    | Record<string, string | string[] | undefined>,
): { q: string; filtros: Record<string, string> } {
  const criterios = parsearConsultaBusca(paraSearchParams(origem));
  return {
    q: criterios.q ?? "",
    filtros: criterios.filtros ?? {},
  };
}

export function camposFiltroColecao(tipo: TipoColecaoItem): CampoFiltroUI[] {
  return Object.entries(METADADOS_FICHA_ITEM[tipo])
    .filter(([, flags]) => flags.filtravel)
    .map(([campo]) => montarCampoFiltro(tipo, campo));
}

export function camposChaveLista(tipo: TipoColecaoItem): readonly string[] {
  return CAMPOS_CHAVE[tipo];
}

export function valoresChaveLista(
  tipo: TipoColecaoItem,
  ficha: Record<string, unknown>,
): ValorChaveLista[] {
  return CAMPOS_CHAVE[tipo].flatMap((campo) => {
    const bruto = ficha[campo];
    if (bruto === undefined || bruto === null || bruto === "") {
      return [];
    }
    return [{ rotulo: rotuloCampoFicha(campo), valor: String(bruto) }];
  });
}

export function rotuloCampoFicha(campo: string): string {
  return ROTULOS_CAMPO[campo] ?? campo;
}

export function rotuloValorFicha(valor: string): string {
  return ROTULOS_VALOR[valor] ?? valor;
}

function montarCampoFiltro(
  tipo: TipoColecaoItem,
  campo: string,
): CampoFiltroUI {
  const tipoCampo = tipoComparacao(tipo, campo);
  const opcoes =
    tipoCampo === "enum"
      ? opcoesEnum(tipo, campo).map((valor) => ({
          valor,
          rotulo: rotuloValorFicha(valor),
        }))
      : undefined;

  return {
    campo,
    rotulo: rotuloCampoFicha(campo),
    tipo: tipoCampo,
    ...(opcoes ? { opcoes } : {}),
  };
}

function tipoComparacao(
  tipoColecao: TipoColecaoItem,
  campo: string,
): "texto" | "enum" | "inteiro" {
  const interno = schemaInterno(tipoColecao, campo);
  if (interno?.type === "enum") {
    return "enum";
  }
  if (interno?.type === "int" || interno?.type === "number") {
    return "inteiro";
  }
  return "texto";
}

function opcoesEnum(tipoColecao: TipoColecaoItem, campo: string): string[] {
  const interno = schemaInterno(tipoColecao, campo);
  if (!interno || !Array.isArray(interno.options)) {
    return [];
  }
  return interno.options.map((opcao) => String(opcao));
}

function schemaInterno(
  tipoColecao: TipoColecaoItem,
  campo: string,
): SchemaCampo | undefined {
  const shape = schemasFichaItem[tipoColecao].shape as Record<
    string,
    SchemaCampo
  >;
  const schema = shape[campo];
  if (!schema) {
    return undefined;
  }
  if (schema.type === "optional" && typeof schema.unwrap === "function") {
    return schema.unwrap();
  }
  return schema;
}

function paraSearchParams(
  origem:
    | URLSearchParams
    | Record<string, string | string[] | undefined>,
): URLSearchParams {
  if (origem instanceof URLSearchParams) {
    return origem;
  }
  const params = new URLSearchParams();
  for (const [chave, valor] of Object.entries(origem)) {
    const texto = Array.isArray(valor) ? valor[0] : valor;
    if (!texto) {
      continue;
    }
    params.set(chave, texto);
  }
  return params;
}
