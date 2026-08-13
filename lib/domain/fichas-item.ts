import { z } from "zod";
import type { TipoColecaoItem } from "./colecoes";

export type FlagsCampoFicha = {
  filtravel: boolean;
  pesquisavel: boolean;
};

const F: FlagsCampoFicha = { filtravel: true, pesquisavel: false };
const P: FlagsCampoFicha = { filtravel: false, pesquisavel: true };
const FP: FlagsCampoFicha = { filtravel: true, pesquisavel: true };
const NENHUM: FlagsCampoFicha = { filtravel: false, pesquisavel: false };

const texto = z.string();
const inteiro = z.int();
const decimal = z.number();

export const METADADOS_FICHA_ITEM = {
  TENIS: {
    marca: FP,
    linha: FP,
    colorway: P,
    sku: P,
    tamanho: FP,
    ano: F,
    condicao: F,
    colaboracao: P,
  },
  WHISKY: {
    destilaria: FP,
    regiao: FP,
    idade_anos: F,
    abv: NENHUM,
    tipo_barril: FP,
    engarrafador: F,
    volume_ml: NENHUM,
    nivel_restante: F,
    notas_degustacao: P,
    nota_pessoal: NENHUM,
  },
  PERFUME: {
    casa: FP,
    linha: FP,
    concentracao: F,
    perfumista: P,
    ano: F,
    volume_ml: NENHUM,
    notas_topo: P,
    notas_coracao: P,
    notas_base: P,
    ocasiao: FP,
    restante: F,
  },
  YUGIOH: {
    set_edicao: FP,
    codigo: P,
    raridade: FP,
    condicao: F,
    idioma: FP,
    quantidade: NENHUM,
    tipo_carta: FP,
    atributo: FP,
    nivel: F,
    atk: NENHUM,
    def: NENHUM,
  },
  MANGA: {
    obra: FP,
    volume: P,
    autor: FP,
    artista: P,
    editora: FP,
    idioma: FP,
    status_obra: F,
  },
  LIVRO: {
    autor: FP,
    editora: FP,
    isbn: P,
    ano: F,
    edicao: P,
    formato: F,
    status_leitura: F,
  },
  GADGET: {
    tipo_aparelho: FP,
    marca: FP,
    modelo: P,
    ano: F,
    capacidade: P,
    condicao: F,
    acessorios: P,
  },
} as const satisfies Record<
  TipoColecaoItem,
  Record<string, FlagsCampoFicha>
>;

export const schemasFichaItem = {
  TENIS: z.strictObject({
    marca: texto.optional(),
    linha: texto.optional(),
    colorway: texto.optional(),
    sku: texto.optional(),
    tamanho: texto.optional(),
    ano: inteiro.optional(),
    condicao: z.enum(["NOVO", "USADO", "DANIFICADO"]).optional(),
    colaboracao: texto.optional(),
  }),
  WHISKY: z.strictObject({
    destilaria: texto.optional(),
    regiao: texto.optional(),
    idade_anos: inteiro.optional(),
    abv: decimal.optional(),
    tipo_barril: texto.optional(),
    engarrafador: z.enum(["OFICIAL", "INDEPENDENTE"]).optional(),
    volume_ml: inteiro.optional(),
    nivel_restante: z
      .enum(["CHEIO", "MAIORIA", "METADE", "POUCO", "VAZIO"])
      .optional(),
    notas_degustacao: texto.optional(),
    nota_pessoal: decimal.min(0).max(10).optional(),
  }),
  PERFUME: z.strictObject({
    casa: texto.optional(),
    linha: texto.optional(),
    concentracao: z
      .enum(["EDC", "EDT", "EDP", "PARFUM", "EXTRAT", "OUTRO"])
      .optional(),
    perfumista: texto.optional(),
    ano: inteiro.optional(),
    volume_ml: inteiro.optional(),
    notas_topo: texto.optional(),
    notas_coracao: texto.optional(),
    notas_base: texto.optional(),
    ocasiao: texto.optional(),
    restante: z
      .enum(["CHEIO", "MAIORIA", "METADE", "POUCO", "VAZIO"])
      .optional(),
  }),
  YUGIOH: z.strictObject({
    set_edicao: texto.optional(),
    codigo: texto.optional(),
    raridade: texto.optional(),
    condicao: z
      .enum(["MINT", "NM", "LP", "MP", "HP", "DANIFICADO"])
      .optional(),
    idioma: texto.optional(),
    quantidade: inteiro.min(1).optional(),
    tipo_carta: texto.optional(),
    atributo: texto.optional(),
    nivel: inteiro.optional(),
    atk: inteiro.optional(),
    def: inteiro.optional(),
  }),
  MANGA: z.strictObject({
    obra: texto.optional(),
    volume: texto.optional(),
    autor: texto.optional(),
    artista: texto.optional(),
    editora: texto.optional(),
    idioma: texto.optional(),
    status_obra: z.enum(["EM_ANDAMENTO", "COMPLETA", "HIATO"]).optional(),
  }),
  LIVRO: z.strictObject({
    autor: texto.optional(),
    editora: texto.optional(),
    isbn: texto.optional(),
    ano: inteiro.optional(),
    edicao: texto.optional(),
    formato: z
      .enum(["CAPA_DURA", "BROCHURA", "BOLSO", "EBOOK", "OUTRO"])
      .optional(),
    status_leitura: z.enum(["NAO_LIDO", "LENDO", "LIDO"]).optional(),
  }),
  GADGET: z.strictObject({
    tipo_aparelho: texto.optional(),
    marca: texto.optional(),
    modelo: texto.optional(),
    ano: inteiro.optional(),
    capacidade: texto.optional(),
    condicao: z.enum(["NOVO", "USADO", "DANIFICADO"]).optional(),
    acessorios: texto.optional(),
  }),
} as const;
