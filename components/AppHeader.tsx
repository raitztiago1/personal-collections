import Link from "next/link";
import { signOut } from "@/auth";

async function sair() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export function AppHeader({ nome }: { nome: string }) {
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white">
      <div className="mx-auto flex w-full max-w-3xl min-w-0 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
        <Link href="/" className="min-w-0 truncate font-semibold">
          Coleções
        </Link>
        <nav className="ml-auto flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <Link href="/buscar" className="text-sm font-medium text-zinc-800">
            Buscar
          </Link>
          <span
            className="max-w-[9rem] truncate text-sm text-zinc-600 sm:max-w-[14rem]"
            title={nome}
          >
            {nome}
          </span>
          <form action={sair}>
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-2.5 py-1 text-sm"
            >
              Sair
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
