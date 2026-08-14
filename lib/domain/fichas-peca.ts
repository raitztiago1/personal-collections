import { z } from "zod";

export const TIPOS_PECA = [
  "GPU",
  "CPU",
  "RAM",
  "ARMAZENAMENTO",
  "PLACA_MAE",
  "PSU",
  "GABINETE",
  "COOLER",
  "MONITOR",
  "PERIFERICO",
  "OUTRO",
] as const;

export type TipoPeca = (typeof TIPOS_PECA)[number];

export type FlagsCampoFicha = {
  filtravel: boolean;
  pesquisavel: boolean;
};

const NENHUM: FlagsCampoFicha = { filtravel: false, pesquisavel: false };

const texto = z.string();
const inteiro = z.int();
const decimal = z.number();

export const METADADOS_FICHA_PECA = {
  GPU: {
    marca: NENHUM,
    modelo: NENHUM,
    vram_gb: NENHUM,
    clock_mhz: NENHUM,
    barramento: NENHUM,
  },
  CPU: {
    marca: NENHUM,
    modelo: NENHUM,
    nucleos: NENHUM,
    threads: NENHUM,
    clock_ghz: NENHUM,
  },
  RAM: {
    capacidade_gb: NENHUM,
    speed_mhz: NENHUM,
    tipo: NENHUM,
  },
  ARMAZENAMENTO: {
    tipo: NENHUM,
    capacidade_gb: NENHUM,
    interface: NENHUM,
  },
  PLACA_MAE: {
    marca: NENHUM,
    modelo: NENHUM,
    socket: NENHUM,
    chipset: NENHUM,
  },
  PSU: {
    marca: NENHUM,
    modelo: NENHUM,
    potencia_w: NENHUM,
    certificacao: NENHUM,
  },
  GABINETE: {
    marca: NENHUM,
    modelo: NENHUM,
    tamanho: NENHUM,
  },
  COOLER: {
    marca: NENHUM,
    modelo: NENHUM,
    tamanho: NENHUM,
  },
  MONITOR: {
    marca: NENHUM,
    modelo: NENHUM,
    polegadas: NENHUM,
    resolucao: NENHUM,
    taxa_hz: NENHUM,
  },
  PERIFERICO: {
    marca: NENHUM,
    modelo: NENHUM,
    tipo: NENHUM,
  },
  OUTRO: {
    marca: NENHUM,
    modelo: NENHUM,
    tipo: NENHUM,
  },
} as const satisfies Record<TipoPeca, Record<string, FlagsCampoFicha>>;

export const schemasFichaPeca = {
  GPU: z.strictObject({
    marca: texto.optional(),
    modelo: texto.optional(),
    vram_gb: decimal.optional(),
    clock_mhz: inteiro.optional(),
    barramento: texto.optional(),
  }),
  CPU: z.strictObject({
    marca: texto.optional(),
    modelo: texto.optional(),
    nucleos: inteiro.optional(),
    threads: inteiro.optional(),
    clock_ghz: decimal.optional(),
  }),
  RAM: z.strictObject({
    capacidade_gb: decimal.optional(),
    speed_mhz: inteiro.optional(),
    tipo: z.enum(["DDR3", "DDR4", "DDR5", "OUTRO"]).optional(),
  }),
  ARMAZENAMENTO: z.strictObject({
    tipo: z.enum(["SSD_NVME", "SSD_SATA", "HDD", "OUTRO"]).optional(),
    capacidade_gb: decimal.optional(),
    interface: texto.optional(),
  }),
  PLACA_MAE: z.strictObject({
    marca: texto.optional(),
    modelo: texto.optional(),
    socket: texto.optional(),
    chipset: texto.optional(),
  }),
  PSU: z.strictObject({
    marca: texto.optional(),
    modelo: texto.optional(),
    potencia_w: inteiro.optional(),
    certificacao: texto.optional(),
  }),
  GABINETE: z.strictObject({
    marca: texto.optional(),
    modelo: texto.optional(),
    tamanho: texto.optional(),
  }),
  COOLER: z.strictObject({
    marca: texto.optional(),
    modelo: texto.optional(),
    tamanho: texto.optional(),
  }),
  MONITOR: z.strictObject({
    marca: texto.optional(),
    modelo: texto.optional(),
    polegadas: decimal.optional(),
    resolucao: texto.optional(),
    taxa_hz: inteiro.optional(),
  }),
  PERIFERICO: z.strictObject({
    marca: texto.optional(),
    modelo: texto.optional(),
    tipo: texto.optional(),
  }),
  OUTRO: z.strictObject({
    marca: texto.optional(),
    modelo: texto.optional(),
    tipo: texto.optional(),
  }),
} as const;
