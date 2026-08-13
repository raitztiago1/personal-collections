import { describe, expect, it } from "vitest";
import { COLECOES } from "./colecoes";
import { METADADOS_FICHA_ITEM } from "./fichas-item";
import { METADADOS_FICHA_PECA } from "./fichas-peca";
import { validarFicha, validarFichaPeca } from "./validar-ficha";

const TIPOS_ITEM = [
  "TENIS",
  "WHISKY",
  "PERFUME",
  "YUGIOH",
  "MANGA",
  "LIVRO",
  "GADGET",
] as const;

const TIPOS_PECA = [
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

const F = { filtravel: true, pesquisavel: false };
const P = { filtravel: false, pesquisavel: true };
const FP = { filtravel: true, pesquisavel: true };
const NENHUM = { filtravel: false, pesquisavel: false };

describe("validarFicha", () => {
  it("aceita ficha de perfume válida", () => {
    const ficha = {
      casa: "Dior",
      linha: "Sauvage",
      concentracao: "EDP",
      perfumista: "François Demachy",
      ano: 2015,
      volume_ml: 100,
      notas_topo: "bergamota",
      notas_coracao: "pimenta",
      notas_base: "ambroxan",
      ocasiao: "diurno",
      restante: "CHEIO",
    };

    expect(validarFicha("PERFUME", ficha)).toEqual(ficha);
  });

  it("rejeita chave desconhecida (RN-06)", () => {
    expect(() => validarFicha("PERFUME", { casa: "Dior", batch_code: "X" })).toThrow();
  });

  it("aceita ficha vazia {} em todo tipo de item", () => {
    for (const tipo of TIPOS_ITEM) {
      expect(validarFicha(tipo, {})).toEqual({});
    }
  });

  it("rejeita tênis com chave de whisky", () => {
    expect(() => validarFicha("TENIS", { destilaria: "Macallan" })).toThrow();
  });

  it("não trata PC_BUILD como ficha de item", () => {
    expect(() => validarFicha("PC_BUILD" as never, {})).toThrow();
  });

  it("rejeita JSON que não é objeto", () => {
    expect(() => validarFicha("PERFUME", null)).toThrow();
    expect(() => validarFicha("PERFUME", [])).toThrow();
    expect(() => validarFicha("PERFUME", "Dior")).toThrow();
  });

  it("rejeita enum inválido", () => {
    expect(() => validarFicha("PERFUME", { concentracao: "COLONIA" })).toThrow();
  });

  it("rejeita quantidade de Yu-Gi-Oh! menor que 1", () => {
    expect(() => validarFicha("YUGIOH", { quantidade: 0 })).toThrow();
  });

  it("aceita Yu-Gi-Oh! com quantidade omitida (default documental 1)", () => {
    expect(validarFicha("YUGIOH", { codigo: "LOB-001" })).toEqual({
      codigo: "LOB-001",
    });
  });

  it("rejeita nota_pessoal de whisky fora de 0–10", () => {
    expect(() => validarFicha("WHISKY", { nota_pessoal: 10.5 })).toThrow();
    expect(() => validarFicha("WHISKY", { nota_pessoal: -0.1 })).toThrow();
  });
});

describe("validarFichaPeca", () => {
  it("aceita GPU com vram_gb", () => {
    const ficha = {
      marca: "NVIDIA",
      modelo: "RTX 4070",
      vram_gb: 12.5,
      clock_mhz: 2475,
      barramento: "PCIe 4.0",
    };

    expect(validarFichaPeca("GPU", ficha)).toEqual(ficha);
  });

  it("aceita ficha vazia {} em todo tipo de peça", () => {
    for (const tipoPeca of TIPOS_PECA) {
      expect(validarFichaPeca(tipoPeca, {})).toEqual({});
    }
  });

  it("rejeita chave desconhecida na peça (RN-06)", () => {
    expect(() => validarFichaPeca("GPU", { vram_gb: 8, wattage: 200 })).toThrow();
  });
});

describe("catálogo de coleções", () => {
  it("cataloga as 8 coleções com slug, rótulo, tipo e kind", () => {
    expect(COLECOES).toEqual([
      { slug: "tenis", rotulo: "Tênis", tipoColecao: "TENIS", kind: "item" },
      { slug: "whisky", rotulo: "Whisky", tipoColecao: "WHISKY", kind: "item" },
      {
        slug: "perfumes",
        rotulo: "Perfumes",
        tipoColecao: "PERFUME",
        kind: "item",
      },
      {
        slug: "yugioh",
        rotulo: "Yu-Gi-Oh!",
        tipoColecao: "YUGIOH",
        kind: "item",
      },
      { slug: "mangas", rotulo: "Mangás", tipoColecao: "MANGA", kind: "item" },
      { slug: "livros", rotulo: "Livros", tipoColecao: "LIVRO", kind: "item" },
      {
        slug: "gadgets",
        rotulo: "Gadgets",
        tipoColecao: "GADGET",
        kind: "item",
      },
      {
        slug: "pc-builds",
        rotulo: "Setups PC",
        tipoColecao: "PC_BUILD",
        kind: "composition",
      },
    ]);
  });
});

describe("metadados filtrável/pesquisável", () => {
  it("bate com a tabela da spec para cada tipo de item", () => {
    expect(METADADOS_FICHA_ITEM).toEqual({
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
    });
  });

  it("peças da Onda 1 não são filtráveis nem pesquisáveis", () => {
    for (const tipoPeca of TIPOS_PECA) {
      const campos = METADADOS_FICHA_PECA[tipoPeca];
      expect(Object.keys(campos).length).toBeGreaterThan(0);
      for (const meta of Object.values(campos)) {
        expect(meta).toEqual(NENHUM);
      }
    }

    expect(METADADOS_FICHA_PECA.GPU).toMatchObject({
      marca: NENHUM,
      modelo: NENHUM,
      vram_gb: NENHUM,
      clock_mhz: NENHUM,
      barramento: NENHUM,
    });
  });
});
