import { describe, expect, it } from "vitest";
import { HttpErro } from "./isolamento";
import {
  criarLimitador,
  ipDoRequest,
  RateLimitErro,
} from "./rate-limit";

const JANELA_MS = 15 * 60 * 1000;

describe("criarLimitador / consumir", () => {
  it("permite 10 consumos com teto 10 e lança RateLimitErro 429 no 11º", () => {
    const agora = 1_000_000;
    const limitador = criarLimitador({ agora: () => agora });

    for (let i = 0; i < 10; i++) {
      expect(() => limitador.consumir("email:ana@example.com", 10)).not.toThrow();
    }

    try {
      limitador.consumir("email:ana@example.com", 10);
      expect.fail("deveria lançar RateLimitErro");
    } catch (erro) {
      expect(erro).toBeInstanceOf(RateLimitErro);
      expect(erro).toBeInstanceOf(HttpErro);
      expect(erro).toMatchObject({ status: 429 });
      expect((erro as RateLimitErro).retryAfterSegundos).toBeGreaterThan(0);
      expect((erro as RateLimitErro).mensagem).toBe(
        "Muitas tentativas. Tente de novo em alguns minutos.",
      );
    }
  });

  it("volta a aceitar depois de avançar o relógio 15 min + 1ms", () => {
    let agora = 1_000_000;
    const limitador = criarLimitador({ agora: () => agora });

    for (let i = 0; i < 10; i++) {
      limitador.consumir("ip:1.1.1.1", 10);
    }

    expect(() => limitador.consumir("ip:1.1.1.1", 10)).toThrow(RateLimitErro);

    agora += JANELA_MS + 1;

    expect(() => limitador.consumir("ip:1.1.1.1", 10)).not.toThrow();
  });
});

describe("consultar", () => {
  it("não incrementa: consultar 10 vezes deixa o orçamento intacto para consumir", () => {
    const agora = 1_000_000;
    const limitador = criarLimitador({ agora: () => agora });

    for (let i = 0; i < 10; i++) {
      const peek = limitador.consultar("chave", 10);
      expect(peek.excedido).toBe(false);
      expect(peek.restante).toBe(10);
    }

    expect(() => limitador.consumir("chave", 10)).not.toThrow();

    const apos = limitador.consultar("chave", 10);
    expect(apos.restante).toBe(9);
    expect(apos.excedido).toBe(false);
  });
});

describe("ipDoRequest", () => {
  it("usa o primeiro hop de x-forwarded-for", () => {
    const headers = new Headers({
      "x-forwarded-for": "1.2.3.4, 5.6.7.8",
    });
    expect(ipDoRequest(headers)).toBe("1.2.3.4");
  });

  it("retorna local quando o header está ausente", () => {
    expect(ipDoRequest(new Headers())).toBe("local");
    expect(ipDoRequest({ get: () => null })).toBe("local");
  });
});
