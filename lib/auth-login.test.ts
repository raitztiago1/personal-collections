import { describe, expect, it, vi } from "vitest";
import {
  autenticarPorCredenciais,
  HASH_DUMMY,
} from "./auth-login";
import { criarLimitador, RateLimitErro } from "./rate-limit";

const USUARIO = {
  id: "user-1",
  nome: "Ana",
  email: "ana@example.com",
  senhaHash: "$2a$12$usuarioFakeHashNaoEDummyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
};

function depsBase(overrides: {
  findByEmail?: (email: string) => Promise<typeof USUARIO | null>;
  compare?: (senha: string, hash: string) => Promise<boolean>;
} = {}) {
  return {
    findByEmail:
      overrides.findByEmail ??
      vi.fn(async () => USUARIO),
    compare: overrides.compare ?? vi.fn(async () => false),
    limitador: criarLimitador(),
  };
}

describe("autenticarPorCredenciais", () => {
  it("no miss chama compare com o hash dummy (não o do usuário) e retorna null", async () => {
    const findByEmail = vi.fn(async () => null);
    const compare = vi.fn(async () => true);
    const deps = depsBase({ findByEmail, compare });

    const result = await autenticarPorCredenciais(
      { email: "  ausente@example.com  ", senha: "qualquer", ip: "1.1.1.1" },
      deps,
    );

    expect(result).toBeNull();
    expect(compare).toHaveBeenCalledTimes(1);
    expect(compare).toHaveBeenCalledWith("qualquer", HASH_DUMMY);
    expect(HASH_DUMMY).not.toBe(USUARIO.senhaHash);
    const hashUsado = compare.mock.calls[0]?.[1];
    expect(hashUsado).not.toBe(USUARIO.senhaHash);
  });

  it("com usuário e senha errada chama compare no hash real e retorna null", async () => {
    const compare = vi.fn(async () => false);
    const deps = depsBase({ compare });

    const result = await autenticarPorCredenciais(
      { email: "ana@example.com", senha: "errada", ip: "1.1.1.1" },
      deps,
    );

    expect(result).toBeNull();
    expect(compare).toHaveBeenCalledTimes(1);
    expect(compare).toHaveBeenCalledWith("errada", USUARIO.senhaHash);
    expect(compare).not.toHaveBeenCalledWith("errada", HASH_DUMMY);
  });

  it("com usuário e senha certa retorna { id, name, email }", async () => {
    const compare = vi.fn(async () => true);
    const deps = depsBase({ compare });

    const result = await autenticarPorCredenciais(
      { email: "ana@example.com", senha: "certa", ip: "1.1.1.1" },
      deps,
    );

    expect(result).toEqual({
      id: USUARIO.id,
      name: USUARIO.nome,
      email: USUARIO.email,
    });
    expect(compare).toHaveBeenCalledTimes(1);
    expect(compare).toHaveBeenCalledWith("certa", USUARIO.senhaHash);
  });

  it("o hash dummy não é igual ao senhaHash de nenhum usuário fake", () => {
    expect(HASH_DUMMY).not.toBe(USUARIO.senhaHash);
    expect(HASH_DUMMY).toMatch(/^\$2[aby]\$12\$/);
  });

  it("a 11ª tentativa do mesmo e-mail lança RateLimitErro mesmo com senha certa", async () => {
    const limitador = criarLimitador();
    const email = "ana@example.com";
    for (let i = 0; i < 10; i++) {
      limitador.consumir(`login-email:${email}`, 10);
    }

    const compare = vi.fn(async () => true);
    const findByEmail = vi.fn(async () => USUARIO);

    await expect(
      autenticarPorCredenciais(
        { email, senha: "certa", ip: "2.2.2.2" },
        { findByEmail, compare, limitador },
      ),
    ).rejects.toThrow(RateLimitErro);

    expect(findByEmail).not.toHaveBeenCalled();
    expect(compare).not.toHaveBeenCalled();
  });

  it("a 31ª tentativa do mesmo IP lança RateLimitErro", async () => {
    const limitador = criarLimitador();
    const ip = "9.9.9.9";
    for (let i = 0; i < 30; i++) {
      limitador.consumir(`login-ip:${ip}`, 30);
    }

    const compare = vi.fn(async () => true);
    const findByEmail = vi.fn(async () => USUARIO);

    await expect(
      autenticarPorCredenciais(
        { email: "outra@example.com", senha: "certa", ip },
        { findByEmail, compare, limitador },
      ),
    ).rejects.toThrow(RateLimitErro);

    expect(findByEmail).not.toHaveBeenCalled();
    expect(compare).not.toHaveBeenCalled();
  });
});
