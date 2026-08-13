import { afterEach, describe, expect, it, vi } from "vitest";
import { registrarUsuario, type UsuarioRepo } from "./auth-register";

type UsuarioFake = {
  id: string;
  nome: string;
  email: string;
  senhaHash: string;
};

function criarRepoEmMemoria(iniciais: UsuarioFake[] = []): {
  users: UsuarioRepo;
  criados: UsuarioFake[];
} {
  const criados: UsuarioFake[] = [...iniciais];

  const users: UsuarioRepo = {
    async findByEmail(email) {
      const chave = email.toLowerCase();
      return criados.find((u) => u.email.toLowerCase() === chave) ?? null;
    },
    async create(data) {
      const chave = data.email.toLowerCase();
      if (criados.some((u) => u.email.toLowerCase() === chave)) {
        throw Object.assign(new Error("Unique constraint failed"), {
          code: "P2002",
        });
      }
      const usuario: UsuarioFake = {
        id: "user-novo",
        nome: data.nome,
        email: data.email,
        senhaHash: data.senhaHash,
      };
      criados.push(usuario);
      return { id: usuario.id, nome: usuario.nome, email: usuario.email };
    },
  };

  return { users, criados };
}

function depsComRepo(
  users: UsuarioRepo,
  hashSenha: (senha: string) => Promise<string> = async (senha) =>
    `hash(${senha})`,
) {
  return { users, hashSenha };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("registrarUsuario", () => {
  it("registra usuário com nome, e-mail e senha", async () => {
    vi.stubEnv("ALLOW_REGISTRATION", "true");
    const { users, criados } = criarRepoEmMemoria();

    const result = await registrarUsuario(
      { nome: "Ana", email: "ana@example.com", senha: "segredo12" },
      depsComRepo(users),
    );

    expect(result.status).toBe(201);
    expect(result.body).toEqual({
      id: "user-novo",
      nome: "Ana",
      email: "ana@example.com",
    });
    expect(criados).toHaveLength(1);
    expect(criados[0]?.senhaHash).toBe("hash(segredo12)");
    expect(criados[0]?.senhaHash).not.toBe("segredo12");
  });

  it("falha com mensagem em pt-BR quando o e-mail já existe", async () => {
    vi.stubEnv("ALLOW_REGISTRATION", "true");
    const { users } = criarRepoEmMemoria([
      {
        id: "existente",
        nome: "Ana",
        email: "ana@example.com",
        senhaHash: "hash-antigo",
      },
    ]);

    const result = await registrarUsuario(
      { nome: "Outra", email: "ana@example.com", senha: "outrasenha" },
      depsComRepo(users),
    );

    expect(result.status).toBe(409);
    expect(JSON.stringify(result.body)).toMatch(/e-mail/i);
    expect(JSON.stringify(result.body)).toMatch(/já está cadastrado/i);
  });

  it("trata violação de unicidade do banco como e-mail duplicado", async () => {
    vi.stubEnv("ALLOW_REGISTRATION", "true");
    const users: UsuarioRepo = {
      async findByEmail() {
        return null;
      },
      async create() {
        throw Object.assign(new Error("Unique constraint failed"), {
          code: "P2002",
        });
      },
    };

    const result = await registrarUsuario(
      { nome: "Ana", email: "ana@example.com", senha: "segredo12" },
      depsComRepo(users),
    );

    expect(result.status).toBe(409);
    expect(JSON.stringify(result.body)).toMatch(/já está cadastrado/i);
  });

  it("falha quando a senha tem menos de 8 caracteres", async () => {
    vi.stubEnv("ALLOW_REGISTRATION", "true");
    const { users, criados } = criarRepoEmMemoria();

    const result = await registrarUsuario(
      { nome: "Ana", email: "ana@example.com", senha: "1234567" },
      depsComRepo(users),
    );

    expect(result.status).toBe(400);
    expect(JSON.stringify(result.body)).toMatch(/senha/i);
    expect(JSON.stringify(result.body)).toMatch(/8/i);
    expect(criados).toHaveLength(0);
  });

  it("retorna 403 quando ALLOW_REGISTRATION=false (RN-10)", async () => {
    vi.stubEnv("ALLOW_REGISTRATION", "false");
    const { users, criados } = criarRepoEmMemoria();

    const result = await registrarUsuario(
      { nome: "Ana", email: "ana@example.com", senha: "segredo12" },
      depsComRepo(users),
    );

    expect(result.status).toBe(403);
    expect(JSON.stringify(result.body)).toMatch(/registro/i);
    expect(criados).toHaveLength(0);
  });

  it("nunca inclui senha nem senhaHash no JSON da resposta", async () => {
    vi.stubEnv("ALLOW_REGISTRATION", "true");
    const { users } = criarRepoEmMemoria();
    const senha = "segredo12";

    const result = await registrarUsuario(
      { nome: "Ana", email: "ana@example.com", senha },
      depsComRepo(users),
    );

    const json = JSON.stringify(result);
    expect(json).not.toMatch(/senhaHash/i);
    expect(json).not.toContain(senha);
    expect(json).not.toMatch(/"senha"\s*:/);
    expect(result.body).not.toHaveProperty("senha");
    expect(result.body).not.toHaveProperty("senhaHash");
  });
});
