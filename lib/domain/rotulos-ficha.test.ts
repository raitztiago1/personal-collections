import { describe, expect, it } from "vitest";
import { TIPOS_COLECAO_ITEM } from "./colecoes";
import { schemasFichaItem } from "./fichas-item";
import {
  camposFichaUI,
  camposPreenchidosFicha,
  rotuloCampoFicha,
  rotuloValorFicha,
} from "./rotulos-ficha";

const ROTULOS_ESPERADOS: Record<string, string> = {
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
};

describe("rotuloCampoFicha", () => {
  it("usa rótulos pt-BR por campo, não a chave crua", () => {
    for (const [campo, rotulo] of Object.entries(ROTULOS_ESPERADOS)) {
      expect(rotuloCampoFicha(campo)).toBe(rotulo);
    }
  });

  it("cobre todas as chaves dos schemas de ficha", () => {
    for (const tipo of TIPOS_COLECAO_ITEM) {
      for (const campo of Object.keys(schemasFichaItem[tipo].shape)) {
        const rotulo = rotuloCampoFicha(campo);
        expect(rotulo, `${tipo}.${campo}`).not.toBe(campo);
        expect(rotulo, `${tipo}.${campo}`).not.toMatch(/_/);
      }
    }
  });
});

describe("rotuloValorFicha", () => {
  it("humaniza enums de condição e restantes", () => {
    expect(rotuloValorFicha("NOVO")).toBe("Novo");
    expect(rotuloValorFicha("USADO")).toBe("Usado");
    expect(rotuloValorFicha("DANIFICADO")).toBe("Danificado");
    expect(rotuloValorFicha("CHEIO")).toBe("Cheio");
    expect(rotuloValorFicha("MAIORIA")).toBe("Maioria");
    expect(rotuloValorFicha("METADE")).toBe("Metade");
    expect(rotuloValorFicha("POUCO")).toBe("Pouco");
    expect(rotuloValorFicha("VAZIO")).toBe("Vazio");
    expect(rotuloValorFicha("OFICIAL")).toBe("Oficial");
    expect(rotuloValorFicha("INDEPENDENTE")).toBe("Independente");
    expect(rotuloValorFicha("EDP")).toBe("EDP");
    expect(rotuloValorFicha("EXTRAT")).toBe("Extrait");
    expect(rotuloValorFicha("EM_ANDAMENTO")).toBe("Em andamento");
    expect(rotuloValorFicha("COMPLETA")).toBe("Completa");
    expect(rotuloValorFicha("HIATO")).toBe("Hiato");
    expect(rotuloValorFicha("CAPA_DURA")).toBe("Capa dura");
    expect(rotuloValorFicha("BROCHURA")).toBe("Brochura");
    expect(rotuloValorFicha("BOLSO")).toBe("Bolso");
    expect(rotuloValorFicha("EBOOK")).toBe("E-book");
    expect(rotuloValorFicha("NAO_LIDO")).toBe("Não lido");
    expect(rotuloValorFicha("LENDO")).toBe("Lendo");
    expect(rotuloValorFicha("LIDO")).toBe("Lido");
    expect(rotuloValorFicha("MINT")).toBe("Mint");
    expect(rotuloValorFicha("OUTRO")).toBe("Outro");
  });
});

describe("camposFichaUI", () => {
  it("gera campos na ordem das chaves Zod, sem JSON cru", () => {
    const campos = camposFichaUI("PERFUME");
    expect(campos.map((c) => c.campo)).toEqual(
      Object.keys(schemasFichaItem.PERFUME.shape),
    );
    expect(campos.find((c) => c.campo === "casa")?.rotulo).toBe("Casa");
    expect(campos.find((c) => c.campo === "notas_coracao")?.rotulo).toBe(
      "Notas de coração",
    );
  });

  it("usa select para enums e number para inteiros/decimais", () => {
    const porCampo = Object.fromEntries(
      camposFichaUI("WHISKY").map((c) => [c.campo, c]),
    );
    expect(porCampo.engarrafador).toMatchObject({
      tipo: "enum",
      opcoes: [
        { valor: "OFICIAL", rotulo: "Oficial" },
        { valor: "INDEPENDENTE", rotulo: "Independente" },
      ],
    });
    expect(porCampo.idade_anos.tipo).toBe("inteiro");
    expect(porCampo.abv.tipo).toBe("decimal");
    expect(porCampo.nota_pessoal.tipo).toBe("decimal");
    expect(porCampo.destilaria.tipo).toBe("texto");
  });
});

describe("camposPreenchidosFicha", () => {
  it("mostra casa e notas de perfume com rótulo, sem bloco detalhes", () => {
    const campos = camposPreenchidosFicha("PERFUME", {
      casa: "Dior",
      notas_topo: "bergamota",
      notas_coracao: "pimenta",
      notas_base: "ambroxan",
      concentracao: "EDP",
    });

    expect(campos).toEqual([
      { campo: "casa", rotulo: "Casa", valor: "Dior" },
      { campo: "concentracao", rotulo: "Concentração", valor: "EDP" },
      { campo: "notas_topo", rotulo: "Notas de topo", valor: "bergamota" },
      { campo: "notas_coracao", rotulo: "Notas de coração", valor: "pimenta" },
      { campo: "notas_base", rotulo: "Notas de base", valor: "ambroxan" },
    ]);
    expect(campos.some((c) => /detalhe/i.test(c.rotulo))).toBe(false);
  });

  it("omite campos vazios", () => {
    expect(
      camposPreenchidosFicha("TENIS", {
        marca: "Nike",
        linha: "",
        sku: "   ",
        ano: undefined,
      }),
    ).toEqual([{ campo: "marca", rotulo: "Marca", valor: "Nike" }]);
  });

  it("humaniza enums na ficha preenchida", () => {
    expect(
      camposPreenchidosFicha("TENIS", { condicao: "USADO" }),
    ).toEqual([{ campo: "condicao", rotulo: "Condição", valor: "Usado" }]);
  });
});
