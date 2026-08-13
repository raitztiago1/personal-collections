import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { registrarUsuario } from "@/lib/auth-register";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function registroAberto(): boolean {
  return process.env.ALLOW_REGISTRATION?.toLowerCase() !== "false";
}

const users = {
  findByEmail(email: string) {
    return prisma.usuario.findUnique({
      where: { email },
      select: { id: true },
    });
  },
  create(data: { nome: string; email: string; senhaHash: string }) {
    return prisma.usuario.create({
      data,
      select: { id: true, nome: true, email: true },
    });
  },
};

async function registrar(formData: FormData) {
  "use server";

  const nome = String(formData.get("nome") ?? "");
  const email = String(formData.get("email") ?? "");
  const senha = String(formData.get("senha") ?? "");

  const result = await registrarUsuario(
    { nome, email, senha },
    {
      users,
      hashSenha: (valor) => bcrypt.hash(valor, 12),
    },
  );

  if (result.status === 403) {
    redirect("/register?erro=fechado");
  }

  if (result.status !== 201) {
    const mensagem =
      typeof result.body.erro === "string"
        ? result.body.erro
        : "Não foi possível criar a conta.";
    redirect(`/register?erro=${encodeURIComponent(mensagem)}`);
  }

  try {
    await signIn("credentials", {
      email,
      password: senha,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?erro=credenciais");
    }
    throw error;
  }
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/");
  }

  const { erro } = await searchParams;
  const fechado = !registroAberto() || erro === "fechado";
  const mensagem = fechado
    ? "O registro de novas contas está desativado."
    : erro
      ? erro
      : null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Criar conta</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Cadastre-se para começar o catálogo vazio.
      </p>

      {mensagem ? (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {mensagem}
        </p>
      ) : null}

      {fechado ? (
        <p className="mt-6 text-sm text-zinc-600">
          <Link href="/login" className="font-medium text-zinc-900 underline">
            Entrar
          </Link>
        </p>
      ) : (
        <>
          <form action={registrar} className="mt-6 flex flex-col gap-4">
            <div>
              <label htmlFor="nome" className="block text-sm font-medium">
                Nome
              </label>
              <input
                id="nome"
                name="nome"
                type="text"
                autoComplete="name"
                required
                className="mt-1 w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base"
              />
            </div>
            <div>
              <label htmlFor="senha" className="block text-sm font-medium">
                Senha
              </label>
              <input
                id="senha"
                name="senha"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="mt-1 w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white"
            >
              Criar conta
            </button>
          </form>
          <p className="mt-6 text-sm text-zinc-600">
            Já tem conta?{" "}
            <Link href="/login" className="font-medium text-zinc-900 underline">
              Entrar
            </Link>
          </p>
        </>
      )}
    </main>
  );
}
