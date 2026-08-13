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
};

export type RegistrarUsuarioResult = {
  status: number;
  body: Record<string, unknown>;
};

const ERRO_REGISTRO_DESATIVADO = "O registro de novas contas está desativado.";
const ERRO_SENHA_CURTA = "A senha deve ter pelo menos 8 caracteres.";
const ERRO_EMAIL_DUPLICADO = "Este e-mail já está cadastrado.";

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

export async function registrarUsuario(
  input: { nome: string; email: string; senha: string },
  deps: RegistrarUsuarioDeps,
): Promise<RegistrarUsuarioResult> {
  if (!registroPermitido()) {
    return { status: 403, body: { erro: ERRO_REGISTRO_DESATIVADO } };
  }

  if (typeof input.senha !== "string" || input.senha.length < 8) {
    return { status: 400, body: { erro: ERRO_SENHA_CURTA } };
  }

  const existente = await deps.users.findByEmail(input.email);
  if (existente) {
    return { status: 409, body: { erro: ERRO_EMAIL_DUPLICADO } };
  }

  const senhaHash = await deps.hashSenha(input.senha);

  try {
    const usuario = await deps.users.create({
      nome: input.nome,
      email: input.email,
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
