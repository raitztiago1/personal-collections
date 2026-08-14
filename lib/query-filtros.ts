import {
  COLECOES,
  type DefinicaoColecao,
  type TipoColecaoItem,
} from "./domain/colecoes";
import { parsearConsultaBusca } from "./domain/busca";
import { METADADOS_FICHA_ITEM, schemasFichaItem } from "./domain/fichas-item";
import {
  rotuloCampoFicha,
  rotuloValorFicha,
} from "./domain/rotulos-ficha";

export { rotuloCampoFicha, rotuloValorFicha };

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

export type ExtraUI = {
  definicaoId: string;
  nome: string;
  tipoValor: "TEXTO" | "NUMERO";
  valorTexto: string | null;
  valorNumero: number | null;
};

export type ExtraPayload = {
  definicaoId: string;
  valorTexto?: string | null;
  valorNumero?: number | null;
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

export function colecaoTemWishlist(slug: string): boolean {
  const colecao = colecaoPorSlug(slug);
  return colecao !== undefined && colecao.kind === "item";
}

export function hrefWishlistColecao(slug: string): string | undefined {
  if (!colecaoTemWishlist(slug)) {
    return undefined;
  }
  return `/colecoes/${slug}/wishlist`;
}

export function extrasPreenchidos(
  extras: ExtraUI[],
): { nome: string; valor: string }[] {
  return extras.flatMap((extra) => {
    if (extra.tipoValor === "TEXTO") {
      const valor = extra.valorTexto?.trim() ?? "";
      return valor === "" ? [] : [{ nome: extra.nome, valor }];
    }
    if (extra.valorNumero === null || extra.valorNumero === undefined) {
      return [];
    }
    return [{ nome: extra.nome, valor: String(extra.valorNumero) }];
  });
}

export function estadoInicialExtras(extras: ExtraUI[]): Record<string, string> {
  const estado: Record<string, string> = {};
  for (const extra of extras) {
    if (extra.tipoValor === "TEXTO") {
      estado[extra.definicaoId] = extra.valorTexto ?? "";
      continue;
    }
    estado[extra.definicaoId] =
      extra.valorNumero === null || extra.valorNumero === undefined
        ? ""
        : String(extra.valorNumero);
  }
  return estado;
}

export function montarPayloadExtras(
  extras: ExtraUI[],
  valores: Record<string, string>,
): ExtraPayload[] {
  return extras.map((extra) => {
    const bruto = valores[extra.definicaoId]?.trim() ?? "";
    if (extra.tipoValor === "TEXTO") {
      return {
        definicaoId: extra.definicaoId,
        valorTexto: bruto === "" ? null : bruto,
      };
    }
    if (bruto === "") {
      return { definicaoId: extra.definicaoId, valorNumero: null };
    }
    const numero = Number(bruto);
    if (!Number.isFinite(numero)) {
      throw new Error(`${extra.nome} inválido.`);
    }
    return { definicaoId: extra.definicaoId, valorNumero: numero };
  });
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
