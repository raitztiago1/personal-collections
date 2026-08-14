import { AuthError } from "next-auth";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { ipDoRequest, limitadorPadrao } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function registroAberto(): boolean {
  return process.env.ALLOW_REGISTRATION?.toLowerCase() !== "false";
}

async function entrar(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const emailNorm = String(email).trim().toLowerCase();
  const ip = ipDoRequest(await headers());

  const limiteEmail = limitadorPadrao.consultar(`login-email:${emailNorm}`, 10);
  const limiteIp = limitadorPadrao.consultar(`login-ip:${ip}`, 30);
  if (limiteEmail.excedido || limiteIp.excedido) {
    redirect("/login?erro=rate-limit");
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?erro=credenciais");
    }
    throw error;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/");
  }

  const { erro } = await searchParams;
  const mensagem =
    erro === "credenciais"
      ? "E-mail ou senha inválidos."
      : erro === "rate-limit"
        ? "Muitas tentativas. Tente de novo em alguns minutos."
        : null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Acesse o catálogo de coleções pessoais.
      </p>

      {mensagem ? (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {mensagem}
        </p>
      ) : null}

      <form action={entrar} className="mt-6 flex flex-col gap-4">
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
          <label htmlFor="password" className="block text-sm font-medium">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-1 w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white"
        >
          Entrar
        </button>
      </form>

      {registroAberto() ? (
        <p className="mt-6 text-sm text-zinc-600">
          Não tem conta?{" "}
          <Link href="/register" className="font-medium text-zinc-900 underline">
            Criar conta
          </Link>
        </p>
      ) : null}
    </main>
  );
}
