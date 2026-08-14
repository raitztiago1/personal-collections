import { describe, expect, it } from "vitest";
import { HttpErro } from "../isolamento";
import { exigirNome, tagsOpcional, textoOpcional } from "./limites-texto";

function expectHttpErro(
  acao: () => unknown,
  status: number,
  mensagem: RegExp | string,
): HttpErro {
  try {
    acao();
    throw new Error("Esperava HttpErro, mas a ação não lançou.");
  } catch (erro) {
    expect(erro).toBeInstanceOf(HttpErro);
    const http = erro as HttpErro;
    expect(http.status).toBe(status);
    if (typeof mensagem === "string") {
      expect(http.mensagem).toBe(mensagem);
    } else {
      expect(http.mensagem).toMatch(mensagem);
    }
    return http;
  }
}

describe("exigirNome", () => {
  it("faz trim do nome", () => {
    expect(exigirNome("  Sauvage  ")).toBe("Sauvage");
  });

  it("rejeita vazio ou só espaços com a mensagem de RN-02", () => {
    expectHttpErro(() => exigirNome(""), 400, "O nome é obrigatório.");
    expectHttpErro(() => exigirNome("   "), 400, "O nome é obrigatório.");
    expectHttpErro(() => exigirNome(undefined), 400, "O nome é obrigatório.");
  });

  it("rejeita nome com 201 caracteres citando o campo", () => {
    expectHttpErro(() => exigirNome("a".repeat(201)), 400, /nome/i);
  });

  it("aceita nome com 200 caracteres após trim", () => {
    const nome = "a".repeat(200);
    expect(exigirNome(`  ${nome}  `)).toBe(nome);
  });
});

describe("textoOpcional", () => {
  it("mantém undefined e null; string vazia após trim vira null", () => {
    expect(textoOpcional(undefined, "descricao")).toBeUndefined();
    expect(textoOpcional(null, "notasPessoais")).toBeNull();
    expect(textoOpcional("", "notas")).toBeNull();
    expect(textoOpcional("   ", "formato")).toBeNull();
  });

  it("faz trim de texto opcional válido", () => {
    expect(textoOpcional("  olá  ", "descricao")).toBe("olá");
  });

  it("rejeita 4001 caracteres citando o nome do campo", () => {
    expectHttpErro(
      () => textoOpcional("x".repeat(4001), "descricao"),
      400,
      /descricao/i,
    );
    expectHttpErro(
      () => textoOpcional("x".repeat(4001), "notasPessoais"),
      400,
      /notasPessoais/i,
    );
  });

  it("aceita 4000 caracteres após trim", () => {
    const texto = "x".repeat(4000);
    expect(textoOpcional(texto, "descricao")).toBe(texto);
  });
});

describe("tagsOpcional", () => {
  it("rejeita 31 tags", () => {
    const tags = Array.from({ length: 31 }, (_, i) => `tag-${i}`);
    expectHttpErro(() => tagsOpcional(tags), 400, /tag/i);
  });

  it("rejeita tag com 51 caracteres", () => {
    expectHttpErro(() => tagsOpcional(["a".repeat(51)]), 400, /tag/i);
  });

  it("aceita 30 tags de 50 caracteres", () => {
    const tags = Array.from({ length: 30 }, () => "a".repeat(50));
    expect(tagsOpcional(tags)).toEqual(tags);
  });

  it("mantém undefined e ignora tags vazias após trim", () => {
    expect(tagsOpcional(undefined)).toBeUndefined();
    expect(tagsOpcional(["  alpha  ", "  ", "beta"])).toEqual(["alpha", "beta"]);
  });
});
