import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "../auth";
import {
  assertDono,
  deveRedirecionarParaLogin,
  eRotaPublica,
  HttpErro,
  opcoesGetTokenSessao,
} from "./isolamento";
import { requireUser } from "./session";

const authMock = vi.mocked(auth);

describe("HttpErro", () => {
  it("expõe status e mensagem para as APIs converterem em resposta HTTP", () => {
    const erro = new HttpErro(401, "Não autenticado.");

    expect(erro).toBeInstanceOf(Error);
    expect(erro.status).toBe(401);
    expect(erro.mensagem).toBe("Não autenticado.");
  });
});

describe("assertDono", () => {
  it("não lança quando o recurso pertence ao usuário da sessão", () => {
    expect(() => assertDono("user-a", "user-a")).not.toThrow();
  });

  it("lança 404 (não 403) quando o recurso é de outro usuário (RF-02)", () => {
    expect.assertions(4);

    try {
      assertDono("user-a", "user-b");
    } catch (erro) {
      expect(erro).toBeInstanceOf(HttpErro);
      expect(erro).toMatchObject({ status: 404 });
      expect((erro as HttpErro).status).not.toBe(403);
      expect((erro as HttpErro).mensagem.length).toBeGreaterThan(0);
    }
  });
});

describe("requireUser", () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  it("retorna o id da sessão autenticada", async () => {
    authMock.mockResolvedValue({
      user: { id: "user-a" },
      expires: "2099-01-01T00:00:00.000Z",
    });

    await expect(requireUser()).resolves.toEqual({ id: "user-a" });
  });

  it("lança 401 quando não há sessão", async () => {
    authMock.mockResolvedValue(null);

    await expect(requireUser()).rejects.toBeInstanceOf(HttpErro);
    await expect(requireUser()).rejects.toMatchObject({ status: 401 });
  });

  it("lança 401 quando a sessão não tem user.id", async () => {
    authMock.mockResolvedValue({
      user: { email: "ana@example.com" },
      expires: "2099-01-01T00:00:00.000Z",
    } as Awaited<ReturnType<typeof auth>>);

    await expect(requireUser()).rejects.toMatchObject({ status: 401 });
  });
});

describe("rotas públicas e redirecionamento de anônimo", () => {
  it("trata /login, /register, /api/auth/* e /api/register como públicas", () => {
    expect(eRotaPublica("/login")).toBe(true);
    expect(eRotaPublica("/register")).toBe(true);
    expect(eRotaPublica("/api/auth/session")).toBe(true);
    expect(eRotaPublica("/api/auth/callback/credentials")).toBe(true);
    expect(eRotaPublica("/api/register")).toBe(true);
    expect(eRotaPublica("/")).toBe(false);
    expect(eRotaPublica("/api/itens")).toBe(false);
  });

  it("redireciona anônimo da área autenticada para /login", () => {
    expect(deveRedirecionarParaLogin("/", false)).toBe(true);
    expect(deveRedirecionarParaLogin("/itens", false)).toBe(true);
  });

  it("não redireciona anônimo em rotas públicas", () => {
    expect(deveRedirecionarParaLogin("/login", false)).toBe(false);
    expect(deveRedirecionarParaLogin("/register", false)).toBe(false);
    expect(deveRedirecionarParaLogin("/api/auth/session", false)).toBe(false);
    expect(deveRedirecionarParaLogin("/api/register", false)).toBe(false);
  });

  it("não redireciona APIs restantes para HTML de login (401 fica a cargo de requireUser)", () => {
    expect(deveRedirecionarParaLogin("/api/itens", false)).toBe(false);
  });

  it("não redireciona usuário autenticado", () => {
    expect(deveRedirecionarParaLogin("/", true)).toBe(false);
    expect(deveRedirecionarParaLogin("/itens", true)).toBe(false);
  });
});

describe("opcoesGetTokenSessao", () => {
  it("usa cookie e salt __Secure-authjs.session-token em HTTPS", () => {
    expect(
      opcoesGetTokenSessao({ protocol: "https:" }),
    ).toEqual({
      secureCookie: true,
      cookieName: "__Secure-authjs.session-token",
    });
  });

  it("usa cookie e salt authjs.session-token em HTTP local", () => {
    expect(
      opcoesGetTokenSessao({ protocol: "http:", nodeEnv: "development" }),
    ).toEqual({
      secureCookie: false,
      cookieName: "authjs.session-token",
    });
  });

  it("respeita x-forwarded-proto quando o app está atrás de proxy TLS", () => {
    expect(
      opcoesGetTokenSessao({
        protocol: "http:",
        forwardedProto: "https",
        nodeEnv: "production",
      }),
    ).toEqual({
      secureCookie: true,
      cookieName: "__Secure-authjs.session-token",
    });
  });

  it("escolhe o cookie presente no request para o salt bater com o encode do Auth.js", () => {
    expect(
      opcoesGetTokenSessao({
        protocol: "http:",
        cookieHeader: "__Secure-authjs.session-token=jwt-criptografado",
        nodeEnv: "development",
      }),
    ).toEqual({
      secureCookie: true,
      cookieName: "__Secure-authjs.session-token",
    });

    expect(
      opcoesGetTokenSessao({
        protocol: "https:",
        cookieHeader: "authjs.session-token=jwt-criptografado",
        nodeEnv: "production",
      }),
    ).toEqual({
      secureCookie: false,
      cookieName: "authjs.session-token",
    });
  });

  it("em produção sem protocolo conhecido assume prefixo __Secure-", () => {
    expect(opcoesGetTokenSessao({ nodeEnv: "production" })).toEqual({
      secureCookie: true,
      cookieName: "__Secure-authjs.session-token",
    });
  });
});
