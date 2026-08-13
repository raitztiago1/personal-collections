import { describe, expect, it } from "vitest";
import { METADADOS_FICHA_ITEM } from "./domain/fichas-item";
import {
  camposChaveLista,
  camposFiltroColecao,
  colecaoPorSlug,
  montarQueryBusca,
  parsearQueryLista,
  rotuloCampoFicha,
  slugPorTipoColecao,
  valoresChaveLista,
} from "./query-filtros";

describe("colecaoPorSlug", () => {
  it("resolve as coleções de item pelos slugs da home", () => {
    expect(colecaoPorSlug("tenis")?.tipoColecao).toBe("TENIS");
    expect(colecaoPorSlug("whisky")?.tipoColecao).toBe("WHISKY");
    expect(colecaoPorSlug("yugioh")?.rotulo).toBe("Yu-Gi-Oh!");
  });

  it("resolve setups PC como composição", () => {
    expect(colecaoPorSlug("pc-builds")).toMatchObject({
      tipoColecao: "PC_BUILD",
      kind: "composition",
    });
  });

  it("retorna undefined para slug desconhecido", () => {
    expect(colecaoPorSlug("wishlist")).toBeUndefined();
  });
});

describe("slugPorTipoColecao", () => {
  it("mapeia o tipo da busca para o slug da lista", () => {
    expect(slugPorTipoColecao("TENIS")).toBe("tenis");
    expect(slugPorTipoColecao("PERFUME")).toBe("perfumes");
    expect(slugPorTipoColecao("YUGIOH")).toBe("yugioh");
  });
});

describe("montarQueryBusca", () => {
  it("monta GET /api/busca com q, tipoColecao e filtro.campo", () => {
    expect(
      montarQueryBusca({
        q: "chicago",
        tipoColecao: "TENIS",
        filtros: { tamanho: "42", marca: "Nike" },
      }),
    ).toBe("q=chicago&tipoColecao=TENIS&filtro.tamanho=42&filtro.marca=Nike");
  });

  it("omite q e filtros vazios", () => {
    expect(montarQueryBusca({ tipoColecao: "YUGIOH", q: "  ", filtros: { raridade: "" } })).toBe(
      "tipoColecao=YUGIOH",
    );
  });
});

describe("parsearQueryLista", () => {
  it("lê q e filtro.* dos search params da lista", () => {
    const sp = new URLSearchParams(
      "q=blue&filtro.tamanho=42&filtro.raridade=Secret&outro=x",
    );
    expect(parsearQueryLista(sp)).toEqual({
      q: "blue",
      filtros: { tamanho: "42", raridade: "Secret" },
    });
  });

  it("aceita o objeto searchParams do App Router", () => {
    expect(
      parsearQueryLista({
        q: ["chicago"],
        "filtro.tamanho": "42",
        "filtro.marca": "",
      }),
    ).toEqual({
      q: "chicago",
      filtros: { tamanho: "42" },
    });
  });
});

describe("camposFiltroColecao", () => {
  it("só inclui campos filtráveis dos metadados (RN-12)", () => {
    const campos = camposFiltroColecao("TENIS").map((c) => c.campo);
    expect(campos).toEqual(
      Object.entries(METADADOS_FICHA_ITEM.TENIS)
        .filter(([, flags]) => flags.filtravel)
        .map(([campo]) => campo),
    );
    expect(campos).toContain("tamanho");
    expect(campos).not.toContain("sku");
  });

  it("gera select de enum para condição e texto para tamanho", () => {
    const porCampo = Object.fromEntries(
      camposFiltroColecao("TENIS").map((c) => [c.campo, c]),
    );
    expect(porCampo.tamanho.tipo).toBe("texto");
    expect(porCampo.ano.tipo).toBe("inteiro");
    expect(porCampo.condicao).toMatchObject({
      tipo: "enum",
      rotulo: "Condição",
      opcoes: [
        { valor: "NOVO", rotulo: "Novo" },
        { valor: "USADO", rotulo: "Usado" },
        { valor: "DANIFICADO", rotulo: "Danificado" },
      ],
    });
  });

  it("inclui raridade em Yu-Gi-Oh! e omite atk", () => {
    const campos = camposFiltroColecao("YUGIOH").map((c) => c.campo);
    expect(campos).toContain("raridade");
    expect(campos).not.toContain("atk");
  });
});

describe("campos-chave da lista", () => {
  it("escolhe 1–2 campos visíveis por coleção", () => {
    expect(camposChaveLista("TENIS")).toEqual(["marca", "tamanho"]);
    expect(camposChaveLista("YUGIOH")).toEqual(["raridade", "set_edicao"]);
    expect(camposChaveLista("WHISKY")).toEqual(["destilaria", "idade_anos"]);
  });

  it("formata só valores preenchidos com rótulo pt-BR", () => {
    expect(
      valoresChaveLista("TENIS", { marca: "Nike", tamanho: "42", sku: "X" }),
    ).toEqual([
      { rotulo: "Marca", valor: "Nike" },
      { rotulo: "Tamanho", valor: "42" },
    ]);
    expect(valoresChaveLista("TENIS", { marca: "Nike" })).toEqual([
      { rotulo: "Marca", valor: "Nike" },
    ]);
    expect(valoresChaveLista("YUGIOH", { raridade: "Secret Rare" })).toEqual([
      { rotulo: "Raridade", valor: "Secret Rare" },
    ]);
  });

  it("traduz enums nos campos-chave", () => {
    expect(valoresChaveLista("TENIS", { condicao: "USADO" })).toEqual([]);
    expect(rotuloCampoFicha("concentracao")).toBe("Concentração");
    expect(
      valoresChaveLista("PERFUME", { casa: "Dior", concentracao: "EDP" }),
    ).toEqual([
      { rotulo: "Casa", valor: "Dior" },
      { rotulo: "Concentração", valor: "EDP" },
    ]);
  });
});
