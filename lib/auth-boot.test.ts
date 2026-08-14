import { describe, expect, it } from "vitest";
import { assertAuthBoot } from "./auth-boot";

const SECRET_VALIDO = "a".repeat(32);
const AUTH_URL_VALIDA = "http://localhost:3000";

describe("assertAuthBoot", () => {
  it("em produção, secret change-me lança e a mensagem cita openssl / gerar", () => {
    expect(() =>
      assertAuthBoot({
        nodeEnv: "production",
        authSecret: "change-me",
        authUrl: AUTH_URL_VALIDA,
      }),
    ).toThrow(/openssl|gerar/i);
  });

  it("em produção, secret ≥ 32 chars que não é placeholder e AUTH_URL válida não lança", () => {
    expect(() =>
      assertAuthBoot({
        nodeEnv: "production",
        authSecret: SECRET_VALIDO,
        authUrl: AUTH_URL_VALIDA,
      }),
    ).not.toThrow();
  });

  it("em produção, secret válido sem AUTH_URL lança", () => {
    expect(() =>
      assertAuthBoot({
        nodeEnv: "production",
        authSecret: SECRET_VALIDO,
      }),
    ).toThrow();
  });

  it("em produção, AUTH_URL not-a-url lança", () => {
    expect(() =>
      assertAuthBoot({
        nodeEnv: "production",
        authSecret: SECRET_VALIDO,
        authUrl: "not-a-url",
      }),
    ).toThrow();
  });

  it("em development, change-me e AUTH_URL ausente não lançam", () => {
    expect(() =>
      assertAuthBoot({
        nodeEnv: "development",
        authSecret: "change-me",
      }),
    ).not.toThrow();
  });

  it("em produção, placeholder gere-um-valor-longo lança", () => {
    expect(() =>
      assertAuthBoot({
        nodeEnv: "production",
        authSecret: "gere-um-valor-longo",
        authUrl: AUTH_URL_VALIDA,
      }),
    ).toThrow();
  });

  it("não inclui o valor do secret na mensagem quando AUTH_URL é inválida", () => {
    const secretAleatorio = "s3cr3t0-super-longo-nao-placeholder-xyz";

    expect(() =>
      assertAuthBoot({
        nodeEnv: "production",
        authSecret: secretAleatorio,
        authUrl: "not-a-url",
      }),
    ).toThrow();

    try {
      assertAuthBoot({
        nodeEnv: "production",
        authSecret: secretAleatorio,
        authUrl: "not-a-url",
      });
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : String(erro);
      expect(mensagem).not.toContain(secretAleatorio);
    }
  });

  it("em produção durante o next build (NEXT_PHASE), placeholder não lança", () => {
    expect(() =>
      assertAuthBoot({
        nodeEnv: "production",
        authSecret: "change-me",
        nextPhase: "phase-production-build",
      }),
    ).not.toThrow();
  });
});
