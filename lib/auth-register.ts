import { limitadorPadrao, RateLimitErro, type Limitador } from "./rate-limit";

export type UsuarioRepo = {
  findByEmail(email: string): Promise<{ id: string } | null>;
  create(data: {
    nome: string;
    email: string;
    senhaHash: string;
  }): Promise<{ id: string; nome: string; email: string }>;
};

export type RegistrarUsuarioDeps = {
  users: UsuarioRepo;
  hashSenha: (senha: string) => Promise<string>;
  ip?: string;
  limitador?: Limitador;
};

export type RegistrarUsuarioResult = {
  status: number;
  body: Record<string, unknown>;
  retryAfter?: number;
};

const ERRO_REGISTRO_DESATIVADO = "O registro de novas contas está desativado.";
const ERRO_NOME = "O nome deve ter entre 1 e 80 caracteres.";
const ERRO_EMAIL = "Informe um e-mail válido.";
const ERRO_SENHA_CURTA = "A senha deve ter pelo menos 8 caracteres.";
const ERRO_SENHA_LONGA = "A senha deve ter no máximo 200 caracteres.";
const ERRO_EMAIL_DUPLICADO = "Este e-mail já está cadastrado.";

const EMAIL_SIMPLES = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TETO_CADASTRO_POR_IP = 5;

function registroPermitido(): boolean {
  return process.env.ALLOW_REGISTRATION?.toLowerCase() !== "false";
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}

function emailValido(email: string): boolean {
  return (
    email.length >= 3 && email.length <= 254 && EMAIL_SIMPLES.test(email)
  );
}

export async function registrarUsuario(
  input: { nome: string; email: string; senha: string },
  deps: RegistrarUsuarioDeps,
): Promise<RegistrarUsuarioResult> {
  if (!registroPermitido()) {
    return { status: 403, body: { erro: ERRO_REGISTRO_DESATIVADO } };
  }

  const nome = typeof input.nome === "string" ? input.nome.trim() : "";
  if (nome.length < 1 || nome.length > 80) {
    return { status: 400, body: { erro: ERRO_NOME } };
  }

  const email = typeof input.email === "string" ? input.email.trim() : "";
  if (!emailValido(email)) {
    return { status: 400, body: { erro: ERRO_EMAIL } };
  }

  if (typeof input.senha !== "string" || input.senha.length < 8) {
    return { status: 400, body: { erro: ERRO_SENHA_CURTA } };
  }
  if (input.senha.length > 200) {
    return { status: 400, body: { erro: ERRO_SENHA_LONGA } };
  }

  if (deps.ip) {
    const limitador = deps.limitador ?? limitadorPadrao;
    try {
      limitador.consumir(`register:${deps.ip}`, TETO_CADASTRO_POR_IP);
    } catch (error) {
      if (error instanceof RateLimitErro) {
        return {
          status: 429,
          body: { erro: error.mensagem },
          retryAfter: error.retryAfterSegundos,
        };
      }
      throw error;
    }
  }

  const existente = await deps.users.findByEmail(email);
  if (existente) {
    return { status: 409, body: { erro: ERRO_EMAIL_DUPLICADO } };
  }

  const senhaHash = await deps.hashSenha(input.senha);

  try {
    const usuario = await deps.users.create({
      nome,
      email,
      senhaHash,
    });

    return {
      status: 201,
      body: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
      },
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { status: 409, body: { erro: ERRO_EMAIL_DUPLICADO } };
    }
    throw error;
  }
}
