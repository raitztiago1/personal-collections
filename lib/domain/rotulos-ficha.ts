import type { TipoColecaoItem } from "./colecoes";
import { schemasFichaItem } from "./fichas-item";
import { schemasFichaPeca, type TipoPeca } from "./fichas-peca";

export type TipoCampoFicha = "texto" | "enum" | "inteiro" | "decimal";

export type CampoFichaUI = {
  campo: string;
  rotulo: string;
  tipo: TipoCampoFicha;
  opcoes?: { valor: string; rotulo: string }[];
};

export type CampoPreenchidoFicha = {
  campo: string;
  rotulo: string;
  valor: string;
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
  set_edicao: "Set/edição",
  codigo: "Código",
  raridade: "Raridade",
  idioma: "Idioma",
  quantidade: "Quantidade",
  tipo_carta: "Tipo",
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
  vram_gb: "VRAM (GB)",
  clock_mhz: "Clock (MHz)",
  barramento: "Barramento",
  nucleos: "Núcleos",
  threads: "Threads",
  clock_ghz: "Clock (GHz)",
  capacidade_gb: "Capacidade (GB)",
  speed_mhz: "Speed (MHz)",
  tipo: "Tipo",
  interface: "Interface",
  socket: "Socket",
  chipset: "Chipset",
  potencia_w: "Potência (W)",
  certificacao: "Certificação",
  polegadas: "Polegadas",
  resolucao: "Resolução",
  taxa_hz: "Taxa (Hz)",
};

const ROTULOS_TIPO_PECA: Record<TipoPeca, string> = {
  GPU: "GPU",
  CPU: "CPU",
  RAM: "RAM",
  ARMAZENAMENTO: "Armazenamento",
  PLACA_MAE: "Placa-mãe",
  PSU: "Fonte",
  GABINETE: "Gabinete",
  COOLER: "Cooler",
  MONITOR: "Monitor",
  PERIFERICO: "Periférico",
  OUTRO: "Outro",
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
  DDR3: "DDR3",
  DDR4: "DDR4",
  DDR5: "DDR5",
  SSD_NVME: "SSD NVMe",
  SSD_SATA: "SSD SATA",
  HDD: "HDD",
};

type SchemaCampo = {
  type: string;
  unwrap?: () => SchemaCampo;
  options?: unknown[];
  format?: string | null;
};

export function rotuloCampoFicha(campo: string): string {
  return ROTULOS_CAMPO[campo] ?? campo;
}

export function rotuloValorFicha(valor: string): string {
  return ROTULOS_VALOR[valor] ?? valor;
}

export function camposFichaUI(tipo: TipoColecaoItem): CampoFichaUI[] {
  return Object.keys(schemasFichaItem[tipo].shape).map((campo) =>
    montarCampo(tipo, campo),
  );
}

export function camposPreenchidosFicha(
  tipo: TipoColecaoItem,
  ficha: Record<string, unknown>,
): CampoPreenchidoFicha[] {
  return preencherCampos(camposFichaUI(tipo), ficha);
}

export function rotuloTipoPeca(tipo: TipoPeca): string {
  return ROTULOS_TIPO_PECA[tipo];
}

export function camposFichaPecaUI(tipo: TipoPeca): CampoFichaUI[] {
  return Object.keys(schemasFichaPeca[tipo].shape).map((campo) =>
    montarCampoPeca(tipo, campo),
  );
}

export function camposPreenchidosFichaPeca(
  tipo: TipoPeca,
  ficha: Record<string, unknown>,
): CampoPreenchidoFicha[] {
  return preencherCampos(camposFichaPecaUI(tipo), ficha);
}

function preencherCampos(
  campos: CampoFichaUI[],
  ficha: Record<string, unknown>,
): CampoPreenchidoFicha[] {
  return campos.flatMap((campo) => {
    const bruto = ficha[campo.campo];
    if (!valorPreenchido(bruto)) {
      return [];
    }
    return [
      {
        campo: campo.campo,
        rotulo: campo.rotulo,
        valor: formatarValorCampo(campo, bruto),
      },
    ];
  });
}

function montarCampo(tipo: TipoColecaoItem, campo: string): CampoFichaUI {
  return montarCampoDeSchema(schemaInternoItem(tipo, campo), campo);
}

function montarCampoPeca(tipo: TipoPeca, campo: string): CampoFichaUI {
  return montarCampoDeSchema(schemaInternoPeca(tipo, campo), campo);
}

function montarCampoDeSchema(
  interno: SchemaCampo | undefined,
  campo: string,
): CampoFichaUI {
  const tipoCampo = tipoDoCampo(interno);
  const opcoes =
    tipoCampo === "enum"
      ? opcoesEnum(interno).map((valor) => ({
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

function tipoDoCampo(interno: SchemaCampo | undefined): TipoCampoFicha {
  if (interno?.type === "enum") {
    return "enum";
  }
  if (interno?.type === "int" || interno?.format === "safeint") {
    return "inteiro";
  }
  if (interno?.type === "number") {
    return "decimal";
  }
  return "texto";
}

function opcoesEnum(interno: SchemaCampo | undefined): string[] {
  if (!interno || !Array.isArray(interno.options)) {
    return [];
  }
  return interno.options.map((opcao) => String(opcao));
}

function schemaInternoItem(
  tipoColecao: TipoColecaoItem,
  campo: string,
): SchemaCampo | undefined {
  return desembrulharSchema(
    (schemasFichaItem[tipoColecao].shape as Record<string, SchemaCampo>)[campo],
  );
}

function schemaInternoPeca(
  tipoPeca: TipoPeca,
  campo: string,
): SchemaCampo | undefined {
  return desembrulharSchema(
    (schemasFichaPeca[tipoPeca].shape as Record<string, SchemaCampo>)[campo],
  );
}

function desembrulharSchema(
  schema: SchemaCampo | undefined,
): SchemaCampo | undefined {
  if (!schema) {
    return undefined;
  }
  if (schema.type === "optional" && typeof schema.unwrap === "function") {
    return schema.unwrap();
  }
  return schema;
}

function valorPreenchido(valor: unknown): boolean {
  if (valor === undefined || valor === null) {
    return false;
  }
  if (typeof valor === "string") {
    return valor.trim() !== "";
  }
  return true;
}

function formatarValorCampo(campo: CampoFichaUI, valor: unknown): string {
  if (typeof valor === "string") {
    return campo.tipo === "enum" ? rotuloValorFicha(valor) : valor;
  }
  return String(valor);
}
