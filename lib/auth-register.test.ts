import { afterEach, describe, expect, it, vi } from "vitest";
import { registrarUsuario, type UsuarioRepo } from "./auth-register";
import { criarLimitador, resetLimitadorPadrao } from "./rate-limit";

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
  resetLimitadorPadrao();
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

  it("retorna 400 quando nome está vazio e e-mail é inválido", async () => {
    vi.stubEnv("ALLOW_REGISTRATION", "true");
    const { users, criados } = criarRepoEmMemoria();
    const hashSenha = vi.fn(async (senha: string) => `hash(${senha})`);
    const findByEmail = vi.fn(users.findByEmail);

    const result = await registrarUsuario(
      { nome: "", email: "x", senha: "12345678" },
      depsComRepo({ ...users, findByEmail }, hashSenha),
    );

    expect(result.status).toBe(400);
    expect(JSON.stringify(result.body)).toMatch(/nome/i);
    expect(criados).toHaveLength(0);
    expect(findByEmail).not.toHaveBeenCalled();
    expect(hashSenha).not.toHaveBeenCalled();
  });

  it("retorna 400 quando o e-mail não tem @", async () => {
    vi.stubEnv("ALLOW_REGISTRATION", "true");
    const { users, criados } = criarRepoEmMemoria();
    const hashSenha = vi.fn(async (senha: string) => `hash(${senha})`);

    const result = await registrarUsuario(
      { nome: "Ana", email: "ana.example.com", senha: "segredo12" },
      depsComRepo(users, hashSenha),
    );

    expect(result.status).toBe(400);
    expect(JSON.stringify(result.body)).toMatch(/e-mail/i);
    expect(criados).toHaveLength(0);
    expect(hashSenha).not.toHaveBeenCalled();
  });

  it("retorna 400 quando o nome tem 81 caracteres", async () => {
    vi.stubEnv("ALLOW_REGISTRATION", "true");
    const { users, criados } = criarRepoEmMemoria();
    const hashSenha = vi.fn(async (senha: string) => `hash(${senha})`);

    const result = await registrarUsuario(
      { nome: "a".repeat(81), email: "ana@example.com", senha: "segredo12" },
      depsComRepo(users, hashSenha),
    );

    expect(result.status).toBe(400);
    expect(JSON.stringify(result.body)).toMatch(/nome/i);
    expect(criados).toHaveLength(0);
    expect(hashSenha).not.toHaveBeenCalled();
  });

  it("retorna 400 quando a senha tem mais de 200 caracteres", async () => {
    vi.stubEnv("ALLOW_REGISTRATION", "true");
    const { users, criados } = criarRepoEmMemoria();
    const hashSenha = vi.fn(async (senha: string) => `hash(${senha})`);

    const result = await registrarUsuario(
      { nome: "Ana", email: "ana@example.com", senha: "a".repeat(201) },
      depsComRepo(users, hashSenha),
    );

    expect(result.status).toBe(400);
    expect(JSON.stringify(result.body)).toMatch(/senha/i);
    expect(criados).toHaveLength(0);
    expect(hashSenha).not.toHaveBeenCalled();
  });

  it("persiste nome e e-mail com espaços nas pontas removidos", async () => {
    vi.stubEnv("ALLOW_REGISTRATION", "true");
    const { users, criados } = criarRepoEmMemoria();

    const result = await registrarUsuario(
      { nome: "  Ana  ", email: "  ana@example.com  ", senha: "segredo12" },
      depsComRepo(users),
    );

    expect(result.status).toBe(201);
    expect(result.body).toEqual({
      id: "user-novo",
      nome: "Ana",
      email: "ana@example.com",
    });
    expect(criados[0]?.nome).toBe("Ana");
    expect(criados[0]?.email).toBe("ana@example.com");
  });

  it("permite 5 cadastros do mesmo IP e retorna 429 no 6º sem vazar a senha", async () => {
    vi.stubEnv("ALLOW_REGISTRATION", "true");
    const { users, criados } = criarRepoEmMemoria();
    const hashSenha = vi.fn(async (senha: string) => `hash(${senha})`);
    const limitador = criarLimitador({ agora: () => 1_000_000 });
    const ip = "203.0.113.10";
    const senhaSexta = "senha-secreta-429";

    for (let i = 0; i < 5; i++) {
      const result = await registrarUsuario(
        {
          nome: "Ana",
          email: `ana${i}@example.com`,
          senha: "segredo12",
        },
        { ...depsComRepo(users, hashSenha), ip, limitador },
      );
      expect(result.status).toBe(201);
    }

    const sexto = await registrarUsuario(
      { nome: "Ana", email: "sexta@example.com", senha: senhaSexta },
      { ...depsComRepo(users, hashSenha), ip, limitador },
    );

    expect(sexto.status).toBe(429);
    expect(sexto.body).toEqual({
      erro: "Muitas tentativas. Tente de novo em alguns minutos.",
    });
    expect(sexto.retryAfter).toBeGreaterThan(0);
    expect(JSON.stringify(sexto.body)).not.toContain(senhaSexta);
    expect(JSON.stringify(sexto)).not.toContain(senhaSexta);
    expect(criados).toHaveLength(5);
    expect(hashSenha).toHaveBeenCalledTimes(5);
  });

  it("não compartilha o teto de cadastro entre IPs diferentes", async () => {
    vi.stubEnv("ALLOW_REGISTRATION", "true");
    const { users } = criarRepoEmMemoria();
    const limitador = criarLimitador({ agora: () => 1_000_000 });

    for (let i = 0; i < 5; i++) {
      const result = await registrarUsuario(
        {
          nome: "Ana",
          email: `ip1-${i}@example.com`,
          senha: "segredo12",
        },
        {
          ...depsComRepo(users),
          ip: "198.51.100.1",
          limitador,
        },
      );
      expect(result.status).toBe(201);
    }

    const outroIp = await registrarUsuario(
      { nome: "Bia", email: "bia@example.com", senha: "segredo12" },
      {
        ...depsComRepo(users),
        ip: "198.51.100.2",
        limitador,
      },
    );
    const sextoDoPrimeiro = await registrarUsuario(
      { nome: "Ana", email: "ip1-sexto@example.com", senha: "segredo12" },
      {
        ...depsComRepo(users),
        ip: "198.51.100.1",
        limitador,
      },
    );

    expect(outroIp.status).toBe(201);
    expect(sextoDoPrimeiro.status).toBe(429);
  });
});
