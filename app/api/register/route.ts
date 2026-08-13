import bcrypt from "bcryptjs";
import { registrarUsuario, type UsuarioRepo } from "@/lib/auth-register";
import { prisma } from "@/lib/db";

const users: UsuarioRepo = {
  findByEmail(email) {
    return prisma.usuario.findUnique({
      where: { email },
      select: { id: true },
    });
  },
  create(data) {
    return prisma.usuario.create({
      data,
      select: { id: true, nome: true, email: true },
    });
  },
};

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ erro: "JSON inválido." }, { status: 400 });
  }

  if (payload === null || typeof payload !== "object") {
    return Response.json({ erro: "JSON inválido." }, { status: 400 });
  }

  const { nome, email, senha } = payload as Record<string, unknown>;

  const result = await registrarUsuario(
    {
      nome: typeof nome === "string" ? nome : "",
      email: typeof email === "string" ? email : "",
      senha: typeof senha === "string" ? senha : "",
    },
    {
      users,
      hashSenha: (valor) => bcrypt.hash(valor, 12),
    },
  );

  return Response.json(result.body, { status: result.status });
}
